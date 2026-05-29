import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Tag, MLModel, InferenceLog

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except Exception as e:
            # simplejwt возвращает сообщение на английском — перехватываем и переводим
            if "No active account found" in str(e) or "Unable to log in" in str(e):
                raise serializers.ValidationError({
                    'non_field_errors': ['Неправильный логин или пароль']
                })
            raise

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        max_length=150,
        error_messages={
            'required': 'Логин не может быть пустым',
            'blank': 'Логин не может быть пустым',
            'max_length': 'Логин не должен превышать 150 символов'
        }
    )
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        min_length=6,
        error_messages={
            'required': 'Пароль не может быть пустым',
            'blank': 'Пароль не может быть пустым',
            'min_length': 'Пароль должен быть не менее 6 символов'
        }
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        error_messages={
            'required': 'Подтверждение пароля не может быть пустым',
            'blank': 'Подтверждение пароля не может быть пустым'
        }
    )

    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'password_confirm')

    def validate_username(self, value):
        if not re.match(r'^[\w.@+-]+$', value):
            raise serializers.ValidationError('Логин может содержать только буквы, цифры и символы @, ., +, -, _')
        
        if len(value) < 3:
            raise serializers.ValidationError('Логин должен быть не менее 3 символов')
        if len(value) > 150:
            raise serializers.ValidationError('Логин не должен превышать 150 символов')
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Пользователь с таким логином уже существует')
        return value

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError('Пароль должен быть не менее 6 символов')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают'
            })
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role=User.USER,
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
        ret = super().to_representation(instance)
        ret['tags'] = TagSerializer(instance.tags.all(), many=True).data
        return ret

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.endpoint_url = validated_data.get('endpoint_url', instance.endpoint_url)
        instance.hf_model_id = validated_data.get('hf_model_id', instance.hf_model_id)
        instance.status = validated_data.get('status', instance.status)
        instance.output_type = validated_data.get('output_type', instance.output_type)

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