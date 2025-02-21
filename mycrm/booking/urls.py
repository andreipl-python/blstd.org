from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView
)
from rest_framework.routers import DefaultRouter

from .api import (
    CustomTokenObtainPairView, CustomTokenRefreshView, CustomTokenVerifyView, ReservationViewSet, ClientViewSet,
    ReservationStatusTypeViewSet, ReservationTypeViewSet, SpecialistViewSet, SubscriptionViewSet, TariffUnitViewSet
)
from .views import user_index_view, create_booking_view
from .views.edit_booking import (
    get_booking_details,
    edit_booking_view,
    cancel_booking_view,
    confirm_booking_view,
    process_payment_view,
    get_cancellation_reasons,
    get_available_specialists,
    get_clients,
    update_booking_client,
    get_services,
    update_booking_services,
    delete_booking_service,
)
from .views_all import auth_view, CustomLogoutView

# Создание маршрутизатора API
router = DefaultRouter()
routes = [
    (r'reservations', ReservationViewSet),
    (r'clients', ClientViewSet),
    (r'reservation_status_types', ReservationStatusTypeViewSet),
    (r'reservation_types', ReservationTypeViewSet),
    (r'specialists', SpecialistViewSet),
    (r'subscriptions', SubscriptionViewSet),
    (r'tariff_units', TariffUnitViewSet)
]
for prefix, viewset in routes:
    router.register(prefix, viewset)

urlpatterns = [
    # Основные представления
    path('', user_index_view, name='index'),
    path('login/', auth_view, name='login'),
    path('logout/', CustomLogoutView.as_view(next_page='index'), name='logout'),
    path('user/', user_index_view, name='user_index'),
    # ************************************************* #
    path('users_list/', user_index_view, name='users_list'),
    path('smena/', user_index_view, name='smena'),
    path('smena_new/', user_index_view, name='smena_new'),
    path('admin_index/', user_index_view, name='admin_index'),
    path('user_payment/', user_index_view, name='payment'),
    path('user_paytable/', user_index_view, name='paytable'),
    path('user_stats_school/', user_index_view, name='stats_school'),
    path('user_stats_average/', user_index_view, name='stats_average'),
    path('user_stats_profit/', user_index_view, name='stats_profit'),
    path('user_stats_all/', user_index_view, name='stats_all'),
    path('create_booking/', create_booking_view, name='create_booking'),

    # Управление бронированием
    path('create_booking/', create_booking_view, name='create_booking'),
    path('booking/get-booking-details/<int:booking_id>/', get_booking_details, name='get_booking_details'),
    path('booking/edit/<int:booking_id>/', edit_booking_view, name='edit_booking'),
    path('booking/cancel/<int:booking_id>/', cancel_booking_view, name='cancel_booking'),
    path('booking/confirm/<int:booking_id>/', confirm_booking_view, name='confirm_booking'),
    path('booking/process-payment/<int:booking_id>/', process_payment_view, name='process_payment'),
    path('booking/get-cancellation-reasons/', get_cancellation_reasons, name='get_cancellation_reasons'),
    path('booking/get-available-specialists/<int:booking_id>/', get_available_specialists,
         name='get_available_specialists'),
    path('booking/get-clients/', get_clients, name='get_clients'),
    path('booking/update-client/<int:booking_id>/', update_booking_client, name='update_booking_client'),
    path('booking/get-services/', get_services, name='get_services'),
    path('booking/update-services/<int:booking_id>/', update_booking_services, name='update_booking_services'),
    path('booking/delete-service/<int:booking_id>/', delete_booking_service, name='delete-booking-service'),

    # API-аутентификация
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', CustomTokenVerifyView.as_view(), name='token_verify'),

    # API-маршруты
    path('api/', include(router.urls)),

    # Документация API
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
