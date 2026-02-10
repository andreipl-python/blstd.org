import json
import re
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

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
    Tariff,
)


_TARIFF_REQUIRED_SCENARIOS = {
    "Репетиционная точка",
    "Музыкальный класс",
}


class BulkCreateBookingError(Exception):
    def __init__(
        self,
        message: str,
        block_index: int | None = None,
        field: str | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.block_index = block_index
        self.field = field


def _quantize_money(value: Decimal) -> Decimal:
    if value is None:
        return value
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_time_hm(value: str):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%H:%M").time()
    except Exception:
        return None


def get_available_tariffs_for_booking(
    *,
    scenario: Scenario,
    room: Room,
    date_iso: str,
    start_time_hm: str,
    end_time_hm: str | None,
    people_count: int | None,
):
    if not scenario or not room:
        return []

    start_time = _parse_time_hm(start_time_hm)
    if start_time is None:
        return []

    end_time = _parse_time_hm(end_time_hm) if end_time_hm else None

    try:
        target_date = datetime.strptime(str(date_iso), "%Y-%m-%d").date()
    except Exception:
        return []

    people_count_val = people_count if people_count is not None else 1
    weekday = int(target_date.weekday())

    qs = (
        Tariff.objects.filter(
            active=True,
            scenarios=scenario,
            rooms=room,
            max_people__gte=people_count_val,
        )
        .prefetch_related("weekly_intervals")
        .distinct()
    )

    result = []
    for tariff in qs:
        intervals_all = list(tariff.weekly_intervals.all())
        if not intervals_all:
            continue

        day_intervals = [i for i in intervals_all if int(i.weekday) == weekday]
        if not day_intervals:
            continue

        fits = False
        for interval in day_intervals:
            if not (interval.start_time <= start_time < interval.end_time):
                continue
            if end_time is not None and end_time > interval.end_time:
                continue
            fits = True
            break
        if not fits:
            continue

        result.append(tariff)

    return result


def _time_to_minutes(t):
    """Конвертирует `datetime.time` в минуты от полуночи (0..1439)."""
    return t.hour * 60 + t.minute


def get_specialist_work_intervals_for_date(
    specialist: Specialist, target_date, scenario_id=None
):
    """Возвращает рабочие интервалы специалиста на конкретную дату.

    Приоритет:
    - Если на дату есть override — используем его (или считаем день выходным).
    - Иначе используем weekly-интервалы. Если weekly-интервалов в принципе нет —
      расписание не ограничивает (поведение как раньше).
    - При наличии scenario_id: сначала ищем записи для конкретного сценария,
      если нет — fallback на глобальные (scenario=NULL).

    Формат ответа:
    - restricted: расписание ограничивает/не ограничивает доступность
    - is_day_off: является ли дата выходным для специалиста
    - intervals: список пар (start_time, end_time)
    """
    # --- Override: приоритет конкретный сценарий > fallback (NULL) ---
    override_qs_filter = Q(specialist_id=specialist.id, date=target_date)
    if scenario_id is not None:
        override_qs_filter &= Q(scenario_id=scenario_id) | Q(scenario__isnull=True)
    overrides = list(
        SpecialistScheduleOverride.objects.filter(override_qs_filter).prefetch_related(
            "intervals"
        )
    )
    override = None
    if overrides:
        # Приоритет: конкретный сценарий > fallback (NULL)
        by_scenario = {o.scenario_id: o for o in overrides}
        if scenario_id is not None and scenario_id in by_scenario:
            override = by_scenario[scenario_id]
        elif None in by_scenario:
            override = by_scenario[None]

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

    # --- Weekly: приоритет конкретный сценарий > fallback (NULL) ---
    weekly_qs_filter = Q(specialist_id=specialist.id)
    if scenario_id is not None:
        weekly_qs_filter &= Q(scenario_id=scenario_id) | Q(scenario__isnull=True)

    has_any_weekly = SpecialistWeeklyInterval.objects.filter(weekly_qs_filter).exists()
    if not has_any_weekly:
        # Если у специалиста нет weekly-расписания — ничего не ограничиваем.
        return {
            "restricted": False,
            "is_day_off": False,
            "intervals": [],
        }

    weekday = int(target_date.weekday())
    weekly_day_qs = SpecialistWeeklyInterval.objects.filter(
        weekly_qs_filter,
        weekday=weekday,
    ).values_list("start_time", "end_time", "scenario_id")

    # Группируем по scenario_id для выбора приоритетных интервалов
    by_sc = {}
    for start_t, end_t, sc_id in weekly_day_qs:
        by_sc.setdefault(sc_id, []).append((start_t, end_t))

    if scenario_id is not None and scenario_id in by_sc:
        intervals = by_sc[scenario_id]
    elif None in by_sc:
        intervals = by_sc[None]
    else:
        intervals = []

    return {
        "restricted": True,
        "is_day_off": len(intervals) == 0,
        "intervals": intervals,
    }


def check_specialist_schedule(
    specialist: Specialist,
    start_datetime: datetime,
    end_datetime: datetime,
    scenario_id=None,
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

    schedule = get_specialist_work_intervals_for_date(
        specialist, local_start.date(), scenario_id=scenario_id
    )
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
    scenario_id=None,
) -> bool:
    """Проверка доступности специалиста"""
    # Сначала проверяем фиксированное расписание (weekly/override), и только потом —
    # пересечения с существующими бронями.
    check_specialist_schedule(
        specialist, start_datetime, end_datetime, scenario_id=scenario_id
    )

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
        return JsonResponse(
            {
                "success": False,
                "error": "Неверный метод запроса",
                "field": None,
                "errors": [
                    {
                        "message": "Неверный метод запроса",
                        "field": None,
                        "block_index": None,
                    }
                ],
            }
        )

    try:
        blocks_json = request.POST.get("blocks_json")
        if blocks_json:
            try:
                blocks = json.loads(blocks_json)
            except Exception:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Некорректный формат blocks_json",
                        "field": "blocks_json",
                        "errors": [
                            {
                                "message": "Некорректный формат blocks_json",
                                "field": "blocks_json",
                                "block_index": None,
                            }
                        ],
                    }
                )

            if not isinstance(blocks, list) or not blocks:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "blocks_json должен быть непустым массивом",
                        "field": "blocks_json",
                        "errors": [
                            {
                                "message": "blocks_json должен быть непустым массивом",
                                "field": "blocks_json",
                                "block_index": None,
                            }
                        ],
                    }
                )

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
            people_count_raw = request.POST.get("people_count")
            people_count = None
            if people_count_raw is not None and str(people_count_raw).strip() != "":
                try:
                    people_count = int(people_count_raw)
                except (TypeError, ValueError):
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "Некорректное количество людей",
                            "field": "people_count",
                            "errors": [
                                {
                                    "message": "Некорректное количество людей",
                                    "field": "people_count",
                                    "block_index": None,
                                }
                            ],
                        }
                    )
                if people_count < 1 or people_count > 99:
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "Количество людей должно быть от 1 до 99",
                            "field": "people_count",
                            "errors": [
                                {
                                    "message": "Количество людей должно быть от 1 до 99",
                                    "field": "people_count",
                                    "block_index": None,
                                }
                            ],
                        }
                    )

            specialist_service_id = request.POST.get("specialist_service_id")
            specialist_service_id = (
                int(specialist_service_id) if specialist_service_id else None
            )

            room_id = request.POST.get("room_id")
            room_id = int(room_id) if room_id else None

            has_client_or_group = client_id or client_group_id
            if not all([scenario_id, has_client_or_group, room_id]):
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Не все обязательные поля заполнены",
                        "field": None,
                        "errors": [
                            {
                                "message": "Не все обязательные поля заполнены",
                                "field": None,
                                "block_index": None,
                            }
                        ],
                    }
                )

            try:
                room = Room.objects.get(id=room_id)
                scenario = Scenario.objects.get(id=scenario_id)
                specialist = (
                    Specialist.objects.get(id=specialist_id) if specialist_id else None
                )
                direction = (
                    Direction.objects.get(id=direction_id) if direction_id else None
                )
                client_group = (
                    ClientGroup.objects.get(id=client_group_id)
                    if client_group_id
                    else None
                )
            except Room.DoesNotExist:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Комната не найдена",
                        "field": "room_id",
                        "errors": [
                            {
                                "message": "Комната не найдена",
                                "field": "room_id",
                                "block_index": None,
                            }
                        ],
                    }
                )
            except Scenario.DoesNotExist:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Сценарий не найден",
                        "field": "scenario_id",
                        "errors": [
                            {
                                "message": "Сценарий не найден",
                                "field": "scenario_id",
                                "block_index": None,
                            }
                        ],
                    }
                )
            except Specialist.DoesNotExist:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Специалист не найден",
                        "field": "specialist_id",
                        "errors": [
                            {
                                "message": "Специалист не найден",
                                "field": "specialist_id",
                                "block_index": None,
                            }
                        ],
                    }
                )
            except Direction.DoesNotExist:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Направление не найдено",
                        "field": "direction_id",
                        "errors": [
                            {
                                "message": "Направление не найдено",
                                "field": "direction_id",
                                "block_index": None,
                            }
                        ],
                    }
                )
            except ClientGroup.DoesNotExist:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Группа не найдена",
                        "field": "client_group_id",
                        "errors": [
                            {
                                "message": "Группа не найдена",
                                "field": "client_group_id",
                                "block_index": None,
                            }
                        ],
                    }
                )

            if scenario and not scenario.active:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выбранный сценарий выключен",
                        "field": "scenario_id",
                        "errors": [
                            {
                                "message": "Выбранный сценарий выключен",
                                "field": "scenario_id",
                                "block_index": None,
                            }
                        ],
                    }
                )

            if room and not getattr(room, "is_active", True):
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выбранная комната выключена",
                        "field": "room_id",
                        "errors": [
                            {
                                "message": "Выбранная комната выключена",
                                "field": "room_id",
                                "block_index": None,
                            }
                        ],
                    }
                )

            if (
                room
                and getattr(room, "area", None) is not None
                and not getattr(room.area, "is_active", True)
            ):
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выбранное помещение выключено",
                        "field": "room_id",
                        "errors": [
                            {
                                "message": "Выбранное помещение выключено",
                                "field": "room_id",
                                "block_index": None,
                            }
                        ],
                    }
                )

            specialist_service = None
            if scenario and scenario.name == "Музыкальная школа":
                if not specialist_service_id:
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "Выберите услугу преподавателя",
                            "field": "specialist_service_id",
                            "errors": [
                                {
                                    "message": "Выберите услугу преподавателя",
                                    "field": "specialist_service_id",
                                    "block_index": None,
                                }
                            ],
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
                            "field": "specialist_service_id",
                            "errors": [
                                {
                                    "message": "Выбранная услуга преподавателя неактивна",
                                    "field": "specialist_service_id",
                                    "block_index": None,
                                }
                            ],
                        }
                    )

            scenario_name = scenario.name if scenario else ""
            is_tariff_required = scenario_name in _TARIFF_REQUIRED_SCENARIOS

            created_ids = []
            with transaction.atomic():
                max_id = Reservation.objects.aggregate(max_id=Max("id"))["max_id"] or 0
                next_id = int(max_id) + 1

                approved_status = ReservationStatusType.objects.get(id=1080)

                # Для bulk-create дополнительно валидируем пересечения *между блоками одной заявки*.
                # Это отдельная проверка от `check_room_availability` / `check_specialist_availability`,
                # которые сравнивают с уже существующими бронями в базе.
                bulk_intervals = []

                for i, block in enumerate(blocks):
                    if not isinstance(block, dict):
                        raise BulkCreateBookingError(
                            "Элемент blocks_json должен быть объектом",
                            block_index=i + 1,
                            field="blocks_json",
                        )

                    service_ids = block.get("services")
                    if service_ids is None:
                        service_ids = []

                    full_datetime = block.get("full_datetime")
                    booking_duration = block.get("duration")
                    comment = block.get("comment", "")

                    tariff_id_raw = block.get("tariff_id")
                    tariff_id = int(tariff_id_raw) if tariff_id_raw else None

                    total_cost_raw = block.get("total_cost")
                    total_cost = None
                    if total_cost_raw is not None and str(total_cost_raw).strip() != "":
                        try:
                            total_cost = Decimal(str(total_cost_raw).replace(",", "."))
                        except Exception:
                            raise BulkCreateBookingError(
                                "Некорректный формат стоимости",
                                block_index=i + 1,
                                field="total_cost",
                            )

                    if not full_datetime:
                        raise BulkCreateBookingError(
                            "Не указано время начала брони",
                            block_index=i + 1,
                            field="full_datetime",
                        )

                    if not booking_duration:
                        raise BulkCreateBookingError(
                            "Не указана длительность",
                            block_index=i + 1,
                            field="duration",
                        )

                    datetime_match = re.match(
                        r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})",
                        str(full_datetime).strip(),
                    )
                    if not datetime_match:
                        raise BulkCreateBookingError(
                            f"Неверный формат даты/времени: {full_datetime}",
                            block_index=i + 1,
                            field="full_datetime",
                        )
                    full_datetime_clean = (
                        f"{datetime_match.group(1)} {datetime_match.group(2)}"
                    )
                    start_datetime_naive = datetime.strptime(
                        full_datetime_clean, "%Y-%m-%d %H:%M:%S"
                    )
                    start_datetime = timezone.make_aware(
                        start_datetime_naive, timezone.get_current_timezone()
                    )
                    duration_hours, duration_minutes = map(
                        int, str(booking_duration).split(":")
                    )
                    end_datetime = start_datetime + timedelta(
                        hours=duration_hours, minutes=duration_minutes
                    )

                    # Пересечение в пределах одной bulk-операции: если блоки выбрали одну дату
                    # и пересекающиеся интервалы, возвращаем ошибку с привязкой к конкретному блоку.
                    for prev in bulk_intervals:
                        if (
                            prev["start"] < end_datetime
                            and prev["end"] > start_datetime
                        ):
                            raise BulkCreateBookingError(
                                f"Пересечение с блоком №{prev['index']}",
                                block_index=i + 1,
                                field="full_datetime",
                            )
                    # Сохраняем интервалы как aware datetime (в той же TZ), чтобы сравнения
                    # для следующих блоков были корректными и сообщение могло ссылаться на № блока.
                    bulk_intervals.append(
                        {"index": i + 1, "start": start_datetime, "end": end_datetime}
                    )

                    if is_tariff_required:
                        if people_count is None:
                            raise BulkCreateBookingError(
                                "Укажите количество людей",
                                block_index=i + 1,
                                field="people_count",
                            )
                        if not tariff_id:
                            raise BulkCreateBookingError(
                                "Выберите тариф",
                                block_index=i + 1,
                                field="tariff_id",
                            )
                    else:
                        if tariff_id:
                            raise BulkCreateBookingError(
                                "Тариф нельзя указывать для выбранного сценария",
                                block_index=i + 1,
                                field="tariff_id",
                            )

                    try:
                        check_room_availability(room, start_datetime, end_datetime)
                        if specialist:
                            check_specialist_availability(
                                specialist,
                                start_datetime,
                                end_datetime,
                                scenario_id=scenario_id,
                            )
                    except ValidationError as e:
                        raise BulkCreateBookingError(
                            e.messages[0] if getattr(e, "messages", None) else str(e),
                            block_index=i + 1,
                            field="full_datetime",
                        )

                    tariff = None
                    if is_tariff_required:
                        tariff = Tariff.objects.filter(
                            id=tariff_id, active=True
                        ).first()
                        if not tariff:
                            raise BulkCreateBookingError(
                                "Выбранный тариф недоступен",
                                block_index=i + 1,
                                field="tariff_id",
                            )

                        available_tariffs = get_available_tariffs_for_booking(
                            scenario=scenario,
                            room=room,
                            date_iso=start_datetime.date().isoformat(),
                            start_time_hm=start_datetime.strftime("%H:%M"),
                            end_time_hm=end_datetime.strftime("%H:%M"),
                            people_count=people_count,
                        )
                        if str(tariff.id) not in {str(t.id) for t in available_tariffs}:
                            raise BulkCreateBookingError(
                                "Выбранный тариф недоступен",
                                block_index=i + 1,
                                field="tariff_id",
                            )

                    service_ids_list = []
                    if isinstance(service_ids, (list, tuple)):
                        for v in service_ids:
                            try:
                                service_ids_list.append(int(v))
                            except (TypeError, ValueError):
                                continue

                    services_qs_for_cost = Service.objects.filter(
                        id__in=service_ids_list
                    )
                    services_cost = Decimal("0")
                    for s in services_qs_for_cost:
                        if s.cost:
                            services_cost += s.cost

                    if is_tariff_required:
                        duration_total_minutes = int(
                            (end_datetime - start_datetime).total_seconds() // 60
                        )
                        rental_cost = (tariff.base_cost or Decimal("0")) * (
                            Decimal(duration_total_minutes)
                            / Decimal(max(1, int(tariff.base_duration_minutes)))
                        )
                        rental_cost = _quantize_money(rental_cost)
                        total_cost = _quantize_money(
                            (rental_cost or Decimal("0")) + services_cost
                        )

                    reservation = Reservation.objects.create(
                        id=next_id,
                        datetimestart=start_datetime,
                        datetimeend=end_datetime,
                        specialist=specialist,
                        specialist_service=specialist_service,
                        direction=direction,
                        client_id=client_id,
                        client_group=client_group,
                        people_count=people_count,
                        room=room,
                        scenario=scenario,
                        tariff=tariff,
                        status=approved_status,
                        comment=comment,
                        total_cost=total_cost,
                    )

                    if service_ids_list:
                        services = Service.objects.filter(id__in=service_ids_list)
                        reservation.services.add(*services)

                    created_ids.append(reservation.id)
                    next_id += 1

            return JsonResponse({"success": True, "reservation_ids": created_ids})

        service_ids = request.POST.getlist("services")
        scenario_id = request.POST.get("scenario_id")
        scenario_id = int(scenario_id) if scenario_id else None
        specialist_id = request.POST.get("specialist_id")
        specialist_id = int(specialist_id) if specialist_id else None
        tariff_id_raw = request.POST.get("tariff_id")
        tariff_id = int(tariff_id_raw) if tariff_id_raw else None
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
        people_count_raw = request.POST.get("people_count")
        people_count = None
        if people_count_raw is not None and str(people_count_raw).strip() != "":
            try:
                people_count = int(people_count_raw)
            except (TypeError, ValueError):
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Некорректное количество людей",
                    }
                )
            if people_count < 1 or people_count > 99:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Количество людей должно быть от 1 до 99",
                    }
                )
        booking_duration = request.POST.get("duration")
        comment = request.POST.get("comment", "")
        room_id = request.POST.get("room_id")
        room_id = int(room_id) if room_id else None
        full_datetime = request.POST.get("full_datetime")
        total_cost_raw = request.POST.get("total_cost")
        total_cost = None
        if total_cost_raw is not None and str(total_cost_raw).strip() != "":
            try:
                total_cost = Decimal(str(total_cost_raw).replace(",", "."))
            except Exception:
                return JsonResponse(
                    {"success": False, "error": "Некорректный формат стоимости"}
                )

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

        if scenario and not scenario.active:
            return JsonResponse(
                {"success": False, "error": "Выбранный сценарий выключен"}
            )

        if room and not getattr(room, "is_active", True):
            return JsonResponse(
                {"success": False, "error": "Выбранная комната выключена"}
            )

        if (
            room
            and getattr(room, "area", None) is not None
            and not getattr(room.area, "is_active", True)
        ):
            return JsonResponse(
                {"success": False, "error": "Выбранное помещение выключено"}
            )

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

        scenario_name = scenario.name if scenario else ""
        is_tariff_required = scenario_name in _TARIFF_REQUIRED_SCENARIOS

        if is_tariff_required:
            if people_count is None:
                return JsonResponse(
                    {"success": False, "error": "Укажите количество людей"}
                )
            if not tariff_id:
                return JsonResponse({"success": False, "error": "Выберите тариф"})
        else:
            if tariff_id:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Тариф нельзя указывать для выбранного сценария",
                    }
                )

        # Проверяем доступность
        try:
            check_room_availability(room, start_datetime, end_datetime)
            if specialist:
                check_specialist_availability(
                    specialist,
                    start_datetime,
                    end_datetime,
                    scenario_id=scenario_id,
                )
        except ValidationError as e:
            return JsonResponse(
                {
                    "success": False,
                    "error": e.messages[0] if getattr(e, "messages", None) else str(e),
                }
            )

        tariff = None
        if is_tariff_required:
            tariff = Tariff.objects.filter(id=tariff_id, active=True).first()
            if not tariff:
                return JsonResponse(
                    {"success": False, "error": "Выбранный тариф недоступен"}
                )

            available_tariffs = get_available_tariffs_for_booking(
                scenario=scenario,
                room=room,
                date_iso=start_datetime.date().isoformat(),
                start_time_hm=start_datetime.strftime("%H:%M"),
                end_time_hm=end_datetime.strftime("%H:%M"),
                people_count=people_count,
            )
            if str(tariff.id) not in {str(t.id) for t in available_tariffs}:
                return JsonResponse(
                    {"success": False, "error": "Выбранный тариф недоступен"}
                )

        service_ids_list = []
        for v in service_ids:
            try:
                service_ids_list.append(int(v))
            except (TypeError, ValueError):
                continue

        services_qs_for_cost = Service.objects.filter(id__in=service_ids_list)
        services_cost = Decimal("0")
        for s in services_qs_for_cost:
            if s.cost:
                services_cost += s.cost

        if is_tariff_required:
            duration_total_minutes = int(
                (end_datetime - start_datetime).total_seconds() // 60
            )
            rental_cost = (tariff.base_cost or Decimal("0")) * (
                Decimal(duration_total_minutes)
                / Decimal(max(1, int(tariff.base_duration_minutes)))
            )
            rental_cost = _quantize_money(rental_cost)
            total_cost = _quantize_money((rental_cost or Decimal("0")) + services_cost)

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
                people_count=people_count,
                room=room,
                scenario=scenario,
                tariff=tariff,
                status=approved_status,
                comment=comment,
                total_cost=total_cost,
            )

            if service_ids_list:
                services = Service.objects.filter(id__in=service_ids_list)
                reservation.services.add(*services)

        return JsonResponse({"success": True, "reservation_id": reservation.id})

    except BulkCreateBookingError as e:
        return JsonResponse(
            {
                "success": False,
                "error": e.message,
                "block_index": e.block_index,
                "field": e.field,
                "errors": [
                    {
                        "message": e.message,
                        "field": e.field,
                        "block_index": e.block_index,
                    }
                ],
            }
        )

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "error": f"Произошла ошибка при создании брони: {str(e)}",
            }
        )
