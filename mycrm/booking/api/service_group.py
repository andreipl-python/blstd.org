from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ServiceGroupSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import ServiceGroup


@extend_schema(tags=['Группа услуг'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ServiceGroupViewSet(BaseViewSet):
    """CRUD для групп услуг"""
    queryset = ServiceGroup.objects.all()
    serializer_class = ServiceGroupSerializer

    @extend_schema(
        summary="Получить список групп услуг",
        description="Возвращает список всех существующих групп услуг.",
        responses=UniversalSchemas.list_schema(ServiceGroupSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую группу услуг",
        description="Создает новую группу услуг с предоставленными данными.",
        request=ServiceGroupSerializer,
        responses=UniversalSchemas.create_schema(ServiceGroupSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали группы услуг",
        description="Возвращает детали конкретной группы услуг по его ID.",
        responses=UniversalSchemas.retrieve_schema(ServiceGroupSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить группу услуг",
        description="Полностью обновляет существующую группу услуг по его ID.",
        request=ServiceGroupSerializer,
        responses=UniversalSchemas.update_schema(ServiceGroupSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить группу услуг",
        description="Частично обновляет существующую группу услуг по его ID.",
        request=ServiceGroupSerializer,
        responses=UniversalSchemas.partial_update_schema(ServiceGroupSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить группу услуг",
        description="Удаление групп услуг запрещено.",
        responses=UniversalSchemas.destroy_schema(ServiceGroupSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление групп услуг запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
