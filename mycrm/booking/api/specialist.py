from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import SpecialistSerializer
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
        responses={
            200: SpecialistSerializer(many=True),
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Given token not valid for any token type"}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            )
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить нового специалиста",
        description="Создает нового специалиста с предоставленными данными.",
        request=SpecialistSerializer,
        responses={
            201: SpecialistSerializer,
            400: OpenApiResponse(
                description="Bad Request - Ошибка в данных запроса",
                examples=[
                    OpenApiExample(
                        'Bad Request Example',
                        value={"error": "Invalid data provided"}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Authentication credentials were not provided."}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            )
        },
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали специалиста",
        description="Возвращает детали конкретного специалиста по его ID.",
        responses={
            200: SpecialistSerializer,
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Given token not valid for any token type"}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - Специалист не найден",
                examples=[
                    OpenApiExample(
                        'Not Found Example',
                        value={"detail": "Not found."}
                    )
                ]
            )
        },
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить специалиста",
        description="Полностью обновляет существующего специалиста по его ID.",
        request=SpecialistSerializer,
        responses={
            200: SpecialistSerializer,
            400: OpenApiResponse(
                description="Bad Request - Ошибка в данных запроса",
                examples=[
                    OpenApiExample(
                        'Bad Request Example',
                        value={"error": "Invalid data provided"}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Given token not valid for any token type"}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - Специалист не найден",
                examples=[
                    OpenApiExample(
                        'Not Found Example',
                        value={"detail": "Not found."}
                    )
                ]
            )
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить специалиста",
        description="Частично обновляет существующего специалиста по его ID.",
        request=SpecialistSerializer,
        responses={
            200: SpecialistSerializer,
            400: OpenApiResponse(
                description="Bad Request - Ошибка в данных запроса",
                examples=[
                    OpenApiExample(
                        'Bad Request Example',
                        value={"error": "Invalid data provided"}
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Given token not valid for any token type"}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - Специалист не найден",
                examples=[
                    OpenApiExample(
                        'Not Found Example',
                        value={"detail": "Not found."}
                    )
                ]
            )
        },
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить специалиста",
        description="Удаление специалистов запрещено.",
        responses={
            400: OpenApiResponse(
                description="Bad Request - Удаление запрещено",
                examples=[
                    OpenApiExample(
                        'Delete Forbidden Example',
                        value={"detail": "Удаление клиентов запрещено"},
                    )
                ]
            ),
            401: OpenApiResponse(
                description="Unauthorized - Неверный или отсутствующий токен",
                examples=[
                    OpenApiExample(
                        'Unauthorized Example',
                        value={"detail": "Given token not valid for any token type"}
                    )
                ]
            ),
            403: OpenApiResponse(
                description="Forbidden - Доступ запрещен",
                examples=[
                    OpenApiExample(
                        'Forbidden Example',
                        value={"detail": "You do not have permission to perform this action"}
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Not Found - Специалист не найден",
                examples=[
                    OpenApiExample(
                        'Not Found Example',
                        value={"detail": "Not found."}
                    )
                ]
            )
        },
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление специалистов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
