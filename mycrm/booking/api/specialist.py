from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import SpecialistSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Specialist


@extend_schema(tags=['Специалист'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class SpecialistViewSet(BaseViewSet):
    """CRUD для специалистов"""
    queryset = Specialist.objects.all()
    serializer_class = SpecialistSerializer

    @extend_schema(
        summary="Получить список специалистов",
        description="Возвращает список всех существующих специалистов.",
        responses=UniversalSchemas.list_schema(SpecialistSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить нового специалиста",
        description="Создает нового специалиста с предоставленными данными.",
        request=SpecialistSerializer,
        responses=UniversalSchemas.create_schema(SpecialistSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали специалиста",
        description="Возвращает детали конкретного специалиста по его ID.",
        responses=UniversalSchemas.retrieve_schema(SpecialistSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить специалиста",
        description="Полностью обновляет существующего специалиста по его ID.",
        request=SpecialistSerializer,
        responses=UniversalSchemas.update_schema(SpecialistSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить специалиста",
        description="Частично обновляет существующего специалиста по его ID.",
        request=SpecialistSerializer,
        responses=UniversalSchemas.partial_update_schema(SpecialistSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить специалиста",
        description="Удаление специалистов запрещено.",
        responses=UniversalSchemas.destroy_schema(SpecialistSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление специалистов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
