from datetime import datetime, timedelta

import dateparser
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import Reservation, Room, Service, Specialist, ReservationStatusType, ClientGroup


def parse_datetime(date: str, time: str) -> datetime:
    """Функция для парсинга даты и времени в объект datetime"""
    date_obj = dateparser.parse(date, languages=['ru'])
    time_obj = datetime.strptime(time, '%H:%M')
    naive_datetime = datetime.combine(date_obj.date(), time_obj.time())
    return naive_datetime


def check_room_availability(room: Room, start_datetime: datetime, end_datetime: datetime) -> bool:
    """Проверка доступности помещения"""
    start_time = start_datetime.time()
    end_time = end_datetime.time()
    
    room_start = datetime.strptime(str(room.hourstart), '%H:%M:%S').time()
    room_end = datetime.strptime(str(room.hourend), '%H:%M:%S').time()
    
    if start_time < room_start or end_time > room_end:
        raise ValidationError("Время бронирования выходит за рамки рабочего времени помещения")

    existing_bookings = Reservation.objects.filter(
        room=room,
    ).exclude(status_id=4)
    
    for booking in existing_bookings:
        booking_start = booking.datetimestart.replace(tzinfo=None)
        booking_end = booking.datetimeend.replace(tzinfo=None)
        
        if booking_end == start_datetime:
            continue
            
        if (booking_start < end_datetime and booking_end > start_datetime):
            print(f"Конфликт с бронью: {booking.id}")
            print(f"Существующая бронь: {booking_start} - {booking_end}")
            print(f"Новая бронь: {start_datetime} - {end_datetime}")
            raise ValidationError("На это время уже есть бронирование")

    return True


def check_specialist_availability(specialist: Specialist, start_datetime: datetime, end_datetime: datetime) -> bool:
    """Проверка доступности специалиста"""
    existing_bookings = Reservation.objects.filter(
        specialist=specialist,
    ).exclude(status_id=4)
    overlapping_bookings = existing_bookings.filter(
        datetimestart__lt=end_datetime,
        datetimeend__gt=start_datetime
    )
    if overlapping_bookings.exists():
        raise ValidationError("Специалист уже занят в это время")

    return True


@csrf_exempt
def create_booking_view(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        print("Request POST data:", request.POST)
        service_types = request.POST.getlist('serviceType')
        booking_type = int(request.POST.get('bookingType'))
        specialist_id = request.POST.get('specialist')
        specialist_id = int(specialist_id) if specialist_id else None
        client_id = int(request.POST.get('client'))
        client_group_id = request.POST.get('client_group')
        client_group_id = int(client_group_id) if client_group_id else None
        booking_duration = request.POST.get('bookingDuration')
        comment = request.POST.get('comment', '')
        room_id = int(request.POST.get('room_id'))
        full_datetime = request.POST.get('full_datetime')
        total_cost = request.POST.get('total_cost')
        total_cost = float(total_cost) if total_cost else None
        
        print("Received full_datetime:", full_datetime)

        if not full_datetime:
            return JsonResponse({"success": False, "error": "Не указано время начала брони"})

        if not all([booking_type, client_id, booking_duration, room_id]):
            return JsonResponse({"success": False, "error": "Не все обязательные поля заполнены"})

        try:
            room = Room.objects.get(id=room_id)
            specialist = Specialist.objects.get(id=specialist_id) if specialist_id else None
            client_group = ClientGroup.objects.get(id=client_group_id) if client_group_id else None
        except Room.DoesNotExist:
            return JsonResponse({"success": False, "error": "Комната не найдена"})
        except Specialist.DoesNotExist:
            return JsonResponse({"success": False, "error": "Специалист не найден"})
        except ClientGroup.DoesNotExist:
            return JsonResponse({"success": False, "error": "Группа не найдена"})

        start_datetime = datetime.strptime(full_datetime, '%Y-%m-%d %H:%M:%S')
        start_datetime = start_datetime
        duration_hours, duration_minutes = map(int, booking_duration.split(':'))
        end_datetime = start_datetime + timedelta(hours=duration_hours, minutes=duration_minutes)


        # Проверяем доступность
        try:
            check_room_availability(room, start_datetime, end_datetime)
            if specialist:
                check_specialist_availability(specialist, start_datetime, end_datetime)
        except ValidationError as e:
            return JsonResponse({"success": False, "error": str(e)})

        with transaction.atomic():
            pending_status = ReservationStatusType.objects.get(name='Не подтверждена')
            
            reservation = Reservation.objects.create(
                datetimestart=start_datetime,
                datetimeend=end_datetime,
                specialist=specialist,
                client_id=client_id,
                client_group=client_group,
                room=room,
                reservation_type_id=booking_type,
                status=pending_status,
                comment=comment,
                total_cost=total_cost
            )

            if service_types:
                services = Service.objects.filter(id__in=service_types)
                reservation.services.add(*services)

        return JsonResponse({
            "success": True,
            "reservation_id": reservation.id
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Произошла ошибка при создании брони: {str(e)}"
        })
