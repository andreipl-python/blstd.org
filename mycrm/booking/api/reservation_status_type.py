from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ReservationStatusTypeSerializer
from .settings import BaseViewSet
from ..models import ReservationStatusType


@extend_schema(tags=['Статус бронирования'])
@extend_schema_view(
    destroy=extend_schema(exclude=True),
    update=extend_schema(exclude=True),
    partial_update=extend_schema(exclude=True),
    create=extend_schema(exclude=True)
)
class ReservationStatusTypeViewSet(BaseViewSet):
    """CRUD для клиентов"""
    queryset = ReservationStatusType.objects.all()
    serializer_class = ReservationStatusTypeSerializer

    @extend_schema(
        summary="Получить список статусов бронирования",
        description="Возвращает список всех существующих статусов бронирования.",
        responses={
            200: ReservationStatusTypeSerializer(many=True),
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
        summary="Добавление нового статуса бронирования запрещено",
        description="Добавление нового статуса бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses={
            400: OpenApiResponse(
                description="Bad Request - Добавление запрещено",
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
        raise ValidationError(
            {"detail": "Добавление новых статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Получить детали статуса бронирования",
        description="Возвращает детали конкретного статуса бронирования по его ID.",
        responses={
            200: ReservationStatusTypeSerializer,
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
                description="Not Found - Статус бронирования не найден",
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
        summary="Обновление статуса бронирования запрещено",
        description="Обновление статуса бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses={
            400: OpenApiResponse(
                description="Bad Request - Обновление запрещено",
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
                description="Not Found - Cтатус бронирования не найден",
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
        raise ValidationError(
            {"detail": "Обновление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Частичное обновление статусов бронирования запрещено",
        description="Частичное обновление статусов бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses={
            400: OpenApiResponse(
                description="Bad Request - Частичное обновление запрещено",
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
                description="Not Found - Статус бронирования не найден",
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
        raise ValidationError(
            {"detail": "Частичное обновление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Удаление статусов бронирования запрещено.",
        description="Удаление статусов бронирования запрещено.",
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
                description="Not Found - Статус бронирования не найден",
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
            {"detail": "Удаление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
