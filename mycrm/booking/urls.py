from django.urls import path
from .views_all import *

from .views import user_index_view, create_booking_view

urlpatterns = [
    path('', user_index_view, name='index'),
    path('login/', auth_view, name='login'),
    path('logout/', CustomLogoutView.as_view(next_page='index'), name='logout'),
    path('user/', user_index_view, name='user_index'),
    path('users_list/', users_list_view, name='users_list'),
    path('smena/', smena_view, name='smena'),
    path('smena_new/', smena_new_view, name='smena_new'),
    path('admin_index/', admin_index_view, name='admin_index'),
    path('user_payment/', user_payment_view, name='payment'),
    path('user_paytable/', user_payment_view, name='paytable'),
    path('user_stats_school/', user_stats_school_view, name='stats_school'),
    path('user_stats_average/', user_stats_average_view, name='stats_average'),
    path('user_stats_profit/', user_stats_profit_view, name='stats_profit'),
    path('user_stats_all/', user_stats_all_view, name='stats_all'),
    path('create_booking/', create_booking_view, name='create_booking'),
]
