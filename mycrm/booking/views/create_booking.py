import hashlib
import dateparser

from datetime import datetime, timedelta
from typing import Tuple

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from booking.models import Reservation, Room


def parse_data_and_calculate_end_time(date: str, time: str, booking_duration: str) -> tuple[str, str, str, int, int]:
    """Функция для парсинга даты, перевода стартового времени брони и вычисления конечного"""
    date_obj = dateparser.parse(date, languages=['ru'])
    day, mon, year = str(date_obj.day), str(date_obj.month), str(date_obj.year)

    time_obj = datetime.strptime(time, '%H:%M')
    combined_datetime = datetime.combine(date_obj.date(), time_obj.time())
    timestart = int(combined_datetime.timestamp())

    duration_hours, duration_minutes = map(int, booking_duration.split(':'))
    duration = timedelta(hours=duration_hours, minutes=duration_minutes)

    end_datetime = combined_datetime + duration
    timeend = int(end_datetime.timestamp())

    return day, mon, year, timestart, timeend


@csrf_exempt
def create_booking_view(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    # print(f'Тело запроса: {request.body}')
    service_types = request.POST.getlist('serviceType')
    if service_types:
        service_types = [int(service_type) for service_type in service_types]

    booking_type = int(request.POST.get('bookingType'))
    specialist = int(request.POST.get('specialist'))
    client = int(request.POST.get('client'))
    booking_count = int(request.POST.get('bookingCount'))
    booking_duration = request.POST.get('bookingDuration')
    comment = request.POST.get('comment')
    date = request.POST.get('date')
    time = request.POST.get('time')
    room_name = request.POST.get('room_name')
    status = 0  # По умолчанию статус новой брони
    hide = 0  # Пример, если нет других условий для этого поля
    pay = ""  # Если нет данных для оплаты на момент создания

    required_fields = {
        'booking_type': "Не указан тип брони",
        'specialist': "Не указан специалист",
        'client': "Не выбран клиент"
    }

    # print(f'Локальные переменные: {locals()}')
    for field, error_message in required_fields.items():
        value = locals().get(field)
        if not value:
            return JsonResponse({"success": False, "error": error_message})

    try:
        room = Room.objects.get(name=room_name)
        room_id = room.id
        period = room.period
    except Room.DoesNotExist:
        return JsonResponse({"success": False, "error": "Комната с указанным именем не найдена"})

    day, mon, year, timestart, timeend = parse_data_and_calculate_end_time(date, time, booking_duration)
    hash_value = hashlib.md5(f"{date}-{time}-{specialist}-{client}".encode()).hexdigest()

    print(request.body)

    bron_record = Reservation.objects.create(
        hash=hash_value,
        day=day,
        mon=mon,
        year=year,
        timestart=timestart,
        timeend=timeend,
        idprepod=specialist,
        iduser=client,
        idroom=room_id,
        period=period,
        hide=hide,
        status=status,
        pay=pay,
        numbron=int(booking_count),
        comment=comment
    )

    print(f"ID созданной брони: {bron_record.id}")

    return JsonResponse({"success": True})


