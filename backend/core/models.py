from django.db import models
from django.contrib.auth.models import AbstractUser
from cryptography.fernet import Fernet
from django.conf import settings

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('USER', 'User'),
    ]
    role = models.CharField(max_length=5, choices=ROLE_CHOICES, default='USER')
    hf_token = models.CharField(max_length=255, null=True, blank=True)

    def set_hf_token(self, raw_token: str):
        if raw_token:
            f = Fernet(settings.FERNET_KEY)
            self.hf_token = f.encrypt(raw_token.encode()).decode()
        else:
            self.hf_token = None

    def get_hf_token(self) -> str | None:
        if not self.hf_token:
            return None
        try:
            f = Fernet(settings.FERNET_KEY)
            return f.decrypt(self.hf_token.encode()).decode()
        except Exception:
            return None

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7) # Хранит HEX, например #FF5733

    def __str__(self):
        return self.name

class MLModel(models.Model):
    STATUS_CHOICES = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('UNKNOWN', 'Unknown'),
    ]
    OUTPUT_CHOICES = [
        ('TEXT', 'Text'),
        ('IMAGE', 'Image'),
    ]
    name = models.CharField(max_length=255)
    # Базовый путь до роутера или конкретного эндпоинта
    endpoint_url = models.URLField(help_text="Например: https://router.huggingface.co/v1/chat/completions")
    # Идентификатор модели для инъекции в payload (может быть пустым для Image-моделей)
    hf_model_id = models.CharField(max_length=255, null=True, blank=True, help_text="Например: HuggingFaceH4/zephyr-7b-beta")
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='UNKNOWN')
    output_type = models.CharField(max_length=10, choices=OUTPUT_CHOICES)
    tags = models.ManyToManyField(Tag, related_name='models')

    def __str__(self):
        return self.name

class InferenceLog(models.Model):
    model = models.ForeignKey(MLModel, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='logs')
    latency_ms = models.IntegerField(null=True, blank=True)
    http_status = models.IntegerField(null=True, blank=True)
    req_payload = models.JSONField()
    res_payload = models.JSONField(null=True, blank=True)
    image_file = models.ImageField(upload_to='generated_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)