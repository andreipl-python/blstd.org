"""View для обработки платежей."""

import json
from decimal import Decimal

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from booking.models import Payment, PaymentType, Reservation


def save_payments_for_booking(booking, payments_data):
    """Сохраняет платежи для брони в БД.

    Args:
        booking: Reservation instance.
        payments_data: Список словарей с ключами payment_type_id и amount.

    Returns:
        Список ID созданных платежей.

    Raises:
        ValueError: Если не указаны обязательные поля.
        PaymentType.DoesNotExist: Если тип платежа не найден.
    """
    created_payments = []

    with transaction.atomic():
        for payment_info in payments_data:
            payment_type_id = payment_info.get("payment_type_id")
            amount = payment_info.get("amount")

            if payment_type_id is None or amount is None:
                raise ValueError(
                    "payment_type_id и amount обязательны для каждого платежа"
                )

            payment_type = PaymentType.objects.get(id=payment_type_id)

            payment = Payment.objects.create(
                reservation=booking,
                payment_type=payment_type,
                amount=Decimal(str(amount)),
                comment=payment_info.get("comment", ""),
                canceled=False,
            )
            created_payments.append(payment.id)

    return created_payments


@csrf_exempt
def process_batch_payments_view(request, booking_id):
    """Обработка нескольких платежей для брони."""
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "error": "Метод не поддерживается"}, status=405
        )

    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        data = json.loads(request.body or "{}")
        payments_data = data.get("payments", [])

        if not payments_data:
            return JsonResponse(
                {"success": False, "error": "Не переданы данные платежей"},
                status=400,
            )

        total_cost = booking.total_cost or Decimal("0")
        existing_payments = Payment.objects.filter(reservation=booking, canceled=False)
        existing_total = sum(
            (payment.amount for payment in existing_payments), Decimal("0")
        )
        remaining = total_cost - existing_total
        if remaining < Decimal("0"):
            remaining = Decimal("0")

        new_total = Decimal("0")
        for payment_info in payments_data:
            amount = payment_info.get("amount")
            if amount is None:
                raise ValueError(
                    "payment_type_id и amount обязательны для каждого платежа"
                )
            new_total += Decimal(str(amount))

        if new_total > remaining:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Суммарная сумма оплат превышает остаток к оплате по брони",
                },
                status=400,
            )

        created_payments = save_payments_for_booking(booking, payments_data)

        return JsonResponse({"success": True, "payment_ids": created_payments})

    except ValueError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    except PaymentType.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Тип платежа не найден"}, status=400
        )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@csrf_exempt
@require_POST
def update_payment_view(request, payment_id):
    """
    Обновляет существующий платёж:
    - сумма (amount)
    - тип оплаты (payment_type_id)
    - комментарий (comment, необязателен)
    """
    try:
        payment = get_object_or_404(Payment, id=payment_id)
        booking = payment.reservation

        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse(
                {"success": False, "error": "Некорректный JSON"}, status=400
            )

        amount = payload.get("amount")
        payment_type_id = payload.get("payment_type_id")
        comment = payload.get("comment", "")

        if amount is None or payment_type_id is None:
            return JsonResponse(
                {"success": False, "error": "Нужно передать amount и payment_type_id"},
                status=400,
            )

        try:
            payment_type = PaymentType.objects.get(id=payment_type_id)
        except PaymentType.DoesNotExist:
            return JsonResponse(
                {"success": False, "error": "Тип платежа не найден"}, status=400
            )

        try:
            new_amount = Decimal(str(amount))
        except Exception:
            return JsonResponse(
                {"success": False, "error": "Некорректное значение суммы"}, status=400
            )

        if new_amount <= Decimal("0"):
            return JsonResponse(
                {"success": False, "error": "Сумма должна быть больше 0"}, status=400
            )

        # Проверяем, что новый платеж не превышает остаток с учётом других платежей
        total_cost = booking.total_cost or Decimal("0")
        other_payments = Payment.objects.filter(
            reservation=booking, canceled=False
        ).exclude(id=payment.id)
        other_total = sum((p.amount for p in other_payments), Decimal("0"))
        remaining = total_cost - other_total
        if remaining < Decimal("0"):
            remaining = Decimal("0")

        if new_amount - remaining > Decimal("0.000001"):
            return JsonResponse(
                {
                    "success": False,
                    "error": "Сумма платежа превышает доступный остаток",
                },
                status=400,
            )

        if payment.canceled:
            return JsonResponse(
                {"success": False, "error": "Платёж уже отменён"}, status=400
            )

        payment.payment_type = payment_type
        payment.amount = new_amount
        payment.comment = comment
        payment.save(update_fields=["payment_type", "amount", "comment", "updated_at"])

        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@csrf_exempt
@require_POST
def cancel_payment_view(request, payment_id):
    """Отмена (деактивация) платежа: помечаем canceled=True и исключаем из расчётов."""
    try:
        payment = get_object_or_404(Payment, id=payment_id)
        if payment.canceled:
            return JsonResponse(
                {"success": False, "error": "Платёж уже отменён"}, status=400
            )

        payment.canceled = True
        payment.save(update_fields=["canceled", "updated_at"])
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@csrf_exempt
def get_payment_history(request, booking_id):
    """Возвращает историю платежей для указанной брони."""
    if request.method != "GET":
        return JsonResponse(
            {"success": False, "error": "Метод не поддерживается"}, status=405
        )

    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        payments = (
            Payment.objects.filter(reservation=booking)
            .select_related("payment_type")
            .order_by("created_at")
        )

        payments_data = []
        total_amount = Decimal("0")

        for payment in payments:
            amount = payment.amount or Decimal("0")
            if not payment.canceled:
                total_amount += amount
            local_created = timezone.localtime(payment.created_at)
            local_updated = timezone.localtime(payment.updated_at)
            payments_data.append(
                {
                    "id": payment.id,
                    "datetime": local_created.strftime("%d.%m.%Y, %H:%M"),
                    "amount": str(amount),
                    "payment_type": (
                        payment.payment_type.name if payment.payment_type_id else ""
                    ),
                    "payment_type_id": payment.payment_type_id,
                    "comment": payment.comment or "",
                    "updated_at": local_updated.strftime("%d.%m.%Y, %H:%M"),
                    "edited": payment.created_at != payment.updated_at,
                    "canceled": payment.canceled,
                }
            )

        return JsonResponse(
            {
                "success": True,
                "payments": payments_data,
                "total_amount": str(total_amount),
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)
