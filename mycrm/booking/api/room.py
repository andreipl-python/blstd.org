from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import RoomSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Room


@extend_schema(tags=['Помещение'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class RoomViewSet(BaseViewSet):
    """CRUD для помещения"""
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    @extend_schema(
        summary="Получить список помещений",
        description="Возвращает список всех существующих помещений.",
        responses=UniversalSchemas.list_schema(RoomSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новое помещение",
        description="Создает новое помещение с предоставленными данными.",
        request=RoomSerializer,
        responses=UniversalSchemas.create_schema(RoomSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали помещения",
        description="Возвращает детали конкретного помещения по его ID.",
        responses=UniversalSchemas.retrieve_schema(RoomSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить помещение",
        description="Полностью обновляет существующее помещение по его ID.",
        request=RoomSerializer,
        responses=UniversalSchemas.update_schema(RoomSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить помещение",
        description="Частично обновляет существующее помещение по его ID.",
        request=RoomSerializer,
        responses=UniversalSchemas.partial_update_schema(RoomSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить помещение",
        description="Удаление помещения запрещено.",
        responses=UniversalSchemas.destroy_schema(RoomSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление помещения запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
