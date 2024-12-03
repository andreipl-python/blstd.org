from django.core.management.base import BaseCommand
from booking.models import Reservation
from datetime import datetime

class Command(BaseCommand):
    help = 'Получение полной информации о брони по её ID'

    def add_arguments(self, parser):
        parser.add_argument('booking_id', type=int, help='ID брони')

    def handle(self, *args, **options):
        try:
            booking_id = options['booking_id']
            booking = Reservation.objects.select_related(
                'specialist',
                'client',
                'client_group',
                'room',
                'reservation_type',
                'status'
            ).prefetch_related(
                'services'
            ).get(id=booking_id)

            # Форматируем информацию
            info = [
                "\n=== Основная информация ===",
                f"ID брони: {booking.id}",
                f"Создана: {booking.created_at.strftime('%d.%m.%Y %H:%M:%S')}",
                f"Последнее обновление: {booking.updated_at.strftime('%d.%m.%Y %H:%M:%S')}",
                f"Статус: {booking.status.name if booking.status else 'Не указан'}",
                
                "\n=== Время ===",
                f"Начало: {booking.datetimestart.strftime('%d.%m.%Y %H:%M')}",
                f"Окончание: {booking.datetimeend.strftime('%d.%m.%Y %H:%M')}",
                f"Длительность: {(booking.datetimeend - booking.datetimestart).seconds // 3600}:{((booking.datetimeend - booking.datetimestart).seconds % 3600) // 60:02d}",
                
                "\n=== Участники ===",
                f"Клиент: {booking.client.name} (ID: {booking.client.id})",
                f"Телефон клиента: {booking.client.phone if booking.client.phone else 'Не указан'}",
                f"Рейтинг клиента: {booking.client.rating if hasattr(booking.client, 'rating') else 'Нет оценок'}",
                f"Специалист: {booking.specialist.name if booking.specialist else 'Не назначен'}",
                
                "\n=== Место и тип ===",
                f"Помещение: {booking.room.name} (ID: {booking.room.id})",
                f"Тип брони: {booking.reservation_type.name}",
                
                "\n=== Дополнительно ===",
                f"Стоимость: {booking.total_cost} руб." if booking.total_cost else "Стоимость: Не указана",
                f"Комментарий: {booking.comment if booking.comment else 'Нет комментария'}",
            ]

            # Добавляем информацию о группе, если есть
            if booking.client_group:
                info.extend([
                    "\n=== Информация о группе ===",
                    f"Группа: {booking.client_group.name} (ID: {booking.client_group.id})"
                ])

            # Добавляем информацию об услугах
            services = booking.services.all()
            if services:
                info.extend([
                    "\n=== Услуги ===",
                    *[f"- {service.name}" for service in services]
                ])

            # Выводим всю информацию
            self.stdout.write('\n'.join(info))

        except Reservation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Бронь с ID {booking_id} не найдена'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Ошибка: {str(e)}'))
