# apps/users/urls.py

from django.urls import path, include
from dj_rest_auth.views import LogoutView
from dj_rest_auth.registration.views import RegisterView
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import CookieTokenRefreshView, login_view, register_view, oauth_callback_view

urlpatterns = [
    # Template-Based Authentication
    path("login/", login_view, name="login"),
    path("register/", register_view, name="register"),

    # OAuth Callback
    path("oauth/callback/", oauth_callback_view, name="oauth_callback"),

    # REST API Authentication
    path("api/login/", TokenObtainPairView.as_view(), name="api_login"),
    path("api/logout/", LogoutView.as_view(), name="api_logout"),
    path("api/register/", RegisterView.as_view(), name="api_register"),
    path("api/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh_cookie"),
]