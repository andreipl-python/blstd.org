from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ServiceSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Service


@extend_schema(tags=['Услуга'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ServiceViewSet(BaseViewSet):
    """CRUD для услуг"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    @extend_schema(
        summary="Получить список услуг",
        description="Возвращает список всех существующих услуг.",
        responses=UniversalSchemas.list_schema(ServiceSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую услугу",
        description="Создает новую услугу с предоставленными данными.",
        request=ServiceSerializer,
        responses=UniversalSchemas.create_schema(ServiceSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали услуги",
        description="Возвращает детали конкретной услуги по его ID.",
        responses=UniversalSchemas.retrieve_schema(ServiceSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить услугу",
        description="Полностью обновляет существующую услугу по его ID.",
        request=ServiceSerializer,
        responses=UniversalSchemas.update_schema(ServiceSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить услугу",
        description="Частично обновляет существующую услугу по его ID.",
        request=ServiceSerializer,
        responses=UniversalSchemas.partial_update_schema(ServiceSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить услугу",
        description="Удаление услуг запрещено.",
        responses=UniversalSchemas.destroy_schema(ServiceSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление услуг запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
