from drf_spectacular.utils import OpenApiResponse, OpenApiExample
from .api_serializers import ClientSerializer, ReservationSerializer, SpecialistSerializer

def unauthorized_response():
    return OpenApiResponse(
        description="Unauthorized - Неверный или отсутствующий токен",
        examples=[
            OpenApiExample(
                'Unauthorized Example',
                value={"detail": "Given token not valid for any token type"}
            )
        ]
    )

def forbidden_response():
    return OpenApiResponse(
        description="Forbidden - Доступ запрещен",
        examples=[
            OpenApiExample(
                'Forbidden Example',
                value={"detail": "You do not have permission to perform this action"}
            )
        ]
    )

def client_list_schema():
    return {
        200: ClientSerializer(many=True),
        401: unauthorized_response(),
        403: forbidden_response(),
    }

def reservation_list_schema():
    return {
        200: ReservationSerializer(many=True),
        401: unauthorized_response(),
        403: forbidden_response(),
    }

def specialist_list_schema():
    return {
        200: SpecialistSerializer(many=True),
        401: unauthorized_response(),
        403: forbidden_response(),
    }
