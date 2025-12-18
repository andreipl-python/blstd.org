import re
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.db.models import Max
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from ..models import (
    Reservation,
    Room,
    Service,
    Specialist,
    ReservationStatusType,
    ClientGroup,
    Scenario,
    Direction,
)


def check_room_availability(
    room: Room, start_datetime: datetime, end_datetime: datetime
) -> bool:
    """Проверка доступности помещения"""
    if timezone.is_naive(start_datetime):
        start_datetime = timezone.make_aware(
            start_datetime, timezone.get_current_timezone()
        )
    if timezone.is_naive(end_datetime):
        end_datetime = timezone.make_aware(
            end_datetime, timezone.get_current_timezone()
        )

    start_time = start_datetime.time()
    end_time = end_datetime.time()

    room_start = room.hourstart
    room_end = room.hourend

    if start_time < room_start or end_time > room_end:
        raise ValidationError(
            "Время бронирования выходит за рамки рабочего времени помещения "
            f"({room_start.strftime('%H:%M')} - {room_end.strftime('%H:%M')}). "
            f"Запрошено: {start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"
        )

    existing_bookings = Reservation.objects.filter(
        room=room,
    ).exclude(status_id=4)

    for booking in existing_bookings:
        booking_start = booking.datetimestart
        booking_end = booking.datetimeend

        if timezone.is_naive(booking_start):
            booking_start = timezone.make_aware(
                booking_start, timezone.get_current_timezone()
            )
        if timezone.is_naive(booking_end):
            booking_end = timezone.make_aware(
                booking_end, timezone.get_current_timezone()
            )

        if booking_end == start_datetime:
            continue

        if booking_start < end_datetime and booking_end > start_datetime:
            raise ValidationError("На это время уже есть бронирование")

    return True


def check_specialist_availability(
    specialist: Specialist, start_datetime: datetime, end_datetime: datetime
) -> bool:
    """Проверка доступности специалиста"""
    existing_bookings = Reservation.objects.filter(
        specialist=specialist,
    ).exclude(status_id=4)
    overlapping_bookings = existing_bookings.filter(
        datetimestart__lt=end_datetime, datetimeend__gt=start_datetime
    )
    if overlapping_bookings.exists():
        raise ValidationError("Специалист уже занят в это время")

    return True


@csrf_exempt
def create_booking_view(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        service_ids = request.POST.getlist("services")
        scenario_id = request.POST.get("scenario_id")
        scenario_id = int(scenario_id) if scenario_id else None
        specialist_id = request.POST.get("specialist_id")
        specialist_id = int(specialist_id) if specialist_id else None
        direction_id = request.POST.get("direction_id")
        direction_id = int(direction_id) if direction_id else None
        client_id = request.POST.get("client_id")
        client_id = int(client_id) if client_id else None
        client_group_id = request.POST.get("client_group_id")
        client_group_id = int(client_group_id) if client_group_id else None
        booking_duration = request.POST.get("duration")
        comment = request.POST.get("comment", "")
        room_id = request.POST.get("room_id")
        room_id = int(room_id) if room_id else None
        full_datetime = request.POST.get("full_datetime")
        total_cost = request.POST.get("total_cost")
        total_cost = float(total_cost) if total_cost else None

        if not full_datetime:
            return JsonResponse(
                {"success": False, "error": "Не указано время начала брони"}
            )

        if not all([scenario_id, client_id, booking_duration, room_id]):
            return JsonResponse(
                {"success": False, "error": "Не все обязательные поля заполнены"}
            )

        # --- Заглушка для интеграции с внешним API ---
        # В будущем здесь будет запрос к внешнему API, который вернёт id для бронирования.
        # Сейчас просто генерируем id для новой брони (максимальный + 1 или случайный).
        def get_external_booking_id():
            max_id = Reservation.objects.aggregate(max_id=Max("id"))["max_id"]
            return (max_id or 0) + 1
            # Альтернатива: return random.randint(100000, 999999)

        external_booking_id = get_external_booking_id()
        # --- Конец заглушки ---

        try:
            room = Room.objects.get(id=room_id)
            scenario = Scenario.objects.get(id=scenario_id)
            specialist = (
                Specialist.objects.get(id=specialist_id) if specialist_id else None
            )
            direction = Direction.objects.get(id=direction_id) if direction_id else None
            client_group = (
                ClientGroup.objects.get(id=client_group_id) if client_group_id else None
            )
        except Room.DoesNotExist:
            return JsonResponse({"success": False, "error": "Комната не найдена"})
        except Scenario.DoesNotExist:
            return JsonResponse({"success": False, "error": "Сценарий не найден"})
        except Specialist.DoesNotExist:
            return JsonResponse({"success": False, "error": "Специалист не найден"})
        except Direction.DoesNotExist:
            return JsonResponse({"success": False, "error": "Направление не найдено"})
        except ClientGroup.DoesNotExist:
            return JsonResponse({"success": False, "error": "Группа не найдена"})

        # Извлекаем datetime в формате YYYY-MM-DD HH:MM:SS (без микросекунд и лишних символов)
        datetime_match = re.match(
            r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})", full_datetime.strip()
        )
        if not datetime_match:
            return JsonResponse(
                {
                    "success": False,
                    "error": f"Неверный формат даты/времени: {full_datetime}",
                }
            )
        full_datetime_clean = f"{datetime_match.group(1)} {datetime_match.group(2)}"
        start_datetime_naive = datetime.strptime(
            full_datetime_clean, "%Y-%m-%d %H:%M:%S"
        )
        start_datetime = timezone.make_aware(
            start_datetime_naive, timezone.get_current_timezone()
        )
        duration_hours, duration_minutes = map(int, booking_duration.split(":"))
        end_datetime = start_datetime + timedelta(
            hours=duration_hours, minutes=duration_minutes
        )

        # Проверяем доступность
        try:
            check_room_availability(room, start_datetime, end_datetime)
            if specialist:
                check_specialist_availability(specialist, start_datetime, end_datetime)
        except ValidationError as e:
            return JsonResponse(
                {
                    "success": False,
                    "error": e.messages[0] if getattr(e, "messages", None) else str(e),
                }
            )

        with transaction.atomic():
            approved_status = ReservationStatusType.objects.get(id=1080)

            reservation = Reservation.objects.create(
                id=external_booking_id,  # id, полученный от "внешнего API"
                datetimestart=start_datetime,
                datetimeend=end_datetime,
                specialist=specialist,
                direction=direction,
                client_id=client_id,
                client_group=client_group,
                room=room,
                scenario=scenario,
                status=approved_status,
                comment=comment,
                total_cost=total_cost,
            )

            if service_ids:
                services = Service.objects.filter(id__in=service_ids)
                reservation.services.add(*services)

        return JsonResponse({"success": True, "reservation_id": reservation.id})

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "error": f"Произошла ошибка при создании брони: {str(e)}",
            }
        )
