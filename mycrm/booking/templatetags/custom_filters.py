from django import template
from datetime import datetime, timedelta
import json

register = template.Library()


@register.filter
def get(dictionary, key):
    return dictionary.get(key, [])


@register.filter(name="time_add")
def time_add(value, steps):
    """Добавляет 15 минут к времени по шагам (steps)"""
    time_obj = datetime.strptime(value, "%H:%M")
    new_time = time_obj + timedelta(minutes=steps * 15)
    return new_time.strftime("%H:%M")


@register.filter
def range_filter(value, arg):
    return range(value, arg)


@register.filter
def str_to_time(value):
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        return None


@register.filter
def combine_date_time(date_obj, time_obj):
    # print(f'Тип: {type(date_obj)}, объект: {date_obj}')
    # print(f'Тип: {type(time_obj)}, объект: {time_obj}')
    return datetime.combine(date_obj.date(), time_obj)


@register.filter
def type_of(value):
    return str(type(value))


@register.filter
def to_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


@register.filter(name='parse_json')
def parse_json(value):
    """Парсит JSON строку в Python объект"""
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return []
