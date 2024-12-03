import dateparser
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404, render
from ..models import Reservation, Room, Service, Specialist, ReservationStatusType, ClientGroup, PaymentType

def get_booking_details(request, booking_id):
    """Получение детальной информации о брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        
        # Получаем типы оплаты
        payment_types = PaymentType.objects.all()
        
        # Формируем словарь с данными брони
        booking_data = {
            'id': booking.id,
            'start_time': booking.datetimestart.strftime('%Y-%m-%d %H:%M'),
            'end_time': booking.datetimeend.strftime('%Y-%m-%d %H:%M'),
            'duration': f"{(booking.datetimeend - booking.datetimestart).seconds // 3600}:{((booking.datetimeend - booking.datetimestart).seconds % 3600) // 60:02d}",
            'duration_minutes': (booking.datetimeend - booking.datetimestart).seconds // 60,
            'room_id': booking.room.id if booking.room else None,
            'room_name': booking.room.name if booking.room else 'Не указано',
            'client_id': booking.client.id if booking.client else None,
            'client_name': str(booking.client) if booking.client else 'Не указан',
            'specialist_id': booking.specialist.id if booking.specialist else None,
            'specialist_name': str(booking.specialist) if booking.specialist else None,
            'service_name': ', '.join([str(service) for service in booking.services.all()]) if booking.services.exists() else None,
            'total_cost': str(booking.total_cost) if booking.total_cost else '0',
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
        # Получаем бронь
        booking = get_object_or_404(Reservation, id=booking_id)
        
        # Получаем и валидируем данные
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

        # Получаем объекты из базы
        try:
            room = Room.objects.get(id=room_id)
            specialist = Specialist.objects.get(id=specialist_id) if specialist_id else None
            client_group = ClientGroup.objects.get(id=client_group_id) if client_group_id else None
        except (Room.DoesNotExist, Specialist.DoesNotExist, ClientGroup.DoesNotExist) as e:
            return JsonResponse({"success": False, "error": str(e)})

        # Вычисляем время начала и конца брони
        start_datetime = datetime.strptime(start_time, '%Y-%m-%d %H:%M')
        duration_hours, duration_minutes = map(int, booking_duration.split(':'))
        end_datetime = start_datetime + timedelta(hours=duration_hours, minutes=duration_minutes)

        # Проверяем доступность (исключая текущую бронь)
        def check_booking_conflicts(booking_id, room, specialist, start_datetime, end_datetime):
            """Проверка конфликтов при редактировании брони"""
            # Проверяем пересечения с другими бронями для помещения
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

        # Обновляем бронь в транзакции
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

            # Обновляем услуги
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
def delete_booking_view(request, booking_id):
    """Удаление брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        booking.delete()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Ошибка при удалении брони: {str(e)}"
        })

@csrf_exempt
def cancel_booking_view(request, booking_id):
    """Отмена брони"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Неверный метод запроса"})

    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        booking.status_id = 4
        booking.save()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Ошибка при отмене брони: {str(e)}"
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
