import time
import httpx
import csv
import json
from asgiref.sync import sync_to_async
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from adrf.views import APIView as AsyncAPIView
from rest_framework.response import Response
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import MLModel, InferenceLog, User, Tag
from .permissions import IsAdminRole
from .serializers import (
    RegisterSerializer, CustomTokenObtainPairSerializer,
    MLModelSerializer, AdminMLModelSerializer,
    InferenceLogSerializer, TagSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


def _apply_log_filters(qs, query_params):
    user_filter = query_params.get('user')
    if user_filter:
        if user_filter.isdigit():
            qs = qs.filter(user_id=user_filter)
        else:
            qs = qs.filter(user__username__icontains=user_filter)

    model_filter = query_params.get('model')
    if model_filter:
        if model_filter.isdigit():
            qs = qs.filter(model_id=model_filter)
        else:
            qs = qs.filter(model__name__icontains=model_filter)

    http_status = query_params.get('status')
    if http_status:
        qs = qs.filter(http_status=http_status)

    return qs


class ProxyInferenceView(AsyncAPIView):
    permission_classes = [IsAuthenticated]

    async def post(self, request, pk):
        try:
            model = await MLModel.objects.aget(pk=pk)
        except MLModel.DoesNotExist:
            return Response({'error': 'Модель не найдена'}, status=404)

        hf_token = await sync_to_async(request.user.get_hf_token)()
        if not hf_token:
            return Response({'error': 'Отсутствует Hugging Face токен в профиле'}, status=403)

        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "application/json"
        }
        req_payload = request.data.copy() if isinstance(request.data, dict) else request.data

        if isinstance(req_payload, dict) and model.hf_model_id:
            req_payload["model"] = model.hf_model_id
        start_time = time.time()

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
                    if model.output_type == MLModel.TEXT:
                        res_payload = response.json()
                    elif model.output_type == MLModel.IMAGE:
                        image_content = response.content
                else:
                    try:
                        res_payload = response.json()
                    except Exception:
                        res_payload = {"error": response.text}

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                await sync_to_async(InferenceLog.save_log)(
                    request.user, model, latency_ms, 500, req_payload, {"error": str(e)}
                )
                return Response({"error": "Ошибка соединения с Hugging Face API"}, status=500)

        log = await sync_to_async(InferenceLog.save_log)(
            request.user, model, latency_ms, res_status, req_payload, res_payload, image_content
        )

        response_data = {
            "log_id": log.id,
            "latency_ms": log.latency_ms,
            "http_status": log.http_status,
        }

        if model.output_type == MLModel.TEXT:
            response_data["result"] = res_payload
        else:
            if log.image_file:
                response_data["image_url"] = request.build_absolute_uri(log.image_file.url)

        return Response(response_data, status=res_status)


class Echo:
    # csv.writer вызывает write() и возвращает его результат — возвращая value напрямую,
    # каждый writerow() отдаёт строку CSV без промежуточного буфера.
    def write(self, value):
        return value


class LogExportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = _apply_log_filters(
            InferenceLog.objects.all().order_by('-created_at'),
            request.query_params,
        )

        headers = [
            'id', 'created_at', 'user_id', 'username',
            'model_id', 'model_name', 'latency_ms',
            'http_status', 'req_payload', 'res_payload'
        ]

        def csv_iterator():
            echo_buffer = Echo()
            writer = csv.writer(echo_buffer)
            yield writer.writerow(headers)

            for log in qs.iterator(chunk_size=2000):
                yield writer.writerow([
                    log.id,
                    log.created_at.isoformat() if log.created_at else '',
                    log.user.id if log.user else 'N/A',
                    log.user.username if log.user else 'N/A',
                    log.model.id if log.model else 'N/A',
                    log.model.name if log.model else 'N/A',
                    log.latency_ms,
                    log.http_status,
                    json.dumps(log.req_payload, ensure_ascii=False),
                    json.dumps(log.res_payload, ensure_ascii=False) if log.res_payload else ''
                ])

        response = StreamingHttpResponse(csv_iterator(), content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="logs_export.csv"'
        return response


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

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminMLModelSerializer
        return MLModelSerializer


class MLModelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MLModel.objects.all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminMLModelSerializer
        return MLModelSerializer


class InferenceLogListView(generics.ListAPIView):
    serializer_class = InferenceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InferenceLog.objects.filter(user=self.request.user).order_by('-created_at')


class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]


class AdminGlobalLogListView(generics.ListAPIView):
    serializer_class = InferenceLogSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return _apply_log_filters(
            InferenceLog.objects.all().order_by('-created_at'),
            self.request.query_params,
        )


class MLModelCheckStatusView(AsyncAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    async def post(self, request, pk):
        try:
            model = await MLModel.objects.aget(pk=pk)
        except MLModel.DoesNotExist:
            return Response({'error': 'Модель не найдена'}, status=404)

        try:
            async with httpx.AsyncClient() as client:
                await client.get(model.endpoint_url, timeout=5.0)
                model.status = MLModel.ONLINE
        except Exception:
            model.status = MLModel.OFFLINE

        await model.asave()
        return Response({'status': model.status})
