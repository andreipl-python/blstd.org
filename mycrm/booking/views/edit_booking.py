import json
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .create_booking import (
    check_room_availability,
    check_specialist_availability,
    check_specialist_schedule,
)
from ..models import (
    Reservation,
    Room,
    Service,
    Specialist,
    SpecialistService,
    ReservationStatusType,
    PaymentType,
    Payment,
    CancellationReason,
    Subscription,
    TariffUnit,
    Client,
    Direction,
)


def get_booking_details(request, booking_id):
    """Получение детальной информации о брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)

        payment_types = PaymentType.objects.exclude(name="Тарифные единицы")

        start_datetime = timezone.localtime(booking.datetimestart)
        end_datetime = timezone.localtime(booking.datetimeend)

        weekdays = {
            0: "понедельник",
            1: "вторник",
            2: "среда",
            3: "четверг",
            4: "пятница",
            5: "суббота",
            6: "воскресенье",
        }

        months = {
            1: "января",
            2: "февраля",
            3: "марта",
            4: "апреля",
            5: "мая",
            6: "июня",
            7: "июля",
            8: "августа",
            9: "сентября",
            10: "октября",
            11: "ноября",
            12: "декабря",
        }

        month_name = months.get(start_datetime.month, start_datetime.strftime("%m"))
        weekday_name = weekdays[start_datetime.weekday()]

        # Пример формата: "18 сентября / четверг"
        date_str = f"{start_datetime.day} {month_name} / {weekday_name}"
        time_str = (
            f"{start_datetime.strftime('%H:%M')} - {end_datetime.strftime('%H:%M')}"
        )

        duration_total_minutes = int(
            (booking.datetimeend - booking.datetimestart).total_seconds() // 60
        )
        duration_hours = duration_total_minutes // 60
        duration_minutes = duration_total_minutes % 60

        duration_str = ""
        if duration_hours > 0:
            duration_str += f"{duration_hours}ч"
        if duration_minutes > 0:
            if duration_hours > 0:
                duration_str += " "
            duration_str += f"{duration_minutes}мин"

        # Вычисляем стоимость аренды и услуг
        total_cost = booking.total_cost or Decimal("0")
        service_cost = sum(
            (service.cost or Decimal("0")) for service in booking.services.all()
        )
        total_rental_cost = total_cost - service_cost

        # Получаем сумму платежей тарифными единицами
        rental_payments = Payment.objects.filter(
            reservation=booking, payment_type__name="Тарифные единицы"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Вычисляем оставшуюся стоимость аренды
        remaining_rental_cost = (total_rental_cost or Decimal("0")) - rental_payments

        # Получаем сумму всех платежей для данной брони
        total_payments = Payment.objects.filter(
            reservation=booking, canceled=False
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Вычисляем оставшуюся сумму
        remaining_amount = (total_cost or Decimal("0")) - total_payments

        # Получаем подписку клиента для данного типа брони
        subscription = None
        available_units = 0
        required_units = 0
        can_use_units = False
        client_balance = None
        max_units_allowed = 0

        if booking.client and booking.scenario_id:
            subscription = Subscription.objects.filter(
                client=booking.client, scenario=booking.scenario
            ).first()

            if subscription:
                available_units = subscription.balance
                client_balance = subscription.balance

                # Получаем тарифную единицу для типа брони
                tariff_unit = TariffUnit.objects.filter(
                    scenario=booking.scenario
                ).first()

                if tariff_unit:
                    # Вычисляем продолжительность брони в минутах
                    duration_minutes = (
                        booking.datetimeend - booking.datetimestart
                    ).seconds // 60
                    required_units = duration_minutes // (
                        tariff_unit.min_reservation_time.hour * 60
                        + tariff_unit.min_reservation_time.minute
                    )
                    can_use_units = available_units >= required_units

                    # Вычисляем максимальное количество доступных единиц
                    if tariff_unit.tariff_unit_cost > 0:
                        max_units_allowed = min(
                            int(remaining_rental_cost / tariff_unit.tariff_unit_cost),
                            available_units,
                        )

        # Группируем услуги по группам
        services_by_group = {}
        total_services_cost = Decimal("0")

        for service in booking.services.select_related("group").all():
            group_name = service.group.name if service.group else "Другое"
            if group_name not in services_by_group:
                services_by_group[group_name] = []
            services_by_group[group_name].append(
                {
                    "id": service.id,
                    "name": service.name,
                    "cost": str(service.cost if service.cost else "0"),
                }
            )
            if service.cost:
                total_services_cost += service.cost

        # Получаем все платежи для данной брони
        payments = (
            Payment.objects.filter(reservation=booking)
            .select_related("payment_type")
            .order_by("-created_at")
        )
        payments_history = []
        for payment in payments:
            payments_history.append(
                {
                    "date": payment.created_at.strftime("%d.%m.%Y %H:%M"),
                    "type": payment.payment_type.name,
                    "amount": str(payment.amount),
                }
            )

        booking_data = {
            "id": booking.id,
            "date": date_str,
            "time": time_str,
            "duration": duration_str,
            "date_iso": start_datetime.date().isoformat(),
            "start_time_hm": start_datetime.strftime("%H:%M"),
            "end_time_hm": end_datetime.strftime("%H:%M"),
            "duration_hhmm": f"{duration_hours:02d}:{duration_minutes:02d}",
            "room_id": booking.room.id if booking.room else None,
            "room_name": booking.room.name if booking.room else "Не указано",
            "client_id": booking.client.id if booking.client else None,
            "client_name": str(booking.client) if booking.client else "Не указан",
            "client_phone": (
                booking.client.phone
                if booking.client and booking.client.phone
                else None
            ),
            "client_email": (
                booking.client.email
                if booking.client and booking.client.email
                else None
            ),
            "specialist_id": booking.specialist.id if booking.specialist else None,
            "specialist_name": str(booking.specialist) if booking.specialist else None,
            "direction_id": (
                booking.direction.id if getattr(booking, "direction", None) else None
            ),
            "direction_name": (
                booking.direction.name
                if getattr(booking, "direction", None)
                else "Не указано"
            ),
            "specialist_service_id": (
                booking.specialist_service.id
                if getattr(booking, "specialist_service", None)
                else None
            ),
            "specialist_service_name": (
                booking.specialist_service.name
                if getattr(booking, "specialist_service", None)
                else None
            ),
            "service_ids": list(booking.services.values_list("id", flat=True)),
            "scenario_id": booking.scenario_id,
            "services_by_group": services_by_group,
            "total_services_cost": str(total_services_cost),
            "total_cost": str(booking.total_cost) if booking.total_cost else "0",
            "paid_amount": str(total_payments),
            "remaining_amount": str(remaining_amount),
            "reservation_cost": str(total_rental_cost),
            "remaining_rental_cost": str(remaining_rental_cost),
            "max_units_allowed": max_units_allowed,
            "status": booking.status.id if booking.status else None,
            "status_name": booking.status.name if booking.status else "Не указан",
            "comment": booking.comment,
            "payment_types": [{"id": pt.id, "name": pt.name} for pt in payment_types],
            "can_use_units": can_use_units,
            "available_units": available_units,
            "required_units": required_units,
            "client_balance": client_balance,
            "reservation_type": (
                booking.scenario.name if booking.scenario_id else "Не указан"
            ),
            "payments_history": payments_history,
            "client_group_id": booking.client_group_id,
            "client_group_name": (
                booking.client_group.name if booking.client_group else None
            ),
        }

        return JsonResponse({"success": True, "booking": booking_data})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)


@csrf_exempt
def delete_booking_view(request, booking_id):
    """Удаление брони (soft-delete через статус cancelled)"""
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "error": "Метод не поддерживается"}, status=405
        )

    try:
        booking = get_object_or_404(Reservation, id=booking_id)

        cancellation_reason_id = None
        if request.body:
            try:
                payload = json.loads(request.body or "{}")
                cancellation_reason_id = payload.get("cancellation_reason_id")
            except Exception:
                cancellation_reason_id = None

        if cancellation_reason_id:
            cancellation_reason = get_object_or_404(
                CancellationReason, id=cancellation_reason_id
            )
            booking.cancellation_reason = cancellation_reason

        cancelled_status = get_object_or_404(ReservationStatusType, id=1082)
        booking.status = cancelled_status
        booking.save()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)


@csrf_exempt
def edit_booking_view(request, booking_id):
    """Редактирование брони"""
    try:
        if request.method != "POST":
            return JsonResponse(
                {"success": False, "error": "Метод не поддерживается"}, status=405
            )

        data = json.loads(request.body or "{}")

        booking = get_object_or_404(Reservation, id=booking_id)

        date_iso = data.get("date_iso") or data.get("date")
        start_time_hm = data.get("start_time_hm") or data.get("start_time")
        duration_hhmm = data.get("duration_hhmm") or data.get("duration")

        room_id = data.get("room_id")
        specialist_id = data.get("specialist_id")
        direction_id = data.get("direction_id")
        specialist_service_id = data.get("specialist_service_id")
        comment = data.get("comment", "")
        total_cost_raw = data.get("total_cost")
        service_ids = data.get("service_ids")

        if not all([date_iso, start_time_hm, duration_hhmm, room_id]):
            return JsonResponse(
                {
                    "success": False,
                    "error": "Не все обязательные поля заполнены",
                },
                status=400,
            )

        try:
            room_id_int = int(room_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {"success": False, "error": "Некорректный room_id"}, status=400
            )

        try:
            duration_hours, duration_minutes = map(int, str(duration_hhmm).split(":"))
        except Exception:
            return JsonResponse(
                {"success": False, "error": "Некорректный формат длительности"},
                status=400,
            )

        try:
            start_datetime_naive = datetime.strptime(
                f"{date_iso} {start_time_hm}:00", "%Y-%m-%d %H:%M:%S"
            )
        except ValueError:
            return JsonResponse(
                {"success": False, "error": "Некорректный формат даты/времени"},
                status=400,
            )

        start_datetime = timezone.make_aware(
            start_datetime_naive, timezone.get_current_timezone()
        )
        end_datetime = start_datetime + timedelta(
            hours=duration_hours, minutes=duration_minutes
        )

        room = get_object_or_404(Room, id=room_id_int)

        direction = None
        if direction_id:
            direction = get_object_or_404(Direction, id=direction_id)

        specialist = None
        if specialist_id:
            specialist = get_object_or_404(Specialist, id=specialist_id)
            if not specialist.active:
                return JsonResponse(
                    {"success": False, "error": "Выбранный специалист неактивен"},
                    status=400,
                )
            # Раньше здесь была проверка привязки специалиста к сценариям.
            # Поле `Specialist.scenario` удалено как избыточное.

        scenario_name = booking.scenario.name if booking.scenario_id else ""
        specialist_service = None
        if scenario_name == "Музыкальная школа":
            if not specialist_service_id:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выберите услугу преподавателя",
                    },
                    status=400,
                )
            specialist_service = get_object_or_404(
                SpecialistService, id=specialist_service_id
            )
            if not specialist_service.active:
                return JsonResponse(
                    {
                        "success": False,
                        "error": "Выбранная услуга преподавателя неактивна",
                    },
                    status=400,
                )

        total_cost = None
        if total_cost_raw is not None and str(total_cost_raw).strip() != "":
            try:
                total_cost = Decimal(str(total_cost_raw))
            except Exception:
                return JsonResponse(
                    {"success": False, "error": "Некорректный формат стоимости"},
                    status=400,
                )

        service_ids_list: list[int] = []
        if isinstance(service_ids, list):
            for v in service_ids:
                try:
                    service_ids_list.append(int(v))
                except (TypeError, ValueError):
                    continue

        try:
            check_room_availability(
                room,
                start_datetime,
                end_datetime,
                exclude_reservation_id=booking_id,
            )
            if specialist:
                check_specialist_availability(
                    specialist,
                    start_datetime,
                    end_datetime,
                    exclude_reservation_id=booking_id,
                )
        except Exception as e:
            return JsonResponse(
                {
                    "success": False,
                    "error": (
                        getattr(e, "messages", [str(e)])[0]
                        if getattr(e, "messages", None)
                        else str(e)
                    ),
                },
                status=400,
            )

        with transaction.atomic():
            booking.datetimestart = start_datetime
            booking.datetimeend = end_datetime
            booking.room = room
            booking.specialist = specialist
            booking.direction = direction
            booking.specialist_service = specialist_service
            booking.comment = comment
            booking.total_cost = total_cost
            booking.save()

            if service_ids is None:
                pass
            else:
                services_qs = Service.objects.filter(id__in=service_ids_list)
                booking.services.set(list(services_qs))

        local_start = timezone.localtime(booking.datetimestart)
        local_end = timezone.localtime(booking.datetimeend)
        return JsonResponse(
            {
                "success": True,
                "booking": {
                    "id": booking.id,
                    "room_id": booking.room_id,
                    "specialist_id": booking.specialist_id,
                    "specialist_name": (
                        booking.specialist.name if booking.specialist else None
                    ),
                    "direction_id": booking.direction_id,
                    "date_iso": local_start.date().isoformat(),
                    "start_time_hm": local_start.strftime("%H:%M"),
                    "end_time_hm": local_end.strftime("%H:%M"),
                },
            }
        )

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)


@csrf_exempt
def cancel_booking_view(request, booking_id):
    """Отмена брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Метод не поддерживается"})

    try:
        data = json.loads(request.body)
        booking = get_object_or_404(Reservation, id=booking_id)

        cancellation_reason_id = data.get("cancellation_reason_id")
        if not cancellation_reason_id:
            return JsonResponse(
                {"success": False, "error": "Не указана причина отмены"}
            )

        cancellation_reason = get_object_or_404(
            CancellationReason, id=cancellation_reason_id
        )

        with transaction.atomic():
            # Находим платежи тарифными единицами для этой брони
            tariff_units_payments = Payment.objects.filter(
                reservation=booking, payment_type__name="Тарифные единицы"
            ).select_related("payment_type")

            # Если есть платежи тарифными единицами
            if tariff_units_payments.exists():
                # Получаем тарифную единицу для данного сценария бронирования
                tariff_unit = TariffUnit.objects.get(scenario=booking.scenario)

                # Получаем абонемент клиента для данного сценария бронирования
                subscription = Subscription.objects.get(
                    client=booking.client, scenario=booking.scenario
                )

                total_amount = Decimal("0")
                total_units = 0

                # Для каждого платежа тарифными единицами
                for payment in tariff_units_payments:
                    amount = Decimal(str(payment.amount))
                    units = int(amount / tariff_unit.tariff_unit_cost)
                    total_amount += amount
                    total_units += units

                # Возвращаем единицы на баланс абонемента
                subscription.balance += total_units
                subscription.save()

                # Создаем запись о возврате в payments
                Payment.objects.create(
                    reservation=booking,
                    payment_type=tariff_units_payments.first().payment_type,
                    amount=-total_amount,
                    comment=f"Возврат при отмене брони ({total_units} тарифных единиц)",
                )

                # Добавляем информацию о возврате в комментарий
                refund_comment = f"\n\nВозвращено тарифных единиц: {total_units} (сумма: {total_amount} руб.)"
                if booking.comment:
                    booking.comment += refund_comment
                else:
                    booking.comment = f"Возвращено тарифных единиц: {total_units} (сумма: {total_amount} руб.)"

            # Отмена брони
            cancelled_status = ReservationStatusType.objects.get(id=4)
            booking.status = cancelled_status
            booking.cancellation_reason = cancellation_reason

            if comment := data.get("comment"):
                if booking.comment:
                    booking.comment += f"\n\nПричина отмены: {comment}"
                else:
                    booking.comment = f"Причина отмены: {comment}"

            booking.save()

        return JsonResponse({"success": True, "message": "Бронь успешно отменена"})

    except (Subscription.DoesNotExist, TariffUnit.DoesNotExist):
        return JsonResponse(
            {
                "success": False,
                "error": "Не найден абонемент клиента или тарифная единица для возврата",
            }
        )
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Произошла ошибка при отмене брони: {str(e)}"}
        )


