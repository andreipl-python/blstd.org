import json
from calendar import monthrange
from decimal import Decimal
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from booking.models import (
    Client,
    ClientGroup,
    Payment,
    Room,
    Service,
    Reservation,
    Scenario,
    Specialist,
    SpecialistWeeklyInterval,
    SpecialistScheduleOverride,
    Direction,
    Tariff,
    TariffWeeklyInterval,
    TariffUnit,
    PaymentType,
    Area,
    SpecialistService,  # Услуги преподавателей для сценария "Музыкальная школа"
)
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.serializers import serialize
from django.db.models import QuerySet, Q, Case, When, Value, IntegerField, Sum, Count
from django.http import JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils import timezone

from .menu2 import menu2_view


def generate_days_of_month(
    request_range: str = "day14", start_date_str: str = None, end_date_str: str = None
) -> list[dict[str, datetime | str | int]]:
    """Функция определяет текущий месяц и возврашает список дней месяца, начальную и конечную даты"""
    days_of_month = []
    today = timezone.now()

    if request_range == "period" and start_date_str and end_date_str:
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
    elif request_range == "month":
        # Для месяца берем первый день
        start_date = timezone.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
        _, number_of_days = monthrange(today.year, today.month)
    else:  # по умолчанию показываем  2 недели
        start_date = timezone.datetime(
            today.year, today.month, today.day, 0, 0, 0, tzinfo=today.tzinfo
        )
        number_of_days = 14

    for day in range(number_of_days):
        current_date = start_date + timedelta(days=day)
        days_of_month.append(
            {
                "date": current_date,
                "weekday": current_date.strftime("%A"),
                "timestamp": int(current_date.timestamp()),
            }
        )

    return days_of_month


def generate_time_blocks(
    starttime: str, hours_interval: int, num_blocks: int
) -> list[dict]:
    """Функция возвращает временной диапазон"""
    naive_start_time = datetime.strptime(starttime, "%H:%M")
    start_time = timezone.make_aware(
        timezone.datetime.combine(timezone.now().date(), naive_start_time.time())
    )
    interval = timedelta(hours=hours_interval)
    time_blocks = []

    for i in range(num_blocks):
        time_blocks.append({"time": (start_time + i * interval).strftime("%H:%M")})

    return time_blocks


