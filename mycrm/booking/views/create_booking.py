import hashlib
import dateparser

from datetime import datetime, timedelta
from typing import Tuple
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.utils import timezone

from booking.models import Reservation, Room, Service, Specialist


def parse_datetime(date: str, time: str) -> datetime:
    """Функция для парсинга даты и времени в объект datetime"""
    date_obj = dateparser.parse(date, languages=['ru'])
    time_obj = datetime.strptime(time, '%H:%M')
    naive_datetime = datetime.combine(date_obj.date(), time_obj.time())
    return timezone.make_aware(naive_datetime)


def check_room_availability(room: Room, start_datetime: datetime, end_datetime: datetime) -> bool:
    """Проверка доступности помещения"""
    # Проверяем рабочее время
    start_time = start_datetime.time()
    end_time = end_datetime.time()
    
    # Преобразуем строки времени в объекты time
    room_start = datetime.strptime(str(room.hourstart), '%H:%M:%S').time()
    room_end = datetime.strptime(str(room.hourend), '%H:%M:%S').time()
    
    if start_time < room_start or end_time > room_end:
        raise ValidationError("Время бронирования выходит за рамки рабочего времени помещения")

    # Проверяем пересечение с другими бронями
    overlapping_bookings = Reservation.objects.filter(
        room=room,
        datetimestart__lt=end_datetime,
        datetimeend__gt=start_datetime
    )
    if overlapping_bookings.exists():
        raise ValidationError("На это время уже есть бронирование")

    return True


def check_specialist_availability(specialist: Specialist, start_datetime: datetime, end_datetime: datetime) -> bool:
    """Проверка доступности специалиста"""
    overlapping_bookings = Reservation.objects.filter(
        specialist=specialist,
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
        # Получаем и валидируем данные
        service_types = request.POST.getlist('serviceType')
        booking_type = int(request.POST.get('bookingType'))
        specialist_id = request.POST.get('specialist')
        specialist_id = int(specialist_id) if specialist_id else None
        client_id = int(request.POST.get('client'))
        booking_duration = request.POST.get('bookingDuration')
        comment = request.POST.get('comment', '')
        room_id = int(request.POST.get('room_id'))
        full_datetime = request.POST.get('full_datetime')
        
        print("Received full_datetime:", full_datetime)

        if not full_datetime:
            return JsonResponse({"success": False, "error": "Не указано время начала брони"})

        # Проверяем обязательные поля
        if not all([booking_type, client_id, booking_duration, room_id]):
            return JsonResponse({"success": False, "error": "Не все обязательные поля заполнены"})

        # Получаем объекты из базы
        try:
            room = Room.objects.get(id=room_id)
            specialist = None
            if specialist_id:
                specialist = Specialist.objects.get(id=specialist_id)
        except Room.DoesNotExist:
            return JsonResponse({"success": False, "error": "Комната не найдена"})
        except Specialist.DoesNotExist:
            return JsonResponse({"success": False, "error": "Специалист не найден"})

        # Вычисляем время начала и конца брони
        naive_start_datetime = datetime.strptime(full_datetime, '%Y-%m-%d %H:%M:%S')
        start_datetime = timezone.make_aware(naive_start_datetime)
        duration_hours, duration_minutes = map(int, booking_duration.split(':'))
        end_datetime = start_datetime + timedelta(hours=duration_hours, minutes=duration_minutes)

        # Проверяем доступность
        try:
            check_room_availability(room, start_datetime, end_datetime)
            if specialist:
                check_specialist_availability(specialist, start_datetime, end_datetime)
        except ValidationError as e:
            return JsonResponse({"success": False, "error": str(e)})

        # Создаем бронь в транзакции
        with transaction.atomic():
            # Создаем запись о брони
            reservation = Reservation.objects.create(
                datetimestart=start_datetime,
                datetimeend=end_datetime,
                specialist=specialist,
                client_id=client_id,
                room=room,
                reservation_type_id=booking_type,
                status=0,  # PENDING
                comment=comment
            )

            # Добавляем услуги
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
