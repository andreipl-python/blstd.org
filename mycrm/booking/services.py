from .models import Room, ReservationType
from django.core.exceptions import ObjectDoesNotExist


def add_reservation_types_to_room(room_id, reservation_type_ids):
    try:
        # Получаем помещение по ID
        room = Room.objects.get(id=room_id)

        # Получаем типы бронирования по их ID
        reservation_types = ReservationType.objects.filter(id__in=reservation_type_ids)

        if not reservation_types:
            return "Типы бронирования не найдены."

        # Добавляем типы бронирования в поле many-to-many
        room.reservation_type.add(*reservation_types)

        return f"Типы бронирования {reservation_type_ids} успешно добавлены к комнате {room_id}"

    except ObjectDoesNotExist:
        return "Комната или типы бронирования не найдены."
