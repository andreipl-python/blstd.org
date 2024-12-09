import dateparser
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404, render
from ..models import (
    Reservation, Room, Service, Specialist, ReservationStatusType, ClientGroup, PaymentType, Payment, CancellationReason
)
import json

def get_booking_details(request, booking_id):
    """Получение детальной информации о брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        
        payment_types = PaymentType.objects.all()
        
        start_datetime = booking.datetimestart
        end_datetime = booking.datetimeend
        
        weekdays = {
            0: 'Понедельник',
            1: 'Вторник',
            2: 'Среда',
            3: 'Четверг',
            4: 'Пятница',
            5: 'Суббота',
            6: 'Воскресенье'
        }
        
        date_str = f"{start_datetime.strftime('%d-%m-%Y')}, {weekdays[start_datetime.weekday()]}"
        time_str = f"{start_datetime.strftime('%H:%M')} - {end_datetime.strftime('%H:%M')}"
        
        duration_hours = (booking.datetimeend - booking.datetimestart).seconds // 3600
        duration_minutes = ((booking.datetimeend - booking.datetimestart).seconds % 3600) // 60
        
        duration_str = ""
        if duration_hours > 0:
            duration_str += f"{duration_hours} {'час' if duration_hours == 1 else 'часа' if 2 <= duration_hours <= 4 else 'часов'}"
        if duration_minutes > 0:
            if duration_hours > 0:
                duration_str += " "
            duration_str += f"{duration_minutes} {'минута' if duration_minutes == 1 else 'минуты' if 2 <= duration_minutes <= 4 else 'минут'}"

        # Получаем сумму всех платежей для данной брони
        total_payments = Payment.objects.filter(
            reservation=booking
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Вычисляем оставшуюся сумму
        remaining_amount = booking.total_cost - total_payments if booking.total_cost else 0
        
        booking_data = {
            'id': booking.id,
            'date': date_str,
            'time': time_str,
            'duration': duration_str,
            'duration_minutes': (booking.datetimeend - booking.datetimestart).seconds // 60,
            'room_id': booking.room.id if booking.room else None,
            'room_name': booking.room.name if booking.room else 'Не указано',
            'client_id': booking.client.id if booking.client else None,
            'client_name': str(booking.client) if booking.client else 'Не указан',
            'specialist_id': booking.specialist.id if booking.specialist else None,
            'specialist_name': str(booking.specialist) if booking.specialist else None,
            'service_name': ', '.join([str(service) for service in booking.services.all()]) if booking.services.exists() else None,
            'service_costs': str(sum(service.cost for service in booking.services.all())),
            'total_cost': str(booking.total_cost) if booking.total_cost else '0',
            'paid_amount': str(total_payments),
            'remaining_amount': str(remaining_amount),
            'reservation_cost': str(booking.total_cost - sum(service.cost for service in booking.services.all())),
            'status': booking.status.id if booking.status else None,
            'status_name': booking.status.name if booking.status else 'Не указан',
            'comment': booking.comment,
            'payment_types': [{'id': pt.id, 'name': pt.name} for pt in payment_types]
        }
        
        return JsonResponse({
            'success': True, 
            'booking': booking_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@csrf_exempt
def edit_booking_view(request, booking_id):
    """Редактирование существующей брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        
        service_types = request.POST.getlist('serviceType')
        booking_type = int(request.POST.get('bookingType', booking.reservation_type.id))
        specialist_id = request.POST.get('specialist')
        specialist_id = int(specialist_id) if specialist_id else None
        client_id = int(request.POST.get('client', booking.client.id))
        client_group_id = request.POST.get('client_group')
        client_group_id = int(client_group_id) if client_group_id else None
        booking_duration = request.POST.get('bookingDuration')
        comment = request.POST.get('comment', '')
        total_cost = request.POST.get('total_cost')
        total_cost = float(total_cost) if total_cost else None
        room_id = int(request.POST.get('room_id', booking.room.id))
        start_time = request.POST.get('start_time')

        if not start_time:
            return JsonResponse({"success": False, "error": "Не указано время начала брони"})

        try:
            room = Room.objects.get(id=room_id)
            specialist = Specialist.objects.get(id=specialist_id) if specialist_id else None
            client_group = ClientGroup.objects.get(id=client_group_id) if client_group_id else None
        except (Room.DoesNotExist, Specialist.DoesNotExist, ClientGroup.DoesNotExist) as e:
            return JsonResponse({"success": False, "error": str(e)})

        start_datetime = datetime.strptime(start_time, '%Y-%m-%d %H:%M')
        duration_hours, duration_minutes = map(int, booking_duration.split(':'))
        end_datetime = start_datetime + timedelta(hours=duration_hours, minutes=duration_minutes)

        def check_booking_conflicts(booking_id, room, specialist, start_datetime, end_datetime):
            """Проверка конфликтов при редактировании брони"""
            room_conflicts = Reservation.objects.filter(
                room=room,
                datetimestart__lt=end_datetime,
                datetimeend__gt=start_datetime
            ).exclude(id=booking_id).exclude(status_id=4)

            if room_conflicts.exists():
                raise ValidationError("Выбранное время пересекается с другими бронями помещения")

            # Проверяем пересечения с другими бронями для специалиста
            specialist_conflicts = Reservation.objects.filter(
                specialist=specialist,
                datetimestart__lt=end_datetime,
                datetimeend__gt=start_datetime
            ).exclude(id=booking_id).exclude(status_id=4)

            if specialist_conflicts.exists():
                raise ValidationError("Выбранное время пересекается с другими бронями специалиста")

            return True

        try:
            check_booking_conflicts(booking_id, room, specialist, start_datetime, end_datetime)
        except ValidationError as e:
            return JsonResponse({"success": False, "error": str(e)})

        with transaction.atomic():
            booking.datetimestart = start_datetime
            booking.datetimeend = end_datetime
            booking.specialist = specialist
            booking.client_id = client_id
            booking.client_group = client_group
            booking.room = room
            booking.reservation_type_id = booking_type
            booking.comment = comment
            booking.total_cost = total_cost
            booking.save()

            if service_types:
                booking.services.clear()
                services = Service.objects.filter(id__in=service_types)
                booking.services.add(*services)

        return JsonResponse({
            "success": True,
            "booking_id": booking.id
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Произошла ошибка при обновлении брони: {str(e)}"
        })

