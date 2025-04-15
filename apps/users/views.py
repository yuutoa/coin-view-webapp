from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import render, redirect
from apps.users.forms import CustomUserCreationForm, CustomAuthenticationForm
from django.contrib.auth import login, get_backends
from django.conf import settings
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(
            settings.DJ_REST_AUTH.get('JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
        )
        if not refresh_token:
            logger.warning("Refresh token not found in cookies.")
            return Response({'error': 'Refresh token not found in cookies'}, status=400)

        serializer = self.get_serializer(data={'refresh': refresh_token})

        try:
            serializer.is_valid(raise_exception=True)
            logger.info("Refresh token is valid. Issuing new access token.")
        except Exception as e:
            logger.error(f"Refresh token validation failed: {e}", exc_info=True)
            return Response(serializer.errors, status=401)

        response = Response(serializer.validated_data, status=200)
        access_token = serializer.validated_data['access']
        access_cookie_name = settings.DJ_REST_AUTH.get('JWT_AUTH_COOKIE', 'access_token')

        response.set_cookie(
            key=access_cookie_name,
            value=access_token,
            httponly=settings.DJ_REST_AUTH.get('JWT_AUTH_HTTPONLY', True),
            secure=settings.DJ_REST_AUTH.get('JWT_AUTH_SECURE', not settings.DEBUG),
            samesite=settings.DJ_REST_AUTH.get('JWT_AUTH_SAMESITE', 'Lax'),
            path='/'
        )
        logger.info("New access token set via cookie.")
        return response


def _set_jwt_cookies_and_redirect(request, user):
    logger.info(f"Issuing JWT tokens for user: {user.username} (ID: {user.id})")
    try:
        access_cookie = settings.DJ_REST_AUTH.get('JWT_AUTH_COOKIE', 'access_token')
        refresh_cookie = settings.DJ_REST_AUTH.get('JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
        http_only = settings.DJ_REST_AUTH.get('JWT_AUTH_HTTPONLY', True)
        secure = settings.DJ_REST_AUTH.get('JWT_AUTH_SECURE', not settings.DEBUG)
        samesite = settings.DJ_REST_AUTH.get('JWT_AUTH_SAMESITE', 'Lax')

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = redirect(settings.LOGIN_REDIRECT_URL)

        response.set_cookie(
            key=access_cookie,
            value=access_token,
            httponly=http_only,
            secure=secure,
            samesite=samesite,
            path='/'
        )

        response.set_cookie(
            key=refresh_cookie,
            value=refresh_token,
            httponly=http_only,
            secure=secure,
            samesite=samesite,
            path='/'
        )

        logger.info("JWT cookies set successfully.")
        return response

    except Exception as e:
        logger.error(f"Failed to set JWT cookies: {e}", exc_info=True)
        return redirect(reverse('login') + '?error=token_generation_failed')


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            logger.info(f"User logged in: {user.username}")
            return _set_jwt_cookies_and_redirect(request, user)
        else:
            logger.warning(f"Invalid login attempt: {form.errors.as_json()}")
    else:
        form = CustomAuthenticationForm()
    return render(request, 'users/login.html', {'form': form})


def register_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            logger.info(f"New user registered: {user.username}")
            return _set_jwt_cookies_and_redirect(request, user)
        else:
            logger.warning(f"Registration failed: {form.errors.as_json()}")
            return render(request, 'users/register.html', {'form': form}, status=400)
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/register.html', {'form': form})


def oauth_callback_view(request):
    logger.info(f"OAuth callback triggered. Path: {request.path}")
    if request.user.is_authenticated:
        logger.info(f"OAuth user authenticated: {request.user.username}")
        return _set_jwt_cookies_and_redirect(request, request.user)
    else:
        logger.warning("OAuth callback called without authenticated user.")
        return redirect(reverse('login') + '?error=oauth_callback_auth_failed')