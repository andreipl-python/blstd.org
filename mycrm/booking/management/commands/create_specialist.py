from django.core.management.base import BaseCommand
from booking.models import Specialist, Client, ReservationType


class Command(BaseCommand):
    help = "Добавляет специалиста вместе с записью в клиента и привязывает типы бронирования"

    def handle(self, *args, **kwargs):
        # Данные для клиента
        client_data = {
            "name": "Спец всех сценариев2",
            "phone": "+1234567890",
            "comment": "Спец всех сценариев2",
        }

        # Данные для специалиста
        specialist_data = {
            "name": "Спец всех сценариев2",
            "active": True,
        }

        # Типы бронирования (ID уже существующих записей)
        reservation_type_ids = [1, 2, 4, 5]  # Укажите существующие ID типов бронирования

        # Создаём клиента
        client = Client.objects.create(**client_data)
        self.stdout.write(f"Клиент {client.name} создан с ID {client.id}")

        # Создаём специалиста
        specialist = Specialist.objects.create(client=client, **specialist_data)
        self.stdout.write(f"Специалист {specialist.name} создан с ID {specialist.id}")

        # Привязываем типы бронирования
        if reservation_type_ids:
            try:
                # Проверяем, что все указанные типы бронирования существуют
                reservation_types = ReservationType.objects.filter(id__in=reservation_type_ids)
                if len(reservation_types) != len(reservation_type_ids):
                    missing_ids = set(reservation_type_ids) - set(reservation_types.values_list("id", flat=True))
                    self.stdout.write(
                        self.style.WARNING(f"Некоторые типы бронирования не найдены: {missing_ids}")
                    )

                # Устанавливаем найденные типы бронирования
                specialist.reservation_type.set(reservation_types)
                self.stdout.write(f"Типы бронирования успешно привязаны к специалисту {specialist.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Ошибка при привязке типов бронирования: {e}"))
        else:
            self.stdout.write(self.style.WARNING("Типы бронирования не указаны"))

        self.stdout.write(self.style.SUCCESS("Добавление специалиста завершено"))
