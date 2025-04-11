# apps/main/urls

from django.urls import path
from apps.main import views

urlpatterns = [
    path('', views.welcome_view, name='welcome'),
    path('app/', views.spa_view, name='app_home'),
]