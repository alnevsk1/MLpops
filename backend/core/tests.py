import io
from unittest.mock import patch, AsyncMock, MagicMock  
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import User, MLModel, Tag, InferenceLog

class MLHubTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Создаем пользователей
        self.user = User.objects.create_user(username='testuser', password='password')
        self.user.set_hf_token('fake-hf-token-123')
        self.user.save()
        
        self.admin = User.objects.create_superuser(username='admin', password='password')
        self.admin.role = 'ADMIN'
        self.admin.save()
        
        # Создаем модель для тестов
        self.model_text = MLModel.objects.create(
            name='Test LLM',
            endpoint_url='https://router.huggingface.co/v1/chat/completions',
            status='ONLINE',
            output_type='TEXT'
        )

    def test_registration(self):
        url = reverse('register')
        data = {'username': 'newuser', 'password': 'newpassword123'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Проверяем, что роль принудительно стала USER
        new_user = User.objects.get(username='newuser')
        self.assertEqual(new_user.role, 'USER')

    def test_hf_token_encryption(self):
        # Токен в БД не должен быть равен сырому тексту
        self.assertNotEqual(self.user.hf_token, 'fake-hf-token-123')
        # Но метод дешифровки должен отдавать сырой текст
        self.assertEqual(self.user.get_hf_token(), 'fake-hf-token-123')

    @patch('httpx.AsyncClient.post', new_callable=AsyncMock)
    def test_proxy_inference_text(self, mock_post):
        # ИСПОЛЬЗУЕМ MagicMock для ответа, чтобы .json() возвращал словарь, а не корутину
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Возвращаем стандартный ответ для обычного Inference API
        mock_response.json.return_value = [{"generated_text": "Test OK"}]
        mock_post.return_value = mock_response

        # Авторизуемся
        self.client.force_authenticate(user=self.user)
        url = reverse('model_proxy', kwargs={'pk': self.model_text.id})
        
        # Отправляем стандартный payload (без поля model)
        response = self.client.post(url, {"inputs": "Hi"}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['result'][0]['generated_text'], "Test OK")
        
        # Проверяем, что лог создался
        self.assertEqual(InferenceLog.objects.count(), 1)
        log = InferenceLog.objects.first()
        self.assertEqual(log.http_status, 200)

    def test_admin_only_csv_import(self):
        url = reverse('log_import')
        # Обычный пользователь не должен иметь доступа
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)