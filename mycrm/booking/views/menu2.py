from django.utils import timezone


def menu2_view(request):
    if request.method == 'POST':
        if 'day7' in request.POST:
            start_date = timezone.now().date()
            end_date = start_date + timezone.timedelta(days=7)
        elif 'allday' in request.POST:
            start_date = timezone.now().date().replace(day=1) 
            end_date = timezone.now().date().replace(day=1) + timezone.timedelta(days=30)
        elif 'repiod' in request.POST:
            start_date = request.POST.get('from_date')
            end_date = request.POST.get('to_date')
        elif 'repiodreset' in request.POST:
            start_date, end_date = None, None  # сброс фильтра

    return {
        'm': 'эм',  #
        'month_names': 'месяца',  
        'y': 'игрек',  
    }
