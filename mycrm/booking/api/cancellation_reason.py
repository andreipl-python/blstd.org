from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import CancellationReasonSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import CancellationReason


@extend_schema(tags=['Причина отмены'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class CancellationReasonViewSet(BaseViewSet):
    """CRUD для причин отмены"""
    queryset = CancellationReason.objects.all()
    serializer_class = CancellationReasonSerializer

    @extend_schema(
        summary="Получить список причин отмены",
        description="Возвращает список всех существующих причин отмены.",
        responses=UniversalSchemas.list_schema(CancellationReasonSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую причину отмены",
        description="Создает новую причину отмены с предоставленными данными.",
        request=CancellationReasonSerializer,
        responses=UniversalSchemas.create_schema(CancellationReasonSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали причины отмены",
        description="Возвращает детали конкретной причины отмены по её ID.",
        responses=UniversalSchemas.retrieve_schema(CancellationReasonSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить причину отмены",
        description="Полностью обновляет существующую причину отмены по её ID.",
        request=CancellationReasonSerializer,
        responses=UniversalSchemas.update_schema(CancellationReasonSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить причину отмены",
        description="Частично обновляет существующую причину отмены по её ID.",
        request=CancellationReasonSerializer,
        responses=UniversalSchemas.partial_update_schema(CancellationReasonSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить причину отмены",
        description="Удаление причины отмены запрещено.",
        responses=UniversalSchemas.destroy_schema(CancellationReasonSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление причины отмены запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
