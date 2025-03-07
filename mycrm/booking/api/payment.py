from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import PaymentSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Payment


@extend_schema(tags=['Оплата'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class PaymentViewSet(BaseViewSet):
    """CRUD для оплат"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @extend_schema(
        summary="Получить список оплат",
        description="Возвращает список всех существующих оплат.",
        responses=UniversalSchemas.list_schema(PaymentSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую оплату",
        description="Создает новую оплату с предоставленными данными.",
        request=PaymentSerializer,
        responses=UniversalSchemas.create_schema(PaymentSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали оплаты",
        description="Возвращает детали конкретной оплаты по её ID.",
        responses=UniversalSchemas.retrieve_schema(PaymentSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить оплату",
        description="Полностью обновляет существующую оплату по её ID.",
        request=PaymentSerializer,
        responses=UniversalSchemas.update_schema(PaymentSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить оплату",
        description="Частично обновляет существующую оплату по её ID.",
        request=PaymentSerializer,
        responses=UniversalSchemas.partial_update_schema(PaymentSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить оплату",
        description="Удаление оплаты запрещено.",
        responses=UniversalSchemas.destroy_schema(PaymentSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление оплаты запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
