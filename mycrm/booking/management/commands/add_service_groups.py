from django.core.management.base import BaseCommand
from booking.models import ServiceGroup


class Command(BaseCommand):
    help = 'Добавляет начальные группы услуг'

    def handle(self, *args, **kwargs):
        groups = [
            {
                'name': 'Аренда оборудования',
                'active': True
            },
            {
                'name': 'Прочее',
                'active': True
            }
        ]

        for group_data in groups:
            group, created = ServiceGroup.objects.get_or_create(**group_data)
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Создана группа услуг: {group.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Группа услуг уже существует: {group.name}')
                )
