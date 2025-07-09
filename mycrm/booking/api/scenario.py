from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ScenarioSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Scenario


@extend_schema(tags=['Сценарий'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ScenarioViewSet(BaseViewSet):
    """CRUD для сценариев"""
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer

    @extend_schema(
        summary="Получить список сценариев",
        description="Возвращает список всех существующих сценариев.",
        responses=UniversalSchemas.list_schema(ScenarioSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить новый сценарий",
        description="Создает новый сценарий с предоставленными данными.",
        request=ScenarioSerializer,
        responses=UniversalSchemas.create_schema(ScenarioSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали сценария",
        description="Возвращает детали конкретного сценария по его ID.",
        responses=UniversalSchemas.retrieve_schema(ScenarioSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить сценарий",
        description="Полностью обновляет существующий сценарий по его ID.",
        request=ScenarioSerializer,
        responses=UniversalSchemas.update_schema(ScenarioSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить сценарий",
        description="Частично обновляет существующий сценарий по его ID.",
        request=ScenarioSerializer,
        responses=UniversalSchemas.partial_update_schema(ScenarioSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить сценарий",
        description="Удаление сценария запрещено.",
        responses=UniversalSchemas.destroy_schema(ScenarioSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление сценария запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
