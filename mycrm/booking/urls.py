from django.urls import path
from .views_all import *
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
)

urlpatterns = [
    path('', user_index_view, name='index'),
    path('login/', auth_view, name='login'),
    path('logout/', CustomLogoutView.as_view(next_page='index'), name='logout'),
    path('user/', user_index_view, name='user_index'),
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
    
    # Редактирование брони
    path('booking/get-booking-details/<int:booking_id>/', get_booking_details, name='get_booking_details'),
    path('booking/edit/<int:booking_id>/', edit_booking_view, name='edit_booking'),
    path('booking/cancel/<int:booking_id>/', cancel_booking_view, name='cancel_booking'),
    path('booking/confirm/<int:booking_id>/', confirm_booking_view, name='confirm_booking'),
    path('booking/process-payment/<int:booking_id>/', process_payment_view, name='process_payment'),
    path('booking/get-cancellation-reasons/', get_cancellation_reasons, name='get_cancellation_reasons'),
    path('booking/get-available-specialists/<int:booking_id>/', get_available_specialists, name='get_available_specialists'),
    path('booking/get-clients/', get_clients, name='get_clients'),
    path('booking/update-client/<int:booking_id>/', update_booking_client, name='update_booking_client'),
]
