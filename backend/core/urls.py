from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (RegisterView, LoginView, LogImportView, 
                    ProxyInferenceView, UserProfileView,
                    MLModelListCreateView, MLModelDetailView, 
                    InferenceLogListView, 
                    AdminGlobalLogListView, TagDetailView,
                    TagListCreateView, MLModelCheckStatusView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/profile/', UserProfileView.as_view(), name='user_profile'),
    
    path('tags/', TagListCreateView.as_view(), name='tag_list'),
    path('tags/<int:pk>/', TagDetailView.as_view(), name='tag_detail'), 
    path('models/', MLModelListCreateView.as_view(), name='model_list'), 
    path('models/<int:pk>/', MLModelDetailView.as_view(), name='model_detail'),
    path('models/<int:pk>/check-status/', MLModelCheckStatusView.as_view(), name='model_check_status'),
    path('models/<int:pk>/proxy/', ProxyInferenceView.as_view(), name='model_proxy'),
    
    path('logs/', InferenceLogListView.as_view(), name='log_list'),
    path('logs/all/', AdminGlobalLogListView.as_view(), name='global_log_list'),
    path('logs/import/', LogImportView.as_view(), name='log_import'),
]