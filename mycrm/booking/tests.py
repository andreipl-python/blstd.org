from django.test import TestCase
from .models import Room, ReservationType
from .services import add_reservation_types_to_room


class ServicesTestCase(TestCase):
    def setUp(self):
        # Создаем тестовые данные
        self.room = Room.objects.create(name="Test Room", hourstart="09:00", hourend="18:00")
        self.type1 = ReservationType.objects.create(name="Type 1")
        self.type2 = ReservationType.objects.create(name="Type 2")

    def test_add_reservation_types_to_room(self):
        # Тестируем функцию
        result = add_reservation_types_to_room(self.room.id, [self.type1.id, self.type2.id])

        # Проверка, что типы бронирования добавлены
        self.assertIn(self.type1, self.room.reservation_type.all())
        self.assertIn(self.type2, self.room.reservation_type.all())

        # Проверка сообщения о результате
        self.assertEqual(result, f"Типы бронирования {[self.type1.id, self.type2.id]} "
                                 f"успешно добавлены к комнате {self.room.id}")
