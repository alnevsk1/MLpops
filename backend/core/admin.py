from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, MLModel, Tag, InferenceLog

# Настраиваем отображение нашего кастомного пользователя
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('ML Hub Settings', {'fields': ('role', 'hf_token')}),
    )
    list_display = ('username', 'email', 'role', 'is_staff')

    def save_model(self, request, obj, form, change):
        # Если поле hf_token было изменено в админке
        if 'hf_token' in form.changed_data:
            raw_token = form.cleaned_data.get('hf_token')
            # Используем наш метод из Фазы 1 для шифрования
            obj.set_hf_token(raw_token)
            
        super().save_model(request, obj, form, change)

class MLModelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'output_type', 'hf_model_id')
    list_filter = ('status', 'output_type')

class InferenceLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'model', 'http_status', 'latency_ms', 'created_at')
    list_filter = ('http_status', 'model')

# Регистрируем модели
admin.site.register(User, CustomUserAdmin)
admin.site.register(MLModel, MLModelAdmin)
admin.site.register(Tag)
admin.site.register(InferenceLog, InferenceLogAdmin)