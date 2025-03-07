from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import SpecialistColorSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import SpecialistColor


@extend_schema(tags=['Цвет специалиста'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class SpecialistColorViewSet(BaseViewSet):
    """CRUD для цветовой схемы специалиста"""
    queryset = SpecialistColor.objects.all()
    serializer_class = SpecialistColorSerializer

    @extend_schema(
        summary="Получить список цветовых схем",
        description="Возвращает список всех существующих цветовых схем.",
        responses=UniversalSchemas.list_schema(SpecialistColorSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую цветовую схему",
        description="Создает новую цветовую схему с предоставленными данными.",
        request=SpecialistColorSerializer,
        responses=UniversalSchemas.create_schema(SpecialistColorSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали цветовой схемы",
        description="Возвращает детали конкретной цветовой схемы по её ID.",
        responses=UniversalSchemas.retrieve_schema(SpecialistColorSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить цветовую схему",
        description="Полностью обновляет существующую цветовую схему по её ID.",
        request=SpecialistColorSerializer,
        responses=UniversalSchemas.update_schema(SpecialistColorSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить цветовую схему",
        description="Частично обновляет существующую цветовую схему по её ID.",
        request=SpecialistColorSerializer,
        responses=UniversalSchemas.partial_update_schema(SpecialistColorSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить цветовую схему",
        description="Удаление цветовой схемы запрещено.",
        responses=UniversalSchemas.destroy_schema(SpecialistColorSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление цветовой схемы запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
