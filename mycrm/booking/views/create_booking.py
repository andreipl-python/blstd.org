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
    SpecialistService,
    SpecialistWeeklyInterval,
    SpecialistScheduleOverride,
    ReservationStatusType,
    ClientGroup,
    Scenario,
    Direction,
)


def _time_to_minutes(t):
    """Конвертирует `datetime.time` в минуты от полуночи (0..1439)."""
    return t.hour * 60 + t.minute


def get_specialist_work_intervals_for_date(specialist: Specialist, target_date):
    """Возвращает рабочие интервалы специалиста на конкретную дату.

    Приоритет:
    - Если на дату есть override — используем его (или считаем день выходным).
    - Иначе используем weekly-интервалы. Если weekly-интервалов в принципе нет —
      расписание не ограничивает (поведение как раньше).

    Формат ответа:
    - restricted: расписание ограничивает/не ограничивает доступность
    - is_day_off: является ли дата выходным для специалиста
    - intervals: список пар (start_time, end_time)
    """
    override = (
        SpecialistScheduleOverride.objects.filter(
            specialist_id=specialist.id,
            date=target_date,
        )
        .prefetch_related("intervals")
        .first()
    )
    if override is not None:
        # Override может пометить день выходным, либо задать конкретные интервалы.
        if override.is_day_off:
            return {
                "restricted": True,
                "is_day_off": True,
                "intervals": [],
            }
        intervals = [(i.start_time, i.end_time) for i in override.intervals.all()]
        return {
            "restricted": True,
            "is_day_off": False,
            "intervals": intervals,
        }

    has_any_weekly = SpecialistWeeklyInterval.objects.filter(
        specialist_id=specialist.id
    ).exists()
    if not has_any_weekly:
        # Если у специалиста нет weekly-расписания — ничего не ограничиваем.
        return {
            "restricted": False,
            "is_day_off": False,
            "intervals": [],
        }

    weekday = int(target_date.weekday())
    # Если weekly-расписание есть, то отсутствие интервалов в конкретный weekday
    # трактуем как выходной.
    intervals = list(
        SpecialistWeeklyInterval.objects.filter(
            specialist_id=specialist.id,
            weekday=weekday,
        ).values_list("start_time", "end_time")
    )
    return {
        "restricted": True,
        "is_day_off": len(intervals) == 0,
        "intervals": intervals,
    }


def check_specialist_schedule(
    specialist: Specialist,
    start_datetime: datetime,
    end_datetime: datetime,
) -> bool:
    """Проверяет, работает ли специалист по расписанию в указанный интервал.

    - Бронь должна быть в пределах одних суток.
    - Интервал брони должен целиком попадать в один из рабочих интервалов,
      при этом рабочие интервалы предварительно объединяются (merge), чтобы
      корректно учитывать прилегающие/пересекающиеся интервалы.
    """
    # Приводим naive datetime к aware, чтобы сравнения были корректными.
    if timezone.is_naive(start_datetime):
        start_datetime = timezone.make_aware(
            start_datetime, timezone.get_current_timezone()
        )
    if timezone.is_naive(end_datetime):
        end_datetime = timezone.make_aware(
            end_datetime, timezone.get_current_timezone()
        )

    # Дальше считаем всё в локальном времени.
    local_start = timezone.localtime(start_datetime)
    local_end = timezone.localtime(end_datetime)
    if local_start.date() != local_end.date():
        raise ValidationError("Бронь не может пересекать сутки")

    schedule = get_specialist_work_intervals_for_date(specialist, local_start.date())
    if not schedule.get("restricted"):
        return True
    if schedule.get("is_day_off"):
        raise ValidationError("У специалиста выходной в выбранную дату")

    intervals = schedule.get("intervals") or []
    if not intervals:
        raise ValidationError("У специалиста выходной в выбранную дату")

    start_minutes = _time_to_minutes(local_start.time())
    end_minutes = _time_to_minutes(local_end.time())

    work_intervals = []
    for start_t, end_t in intervals:
        if start_t is None or end_t is None:
            continue
        work_intervals.append((_time_to_minutes(start_t), _time_to_minutes(end_t)))

    # Объединяем интервалы, чтобы проверять попадание в “union” рабочего времени.
    work_intervals.sort(key=lambda x: x[0])
    merged = []
    for s, e in work_intervals:
        if not merged or s > merged[-1][1]:
            merged.append([s, e])
        else:
            merged[-1][1] = max(merged[-1][1], e)

    for s, e in merged:
        if start_minutes >= s and end_minutes <= e:
            return True

    raise ValidationError("Специалист не работает в это время")


def check_room_availability(
    room: Room,
    start_datetime: datetime,
    end_datetime: datetime,
    exclude_reservation_id: int | None = None,
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

    existing_bookings = Reservation.objects.filter(room=room).exclude(
        status_id__in=[4, 1082]
    )
    if exclude_reservation_id is not None:
        existing_bookings = existing_bookings.exclude(id=exclude_reservation_id)

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
    specialist: Specialist,
    start_datetime: datetime,
    end_datetime: datetime,
    exclude_reservation_id: int | None = None,
) -> bool:
    """Проверка доступности специалиста"""
    # Сначала проверяем фиксированное расписание (weekly/override), и только потом —
    # пересечения с существующими бронями.
    check_specialist_schedule(specialist, start_datetime, end_datetime)

    # Специалист может быть занят не только как преподаватель, но и как клиент
    # (например, если сам берёт урок у другого специалиста).
    if specialist.client_id:
        client_bookings = Reservation.objects.filter(
            client_id=specialist.client_id,
        ).exclude(status_id__in=[4, 1082])
        if exclude_reservation_id is not None:
            client_bookings = client_bookings.exclude(id=exclude_reservation_id)
        if client_bookings.filter(
            datetimestart__lt=end_datetime, datetimeend__gt=start_datetime
        ).exists():
            raise ValidationError(
                "Специалист занят в это время (он записан как клиент)"
            )

    existing_bookings = Reservation.objects.filter(
        specialist=specialist,
    ).exclude(status_id__in=[4, 1082])
    if exclude_reservation_id is not None:
        existing_bookings = existing_bookings.exclude(id=exclude_reservation_id)
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
        specialist_service_id = request.POST.get("specialist_service_id")
        specialist_service_id = (
            int(specialist_service_id) if specialist_service_id else None
        )
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

        # Для Репетиционной точки можно указать либо client_id, либо client_group_id
        has_client_or_group = client_id or client_group_id
        if not all([scenario_id, has_client_or_group, booking_duration, room_id]):
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

        specialist_service = None
        if scenario and scenario.name == "Музыкальная школа":
            if not specialist_service_id:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выберите услугу преподавателя",
                    }
                )
            specialist_service = SpecialistService.objects.filter(
                id=specialist_service_id,
                active=True,
            ).first()
            if not specialist_service:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выбранная услуга преподавателя неактивна",
                    }
                )

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
                specialist_service=specialist_service,
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