@csrf_exempt
def cancel_booking_view(request, booking_id):
    """Отмена брони"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})
    
    try:
        data = json.loads(request.body)
        booking = get_object_or_404(Reservation, id=booking_id)
        
        cancellation_reason_id = data.get('cancellation_reason_id')
        if not cancellation_reason_id:
            return JsonResponse({
                'success': False,
                'error': 'Не указана причина отмены'
            })
        
        cancellation_reason = get_object_or_404(CancellationReason, id=cancellation_reason_id)
        
        with transaction.atomic():
            cancelled_status = ReservationStatusType.objects.get(id=4)
            booking.status = cancelled_status
            booking.cancellation_reason = cancellation_reason
            
            if comment := data.get('comment'):
                if booking.comment:
                    booking.comment += f"\n\nПричина отмены: {comment}"
                else:
                    booking.comment = f"Причина отмены: {comment}"
            
            booking.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Бронь успешно отменена'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

def get_cancellation_reasons(request):
    """Получение списка активных причин отмены"""
    reasons = CancellationReason.objects.filter(is_active=True).order_by('order', 'name')
    return JsonResponse({
        'success': True,
        'reasons': [{'id': reason.id, 'name': reason.name} for reason in reasons]
    })

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
        return JsonResponse({
            "success": False,
            "error": f"Ошибка при подтверждении брони: {str(e)}"
        })

@csrf_exempt
def process_payment_view(request, booking_id):
    """Обработка платежа для брони"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})
    
    try:
        data = json.loads(request.body)
        payment_type_id = data.get('payment_type')
        amount = data.get('amount')
        comment = data.get('comment', '')

        if not payment_type_id or not amount:
            return JsonResponse({
                'success': False,
                'error': 'Не указан тип оплаты или сумма'
            })

        booking = get_object_or_404(Reservation, id=booking_id)
        payment_type = get_object_or_404(PaymentType, id=payment_type_id)

        # Получаем текущую сумму платежей
        current_payments = Payment.objects.filter(
            reservation=booking
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Проверяем, не превысит ли новый платеж общую стоимость
        if current_payments + float(amount) > booking.total_cost:
            return JsonResponse({
                'success': False,
                'error': f'Сумма платежа превышает оставшуюся сумму к оплате. Максимальная сумма: {booking.total_cost - current_payments} руб.'
            })

        with transaction.atomic():
            # Создаем новый платеж
            payment = Payment.objects.create(
                reservation=booking,
                payment_type=payment_type,
                amount=amount,
                comment=comment
            )

            # Получаем сумму всех платежей для данной брони
            total_payments = Payment.objects.filter(
                reservation=booking
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Если сумма всех платежей равна общей стоимости брони,
            # меняем статус на "Оплачено"
            if total_payments >= booking.total_cost:
                paid_status = ReservationStatusType.objects.get(id=3)  # ID 3 = Оплачено
                booking.status = paid_status
                booking.save()

        return JsonResponse({
            'success': True,
            'message': 'Оплата успешно добавлена'
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })
