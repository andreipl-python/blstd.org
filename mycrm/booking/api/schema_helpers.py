from drf_spectacular.utils import OpenApiResponse, OpenApiExample
from .api_serializers import ClientSerializer, ReservationSerializer, SpecialistSerializer

class OpenApiResponses:

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

    def bad_request_response(delete_object=False, create_object=False, update_object=False):
        return OpenApiResponse(
            description="Bad Request - Удаление запрещено" if delete_object 
            else "Bad Request - Добавление запрещено" if create_object 
            else "Bad Request - Обновление запрещено" if update_object 
            else "Bad Request - Ошибка в данных запроса",
            examples=[
                OpenApiExample(
                    'Bad Request Example',
                    value={"error": "Invalid data provided"}
                )
            ]
        )

    def not_found_response():
        return OpenApiResponse(
            description="Not Found - Ресурс не найден",
            examples=[
                OpenApiExample(
                    'Not Found Example',
                    value={"detail": "Not found."}
                )
            ]
        )

class UniversalChemas:
    def list_schema(serializer):
        return {
            200: serializer(many=True),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
        }

    def retrieve_schema(serializer):
        return {
            200: serializer(),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
            404: OpenApiResponses.not_found_response()
        }

    def create_schema(serializer, forbidden_create_object=False):
        schema = {
            201: serializer(),
            400: OpenApiResponses.bad_request_response(),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
        }
        if forbidden_create_object:
            schema[400] = OpenApiResponses.bad_request_response(create_object=True)
            del schema[201]
        return schema

    def update_schema(serializer, forbidden_update_object=False):
        schema = {
            200: serializer(),
            400: OpenApiResponses.bad_request_response(),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
        }
        if forbidden_update_object:
            schema[400] = OpenApiResponses.bad_request_response(update_object=True)
            del schema[200]
        return schema

    def partial_update_schema(serializer, forbidden_update_object=False):
        schema = {
            200: serializer(),
            400: OpenApiResponses.bad_request_response(),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
        }
        if forbidden_update_object:
            schema[400] = OpenApiResponses.bad_request_response(update_object=True)
            del schema[200]
        return schema

    def destroy_schema(serializer):
        return {
            400: OpenApiResponses.bad_request_response(delete_object=True),
            401: OpenApiResponses.unauthorized_response(),
            403: OpenApiResponses.forbidden_response(),
        }