@csrf_exempt
def confirm_booking_view(request, booking_id):
    """Подтверждение брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        booking.status_id = 2  # Статус "Подтверждена, но не оплачена"
        booking.save()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Ошибка при подтверждении брони: {str(e)}"}
        )


@csrf_exempt
def get_available_specialists(request, booking_id):
    """Получение списка доступных специалистов для брони"""
    try:
        # Получаем бронь
        booking = get_object_or_404(Reservation, id=booking_id)

        # Получаем всех активных специалистов
        specialists = Specialist.objects.filter(active=True)

        # Исключаем специалистов, у которых есть пересекающиеся брони
        busy_specialists = (
            Reservation.objects.filter(
                specialist__isnull=False,
                datetimestart__lt=booking.datetimeend,
                datetimeend__gt=booking.datetimestart,
            )
            .exclude(id=booking_id)
            .exclude(status_id__in=[4, 1082])
            .values_list("specialist_id", flat=True)
        )

        specialists = specialists.exclude(id__in=busy_specialists)

        # Дополнительно исключаем специалистов, которые заняты как клиенты
        # (например, сами записаны на урок у другого преподавателя).
        specialist_client_ids = list(
            specialists.exclude(client_id__isnull=True).values_list(
                "client_id", flat=True
            )
        )
        if specialist_client_ids:
            busy_clients = (
                Reservation.objects.filter(
                    client_id__in=specialist_client_ids,
                    datetimestart__lt=booking.datetimeend,
                    datetimeend__gt=booking.datetimestart,
                )
                .exclude(id=booking_id)
                .exclude(status_id__in=[4, 1082])
                .values_list("client_id", flat=True)
            )
            specialists = specialists.exclude(client_id__in=busy_clients)

        # Исключаем специалистов, которые не работают по расписанию в это время
        # (weekly интервалы + overrides на конкретную дату). Любая ошибка проверки
        # трактуется как недоступность специалиста.
        specialists_by_schedule = []
        for s in specialists:
            try:
                check_specialist_schedule(s, booking.datetimestart, booking.datetimeend)
            except Exception:
                # Если не попадает в рабочее время / выходной / и т.п.
                continue
            specialists_by_schedule.append(s)

        specialists = specialists_by_schedule

        # Формируем список специалистов
        specialists_data = []
        for specialist in specialists:
            specialists_data.append(
                {
                    "id": specialist.id,
                    "name": specialist.name,
                    "current": (
                        specialist.id == booking.specialist_id
                        if booking.specialist
                        else False
                    ),
                }
            )

        return JsonResponse({"success": True, "specialists": specialists_data})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)


def get_cancellation_reasons(request):
    """Получение списка активных причин отмены"""
    reasons = CancellationReason.objects.filter(is_active=True).order_by(
        "order", "name"
    )
    return JsonResponse(
        {
            "success": True,
            "reasons": [{"id": reason.id, "name": reason.name} for reason in reasons],
        }
    )


def get_clients(request):
    """Получение списка клиентов"""
    try:
        clients = Client.objects.all().values("id", "name")
        return JsonResponse({"success": True, "clients": list(clients)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


def update_booking_client(request, booking_id):
    """Обновление клиента для брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        data = json.loads(request.body)
        client_id = data.get("client_id")

        if client_id:
            client = get_object_or_404(Client, id=client_id)
            booking.client = client
        else:
            booking.client = None

        booking.save()

        return JsonResponse(
            {
                "success": True,
                "client_name": booking.client.name if booking.client else None,
                "client_phone": booking.client.phone if booking.client else None,
                "client_email": booking.client.email if booking.client else None,
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


def get_services(request):
    """Получение списка услуг"""
    try:
        booking_id = request.GET.get("booking_id")
        current_services = []

        if booking_id:
            booking = get_object_or_404(Reservation, id=booking_id)
            current_services = list(booking.services.values_list("id", flat=True))

        services = (
            Service.objects.filter(active=True)
            .select_related("group")
            .order_by("group__name", "name")
        )
        services_data = []

        for service in services:
            services_data.append(
                {
                    "id": service.id,
                    "name": service.name,
                    "cost": float(service.cost),
                    "group": service.group.name if service.group else "Без группы",
                }
            )

        return JsonResponse(
            {
                "success": True,
                "services": services_data,
                "current_services": current_services,
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@csrf_exempt
def update_booking_services(request, booking_id):
    """Добавление услуги в бронь"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Метод не поддерживается"})

    try:
        data = json.loads(request.body)
        service_ids = data.get("service_ids", [])

        if not service_ids or len(service_ids) != 1:
            return JsonResponse({"success": False, "error": "Требуется один ID услуги"})

        service_id = service_ids[0]
        booking = get_object_or_404(Reservation, id=booking_id)
        service = get_object_or_404(Service, id=service_id)

        # Добавляем услугу к брони
        booking.services.add(service)

        # Увеличиваем общую стоимость на стоимость услуги
        if service.cost:
            booking.total_cost = booking.total_cost + service.cost
            booking.save()

        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@csrf_exempt
def delete_booking_service(request, booking_id):
    """Удаление услуги из брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Метод не поддерживается"})

    try:
        data = json.loads(request.body)
        service_id = data.get("service_id")

        if not service_id:
            return JsonResponse({"success": False, "error": "Требуется ID услуги"})

        booking = get_object_or_404(Reservation, id=booking_id)
        service = get_object_or_404(Service, id=service_id)

        # Удаляем услугу из брони
        booking.services.remove(service)

        # Уменьшаем общую стоимость на стоимость услуги
        if service.cost:
            booking.total_cost = booking.total_cost - service.cost
            booking.save()

        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
