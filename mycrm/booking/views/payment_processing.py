"""View для обработки платежей."""

import json
from decimal import Decimal

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from ..models import Payment, PaymentType, Reservation


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
        existing_payments = Payment.objects.filter(reservation=booking)
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
