from datetime import datetime, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from ..models import (
    Reservation, Room, Service, Specialist, ReservationStatusType, ClientGroup, PaymentType, Payment, CancellationReason, Subscription, TariffUnit
)
import json

def get_booking_details(request, booking_id):
    """Получение детальной информации о брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        
        payment_types = PaymentType.objects.exclude(name='Тарифные единицы')
        
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

        # Вычисляем стоимость аренды и услуг
        service_cost = sum(service.cost for service in booking.services.all())
        total_rental_cost = booking.total_cost - service_cost

        # Получаем сумму платежей тарифными единицами
        rental_payments = Payment.objects.filter(
            reservation=booking,
            payment_type__name='Тарифные единицы'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Вычисляем оставшуюся стоимость аренды
        remaining_rental_cost = total_rental_cost - rental_payments

        # Получаем сумму всех платежей для данной брони
        total_payments = Payment.objects.filter(
            reservation=booking
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Вычисляем оставшуюся сумму
        remaining_amount = booking.total_cost - total_payments if booking.total_cost else 0
        
        # Получаем подписку клиента для данного типа брони
        subscription = None
        available_units = 0
        required_units = 0
        can_use_units = False
        client_balance = None
        max_units_allowed = 0

        if booking.client and booking.reservation_type:
            subscription = Subscription.objects.filter(
                client=booking.client,
                reservation_type=booking.reservation_type
            ).first()

            if subscription:
                available_units = subscription.balance
                client_balance = subscription.balance

                # Получаем тарифную единицу для типа брони
                tariff_unit = TariffUnit.objects.filter(
                    reservation_type=booking.reservation_type
                ).first()

                if tariff_unit:
                    # Вычисляем продолжительность брони в минутах
                    duration_minutes = (booking.datetimeend - booking.datetimestart).seconds // 60
                    required_units = duration_minutes // (tariff_unit.min_reservation_time.hour * 60 + tariff_unit.min_reservation_time.minute)
                    can_use_units = available_units >= required_units

                    # Вычисляем максимальное количество доступных единиц
                    if tariff_unit.tariff_unit_cost > 0:
                        max_units_allowed = min(
                            int(remaining_rental_cost / tariff_unit.tariff_unit_cost),
                            available_units
                        )

        # Группируем услуги по группам
        services_by_group = {}
        total_services_cost = Decimal('0')
        
        for service in booking.services.all():
            group_name = service.group.name if service.group else 'Другое'
            if group_name not in services_by_group:
                services_by_group[group_name] = []
            services_by_group[group_name].append({
                'id': service.id,
                'name': str(service),
                'cost': str(service.cost if service.cost else '0')
            })
            if service.cost:
                total_services_cost += service.cost

        # Получаем все платежи для данной брони
        payments = Payment.objects.filter(reservation=booking).select_related('payment_type').order_by('-created_at')
        payments_history = []
        for payment in payments:
            payments_history.append({
                'date': payment.created_at.strftime('%d.%m.%Y %H:%M'),
                'type': payment.payment_type.name,
                'amount': str(payment.amount)
            })

        booking_data = {
            'id': booking.id,
            'date': date_str,
            'time': time_str,
            'duration': duration_str,
            'room_id': booking.room.id if booking.room else None,
            'room_name': booking.room.name if booking.room else 'Не указано',
            'client_id': booking.client.id if booking.client else None,
            'client_name': str(booking.client) if booking.client else 'Не указан',
            'client_phone': booking.client.phone if booking.client and booking.client.phone else None,
            'client_email': booking.client.email if booking.client and booking.client.email else None,
            'specialist_id': booking.specialist.id if booking.specialist else None,
            'specialist_name': str(booking.specialist) if booking.specialist else None,
            'services_by_group': services_by_group,
            'total_services_cost': str(total_services_cost),
            'total_cost': str(booking.total_cost) if booking.total_cost else '0',
            'paid_amount': str(total_payments),
            'remaining_amount': str(remaining_amount),
            'reservation_cost': str(total_rental_cost),
            'remaining_rental_cost': str(remaining_rental_cost),
            'max_units_allowed': max_units_allowed,
            'status': booking.status.id if booking.status else None,
            'status_name': booking.status.name if booking.status else 'Не указан',
            'comment': booking.comment,
            'payment_types': [{'id': pt.id, 'name': pt.name} for pt in payment_types],
            'can_use_units': can_use_units,
            'available_units': available_units,
            'required_units': required_units,
            'client_balance': client_balance,
            'reservation_type': booking.reservation_type.name if booking.reservation_type else 'Не указан',
            'payments_history': payments_history,
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
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        data = json.loads(request.body)
        
        payment_method = data.get('payment_method')
        
        if payment_method == 'units':
            units_amount = int(data.get('units_amount', 0))
            
            # Получаем тарифную единицу для типа брони
            tariff_unit = TariffUnit.objects.filter(
                reservation_type=booking.reservation_type
            ).first()
            
            if not tariff_unit:
                return JsonResponse({
                    'success': False,
                    'error': 'Тарифные единицы недоступны для данного типа брони'
                })
            
            # Получаем подписку клиента
            subscription = Subscription.objects.filter(
                client=booking.client,
                reservation_type=booking.reservation_type
            ).first()
            
            if not subscription:
                return JsonResponse({
                    'success': False,
                    'error': 'У клиента нет активной подписки'
                })
            
            if subscription.balance < units_amount:
                return JsonResponse({
                    'success': False,
                    'error': f'Недостаточно единиц. Доступно: {subscription.balance}'
                })
            
            # Вычисляем стоимость аренды и услуг
            service_cost = sum(service.cost for service in booking.services.all())
            total_rental_cost = booking.total_cost - service_cost
            
            # Получаем сумму платежей тарифными единицами
            rental_payments = Payment.objects.filter(
                reservation=booking,
                payment_type__name='Тарифные единицы'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            # Вычисляем оставшуюся стоимость аренды
            remaining_rental_cost = total_rental_cost - rental_payments
            
            # Вычисляем максимальное количество доступных единиц
            max_units_allowed = min(
                int(remaining_rental_cost / tariff_unit.tariff_unit_cost),
                subscription.balance
            )
            
            if units_amount > max_units_allowed:
                return JsonResponse({
                    'success': False,
                    'error': f'Превышено максимальное количество единиц ({max_units_allowed})'
                })
            
            # Вычисляем сумму платежа
            payment_amount = units_amount * tariff_unit.tariff_unit_cost
            
            # Создаем платеж
            payment_type = PaymentType.objects.get(name='Тарифные единицы')
            payment = Payment.objects.create(
                reservation=booking,
                payment_type=payment_type,
                amount=payment_amount,
                comment=data.get('comment', '')
            )
            
            # Списываем единицы с подписки
            subscription.balance -= units_amount
            subscription.save()
            
        else:  # regular payment
            payment_type_id = data.get('payment_type')
            amount = data.get('amount')
            
            if not payment_type_id or not amount:
                return JsonResponse({
                    'success': False,
                    'error': 'Не указан тип платежа или сумма'
                })
            
            try:
                payment_type = PaymentType.objects.get(id=payment_type_id)
            except PaymentType.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Неверный тип платежа'
                })
            
            # Проверяем, не превышает ли сумма платежа оставшуюся сумму
            total_payments = Payment.objects.filter(
                reservation=booking
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            remaining_amount = booking.total_cost - total_payments
            
            if float(amount) > remaining_amount:
                return JsonResponse({
                    'success': False,
                    'error': f'Сумма платежа превышает оставшуюся сумму ({remaining_amount} BYN)'
                })
            
            # Создаем платеж
            payment = Payment.objects.create(
                reservation=booking,
                payment_type=payment_type,
                amount=amount,
                comment=data.get('comment', '')
            )
        
        # Проверяем, полностью ли оплачена бронь
        total_payments = Payment.objects.filter(
            reservation=booking
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if total_payments >= booking.total_cost:
            # Если бронь полностью оплачена, меняем статус на "Подтверждена"
            confirmed_status = ReservationStatusType.objects.get(name='Подтверждена и оплачена')
            booking.status = confirmed_status
            booking.save()
        
        return JsonResponse({
            'success': True,
            'payment_id': payment.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