def build_time_cells_and_blocks(work_time_start, work_time_end):
    start_minutes = 0
    end_minutes = 24 * 60

    if work_time_start is not None and work_time_end is not None:
        start_minutes = int(work_time_start.hour) * 60 + int(work_time_start.minute)
        end_minutes = int(work_time_end.hour) * 60 + int(work_time_end.minute)

        if end_minutes <= start_minutes:
            start_minutes = 0
            end_minutes = 24 * 60

    start_minutes = (start_minutes // 15) * 15
    end_minutes = ((end_minutes + 14) // 15) * 15
    if end_minutes > 24 * 60:
        end_minutes = 24 * 60

    time_cells = []
    for m in range(start_minutes, end_minutes, 15):
        time_cells.append(f"{m // 60:02d}:{m % 60:02d}")

    time_blocks = []
    prev_hour = None
    block_start = None
    block_colspan = 0
    for t in time_cells:
        hour = t[:2]
        if prev_hour is None:
            prev_hour = hour
            block_start = t
            block_colspan = 1
            continue

        if hour == prev_hour:
            block_colspan += 1
            continue

        time_blocks.append({"time": block_start, "colspan": block_colspan})
        prev_hour = hour
        block_start = t
        block_colspan = 1

    if prev_hour is not None:
        time_blocks.append({"time": block_start, "colspan": block_colspan})

    return time_cells, time_blocks


def add_blocks_datetime_range_and_room_name(
    reservation_objects: QuerySet, default_block_length_minutes: int
) -> list[dict[str, Any]]:
    reservation_objects = reservation_objects.select_related("room", "client", "status")

    reservations = list(reservation_objects)
    reservation_ids = [r.id for r in reservations]
    paid_by_reservation_id: dict[int, Decimal] = {}

    if reservation_ids:
        payments = (
            Payment.objects.filter(reservation_id__in=reservation_ids, canceled=False)
            .values("reservation_id")
            .annotate(total=Sum("amount"))
        )
        paid_by_reservation_id = {
            int(p["reservation_id"]): (p["total"] or Decimal("0")) for p in payments
        }

    result = []
    for reservation in reservations:
        total_cost = reservation.total_cost or Decimal("0")
        paid_amount = paid_by_reservation_id.get(reservation.id, Decimal("0"))
        remaining_amount = total_cost - paid_amount
        if remaining_amount < Decimal("0"):
            remaining_amount = Decimal("0")

        local_start = timezone.localtime(reservation.datetimestart)
        local_end = timezone.localtime(reservation.datetimeend)
        datetime_str_list = [
            (local_start + timedelta(minutes=i)).strftime("%Y-%m-%d %H:%M:%S")
            for i in range(
                0,
                int((local_end - local_start).total_seconds() // 60) + 1,
                default_block_length_minutes,
            )
        ]

        result.append(
            {
                "id": reservation.id,
                "room_name": reservation.room.name,
                "idroom": reservation.room_id,
                "scenario_id": reservation.scenario_id,
                "blocks_datetime_range": datetime_str_list,
                "client_id": reservation.client_id,
                "client_name": reservation.client.name if reservation.client else None,
                "client_comment": (
                    reservation.client.comment if reservation.client else None
                ),
                "client_phone": (
                    reservation.client.phone if reservation.client else None
                ),
                "client_group_id": reservation.client_group_id,
                "client_group_name": (
                    reservation.client_group.name if reservation.client_group else None
                ),
                "specialist_id": reservation.specialist_id,
                "status_id": reservation.status.id if reservation.status else 1,
                "comment": reservation.comment,
                "total_cost": str(total_cost),
                "paid_amount": str(paid_amount),
                "remaining_amount": str(remaining_amount),
            }
        )

    return result


@login_required(login_url="login")
def user_index_view(request):
    request_range = "day14"  # по умолчанию 2 неделb
    start_date_str = None
    end_date_str = None

    if request.method == "POST":
        if "month" in request.POST:
            request_range = "month"
        elif "period" in request.POST:  # исправлено с 'repiod' на 'period'
            from_date = request.POST.get("from_date")
            to_date = request.POST.get("to_date")
            if from_date and to_date:
                request_range = "period"
                start_date_str = from_date
                end_date_str = to_date

    days_of_month = generate_days_of_month(request_range, start_date_str, end_date_str)
    menu2_context = menu2_view(request)

    start_date = timezone.datetime.combine(
        days_of_month[0]["date"].date(), timezone.datetime.min.time()
    )
    start_date = timezone.make_aware(start_date)
    end_date = timezone.datetime.combine(
        days_of_month[-1]["date"].date(), timezone.datetime.max.time()
    )
    end_date = timezone.make_aware(end_date)

    # Помещения и сценарии для фильтров
    areas = Area.objects.prefetch_related("scenario").order_by("id")
    scenarios = Scenario.objects.order_by("id")

    areas_json = serialize("json", areas, use_natural_primary_keys=True)

    default_area = areas[0] if areas else None
    default_scenario = scenarios[0] if scenarios else None

    time_cells, time_blocks = build_time_cells_and_blocks(
        default_scenario.work_time_start if default_scenario else None,
        default_scenario.work_time_end if default_scenario else None,
    )
    time_blocks_json = json.dumps(time_blocks)

    # Брони в выбранном диапазоне с учётом дефолтного помещения и сценария
    bookings_in_range_qs = Reservation.objects.filter(
        Q(datetimestart__lte=end_date) & Q(datetimeend__gte=start_date)
    ).exclude(status_id__in=[4, 1082])

    if default_area is not None:
        bookings_in_range_qs = bookings_in_range_qs.filter(
            room__area_id=default_area.id
        )

    bookings_in_range = add_blocks_datetime_range_and_room_name(
        bookings_in_range_qs, 15
    )
    bookings_in_range_json = json.dumps(bookings_in_range)

    clients = Client.objects.prefetch_related(
        "subscription_set__reservation_type", "clientrating_set", "groups"
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
            group_data.append(
                {
                    "id": group.id,
                    "name": group.name,
                    "clients": [c.name for c in group.clients.all()],
                }
            )

        clients_with_balances.append(
            {
                "id": client.id,
                "name": client.name,
                "comment": client.comment,
                "phone": client.phone,
                "rating": client.rating,
                "rating_count": client.clientrating_set.count(),
                "balances": balances,
                "group": group_data,
            }
        )

    clients_json = json.dumps(clients_with_balances)

    services = (
        Service.objects.select_related("group")
        .prefetch_related("scenario")
        .annotate(usage_count=Count("reservations", distinct=True))
        .order_by("-usage_count", "name")
    )

    services_json = serialize("json", services, use_natural_foreign_keys=True)

    specialists = Specialist.objects.prefetch_related("directions").all()
    specialists_json = serialize("json", specialists, use_natural_primary_keys=True)

    directions = Direction.objects.filter(active=True).order_by("name")

    rooms_all = Room.objects.prefetch_related("scenario").all()
    rooms_json = serialize("json", rooms_all, use_natural_primary_keys=True)

    if default_area is not None:
        rooms = rooms_all.filter(area_id=default_area.id)
    else:
        rooms = rooms_all

    scenarios_json = serialize("json", scenarios, use_natural_primary_keys=True)

    tariff_units = TariffUnit.objects.all()
    tariff_units_json = serialize("json", tariff_units)

    tariffs = Tariff.objects.filter(active=True).prefetch_related("scenarios", "rooms")
    tariffs_json = serialize("json", tariffs)

    tariff_weekly_intervals = TariffWeeklyInterval.objects.filter(tariff__active=True)
    tariff_weekly_intervals_json = serialize("json", tariff_weekly_intervals)

    # Группы клиентов для сценария "Репетиционная точка"
    client_groups = ClientGroup.objects.all()
    client_groups_json = json.dumps(
        [{"id": cg.id, "name": cg.name} for cg in client_groups]
    )

    payment_types = PaymentType.objects.all().order_by("id")
    payment_types_json = json.dumps(
        [
            {
                "id": payment_type.id,
                "name": payment_type.name,
            }
            for payment_type in payment_types
        ]
    )

    version_value = ""
    version_file = Path(settings.BASE_DIR).parent / "VERSION"
    try:
        with version_file.open(encoding="utf-8") as f:
            version_value = f.read().strip()
    except OSError:
        version_value = ""

    # Услуги преподавателей для сценария "Музыкальная школа"
    specialist_services = SpecialistService.objects.filter(active=True).order_by("name")

    # Маппинг услуги преподавателя → список ID специалистов, которые её оказывают.
    # Используется для фильтрации услуг по доступным специалистам на фронтенде.
    specialist_service_to_specialists = {}
    for specialist in Specialist.objects.filter(active=True).prefetch_related(
        "specialist_services"
    ):
        for service in specialist.specialist_services.filter(active=True):
            if service.id not in specialist_service_to_specialists:
                specialist_service_to_specialists[service.id] = []
            specialist_service_to_specialists[service.id].append(specialist.id)

    # JSON для передачи на фронтенд: {service_id: [specialist_id, ...]}
    specialist_service_to_specialists_json = json.dumps(
        specialist_service_to_specialists
    )

    pending_requests_count = Reservation.objects.filter(status_id=1079).count()

    context = {
        **menu2_context,
        "days_of_month": days_of_month,
        "time_blocks": time_blocks,
        "time_blocks_json": time_blocks_json,
        "rooms": rooms,
        "rooms_json": rooms_json,
        "areas": areas,
        "areas_json": areas_json,
        "scenarios": scenarios,
        "scenarios_json": scenarios_json,
        "show_datefrom": days_of_month[0]["date"].date().isoformat(),
        "show_dateto": days_of_month[-1]["date"].date().isoformat(),
        "services": services,
        "services_json": services_json,
        "specialists": specialists,
        "specialists_json": specialists_json,
        "directions": directions,
        "bookings_in_range": bookings_in_range_json,
        "tariff_units_json": tariff_units_json,
        "tariffs_json": tariffs_json,
        "tariff_weekly_intervals_json": tariff_weekly_intervals_json,
        "clients": clients,
        "clients_json": clients_json,
        "client_groups": client_groups,
        "client_groups_json": client_groups_json,
        "payment_types_json": payment_types_json,
        "time_cells": time_cells,
        "app_version": version_value,
        "specialist_services": specialist_services,  # Услуги преподавателей для "Музыкальная школа"
        "specialist_service_to_specialists_json": specialist_service_to_specialists_json,  # Маппинг услуга→специалисты
        "pending_requests_count": pending_requests_count,
    }

    return render(request, "booking/user/user_index.html", context)


@login_required(login_url="login")
def get_pending_requests_count(request):
    pending_requests_count = Reservation.objects.filter(status_id=1079).count()
    return JsonResponse(
        {"success": True, "pending_requests_count": pending_requests_count}
    )


@login_required(login_url="login")
def get_bookings_grid(request):
    """Возвращает актуальные брони для сетки календаря в заданном диапазоне дат.

    Ожидает параметры GET:
      - date_from (YYYY-MM-DD)
      - date_to   (YYYY-MM-DD)

    Формат ответа совместим с bookings_in_range на главной странице.
    """

    date_from_str = request.GET.get("date_from")
    date_to_str = request.GET.get("date_to")
    area_id = request.GET.get("area_id")

    if not date_from_str or not date_to_str:
        return JsonResponse(
            {
                "success": False,
                "error": "Параметры date_from и date_to обязательны",
            },
            status=400,
        )

    try:
        start_date = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").date()
        end_date = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный формат даты, ожидается YYYY-MM-DD",
            },
            status=400,
        )

    if start_date > end_date:
        return JsonResponse(
            {
                "success": False,
                "error": "date_from не может быть больше date_to",
            },
            status=400,
        )

    start_dt = timezone.datetime.combine(start_date, timezone.datetime.min.time())
    end_dt = timezone.datetime.combine(end_date, timezone.datetime.max.time())
    start_dt = timezone.make_aware(start_dt)
    end_dt = timezone.make_aware(end_dt)

    bookings_qs = Reservation.objects.filter(
        Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt)
    ).exclude(status_id__in=[4, 1082])

    # Дополнительная фильтрация по помещению и сценарию, если переданы
    area_id_int = None
    if area_id:
        try:
            area_id_int = int(area_id)
        except (TypeError, ValueError):
            area_id_int = None
        if area_id_int is not None:
            bookings_qs = bookings_qs.filter(room__area_id=area_id_int)

    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_qs, 15)

    return JsonResponse(
        {
            "success": True,
            "bookings_in_range": bookings_in_range,
            "date_from": date_from_str,
            "date_to": date_to_str,
        }
    )


@login_required(login_url="login")
def get_calendar_grid(request):
    """Возвращает HTML календарной сетки и список броней для заданного диапазона дат и фильтров.

    Ожидает параметры GET:
      - date_from (YYYY-MM-DD)
      - date_to   (YYYY-MM-DD)
      - area_id   (опционально)
      - scenario_id (опционально)
    """

    date_from_str = request.GET.get("date_from")
    date_to_str = request.GET.get("date_to")
    area_id = request.GET.get("area_id")
    scenario_id = request.GET.get("scenario_id")

    if not date_from_str or not date_to_str:
        return JsonResponse(
            {
                "success": False,
                "error": "Параметры date_from и date_to обязательны",
            },
            status=400,
        )

    try:
        start_date = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").date()
        end_date = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный формат даты, ожидается YYYY-MM-DD",
            },
            status=400,
        )

    if start_date > end_date:
        return JsonResponse(
            {
                "success": False,
                "error": "date_from не может быть больше date_to",
            },
            status=400,
        )

    # Даты в виде aware-datetime для выборки броней
    start_dt = timezone.datetime.combine(start_date, timezone.datetime.min.time())
    end_dt = timezone.datetime.combine(end_date, timezone.datetime.max.time())
    start_dt = timezone.make_aware(start_dt)
    end_dt = timezone.make_aware(end_dt)

    # Те же вспомогательные структуры, что и на основной странице
    days_of_month = generate_days_of_month("period", date_from_str, date_to_str)

    scenario_obj = None
    scenario_id_int = None
    if scenario_id:
        try:
            scenario_id_int = int(scenario_id)
        except (TypeError, ValueError):
            scenario_id_int = None

    if scenario_id_int is not None:
        scenario_obj = (
            Scenario.objects.filter(pk=scenario_id_int)
            .only("work_time_start", "work_time_end")
            .first()
        )

    time_cells, time_blocks = build_time_cells_and_blocks(
        scenario_obj.work_time_start if scenario_obj else None,
        scenario_obj.work_time_end if scenario_obj else None,
    )

    rooms_qs = Room.objects.prefetch_related("scenario").all()

    area_id_int = None
    if area_id:
        try:
            area_id_int = int(area_id)
        except (TypeError, ValueError):
            area_id_int = None
        if area_id_int is not None:
            rooms_qs = rooms_qs.filter(area_id=area_id_int)

    rooms = list(rooms_qs)

    bookings_qs = Reservation.objects.filter(
        Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt)
    ).exclude(status_id__in=[4, 1082])

    if area_id_int is not None:
        bookings_qs = bookings_qs.filter(room__area_id=area_id_int)

    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_qs, 15)

    html = render_to_string(
        "booking/user/_calendar_grid.html",
        {
            "days_of_month": days_of_month,
            "time_blocks": time_blocks,
            "rooms": rooms,
            "time_cells": time_cells,
        },
        request=request,
    )

    return JsonResponse(
        {
            "success": True,
            "html": html,
            "bookings_in_range": bookings_in_range,
            "time_blocks": time_blocks,
            "time_cells": time_cells,
            "date_from": date_from_str,
            "date_to": date_to_str,
        }
    )


