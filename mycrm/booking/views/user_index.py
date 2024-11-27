import json
from typing import Tuple, List, Dict, Any
from django.db.models import QuerySet, Q, Case, When, Value, IntegerField
from django.contrib.auth.decorators import login_required
from django.core.serializers import serialize
from django.shortcuts import render
from datetime import datetime, timedelta, date
from calendar import monthrange
from django.utils import timezone

from booking.models import Client, Room, Service, Reservation, ReservationType, Specialist, TariffUnit, ServiceGroup

from .menu2 import menu2_view


def generate_days_of_month(request_range: str = None) -> list[dict[str, datetime | str | int]]:
    """Функция определяет текущий месяц и возврашает список дней месяца, начальную и конечную даты"""
    days_of_month = []
    today = timezone.now()
    if request_range == 'day7':
        start_date = today
        number_of_days = 8
    else:
        start_date = timezone.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
        _, number_of_days = monthrange(today.year, today.month)

    for day in range(number_of_days):
        current_date = start_date + timedelta(days=day)
        days_of_month.append({
            'date': current_date,
            'weekday': current_date.strftime('%A'),
            'timestamp': int(current_date.timestamp())
        })

    return days_of_month


def generate_time_blocks(starttime: str, hours_interval: int, num_blocks: int) -> list[dict]:
    """Функция возвращает временной диапазон"""
    naive_start_time = datetime.strptime(starttime, "%H:%M")  # Время, с которого начинается отсчёт
    start_time = timezone.make_aware(
        timezone.datetime.combine(timezone.now().date(), naive_start_time.time())
    )
    interval = timedelta(hours=hours_interval)  # Интервал между временными блоками (1 час)
    num_blocks = num_blocks  # Количество блоков
    time_blocks = []

    for i in range(num_blocks):
        # Добавляем блоки по 1 часу
        time_blocks.append({
            "time": (start_time + i * interval).strftime("%H:%M")  # Основное время, например, 9:00, 10:00 и т.д.
        })

    return time_blocks


def add_blocks_datetime_range_and_room_name(reservation_objects: QuerySet, default_block_length_minutes: int) \
        -> list[dict[str, Any]]:
    result = []
    for reservation in reservation_objects:
        # Создаем массив с метками времени на каждый 15-минутный блок
        datetime_str_list = [
            str(reservation.datetimestart + timedelta(minutes=i))[:-6]
            for i in range(0, int((reservation.datetimeend - reservation.datetimestart).total_seconds() // 60) + 1,
                           default_block_length_minutes)
        ]
        room = Room.objects.get(id=reservation.room_id)
        client = Client.objects.get(id=reservation.client_id)

        result.append({
            'id': reservation.id,
            'room_name': room.name,
            'idroom': reservation.room_id,
            'blocks_datetime_range': datetime_str_list,
            'client_id': reservation.client_id,
            'client_name': client.name,
            'client_comment': client.comment,
            'client_phone': client.phone,
        })

    return result


@login_required(login_url='login')
def user_index_view(request):
    days_of_month = generate_days_of_month()

    if request.method == 'POST':
        if 'day7' in request.POST:
            days_of_month = generate_days_of_month(request_range='day7')

    menu2_context = menu2_view(request)
    time_blocks = generate_time_blocks("09:00", 1, 14)
    time_blocks_json = json.dumps(time_blocks)

    start_date = days_of_month[0]['date']
    end_date = days_of_month[-1]['date']
    bookings_in_range = Reservation.objects.filter(Q(datetimestart__gte=start_date), Q(datetimeend__lte=end_date))
    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_in_range, 15)
    bookings_in_range_json = json.dumps(bookings_in_range)

    # Получаем всех клиентов с их балансами
    clients = Client.objects.prefetch_related(
        'subscription_set__reservation_type', 
        'clientrating_set',
        'group__client_set'
    ).select_related('group').all()
    
    # Подготавливаем данные о балансах для каждого клиента
    clients_with_balances = []
    for client in clients:
        subscriptions = client.subscription_set.all()
        
        balances = {
            subscription.reservation_type_id: subscription.balance 
            for subscription in subscriptions
        }
        
        # Получаем количество оценок
        rating_count = client.clientrating_set.count()
        
        # Подготавливаем данные о группе
        group_data = None
        if client.group:
            group_data = {
                'id': client.group.id,
                'name': client.group.name,
                'clients': [c.name for c in client.group.client_set.all() if c.id != client.id]
            }
        
        clients_with_balances.append({
            'id': client.id,
            'name': client.name,
            'comment': client.comment,
            'phone': client.phone,
            'rating': client.rating,
            'rating_count': rating_count,
            'balances': balances,
            'group': group_data
        })
    
    clients_json = json.dumps(clients_with_balances)

    # Сортировка услуг: сначала "Аренда оборудования", затем "Прочее"
    services = Service.objects.select_related('group').prefetch_related('reservation_type').annotate(
        group_order=Case(
            When(group__name='Аренда оборудования', then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
    ).order_by('group_order', 'group__name', 'name')

    # Сериализуем услуги вместе с их типами бронирования и группами
    services_json = serialize('json', services, use_natural_foreign_keys=True, use_natural_primary_keys=True)

    specialists = Specialist.objects.prefetch_related('reservation_type').all()
    specialists_json = serialize('json', specialists, use_natural_primary_keys=True)

    reservation_types = ReservationType.objects.all()
    reservation_types_json = serialize('json', reservation_types, use_natural_primary_keys=True)

    rooms = Room.objects.prefetch_related('reservation_type').all()
    rooms_json = serialize('json', rooms, use_natural_primary_keys=True)

    tariff_units = TariffUnit.objects.all()
    tariff_units_json = serialize('json', tariff_units, use_natural_primary_keys=True)

    context = {
        **menu2_context,
        'days_of_month': days_of_month,
        'time_blocks': time_blocks,
        'time_blocks_json': time_blocks_json,
        'rooms': rooms,
        'rooms_json': rooms_json,
        'show_datefrom': days_of_month[0]['date'].date().isoformat(),
        'show_dateto': days_of_month[-1]['date'].date().isoformat(),
        'services': services,
        'services_json': services_json,
        'specialists_json': specialists_json,
        'bookings_in_range': bookings_in_range_json,
        'reservation_types_json': reservation_types_json,
        'tariff_units_json': tariff_units_json,
        'clients': clients,  # Добавляем клиентов в контекст
        'clients_json': clients_json
    }

    return render(request, 'booking/user/user_index.html', context)
