import time
import httpx
import uuid
import csv
import json
from asgiref.sync import sync_to_async
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from adrf.views import APIView as AsyncAPIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import MLModel, InferenceLog, User, Tag
from .permissions import IsAdminRole
from .serializers import RegisterSerializer, MLModelSerializer, AdminMLModelSerializer, InferenceLogSerializer, TagSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

# Вспомогательная синхронная функция для сохранения логов (и файлов) в БД
def save_log_sync(user, model, latency_ms, http_status, req_payload, res_payload, image_content):
    log = InferenceLog(
        user=user,
        model=model,
        latency_ms=latency_ms,
        http_status=http_status,
        req_payload=req_payload,
        res_payload=res_payload
    )
    # Если статус успешный и модель выдает картинку — сохраняем бинарник как файл
    if image_content and model.output_type == 'IMAGE' and http_status == 200:
        filename = f"gen_{uuid.uuid4().hex[:8]}.jpg"
        log.image_file.save(filename, ContentFile(image_content), save=False)
    
    log.save()
    return log

class ProxyInferenceView(AsyncAPIView):
    permission_classes = [IsAuthenticated]

    async def post(self, request, pk):
        try:
            model = await MLModel.objects.aget(pk=pk)
        except MLModel.DoesNotExist:
            return Response({'error': 'Модель не найдена'}, status=404)
        
        # Дешифруем токен пользователя "на лету"
        hf_token = await sync_to_async(request.user.get_hf_token)()
        if not hf_token:
            return Response({'error': 'Отсутствует Hugging Face токен в профиле'}, status=403)

        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "application/json"
        }
        req_payload = request.data.copy() if isinstance(request.data, dict) else request.data
        
        # Если в БД указано имя модели, и это JSON-словарь, мы подмешиваем поле 'model'
        if isinstance(req_payload, dict) and model.hf_model_id:
            req_payload["model"] = model.hf_model_id
        start_time = time.time()

        # Асинхронный запрос к Hugging Face
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    model.endpoint_url, 
                    json=req_payload, 
                    headers=headers, 
                    timeout=60.0
                )
                latency_ms = int((time.time() - start_time) * 1000)
                res_status = response.status_code
                
                res_payload = None
                image_content = None

                if res_status == 200:
                    if model.output_type == 'TEXT':
                        res_payload = response.json()
                    elif model.output_type == 'IMAGE':
                        image_content = response.content
                else:
                    try:
                        res_payload = response.json()
                    except:
                        res_payload = {"error": response.text}

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                await sync_to_async(save_log_sync)(
                    request.user, model, latency_ms, 500, req_payload, {"error": str(e)}, None
                )
                return Response({"error": "Ошибка соединения с Hugging Face API"}, status=500)

        # Сохранение в базу
        log = await sync_to_async(save_log_sync)(
            request.user, model, latency_ms, res_status, req_payload, res_payload, image_content
        )

        # Формирование ответа
        response_data = {
            "log_id": log.id,
            "latency_ms": log.latency_ms,
            "http_status": log.http_status,
        }
        
        if model.output_type == 'TEXT':
            response_data["result"] = res_payload
        else:
            if log.image_file:
                # Отдаем абсолютный URL картинки на фронтенд
                response_data["image_url"] = request.build_absolute_uri(log.image_file.url)
        
        return Response(response_data, status=res_status)


class LogImportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'Файл не предоставлен'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        decoded_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(decoded_file)

        logs_to_create = []
        for row in reader:
            try:
                logs_to_create.append(
                    InferenceLog(
                        model_id=int(row['model_id']),
                        user_id=int(row['user_id']) if row.get('user_id') else request.user.id,
                        latency_ms=int(row['latency_ms']),
                        http_status=int(row['http_status']),
                        req_payload=json.loads(row['req_payload'].replace("'", '"')),
                        res_payload=json.loads(row['res_payload'].replace("'", '"')) if row.get('res_payload') else None,
                    )
                )
            except Exception as e:
                return Response({'error': f"Ошибка в строке {row}. Детали: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        InferenceLog.objects.bulk_create(logs_to_create)
        return Response({'message': f'Успешно импортировано {len(logs_to_create)} записей'}, status=status.HTTP_201_CREATED)
    

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_token = bool(request.user.get_hf_token())
        return Response({
            "username": request.user.username,
            "role": request.user.role,
            "has_token": has_token
        })

    def post(self, request):
        hf_token = request.data.get("hf_token")
        if hf_token is not None:
            request.user.set_hf_token(hf_token)
            request.user.save()
            return Response({"message": "Токен сохранен"})
        return Response({"error": "Токен не передан"}, status=400)


class MLModelListCreateView(generics.ListCreateAPIView):
    queryset = MLModel.objects.all().prefetch_related('tags')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminMLModelSerializer
        return MLModelSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"error": "Только для администраторов"}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

class MLModelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MLModel.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminMLModelSerializer
        return MLModelSerializer

    def update(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"error": "Только для администраторов"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"error": "Только для администраторов"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class InferenceLogListView(generics.ListAPIView):
    serializer_class = InferenceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Пользователь видит только СВОЮ историю
        return InferenceLog.objects.filter(user=self.request.user).order_by('-created_at')
    

# Теперь теги можно Создавать (POST)
class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"error": "Только для администраторов"}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)
    
# И Удалять/Редактировать (DELETE/PUT)
class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"error": "Только для администраторов"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class AdminGlobalLogListView(generics.ListAPIView):
    serializer_class = InferenceLogSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        qs = InferenceLog.objects.all().order_by('-created_at')
        
        # Фильтрация по query-параметрам
        # Поддерживаем поиск по username или user_id
        user_filter = self.request.query_params.get('user')
        if user_filter:
            if user_filter.isdigit():
                # Если это число, ищем по ID
                qs = qs.filter(user_id=user_filter)
            else:
                # Если текст, ищем по username (case-insensitive)
                qs = qs.filter(user__username__icontains=user_filter)
        
        # Поддерживаем поиск по имени модели или model_id
        model_filter = self.request.query_params.get('model')
        if model_filter:
            if model_filter.isdigit():
                # Если это число, ищем по ID
                qs = qs.filter(model_id=model_filter)
            else:
                # Если текст, ищем по имени модели (case-insensitive)
                qs = qs.filter(model__name__icontains=model_filter)
        
        http_status = self.request.query_params.get('status')
        if http_status: qs = qs.filter(http_status=http_status)
        
        return qs
    

class MLModelCheckStatusView(AsyncAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    async def post(self, request, pk):
        try:
            model = await MLModel.objects.aget(pk=pk)
        except MLModel.DoesNotExist:
            return Response({'error': 'Модель не найдена'}, status=404)
        
        try:
            async with httpx.AsyncClient() as client:
                # Делаем быстрый пинг (без токена, просто чтобы проверить доступность хоста)
                response = await client.get(model.endpoint_url, timeout=5.0)
                # Если достучались (даже если 401 Unauthorized), значит хост жив
                model.status = 'ONLINE'
        except Exception:
            # Ошибка DNS, таймаут или недоступность сети
            model.status = 'OFFLINE'
        
        await model.asave()
        return Response({'status': model.status})