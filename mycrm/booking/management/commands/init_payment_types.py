from django.core.management.base import BaseCommand
from booking.models import PaymentType

class Command(BaseCommand):
    help = 'Инициализация типов платежей'

    def handle(self, *args, **options):
        payment_types = [
            {
                'name': 'Наличные',
                'description': 'Оплата наличными средствами'
            },
            {
                'name': 'Безналичные',
                'description': 'Оплата банковской картой или переводом'
            },
            {
                'name': 'Тарифные единицы',
                'description': 'Оплата тарифными единицами из абонемента'
            }
        ]

        for payment_type in payment_types:
            PaymentType.objects.get_or_create(
                name=payment_type['name'],
                defaults={'description': payment_type['description']}
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created payment type "{payment_type["name"]}"')
            )
