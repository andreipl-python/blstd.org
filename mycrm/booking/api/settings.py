from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication


class BaseViewSet(viewsets.ModelViewSet):
    """Базовый ViewSet с настройками аутентификации и разрешений"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
