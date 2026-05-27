from unittest.mock import patch, AsyncMock, MagicMock
from cryptography.fernet import Fernet
from django.test import TestCase, RequestFactory, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Tag, MLModel, InferenceLog
from core.permissions import IsAdminRole
from core.serializers import RegisterSerializer
from core.admin import CustomUserAdmin

User = get_user_model()
TEST_FERNET_KEY = Fernet.generate_key().decode()

@override_settings(FERNET_KEY=TEST_FERNET_KEY)
class CoreAppTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = RequestFactory()
        
        # Пользователи
        self.user = User.objects.create_user(username="testuser", password="password123", role="USER")
        self.admin = User.objects.create_user(username="adminuser", password="password123", role="ADMIN")
        
        # Объекты для тестов
        self.tag = Tag.objects.create(name="NLP", color="#000000")
        self.ml_model = MLModel.objects.create(
            name="Test Model", 
            endpoint_url="http://example.com", 
            hf_model_id="test/model", 
            status="ONLINE", 
            output_type="TEXT"
        )
        self.ml_model.tags.add(self.tag)

    # ==========================
    # ТЕСТЫ МОДЕЛЕЙ И ШИФРОВАНИЯ
    # ==========================
    def test_user_hf_token_encryption(self):
        self.assertIsNone(self.user.get_hf_token())
        self.user.set_hf_token("secret_token")
        self.user.save()
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.get_hf_token(), "secret_token")
        
        self.user.set_hf_token(None)
        self.assertIsNone(self.user.get_hf_token())

    def test_user_get_token_invalid_key(self):
        self.user.set_hf_token("secret")
        self.user.save()
        # Имитируем сломанный/чужой ключ шифрования
        with override_settings(FERNET_KEY=Fernet.generate_key().decode()):
            self.assertIsNone(self.user.get_hf_token())

    def test_model_str_methods(self):
        self.assertEqual(str(self.tag), "NLP")
        self.assertEqual(str(self.ml_model), "Test Model")

    # ==========================
    # ТЕСТЫ СЕРИАЛИЗАТОРОВ
    # ==========================
    def test_register_serializer_validation(self):
        # Ошибка: короткий логин
        data = {'username': 'ab', 'password': 'password', 'password_confirm': 'password'}
        serializer = RegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('username', serializer.errors)

        # Ошибка: недопустимые символы в логине
        data['username'] = 'invalid space'
        serializer = RegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        # Ошибка: разные пароли
        data['username'] = 'valid.user'
        data['password_confirm'] = 'different'
        serializer = RegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password_confirm', serializer.errors)

    def test_custom_token_serializer_errors(self):
        res = self.client.post(reverse('token_obtain_pair'), {'username': 'wrong', 'password': '123'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['non_field_errors'][0], 'Неправильный логин или пароль')

    # ==========================
    # ТЕСТЫ ПРАВ ДОСТУПА И ПАНЕЛИ АДМИНА
    # ==========================
    def test_is_admin_role_permission(self):
        perm = IsAdminRole()
        request = self.factory.get('/')
        
        request.user = self.user
        self.assertFalse(perm.has_permission(request, None))
        
        request.user = self.admin
        self.assertTrue(perm.has_permission(request, None))

    def test_custom_user_admin_save_model(self):
        site = AdminSite()
        admin_model = CustomUserAdmin(User, site)
        
        request = MagicMock()
        form = MagicMock()
        form.changed_data = ['hf_token']
        form.cleaned_data = {'hf_token': 'admin_set_token'}
        
        admin_model.save_model(request, self.user, form, change=True)
        self.assertEqual(self.user.get_hf_token(), 'admin_set_token')

    # ==========================
    # ТЕСТЫ VIEWS (API)
    # ==========================
    def test_registration_and_login_views(self):
        res = self.client.post(reverse('register'), {
            'username': 'newuser', 'password': 'password123', 'password_confirm': 'password123'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        res_login = self.client.post(reverse('token_obtain_pair'), {
            'username': 'newuser', 'password': 'password123'
        })
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)
        self.assertIn('access', res_login.data)

    def test_user_profile_view(self):
        self.client.force_authenticate(user=self.user)
        # GET
        res = self.client.get(reverse('user_profile'))
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['has_token'])

        # POST (set token)
        res = self.client.post(reverse('user_profile'), {'hf_token': 'my-new-token'})
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.get_hf_token(), 'my-new-token')

    def test_models_and_tags_crud_permissions(self):
        # Пользователь не может создавать теги
        self.client.force_authenticate(user=self.user)
        res = self.client.post(reverse('tag_list'), {'name': 'NewTag', 'color': '#111111'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Админ может
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(reverse('tag_list'), {'name': 'NewTag', 'color': '#111111'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Редактирование модели админом
        res = self.client.patch(reverse('model_detail', kwargs={'pk': self.ml_model.id}), {
            'name': 'Updated Model'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Model')

    def test_log_import_view(self):
        self.client.force_authenticate(user=self.admin)
        csv_data = f"model_id,user_id,latency_ms,http_status,req_payload,res_payload\n{self.ml_model.id},{self.user.id},150,200,'{{}}','{{}}'"
        file = SimpleUploadedFile("logs.csv", csv_data.encode('utf-8'), content_type="text/csv")
        
        res = self.client.post(reverse('log_import'), {'file': file})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InferenceLog.objects.count(), 1)

    def test_logs_list_filters(self):
        InferenceLog.objects.create(
            user=self.user, model=self.ml_model, latency_ms=10, http_status=200, req_payload={}
        )
        self.client.force_authenticate(user=self.admin)
        
        res = self.client.get(reverse('global_log_list') + f'?user={self.user.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    # ==========================
    # ТЕСТЫ АСИНХРОННЫХ VIEWS
    # ==========================
    @patch('core.views.httpx.AsyncClient')
    def test_proxy_inference_text_success(self, MockClient):
        # Настройка mock'а для httpx
        mock_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_instance
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"answer": "Hello"}
        mock_instance.post.return_value = mock_response

        self.user.set_hf_token("dummy_token")
        self.user.save()
        self.client.force_authenticate(user=self.user)

        res = self.client.post(reverse('model_proxy', kwargs={'pk': self.ml_model.id}), {'inputs': 'Hi'})
        
        self.assertEqual(res.status_code, 200)
        self.assertIn("log_id", res.data)
        self.assertEqual(res.data["result"], {"answer": "Hello"})
        self.assertEqual(InferenceLog.objects.count(), 1)

    @patch('core.views.httpx.AsyncClient')
    def test_proxy_inference_image_success(self, MockClient):
        mock_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_instance
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_bytes'
        mock_instance.post.return_value = mock_response

        img_model = MLModel.objects.create(name="Img", endpoint_url="http://img", output_type="IMAGE")
        self.user.set_hf_token("dummy_token")
        self.user.save()
        
        self.client.force_authenticate(user=self.user)
        res = self.client.post(reverse('model_proxy', kwargs={'pk': img_model.id}), {'inputs': 'cat'})
        
        self.assertEqual(res.status_code, 200)
        self.assertIn("image_url", res.data)
        log = InferenceLog.objects.last()
        self.assertIsNotNone(log.image_file)

    @patch('core.views.httpx.AsyncClient')
    def test_model_check_status_view(self, MockClient):
        mock_instance = AsyncMock()
        MockClient.return_value.__aenter__.return_value = mock_instance
        
        mock_response = MagicMock()
        mock_response.status_code = 401 # Даже если 401, это означает, что сервис доступен
        mock_instance.get.return_value = mock_response

        self.client.force_authenticate(user=self.admin)
        self.ml_model.status = "UNKNOWN"
        self.ml_model.save()

        res = self.client.post(reverse('model_check_status', kwargs={'pk': self.ml_model.id}))
        self.assertEqual(res.status_code, 200)
        
        self.ml_model.refresh_from_db()
        self.assertEqual(self.ml_model.status, "ONLINE")