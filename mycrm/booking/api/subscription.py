from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import SubscriptionSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Subscription


@extend_schema(tags=['Абонемент'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class SubscriptionViewSet(BaseViewSet):
    """CRUD для абонементов"""
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer

    @extend_schema(
        summary="Получить список абонементов",
        description="Возвращает список всех существующих абонементов.",
        responses=UniversalSchemas.list_schema(SubscriptionSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить новый абонемент",
        description="Создает новый абонемент с предоставленными данными.",
        request=SubscriptionSerializer,
        responses=UniversalSchemas.create_schema(SubscriptionSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали абонемента",
        description="Возвращает детали конкретного абонемента по его ID.",
        responses=UniversalSchemas.retrieve_schema(SubscriptionSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить абонемент",
        description="Полностью обновляет существующий абонемент по его ID.",
        request=SubscriptionSerializer,
        responses=UniversalSchemas.update_schema(SubscriptionSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить абонемент",
        description="Частично обновляет существующий абонемент по его ID.",
        request=SubscriptionSerializer,
        responses=UniversalSchemas.partial_update_schema(SubscriptionSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить абонемент",
        description="Удаление абонементов запрещено.",
        responses=UniversalSchemas.destroy_schema(SubscriptionSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление абонементов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
