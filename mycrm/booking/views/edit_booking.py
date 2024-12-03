import dateparser
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404

from booking.models import Reservation, Room, Service, Specialist, ReservationStatusType, ClientGroup
from .create_booking import check_room_availability, check_specialist_availability

def get_booking_details(request, booking_id):
    """Получение детальной информации о брони"""
    try:
        booking = get_object_or_404(Reservation, id=booking_id)
        
        # Формируем словарь с данными брони
        booking_data = {
            'id': booking.id,
            'start_time': booking.datetimestart.strftime('%Y-%m-%d %H:%M'),
            'end_time': booking.datetimeend.strftime('%Y-%m-%d %H:%M'),
            'duration': f"{(booking.datetimeend - booking.datetimestart).seconds // 3600}:{((booking.datetimeend - booking.datetimestart).seconds % 3600) // 60:02d}",
            'duration_minutes': (booking.datetimeend - booking.datetimestart).seconds // 60,
            'room_id': booking.room.id,
            'room_name': booking.room.name,
            'client_id': booking.client.id,
            'client_name': str(booking.client),
            'specialist_id': booking.specialist.id if booking.specialist else None,
            'specialist_name': str(booking.specialist) if booking.specialist else None,
            'service_name': ', '.join([str(service) for service in booking.services.all()]),
            'price': str(booking.get_total_price()) if hasattr(booking, 'get_total_price') else '',
            'total_cost': str(booking.total_cost) if booking.total_cost else '',
            'status': booking.status.id,
            'status_name': booking.status.name,
            'comment': booking.comment,
            'reservation_type': booking.reservation_type.id,
            'client_group_id': booking.client_group.id if booking.client_group else None,
            'services': [service.id for service in booking.services.all()]
        }
        
        return JsonResponse({'success': True, 'booking': booking_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

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
        try:
            # Модифицируем запрос для исключения текущей брони при проверке
            existing_bookings = Reservation.objects.filter(
                room=room
            ).exclude(
                id=booking_id
            ).exclude(
                status__name='Отменена'
            )
            
            for existing_booking in existing_bookings:
                if (existing_booking.datetimestart < end_datetime and 
                    existing_booking.datetimeend > start_datetime):
                    raise ValidationError("На это время уже есть бронирование")

            if specialist:
                existing_specialist_bookings = Reservation.objects.filter(
                    specialist=specialist,
                    datetimestart__lt=end_datetime,
                    datetimeend__gt=start_datetime
                ).exclude(id=booking_id)
                
                if existing_specialist_bookings.exists():
                    raise ValidationError("Специалист уже занят в это время")

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
        cancelled_status = ReservationStatusType.objects.get(name='Отменена')
        booking.status = cancelled_status
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
        confirmed_status = ReservationStatusType.objects.get(name='Подтверждена')
        booking.status = confirmed_status
        booking.save()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": f"Ошибка при подтверждении брони: {str(e)}"
        })
