from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ClientRatingSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import ClientRating


@extend_schema(tags=['Рейтинг клиента'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ClientRatingViewSet(BaseViewSet):
    """CRUD для рейтинга клиента"""
    queryset = ClientRating.objects.all()
    serializer_class = ClientRatingSerializer

    @extend_schema(
        summary="Получить список рейтингов клиентов",
        description="Возвращает список всех существующих рейтингов клиентов.",
        responses=UniversalSchemas.list_schema(ClientRatingSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новый рейтинг клиента",
        description="Создает новый рейтинг клиента с предоставленными данными.",
        request=ClientRatingSerializer,
        responses=UniversalSchemas.create_schema(ClientRatingSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали рейтинга клиента",
        description="Возвращает детали конкретного рейтинга клиента по его ID.",
        responses=UniversalSchemas.retrieve_schema(ClientRatingSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить рейтинг клиента",
        description="Полностью обновляет существующий рейтинг клиента по его ID.",
        request=ClientRatingSerializer,
        responses=UniversalSchemas.update_schema(ClientRatingSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить рейтинг клиента",
        description="Частично обновляет существующий рейтинг клиента по его ID.",
        request=ClientRatingSerializer,
        responses=UniversalSchemas.partial_update_schema(ClientRatingSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить рейтинг клиента",
        description="Удаление рейтинга клиента запрещено.",
        responses=UniversalSchemas.destroy_schema(ClientRatingSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление рейтинга клиента запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
