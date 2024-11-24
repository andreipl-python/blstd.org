from django.core.management.base import BaseCommand
from django.db import connection
from booking.models import Service, ReservationType


class Command(BaseCommand):
    help = 'Мигрирует выбранные услуги из старой таблицы uslugi в новую таблицу services'

    def handle(self, *args, **kwargs):
        # Получаем тип бронирования по умолчанию (первый)
        default_reservation_type = ReservationType.objects.first()
        if not default_reservation_type:
            self.stdout.write(
                self.style.ERROR('Нет ни одного типа бронирования в системе')
            )
            return

        # Список оборудования для аренды
        equipment_rentals = [
            'Бас-гитара Ibanez SR300EIPT',
            'Бас-гитара Marcus Miller V3',
            'Кардан DW 7002PT double bass',
            'Клавиши Casio CTK-591',
            'Клавиши Korg D1',
            'Клавиши Medeli M361',
            'Клавиши Roland BK-5',
            'Комплект железа',
            'Комплект железа Paiste 201',
            'Комплект железа Paiste PST3',
            'Комплект железа Sabian XSR Performance Set Pro',
            'Комплект железа Zultan',
            'Конденсаторный микрофон на репетицию',
            'Электроакустическая гитара Fender CD-60SCE',
            'Электроакустическая гитара Ibanez PF15ECE',
            'Электрогитара Ibanez SS21BBS'
        ]

        # Все услуги для миграции
        services_to_migrate = [
            # Аренда помещений
            'Аренда Класса',
            'Аренда Класса (Ударные)',
            
            # Запись и обработка
            'Звукозапись',
            'Мастеринг',
            'Поканальная запись репетиции (акустическая ударная установка)',
            'Поканальная запись репетиции (без ударной установки)',
            'Поканальная запись репетиции (электронная ударная установка)',
            'Реампинг',
            'Сведение',
            
            # Аренда оборудования
            *equipment_rentals
        ]

        # Создаем новые услуги
        for name in services_to_migrate:
            service, created = Service.objects.get_or_create(
                name=name,
                defaults={
                    'active': True,
                }
            )
            # Добавляем тип бронирования
            service.reservation_type.add(default_reservation_type)

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Создана услуга: {name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Услуга уже существует: {name}')
                )
