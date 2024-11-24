from django.shortcuts import render, redirect
from django.utils import timezone
from booking.models import Client


def menu2_view(request):
    clients = Client.objects.all()

    if request.method == 'POST':
        if 'day7' in request.POST:
            start_date = timezone.now().date()
            end_date = start_date + timezone.timedelta(days=7)
        elif 'allday' in request.POST:
            start_date = timezone.now().date().replace(day=1)  # начало месяца
            end_date = timezone.now().date().replace(day=1) + timezone.timedelta(days=30)
        elif 'repiod' in request.POST:
            start_date = request.POST.get('from_date')
            end_date = request.POST.get('to_date')
        elif 'repiodreset' in request.POST:
            start_date, end_date = None, None  # сброс фильтра

    return {
        'clients': clients,
        'm': 'эм',  # Добавь здесь, если m нужно
        'month_names': 'месяца',  # Убедись, что month_names тоже передано
        'y': 'игрек',  # То же самое для y
    }
