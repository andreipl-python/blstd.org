import random
from django.core.management.base import BaseCommand
from booking.models import Client, Subscription, ReservationType


class Command(BaseCommand):
    help = 'Добавляет случайный баланс тарифных единиц (от 1 до 5) каждому клиенту для типов брони с id 1 и 2'

    def handle(self, *args, **options):
        reservation_types = ReservationType.objects.filter(id__in=[5])
        if not reservation_types:
            self.stdout.write(self.style.ERROR('Типы брони с id 1 и 2 не найдены'))
            return

        clients = Client.objects.all()
        
        for client in clients:
            for reservation_type in reservation_types:
                balance = random.randint(1, 5)
                
                subscription, created = Subscription.objects.update_or_create(
                    client=client,
                    reservation_type=reservation_type,
                    defaults={'balance': balance}
                )
                
                action = 'Создана' if created else 'Обновлена'
                self.stdout.write(
                    self.style.SUCCESS(
                        f'{action} подписка для клиента {client.name} '
                        f'с балансом {balance} единиц для типа брони "{reservation_type.name}"'
                    )
                )
