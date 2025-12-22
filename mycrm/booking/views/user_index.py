import json
from calendar import monthrange
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from booking.models import (
    Client,
    Room,
    Service,
    Reservation,
    Scenario,
    Specialist,
    Direction,
    TariffUnit,
    PaymentType,
    Area,
)
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.serializers import serialize
from django.db.models import QuerySet, Q, Case, When, Value, IntegerField
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


def add_blocks_datetime_range_and_room_name(
    reservation_objects: QuerySet, default_block_length_minutes: int
) -> list[dict[str, Any]]:
    reservation_objects = reservation_objects.select_related("room", "client", "status")

    result = []
    for reservation in reservation_objects:
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
                "blocks_datetime_range": datetime_str_list,
                "client_id": reservation.client_id,
                "client_name": reservation.client.name,
                "client_comment": reservation.client.comment,
                "client_phone": reservation.client.phone,
                "specialist_id": reservation.specialist_id,
                "status_id": reservation.status.id if reservation.status else 1,
                "comment": reservation.comment,
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
    time_blocks = generate_time_blocks("00:00", 1, 24)
    time_blocks_json = json.dumps(time_blocks)

    start_date = timezone.datetime.combine(
        days_of_month[0]["date"].date(), timezone.datetime.min.time()
    )
    start_date = timezone.make_aware(start_date)
    end_date = timezone.datetime.combine(
        days_of_month[-1]["date"].date(), timezone.datetime.max.time()
    )
    end_date = timezone.make_aware(end_date)

    # Помещения и сценарии для фильтров
    areas = Area.objects.prefetch_related("scenario").all()
    scenarios = Scenario.objects.all()

    default_area = areas[0] if areas else None
    default_scenario = scenarios[0] if scenarios else None

    # Брони в выбранном диапазоне с учётом дефолтного помещения и сценария
    bookings_in_range_qs = Reservation.objects.filter(
        Q(datetimestart__lte=end_date) & Q(datetimeend__gte=start_date)
    ).exclude(status_id__in=[4, 1082])

    if default_area is not None:
        bookings_in_range_qs = bookings_in_range_qs.filter(
            room__area_id=default_area.id
        )

    if default_scenario is not None:
        bookings_in_range_qs = bookings_in_range_qs.filter(
            scenario_id=default_scenario.id
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
        .annotate(
            group_order=Case(
                When(group__name="Аренда оборудования", then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        )
        .order_by("group_order", "group__name", "name")
    )

    services_json = serialize("json", services, use_natural_foreign_keys=True)

    specialists = Specialist.objects.prefetch_related("scenario", "directions").all()
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

    context = {
        **menu2_context,
        "days_of_month": days_of_month,
        "time_blocks": time_blocks,
        "time_blocks_json": time_blocks_json,
        "rooms": rooms,
        "rooms_json": rooms_json,
        "areas": areas,
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
        "clients": clients,
        "clients_json": clients_json,
        "payment_types_json": payment_types_json,
        "time_cells": range(96),
        "app_version": version_value,
    }

    return render(request, "booking/user/user_index.html", context)


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

    scenario_id_int = None
    if scenario_id:
        try:
            scenario_id_int = int(scenario_id)
        except (TypeError, ValueError):
            scenario_id_int = None
        if scenario_id_int is not None:
            bookings_qs = bookings_qs.filter(scenario_id=scenario_id_int)

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
    time_blocks = generate_time_blocks("00:00", 1, 24)

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

    scenario_id_int = None
    if scenario_id:
        try:
            scenario_id_int = int(scenario_id)
        except (TypeError, ValueError):
            scenario_id_int = None
        if scenario_id_int is not None:
            bookings_qs = bookings_qs.filter(scenario_id=scenario_id_int)

    bookings_in_range = add_blocks_datetime_range_and_room_name(bookings_qs, 15)

    html = render_to_string(
        "booking/user/_calendar_grid.html",
        {
            "days_of_month": days_of_month,
            "time_blocks": time_blocks,
            "rooms": rooms,
            "time_cells": range(96),
        },
        request=request,
    )

    return JsonResponse(
        {
            "success": True,
            "html": html,
            "bookings_in_range": bookings_in_range,
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

    # Все брони на дату с назначенным специалистом (исключаем отменённые, status_id=4)
    bookings_qs = (
        Reservation.objects.filter(
            Q(datetimestart__lte=end_dt) & Q(datetimeend__gte=start_dt),
            specialist__isnull=False,
        )
        .exclude(status_id__in=[4, 1082])
        .select_related("specialist")
    )

    # Собираем данные о занятости специалистов
    busy_specialists = {}
    for booking in bookings_qs:
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
        start_minutes = local_start.hour * 60 + local_start.minute
        end_minutes = local_end.hour * 60 + local_end.minute

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
