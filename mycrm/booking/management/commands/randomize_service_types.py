from django.core.management.base import BaseCommand
from booking.models import Service, ReservationType
import random


class Command(BaseCommand):
    help = 'Случайным образом назначает типы бронирования для услуг'

    def handle(self, *args, **kwargs):
        # Получаем все типы бронирования
        reservation_types = list(ReservationType.objects.all())
        if not reservation_types:
            self.stdout.write(
                self.style.ERROR('Нет типов бронирования в системе')
            )
            return

        # Для каждой услуги
        for service in Service.objects.all():
            # Очищаем текущие типы
            service.reservation_type.clear()
            
            # Случайное количество типов (от 1 до 4)
            num_types = random.randint(1, 4)
            
            # Случайная выборка типов
            selected_types = random.sample(reservation_types, min(num_types, len(reservation_types)))
            
            # Добавляем выбранные типы
            service.reservation_type.add(*selected_types)
            
            # Выводим результат
            type_names = ', '.join([rt.name for rt in selected_types])
            self.stdout.write(
                self.style.SUCCESS(
                    f'Услуга "{service.name}" связана с типами: {type_names}'
                )
            )
