from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import CancellationPolicySerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import CancellationPolicy


@extend_schema(tags=['Политика отмены'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class CancellationPolicyViewSet(BaseViewSet):
    """CRUD для политики отмены"""
    queryset = CancellationPolicy.objects.all()
    serializer_class = CancellationPolicySerializer

    @extend_schema(
        summary="Получить список политик отмены",
        description="Возвращает список всех существующих политик отмены.",
        responses=UniversalSchemas.list_schema(CancellationPolicySerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую политику отмены",
        description="Создает новую политику отмены с предоставленными данными.",
        request=CancellationPolicySerializer,
        responses=UniversalSchemas.create_schema(CancellationPolicySerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали политики отмены",
        description="Возвращает детали конкретной политики отмены по её ID.",
        responses=UniversalSchemas.retrieve_schema(CancellationPolicySerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить политику отмены",
        description="Полностью обновляет существующую политику отмены по её ID.",
        request=CancellationPolicySerializer,
        responses=UniversalSchemas.update_schema(CancellationPolicySerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить политику отмены",
        description="Частично обновляет существующую политику отмены по её ID.",
        request=CancellationPolicySerializer,
        responses=UniversalSchemas.partial_update_schema(CancellationPolicySerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить политику отмены",
        description="Удаление политики отмены запрещено.",
        responses=UniversalSchemas.destroy_schema(CancellationPolicySerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление политики отмены запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