@login_required(login_url="login")
def get_room_bookings_for_date(request):
    """Возвращает все брони комнаты на указанную дату (без фильтра по сценарию).

    Используется в модалке создания брони для проверки пересечений
    с бронями других сценариев.

    Ожидает параметры GET:
      - room_id (обязательный)
      - date    (YYYY-MM-DD, обязательный)
    """

    room_id = request.GET.get("room_id")
    date_str = request.GET.get("date")

    if not room_id or not date_str:
        return JsonResponse(
            {
                "success": False,
                "error": "Параметры room_id и date обязательны",
            },
            status=400,
        )

    try:
        room_id_int = int(room_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный room_id",
            },
            status=400,
        )

    try:
        target_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный формат даты, ожидается YYYY-MM-DD",
            },
            status=400,
        )

    start_dt = timezone.datetime.combine(target_date, timezone.datetime.min.time())
    end_dt = timezone.datetime.combine(target_date, timezone.datetime.max.time())
    start_dt = timezone.make_aware(start_dt)
    end_dt = timezone.make_aware(end_dt)

    # Все брони в комнате на дату (без фильтра по сценарию!)
    bookings_qs = Reservation.objects.filter(
        Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt),
        room_id=room_id_int,
    ).exclude(status_id__in=[4, 1082])

    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_qs, 15)

    return JsonResponse(
        {
            "success": True,
            "bookings": bookings_in_range,
            "room_id": room_id_int,
            "date": date_str,
        }
    )


@login_required(login_url="login")
def get_busy_specialists_for_date(request):
    """Возвращает список занятых специалистов на указанную дату с их временными интервалами.

    Используется в модалке создания брони для проверки доступности преподавателей.
    Возвращает всех специалистов, у которых есть брони на эту дату (вне зависимости
    от комнаты, сценария или помещения).

    Ожидает параметры GET:
      - date (YYYY-MM-DD, обязательный)
    """

    date_str = request.GET.get("date")

    if not date_str:
        return JsonResponse(
            {
                "success": False,
                "error": "Параметр date обязателен",
            },
            status=400,
        )

    try:
        target_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный формат даты, ожидается YYYY-MM-DD",
            },
            status=400,
        )

    start_dt = timezone.datetime.combine(target_date, timezone.datetime.min.time())
    end_dt = timezone.datetime.combine(target_date, timezone.datetime.max.time())
    start_dt = timezone.make_aware(start_dt)
    end_dt = timezone.make_aware(end_dt)

    # Все брони на дату с назначенным специалистом (исключаем отменённые)
    bookings_qs = (
        Reservation.objects.filter(
            Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt),
            specialist__isnull=False,
            specialist__active=True,
        )
        .exclude(status_id__in=[4, 1082])
        .select_related("specialist")
    )

    # Специалист может быть занят в это время как клиент (например, берёт урок у другого).
    # Для фронта это тоже считается "busy".
    client_to_specialist_ids = {}
    for spec_id, client_id in Specialist.objects.filter(
        active=True,
        client_id__isnull=False,
    ).values_list("id", "client_id"):
        client_to_specialist_ids.setdefault(int(client_id), []).append(int(spec_id))

    client_bookings_qs = Reservation.objects.none()
    client_busy_specialist_ids = set()
    if client_to_specialist_ids:
        client_bookings_qs = Reservation.objects.filter(
            Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt),
            client_id__in=list(client_to_specialist_ids.keys()),
        ).exclude(status_id__in=[4, 1082])

        busy_client_ids = set(client_bookings_qs.values_list("client_id", flat=True))
        for cid in busy_client_ids:
            for sid in client_to_specialist_ids.get(int(cid), []):
                client_busy_specialist_ids.add(int(sid))

    def _time_to_minutes(t):
        # Минуты от полуночи для компактной передачи на фронт.
        return t.hour * 60 + t.minute

    def _merge_work_intervals(work_intervals_minutes):
        # Объединяем пересекающиеся/прилегающие интервалы рабочего времени.
        merged = []
        for s, e in sorted(work_intervals_minutes, key=lambda x: x[0]):
            if s < 0:
                s = 0
            if e > 24 * 60:
                e = 24 * 60
            if s >= e:
                continue
            if not merged or s > merged[-1][1]:
                merged.append([s, e])
            else:
                merged[-1][1] = max(merged[-1][1], e)
        return merged

    def _get_unavailability_intervals_for_specialist(specialist_id: int):
        # Возвращаем интервалы НЕДОСТУПНОСТИ (gaps), то есть всё, что вне рабочего
        # времени специалиста на эту дату. Эти интервалы отдаем фронту как "busy",
        # чтобы повторно использовать существующую проверку isSpecialistBusy.
        override = overrides_map.get(specialist_id)
        if override is not None:
            if override.is_day_off:
                return [(0, 24 * 60)]
            work = [
                (_time_to_minutes(i.start_time), _time_to_minutes(i.end_time))
                for i in getattr(override, "intervals", []).all()
            ]
        else:
            if specialist_id not in specialists_with_any_weekly:
                # Нет weekly-расписания вообще — значит не ограничиваем доступность.
                return []
            work = weekly_work_map.get(specialist_id, [])

        work_merged = _merge_work_intervals(work)
        if not work_merged:
            # Есть расписание (weekly/override), но на дату нет рабочих интервалов.
            return [(0, 24 * 60)]

        gaps = []
        prev_end = 0
        for s, e in work_merged:
            if prev_end < s:
                gaps.append((prev_end, s))
            prev_end = max(prev_end, e)
        if prev_end < 24 * 60:
            gaps.append((prev_end, 24 * 60))
        return gaps

    overrides_qs = SpecialistScheduleOverride.objects.filter(
        date=target_date,
        specialist__active=True,
    ).prefetch_related("intervals")
    overrides_map = {o.specialist_id: o for o in overrides_qs}

    specialists_with_any_weekly = set(
        SpecialistWeeklyInterval.objects.filter(specialist__active=True)
        .values_list("specialist_id", flat=True)
        .distinct()
    )
    weekday = int(target_date.weekday())
    weekly_work_map = {}
    for spec_id, start_t, end_t in SpecialistWeeklyInterval.objects.filter(
        weekday=weekday,
        specialist_id__in=specialists_with_any_weekly,
    ).values_list("specialist_id", "start_time", "end_time"):
        weekly_work_map.setdefault(int(spec_id), []).append(
            (_time_to_minutes(start_t), _time_to_minutes(end_t))
        )

    relevant_specialist_ids = (
        set(bookings_qs.values_list("specialist_id", flat=True))
        | set(overrides_map.keys())
        | set(specialists_with_any_weekly)
        | set(client_busy_specialist_ids)
    )

    specialist_names = {
        s.id: s.name
        for s in Specialist.objects.filter(
            id__in=relevant_specialist_ids,
            active=True,
        ).only("id", "name")
    }

    # Собираем данные о занятости специалистов
    busy_specialists = {}

    for spec_id in relevant_specialist_ids:
        # Сначала добавляем "занятость" из расписания (вне рабочего времени).
        unavail = _get_unavailability_intervals_for_specialist(int(spec_id))
        if not unavail:
            continue

        busy_specialists[int(spec_id)] = {
            "id": int(spec_id),
            "name": specialist_names.get(int(spec_id), ""),
            "intervals": [
                {
                    "startMinutes": s,
                    "endMinutes": e,
                }
                for s, e in unavail
            ],
        }
    for booking in bookings_qs:
        # Затем дополняем фактическими бронями, чтобы фронт видел обе причины
        # недоступности: "не работает" и "занят бронью".
        spec_id = booking.specialist_id
        if spec_id not in busy_specialists:
            busy_specialists[spec_id] = {
                "id": spec_id,
                "name": booking.specialist.name,
                "intervals": [],
            }

        # Конвертируем время в минуты от полуночи
        local_start = timezone.localtime(booking.datetimestart)
        local_end = timezone.localtime(booking.datetimeend)

        start_minutes = (
            0
            if local_start.date() < target_date
            else (local_start.hour * 60 + local_start.minute)
        )
        end_minutes = (
            (24 * 60)
            if local_end.date() > target_date
            else (local_end.hour * 60 + local_end.minute)
        )

        if end_minutes <= start_minutes:
            continue

        busy_specialists[spec_id]["intervals"].append(
            {
                "booking_id": booking.id,
                "startMinutes": start_minutes,
                "endMinutes": end_minutes,
            }
        )

    # Дополняем занятость специалистов как клиентов.
    for booking in client_bookings_qs:
        client_id = booking.client_id
        for spec_id in client_to_specialist_ids.get(int(client_id), []):
            spec_id = int(spec_id)
            if spec_id not in busy_specialists:
                busy_specialists[spec_id] = {
                    "id": spec_id,
                    "name": specialist_names.get(spec_id, ""),
                    "intervals": [],
                }

            local_start = timezone.localtime(booking.datetimestart)
            local_end = timezone.localtime(booking.datetimeend)

            start_minutes = (
                0
                if local_start.date() < target_date
                else (local_start.hour * 60 + local_start.minute)
            )
            end_minutes = (
                (24 * 60)
                if local_end.date() > target_date
                else (local_end.hour * 60 + local_end.minute)
            )

            if end_minutes <= start_minutes:
                continue

            busy_specialists[spec_id]["intervals"].append(
                {
                    "booking_id": booking.id,
                    "startMinutes": start_minutes,
                    "endMinutes": end_minutes,
                }
            )

    return JsonResponse(
        {
            "success": True,
            "busy_specialists": list(busy_specialists.values()),
            "date": date_str,
        }
    )


