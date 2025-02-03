from django.core.management.base import BaseCommand
from booking.models import Room, ReservationType


class Command(BaseCommand):
    help = "Команда для добавления типов бронирования к помещениям"

    def handle(self, *args, **kwargs):
        try:
            room = Room.objects.get(id=1)
            types_to_add = ReservationType.objects.filter(id__in=[4, 5])
            room.reservation_type.add(*types_to_add)
            self.stdout.write(self.style.SUCCESS("Типы бронирования успешно добавлены!"))
        except Room.DoesNotExist:
            self.stdout.write(self.style.ERROR("Комната с ID 1 не найдена"))
        except ReservationType.DoesNotExist:
            self.stdout.write(self.style.ERROR("Некоторые типы бронирования не найдены"))
