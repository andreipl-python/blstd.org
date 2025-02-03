import logging
from datetime import datetime, timezone

from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
    TokenVerifySerializer,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView


@extend_schema(
    tags=['Аутентификация'],
    summary="Получение JWT токена",
    description="Эндпоинт для получения JWT токена при предоставлении корректных учетных данных.",
    request=TokenObtainPairSerializer,
    responses={
        200: OpenApiResponse(
            response=TokenObtainPairSerializer,
            description="Успешная аутентификация",
            examples=[
                OpenApiExample(
                    'Успешный ответ',
                    value={
                        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                    }
                )
            ]
        ),
        401: OpenApiResponse(
            description="Неверные учетные данные",
            examples=[
                OpenApiExample(
                    'Ошибка аутентификации',
                    value={"detail": "No active account found with the given credentials"}
                )
            ]
        )
    },
    examples=[
        OpenApiExample(
            'Пример запроса',
            value={
                "username": "admin",
                "password": "admin_password"
            },
            request_only=True
        )
    ]
)
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомное представление для получения JWT токена.
    """
    pass


@extend_schema(
    tags=['Аутентификация'],
    summary="Обновление JWT токена",
    description="Эндпоинт для обновления JWT токена с использованием refresh токена.",
    request=TokenRefreshSerializer,
    responses={
        200: OpenApiResponse(
            response=TokenRefreshSerializer,
            description="Успешное обновление токена",
            examples=[
                OpenApiExample(
                    'Успешный ответ',
                    value={
                        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                    }
                )
            ]
        ),
        401: OpenApiResponse(
            description="Неверный или отсутствующий refresh токен",
            examples=[
                OpenApiExample(
                    'Ошибка обновления',
                    value={"detail": "Token is invalid or expired"}
                )
            ]
        )
    },
    examples=[
        OpenApiExample(
            'Пример запроса',
            value={
                "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
            },
            request_only=True
        )
    ]
)
class CustomTokenRefreshView(TokenRefreshView):
    """
    Кастомное представление для обновления JWT токена.
    """
    pass


class TokenVerifyResponseSerializer(serializers.Serializer):
    token_valid = serializers.BooleanField()
    expires_in = serializers.IntegerField(help_text="Время в днях/часах/минутах/секундах")


@extend_schema(
    tags=['Аутентификация'],
    summary="Проверка JWT токена",
    description="Эндпоинт для проверки валидности предоставленного JWT токена и оставшегося времени жизни.",
    request=TokenVerifySerializer,
    responses={
        200: OpenApiResponse(
            response=TokenVerifyResponseSerializer,
            description="Токен действителен, возвращает оставшееся время до истечения токена",
            examples=[
                OpenApiExample(
                    'Успешный ответ',
                    value={
                        "token_valid": True,
                        "expires_in": "0 d, 21 h, 47 m, 32 s"
                    }
                )
            ],
        ),
        401: OpenApiResponse(
            description="Неверный или отсутствующий токен",
            examples=[
                OpenApiExample(
                    'Ошибка проверки',
                    value={"detail": "Token is invalid or expired"}
                )
            ]
        )
    },
    examples=[
        OpenApiExample(
            'Пример запроса',
            value={"token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."},
            request_only=True
        ),
    ]
)
class CustomTokenVerifyView(TokenVerifyView):
    """
    Кастомное представление для проверки JWT токена.
    """

    def post(self, request, *args, **kwargs):
        print(request.body)
        print(request.META.get('CONTENT_TYPE'))
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = request.data.get("token")

        from jwt import decode, ExpiredSignatureError
        from rest_framework_simplejwt.settings import api_settings

        try:
            payload = decode(token, api_settings.SIGNING_KEY, algorithms=[api_settings.ALGORITHM])
            exp_timestamp = payload.get("exp")
            if exp_timestamp:
                exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
                remaining_seconds = int((exp_datetime - datetime.now(timezone.utc)).total_seconds())

                if remaining_seconds > 0:
                    days, remainder = divmod(remaining_seconds, 86400)
                    hours, remainder = divmod(remainder, 3600)
                    minutes, seconds = divmod(remainder, 60)
                    remaining_time = f"{days} d, {hours} h, {minutes} m, {seconds} s"
                else:
                    return Response({"detail": "Token is invalid or expired"}, status=401)
            else:
                remaining_time = "Неизвестно"
        except ExpiredSignatureError:
            return Response({"detail": "Token is invalid or expired"}, status=401)

        return Response({"token_valid": True, "expires_in": remaining_time})