@login_required(login_url="login")
def get_specialists_work_intervals(request):
    date_from_str = request.GET.get("date_from")
    date_to_str = request.GET.get("date_to")
    scenario_id_str = request.GET.get("scenario_id")

    if not date_from_str or not date_to_str:
        return JsonResponse(
            {
                "success": False,
                "error": "Параметры date_from и date_to обязательны",
            },
            status=400,
        )

    try:
        start_date = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").date()
        end_date = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный формат даты, ожидается YYYY-MM-DD",
            },
            status=400,
        )

    if start_date > end_date:
        return JsonResponse(
            {
                "success": False,
                "error": "date_from не может быть больше date_to",
            },
            status=400,
        )

    if (end_date - start_date).days > 60:
        return JsonResponse(
            {
                "success": False,
                "error": "Слишком большой диапазон дат",
            },
            status=400,
        )

    # Фильтрация специалистов по сценарию (если передан) и активности
    specialists_qs = Specialist.objects.filter(active=True).prefetch_related(
        "directions"
    )
    if scenario_id_str:
        try:
            scenario_id_int = int(scenario_id_str)
            specialists_qs = specialists_qs.filter(scenarios__id=scenario_id_int)
        except (ValueError, TypeError):
            pass
    specialists = list(specialists_qs)
    specialist_ids = [s.id for s in specialists]

    teachers = []
    for s in specialists:
        teachers.append(
            {
                "id": int(s.id),
                "name": s.name,
                "role": s.role,
                "directions": [
                    {"id": int(d.id), "name": d.name} for d in s.directions.all()
                ],
            }
        )

    specialists_with_any_weekly = set(
        SpecialistWeeklyInterval.objects.filter(specialist_id__in=specialist_ids)
        .values_list("specialist_id", flat=True)
        .distinct()
    )

    weekly_work_map = {}
    for spec_id, weekday, start_t, end_t in SpecialistWeeklyInterval.objects.filter(
        specialist_id__in=specialist_ids
    ).values_list("specialist_id", "weekday", "start_time", "end_time"):
        weekly_work_map.setdefault((int(spec_id), int(weekday)), []).append(
            (start_t, end_t)
        )

    overrides_qs = (
        SpecialistScheduleOverride.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            specialist_id__in=specialist_ids,
            specialist__active=True,
        )
        .prefetch_related("intervals")
        .select_related("specialist")
    )
    overrides_map = {(int(o.specialist_id), o.date): o for o in overrides_qs}

    def _time_to_minutes(t):
        return int(t.hour) * 60 + int(t.minute)

    def _merge_intervals_minutes(intervals):
        merged = []
        for s, e in sorted(intervals, key=lambda x: x[0]):
            if s < 0:
                s = 0
            if e > 24 * 60:
                e = 24 * 60
            if s >= e:
                continue
            if not merged or s > merged[-1][1]:
                merged.append([s, e])
            else:
                merged[-1][1] = max(merged[-1][1], e)
        return merged

    work_intervals_by_date = {}
    cur = start_date
    while cur <= end_date:
        date_key = cur.isoformat()
        weekday = int(cur.weekday())
        by_spec = {}
        for spec_id in specialist_ids:
            override = overrides_map.get((int(spec_id), cur))
            intervals_minutes = []

            if override is not None:
                if override.is_day_off:
                    intervals_minutes = []
                else:
                    intervals_minutes = [
                        (_time_to_minutes(i.start_time), _time_to_minutes(i.end_time))
                        for i in getattr(override, "intervals", []).all()
                        if i.start_time is not None and i.end_time is not None
                    ]
            else:
                if int(spec_id) in specialists_with_any_weekly:
                    intervals_minutes = [
                        (_time_to_minutes(s), _time_to_minutes(e))
                        for s, e in weekly_work_map.get((int(spec_id), weekday), [])
                        if s is not None and e is not None
                    ]
                else:
                    intervals_minutes = [(0, 24 * 60)]

            merged = _merge_intervals_minutes(intervals_minutes)
            # Не включаем специалиста, если у него нет рабочих интервалов в этот день
            if merged:
                by_spec[str(int(spec_id))] = [
                    {"startMinutes": s, "endMinutes": e} for s, e in merged
                ]

        work_intervals_by_date[date_key] = by_spec
        cur += timedelta(days=1)

    return JsonResponse(
        {
            "success": True,
            "date_from": date_from_str,
            "date_to": date_to_str,
            "teachers": teachers,
            "work_intervals_by_date": work_intervals_by_date,
        }
    )
