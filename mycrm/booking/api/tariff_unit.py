from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import TariffUnitSerializer
from .schema_helpers import UniversalChemas
from .settings import BaseViewSet
from ..models import TariffUnit


@extend_schema(tags=['Тарифная единица'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class TariffUnitViewSet(BaseViewSet):
    """CRUD для тарифных единиц"""
    queryset = TariffUnit.objects.all()
    serializer_class = TariffUnitSerializer

    @extend_schema(
        summary="Получить список тарифных единиц",
        description="Возвращает список всех существующих тарифных единиц.",
        responses=UniversalChemas.list_schema(TariffUnitSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить новую тарифную единицу",
        description="Создает новую тарифную единицу с предоставленными данными.",
        request=TariffUnitSerializer,
        responses=UniversalChemas.create_schema(TariffUnitSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали тарифной единицы",
        description="Возвращает детали конкретной тарифной единицы по его ID.",
        responses=UniversalChemas.retrieve_schema(TariffUnitSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить тарифную единицу",
        description="Полностью обновляет существующую тарифную единицу по ее ID.",
        request=TariffUnitSerializer,
        responses=UniversalChemas.update_schema(TariffUnitSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить тарифную единицу",
        description="Частично обновляет существующую тарифную единицу по ее ID.",
        request=TariffUnitSerializer,
        responses=UniversalChemas.partial_update_schema(TariffUnitSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить тарифную единицу",
        description="Удаление тарифных единиц запрещено.",
        responses=UniversalChemas.destroy_schema(TariffUnitSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление тарифных единиц запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
