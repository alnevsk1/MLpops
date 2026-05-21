from rest_framework import serializers
from .models import User, Tag, MLModel, InferenceLog

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role='USER' # Жестко задаем роль
        )
        return user
    
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'color')

class MLModelSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = MLModel
        fields = ('id', 'name', 'endpoint_url', 'hf_model_id', 'status', 'output_type', 'tags')

class AdminMLModelSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = MLModel
        fields = ('id', 'name', 'endpoint_url', 'hf_model_id', 'status', 'output_type', 'tags')

    def to_representation(self, instance):
        # При чтении возвращаем полные объекты тегов
        ret = super().to_representation(instance)
        ret['tags'] = TagSerializer(instance.tags.all(), many=True).data
        return ret

    def update(self, instance, validated_data):
        # Обновляем основные поля
        instance.name = validated_data.get('name', instance.name)
        instance.endpoint_url = validated_data.get('endpoint_url', instance.endpoint_url)
        instance.hf_model_id = validated_data.get('hf_model_id', instance.hf_model_id)
        instance.status = validated_data.get('status', instance.status)
        instance.output_type = validated_data.get('output_type', instance.output_type)
        
        # Обновляем теги ТОЛЬКО с выделенными тегами
        if 'tags' in validated_data:
            instance.tags.set(validated_data['tags'])
        
        instance.save()
        return instance

class InferenceLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model.name', read_only=True)
    model_id = serializers.IntegerField(source='model.id', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True, allow_null=True)
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    
    class Meta:
        model = InferenceLog
        fields = ('id', 'model_id', 'model_name', 'user_id', 'username', 'latency_ms', 'http_status', 'req_payload', 'res_payload', 'image_file', 'created_at')