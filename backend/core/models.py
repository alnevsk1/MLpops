import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.files.base import ContentFile
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class User(AbstractUser):
    ADMIN = 'ADMIN'
    USER = 'USER'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (USER, 'User'),
    ]
    role = models.CharField(max_length=5, choices=ROLE_CHOICES, default=USER)
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
        except InvalidToken:
            return None


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7)  # Хранит HEX, например #FF5733

    def __str__(self):
        return self.name


class MLModel(models.Model):
    ONLINE = 'ONLINE'
    OFFLINE = 'OFFLINE'
    UNKNOWN = 'UNKNOWN'
    STATUS_CHOICES = [
        (ONLINE, 'Online'),
        (OFFLINE, 'Offline'),
        (UNKNOWN, 'Unknown'),
    ]

    TEXT = 'TEXT'
    IMAGE = 'IMAGE'
    OUTPUT_CHOICES = [
        (TEXT, 'Text'),
        (IMAGE, 'Image'),
    ]

    name = models.CharField(max_length=255)
    endpoint_url = models.URLField(help_text="Например: https://router.huggingface.co/v1/chat/completions")
    hf_model_id = models.CharField(max_length=255, null=True, blank=True, help_text="Например: HuggingFaceH4/zephyr-7b-beta")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=UNKNOWN)
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

    @classmethod
    def save_log(cls, user, model, latency_ms, http_status, req_payload, res_payload, image_content=None):
        log = cls(
            user=user,
            model=model,
            latency_ms=latency_ms,
            http_status=http_status,
            req_payload=req_payload,
            res_payload=res_payload,
        )
        if image_content and model.output_type == MLModel.IMAGE and http_status == 200:
            filename = f"gen_{uuid.uuid4().hex[:8]}.jpg"
            log.image_file.save(filename, ContentFile(image_content), save=False)
        log.save()
        return log
