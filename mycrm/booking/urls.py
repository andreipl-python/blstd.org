from django.urls import path
from . import views
from .views import CustomLogoutView

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.auth_view, name='login'),
    path('logout/', CustomLogoutView.as_view(next_page='index'), name='logout'),
    path('user/', views.user_index, name='user_index'),
    path('users_list/', views.users_list_view, name='users_list'),
    path('smena/', views.smena_view, name='smena'),
    path('smena_new/', views.smena_new_view, name='smena_new'),
    path('admin_index/', views.admin_index_view, name='admin_index'),
    path('user_payment/', views.user_payment_view, name='payment'),
    path('user_paytable/', views.user_payment_view, name='paytable'),
    path('user_stats_school/', views.user_stats_school_view, name='stats_school'),
    path('user_stats_average/', views.user_stats_average_view, name='stats_average'),
    path('user_stats_profit/', views.user_stats_profit_view, name='stats_profit'),
    path('user_stats_all/', views.user_stats_all_view, name='stats_all'),
]
