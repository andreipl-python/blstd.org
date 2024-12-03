from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.db import transaction
import json

from ..models import Reservation, Payment, PaymentType

@csrf_exempt
def payment_booking_view(request, booking_id):
    """Обработка оплаты брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        data = json.loads(request.body)
        payment_type_id = data.get('payment_type')
        amount = data.get('amount')
        comment = data.get('comment', '')

        with transaction.atomic():
            # Получаем бронь
            booking = get_object_or_404(Reservation, id=booking_id)
            
            # Проверяем статус брони
            if booking.status_id != 2:  # Если бронь не в статусе "Подтверждена"
                return JsonResponse({
                    "success": False,
                    "error": "Бронь должна быть в статусе 'Подтверждена' для внесения оплаты"
                })
            
            # Создаем платеж
            payment = Payment.objects.create(
                reservation=booking,
                payment_type_id=payment_type_id,
                amount=amount,
                comment=comment
            )
            
            # Меняем статус брони на "Оплачена"
            booking.status_id = 3
            booking.save()
            
            return JsonResponse({
                "success": True,
                "payment_id": payment.id
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "Неверный формат данных"
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Ошибка при обработке оплаты: {str(e)}"
        })
