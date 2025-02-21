from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ClientSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Client


@extend_schema(tags=['Клиент'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ClientViewSet(BaseViewSet):
    """CRUD для клиентов"""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

    @extend_schema(
        summary="Получить список клиентов",
        description="Возвращает список всех существующих клиентов.",
        responses=UniversalSchemas.list_schema(ClientSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить нового клиента",
        description="Создает нового клиента с предоставленными данными.",
        request=ClientSerializer,
        responses=UniversalSchemas.create_schema(ClientSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали клиента",
        description="Возвращает детали конкретного клиента по его ID.",
        responses=UniversalSchemas.retrieve_schema(ClientSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить клиента",
        description="Полностью обновляет существующего клиента по его ID.",
        request=ClientSerializer,
        responses=UniversalSchemas.update_schema(ClientSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить клиента",
        description="Частично обновляет существующего клиента по его ID.",
        request=ClientSerializer,
        responses=UniversalSchemas.partial_update_schema(ClientSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить клиента",
        description="Удаление клиентов запрещено.",
        responses=UniversalSchemas.destroy_schema(ClientSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление клиентов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
