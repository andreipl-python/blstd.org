import json
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Any

from booking.models import Client, Room, Service, Reservation, Scenario, Specialist, TariffUnit, SpecialistColor, \
    PaymentType, Area
from django.contrib.auth.decorators import login_required
from django.core.serializers import serialize
from django.db.models import QuerySet, Q, Case, When, Value, IntegerField
from django.shortcuts import render
from django.utils import timezone

from .menu2 import menu2_view


def generate_days_of_month(request_range: str = 'day14', start_date_str: str = None, end_date_str: str = None) -> list[dict[str, datetime | str | int]]:
    """Функция определяет текущий месяц и возврашает список дней месяца, начальную и конечную даты"""
    days_of_month = []
    today = timezone.now()
    
    if request_range == 'period' and start_date_str and end_date_str:
        # Для периода используем переданные даты
        start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = timezone.datetime.strptime(end_date_str, "%Y-%m-%d")
        # Устанавливаем время начала и конца дня
        start_date = timezone.make_aware(
            timezone.datetime.combine(start_date.date(), timezone.datetime.min.time())
        )
        end_date = timezone.make_aware(
            timezone.datetime.combine(end_date.date(), timezone.datetime.max.time())
        )
        # Если даты одинаковые, используем 1 день
        if start_date.date() == end_date.date():
            number_of_days = 1
        else:
            number_of_days = (end_date.date() - start_date.date()).days + 1
    elif request_range == 'month':
        # Для месяца берем первый день
        start_date = timezone.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
        _, number_of_days = monthrange(today.year, today.month)
    else:  # по умолчанию показываем  2 недели
        start_date = timezone.datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=today.tzinfo)
        number_of_days = 14

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
    naive_start_time = datetime.strptime(starttime, "%H:%M")  
    start_time = timezone.make_aware(
        timezone.datetime.combine(timezone.now().date(), naive_start_time.time())
    )
    interval = timedelta(hours=hours_interval) 
    num_blocks = num_blocks 
    time_blocks = []

    for i in range(num_blocks):
        time_blocks.append({
            "time": (start_time + i * interval).strftime("%H:%M")
        })

    return time_blocks


