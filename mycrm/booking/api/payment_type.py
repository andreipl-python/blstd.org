from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import PaymentTypeSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import PaymentType


@extend_schema(tags=['Тип оплаты'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class PaymentTypeViewSet(BaseViewSet):
    """CRUD для типов оплаты"""
    queryset = PaymentType.objects.all()
    serializer_class = PaymentTypeSerializer

    @extend_schema(
        summary="Получить список типов оплаты",
        description="Возвращает список всех существующих типов оплаты.",
        responses=UniversalSchemas.list_schema(PaymentTypeSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новый тип оплаты",
        description="Создает новый тип оплаты с предоставленными данными.",
        request=PaymentTypeSerializer,
        responses=UniversalSchemas.create_schema(PaymentTypeSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали типа оплаты",
        description="Возвращает детали конкретного типа оплаты по её ID.",
        responses=UniversalSchemas.retrieve_schema(PaymentTypeSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить тип оплаты",
        description="Полностью обновляет существующий тип оплаты по её ID.",
        request=PaymentTypeSerializer,
        responses=UniversalSchemas.update_schema(PaymentTypeSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить тип оплаты",
        description="Частично обновляет существующий тип оплаты по её ID.",
        request=PaymentTypeSerializer,
        responses=UniversalSchemas.partial_update_schema(PaymentTypeSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить тип оплаты",
        description="Удаление типа оплаты запрещено.",
        responses=UniversalSchemas.destroy_schema(PaymentTypeSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление типа оплаты запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
