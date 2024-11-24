from django.core.management.base import BaseCommand
from booking.models import Service, ServiceGroup


class Command(BaseCommand):
    help = 'Связывает существующие услуги с группами'

    def handle(self, *args, **kwargs):
        # Получаем группы
        equipment_group = ServiceGroup.objects.get(name='Аренда оборудования')
        other_group = ServiceGroup.objects.get(name='Прочее')

        # Список услуг для группы "Аренда оборудования"
        equipment_services = [
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

        # Обновляем услуги
        services = Service.objects.all()
        for service in services:
            if service.name in equipment_services:
                service.group = equipment_group
            else:
                service.group = other_group
            service.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Услуга "{service.name}" добавлена в группу "{service.group.name}"'
                )
            )