def add_blocks_datetime_range_and_room_name(reservation_objects: QuerySet, default_block_length_minutes: int) \
        -> list[dict[str, Any]]:
    reservation_objects = reservation_objects.select_related('room', 'client', 'status')
    
    result = []
    for reservation in reservation_objects:
        datetime_str_list = [
            str(reservation.datetimestart + timedelta(minutes=i))[:-6]
            for i in range(0, int((reservation.datetimeend - reservation.datetimestart).total_seconds() // 60) + 1,
                           default_block_length_minutes)
        ]

        result.append({
            'id': reservation.id,
            'room_name': reservation.room.name,
            'idroom': reservation.room_id,
            'blocks_datetime_range': datetime_str_list,
            'client_id': reservation.client_id,
            'client_name': reservation.client.name,
            'client_comment': reservation.client.comment,
            'client_phone': reservation.client.phone,
            'specialist_id': reservation.specialist_id,
            'status_id': reservation.status.id if reservation.status else 1,
            'comment': reservation.comment
        })

    return result


@login_required(login_url='login')
def user_index_view(request):
    request_range = 'day14'  # по умолчанию 2 неделb
    start_date_str = None
    end_date_str = None
    
    if request.method == 'POST':
        if 'month' in request.POST:
            request_range = 'month'
        elif 'period' in request.POST:  # исправлено с 'repiod' на 'period'
            from_date = request.POST.get('from_date')
            to_date = request.POST.get('to_date')
            if from_date and to_date:
                request_range = 'period'
                start_date_str = from_date
                end_date_str = to_date
    
    days_of_month = generate_days_of_month(request_range, start_date_str, end_date_str)
    menu2_context = menu2_view(request)
    time_blocks = generate_time_blocks("00:00", 1, 24)
    time_blocks_json = json.dumps(time_blocks)

    start_date = timezone.datetime.combine(days_of_month[0]['date'].date(), timezone.datetime.min.time())
    start_date = timezone.make_aware(start_date)
    end_date = timezone.datetime.combine(days_of_month[-1]['date'].date(), timezone.datetime.max.time())
    end_date = timezone.make_aware(end_date)
    

    # Получаем все брони без фильтрации по датам для проверки
    all_bookings = Reservation.objects.exclude(status_id=4)
    
    # Применяем фильтр
    bookings_in_range = Reservation.objects.filter(
        Q(datetimestart__lte=end_date) & Q(datetimeend__gte=start_date)
    ).exclude(status_id=4)
    
    
    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_in_range, 15)
    bookings_in_range_json = json.dumps(bookings_in_range)

    clients = Client.objects.prefetch_related(
        'subscription_set__reservation_type',
        'clientrating_set',
        'groups'
    ).all()
    
    clients_with_balances = []
    for client in clients:
        subscriptions = client.subscription_set.all()  
        
        balances = {
            subscription.reservation_type_id: subscription.balance
            for subscription in subscriptions
        }
        
        group_data = []
        for group in client.groups.all():
            group_data.append({
                'id': group.id,
                'name': group.name,
                'clients': [c.name for c in group.clients.all()]
            })
        
        clients_with_balances.append({
            'id': client.id,
            'name': client.name,
            'comment': client.comment,
            'phone': client.phone,
            'rating': client.rating,
            'rating_count': client.clientrating_set.count(),
            'balances': balances,
            'group': group_data
        })
    
    clients_json = json.dumps(clients_with_balances)

    services = Service.objects.select_related(
        'group'
    ).prefetch_related(
        'scenario'
    ).annotate(
        group_order=Case(
            When(group__name='Аренда оборудования', then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
    ).order_by('group_order', 'group__name', 'name')

    services_json = serialize('json', services, use_natural_foreign_keys=True)

    specialists = Specialist.objects.prefetch_related('scenario').all()
    specialists_json = serialize('json', specialists, use_natural_primary_keys=True)

    rooms = Room.objects.prefetch_related('scenario').all()
    rooms_json = serialize('json', rooms, use_natural_primary_keys=True)

    specialist_colors = {
        color.specialist_id: {
            'primary': color.primary_color,
            'secondary': color.secondary_color
        }
        for color in SpecialistColor.objects.all()
    }

    for specialist in specialists:
        if specialist.id not in specialist_colors:
            specialist_colors[specialist.id] = {
                'primary': '#a960ee',
                'secondary': '#90a0f7'
            }
    
    specialist_colors_json = json.dumps(specialist_colors)

    scenarios = Scenario.objects.all()
    scenarios_json = serialize('json', scenarios, use_natural_primary_keys=True)

    tariff_units = TariffUnit.objects.all()
    tariff_units_json = serialize('json', tariff_units, use_natural_primary_keys=True)

    payment_types = PaymentType.objects.all()

    days_of_month = days_of_month
    rooms = rooms

    print("==== DEBUG user_index_view ====")
    
    areas = Area.objects.prefetch_related('scenario').all()
    areas_json = serialize('json', areas, use_natural_primary_keys=True)
    scenarios = Scenario.objects.all()
    scenarios_json = serialize('json', scenarios, use_natural_primary_keys=True)

    context = {
        **menu2_context,
        'days_of_month': days_of_month,
        'time_blocks': time_blocks,
        'time_blocks_json': time_blocks_json,
        'rooms': rooms,
        'rooms_json': rooms_json,
        'areas': areas,
        'areas_json': areas_json,
        'scenarios': scenarios,
        'scenarios_json': scenarios_json,
        'show_datefrom': days_of_month[0]['date'].date().isoformat(),
        'show_dateto': days_of_month[-1]['date'].date().isoformat(),
        'services': services,
        'services_json': services_json,
        'specialists_json': specialists_json,
        'bookings_in_range': bookings_in_range_json,
        'scenarios_json': scenarios_json,
        'tariff_units_json': tariff_units_json,
        'clients': clients,
        'clients_json': clients_json,
        'specialist_colors': specialist_colors_json,
        'payment_types': payment_types,
        'time_cells': range(96),
    }

    return render(request, 'booking/user/user_index.html', context)
