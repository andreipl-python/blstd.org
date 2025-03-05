from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ClientGroupSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import ClientGroup


@extend_schema(tags=['Группа клиента'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ClientGroupViewSet(BaseViewSet):
    """CRUD для групп клиентов"""
    queryset = ClientGroup.objects.all()
    serializer_class = ClientGroupSerializer

    @extend_schema(
        summary="Получить список групп клиентов",
        description="Возвращает список всех существующих групп клиентов.",
        responses=UniversalSchemas.list_schema(ClientGroupSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую группу клиентов",
        description="Создает новую группу клиентов с предоставленными данными.",
        request=ClientGroupSerializer,
        responses=UniversalSchemas.create_schema(ClientGroupSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали группы клиентов",
        description="Возвращает детали конкретной группы клиентов по ее ID.",
        responses=UniversalSchemas.retrieve_schema(ClientGroupSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить группу клиентов",
        description="Полностью обновляет существующую группу клиентов по ее ID.",
        request=ClientGroupSerializer,
        responses=UniversalSchemas.update_schema(ClientGroupSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить группу клиентов",
        description="Частично обновляет существующую группу клиентов по ее ID.",
        request=ClientGroupSerializer,
        responses=UniversalSchemas.partial_update_schema(ClientGroupSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить группу клиентов",
        description="Удаление группы клиентов запрещено.",
        responses=UniversalSchemas.destroy_schema(ClientGroupSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление группы клиентов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
