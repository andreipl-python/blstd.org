from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ReservationSerializer
from .settings import BaseViewSet
from ..models import Reservation


@extend_schema(tags=['Бронирование'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ReservationViewSet(BaseViewSet):
    """CRUD для бронирований"""
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    @extend_schema(
        summary="Получить список бронирований",
        description="Возвращает список всех существующих бронирований.",
        responses={
            200: ReservationSerializer(many=True),
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
        summary="Создать новое бронирование",
        description="Создает новое бронирование с предоставленными данными.",
        request=ReservationSerializer,
        responses={
            201: ReservationSerializer,
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
        summary="Получить детали бронирования",
        description="Возвращает детали конкретного бронирования по его ID.",
        responses={
            200: ReservationSerializer,
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
                description="Not Found - Бронирование не найдено",
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
        summary="Полностью обновить бронирование",
        description="Полностью обновляет существующее бронирование по его ID.",
        request=ReservationSerializer,
        responses={
            200: ReservationSerializer,
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
                description="Not Found - Бронирование не найдено",
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
        summary="Частично обновить бронирование",
        description="Частично обновляет существующее бронирование по его ID.",
        request=ReservationSerializer,
        responses={
            200: ReservationSerializer,
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
                description="Not Found - Бронирование не найдено",
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
        summary="Удалить бронирование",
        description="Удаление бронирований запрещено.",
        responses={
            400: OpenApiResponse(
                description="Bad Request - Удаление запрещено",
                examples=[
                    OpenApiExample(
                        'Delete Forbidden Example',
                        value={"detail": "Удаление бронирований запрещено"},
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
                description="Not Found - Бронирование не найдено",
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
            {"detail": "Удаление бронирований запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
