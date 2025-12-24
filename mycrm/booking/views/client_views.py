"""
Представления для работы с клиентами
"""

import json
import re

from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect

from ..models import Client


def validate_russian_name(value):
    """Проверяет, что строка содержит только русские буквы, пробелы и дефисы"""
    if not value or not value.strip():
        return False
    pattern = r"^[А-Яа-яЁё\s\-]+$"
    return bool(re.match(pattern, value.strip()))


def validate_belarus_phone(value):
    """Проверяет формат белорусского телефона +375 (29|44|25|33) XXX-XX-XX"""
    if not value:
        return False
    # Убираем всё кроме цифр
    digits = re.sub(r"\D", "", value)
    # Должно быть 12 цифр: 375 + 2 (код оператора) + 7 (номер)
    if len(digits) != 12:
        return False
    # Проверяем начало 375 и код оператора (29, 44, 25, 33)
    pattern = r"^375(29|44|25|33)\d{7}$"
    return bool(re.match(pattern, digits))


def normalize_phone(value):
    """Нормализует телефон к формату +375XXXXXXXXX"""
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    if digits.startswith("375") and len(digits) == 12:
        return "+" + digits
    return None


@csrf_protect
@require_POST
def add_client_view(request):
    """
    Добавление нового клиента
    POST /booking/client/add/
    Body: { name: str, phone: str, comment: str (optional) }
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "error": "Некорректный формат данных"}, status=400
        )

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    comment = data.get("comment", "").strip()

    # Валидация имени (полное имя = Фамилия + Имя)
    if not name:
        return JsonResponse(
            {"success": False, "error": "Введите имя клиента"}, status=400
        )

    # Проверяем, что имя содержит только русские буквы
    if not validate_russian_name(name):
        return JsonResponse(
            {"success": False, "error": "Имя должно содержать только русские буквы"},
            status=400,
        )

    if len(name) > 150:
        return JsonResponse(
            {"success": False, "error": "Имя слишком длинное (максимум 150 символов)"},
            status=400,
        )

    # Валидация телефона
    if not phone:
        return JsonResponse(
            {"success": False, "error": "Введите номер телефона"}, status=400
        )

    if not validate_belarus_phone(phone):
        return JsonResponse(
            {
                "success": False,
                "error": "Неверный формат телефона. Используйте: +375 XX XXX-XX-XX",
            },
            status=400,
        )

    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        return JsonResponse(
            {"success": False, "error": "Не удалось обработать номер телефона"},
            status=400,
        )

    # Проверка уникальности телефона
    if Client.objects.filter(phone=normalized_phone).exists():
        return JsonResponse(
            {
                "success": False,
                "error": "Клиент с таким номером телефона уже существует",
            },
            status=400,
        )

    # Валидация комментария
    if comment and len(comment) > 1000:
        return JsonResponse(
            {
                "success": False,
                "error": "Комментарий слишком длинный (максимум 1000 символов)",
            },
            status=400,
        )

    # Генерация ID для нового клиента
    max_id = Client.objects.order_by("-id").values_list("id", flat=True).first()
    new_id = (max_id or 0) + 1

    # Создание клиента
    try:
        client = Client.objects.create(
            id=new_id,
            name=name,
            phone=normalized_phone,
            comment=comment if comment else None,
        )
        return JsonResponse(
            {
                "success": True,
                "client": {"id": client.id, "name": client.name, "phone": client.phone},
            }
        )
    except Exception as e:
        return JsonResponse(
            {"success": False, "error": f"Ошибка при создании клиента: {str(e)}"},
            status=500,
        )
