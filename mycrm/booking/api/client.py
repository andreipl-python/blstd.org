from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ClientSerializer
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
        responses={
            200: ClientSerializer(many=True),
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
        summary="Добавить нового клиента",
        description="Создает нового клиента с предоставленными данными.",
        request=ClientSerializer,
        responses={
            201: ClientSerializer,
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
        summary="Получить детали клиента",
        description="Возвращает детали конкретного клиента по его ID.",
        responses={
            200: ClientSerializer,
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
                description="Not Found - Клиент не найден",
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
        summary="Полностью обновить клиента",
        description="Полностью обновляет существующего клиента по его ID.",
        request=ClientSerializer,
        responses={
            200: ClientSerializer,
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
                description="Not Found - Клиент не найден",
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
        summary="Частично обновить клиента",
        description="Частично обновляет существующего клиента по его ID.",
        request=ClientSerializer,
        responses={
            200: ClientSerializer,
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
                description="Not Found - Клиент не найден",
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
        summary="Удалить клиента",
        description="Удаление клиентов запрещено.",
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
                description="Not Found - Клиент не найден",
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
            {"detail": "Удаление клиентов запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
