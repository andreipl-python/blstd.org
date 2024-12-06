from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LogoutView
from django.http import HttpResponse
from django.shortcuts import render, redirect
from .models import Client, Reservation, Subscription


class CustomLogoutView(LogoutView):
    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


def auth_view(request):
    if request.method == 'POST':
        username = request.POST['login']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('index')
        else:
            pass

    return render(request, 'booking/user/auth.html')


@login_required(login_url='login')
def menu_view(request):
    users = Client.objects.exclude(idoblast=666)

    filter_type = request.GET.get('filter_type')
    if filter_type == 'managerandprepod':
        users = Client.filter(role__in=['manager', 'prepod'])
    elif filter_type == 'school':
        users = Client.filter(idoblast=1)
    elif filter_type == 'studia':
        users = Client.filter(idoblast=2)
    elif filter_type == 'schoolstudia':
        users = Client.filter(idoblast=3)

    context = {
        'users': users,
        'filter_type': filter_type,
    }

    return render(request, 'booking/add/menu.html', context)


@login_required(login_url='login')
def users_list_view(request):
    def how_know_func(howknow):
        if howknow == '1':
            return "Инстаграмм"
        elif howknow == '2':
            return "ВК"
        elif howknow == '3':
            return "Реклама"
        else:
            return "Не указано"

    filter_type = request.GET.get('filter_type')
    role_type, oblast_type = None, None

    users = Client.objects.all().order_by('-id')

    if filter_type == 'clients':
        users = Client.exclude(role='hide')
    elif filter_type == 'workers':
        role_type = "workers"
        users = Client.filter(role__in=['manager', 'prepod'])
    elif filter_type == 'school':
        users = Client.filter(idoblast=1)
        oblast_type = 'showusers_school'
    elif filter_type == 'studio':
        users = Client.filter(idoblast=2)
        oblast_type = 'showusers_studia'
    elif filter_type == 'schoolstudia':
        users = Client.filter(idoblast__in=[1, 2])
        oblast_type = 'showusers_schoolstudia'

    user_brones = {}
    for user in users:
        brones = Reservation.objects.filter(iduser=user.id).order_by('-idprepod').values('idprepod').distinct()
        bron_info = []
        for bron in brones:
            idprepod = bron['idprepod']
            if idprepod == 0:
                name_prepod = "Аренда"
                comment_prepod = "Помещения"
                color_user = "#cfcfcf"
            else:
                prepod_user = Client.objects.filter(id=idprepod).first()
                name_prepod = prepod_user.email if prepod_user else "Неизвестно"
                comment_prepod = prepod_user.comment if prepod_user else ""
                color_user = prepod_user.color if prepod_user else "#cfcfcf"
            bron_info.append({'color': color_user, 'name': name_prepod, 'comment': comment_prepod})
        user_brones[user.id] = bron_info

    user_abon = {}
    for user in users:
        abon_info = ""
        adds_abon = Abon.objects.filter(iduser=user.id, hide=0).order_by('-id')[:3]

        for row_abon in adds_abon:
            hours = row_abon.hours
            hoursleft = row_abon.hoursleft
            price = row_abon.price
            moneyleft = row_abon.moneyleft
            oblast = row_abon.oblast
            status_ico = "green_status"

            if hoursleft == 0 or moneyleft == 0:
                status_ico = "red_status"

            if oblast == 1:
                abon_info += f"{hoursleft} из {hours} часов, <b>{price} руб</b> <span class='{status_ico}'> Ш </span><br>"
            elif oblast == 2:
                abon_info += f"{hoursleft} из {hours} часов, <b>{price} руб</b> <span class='{status_ico}'> С </span><br>"
            elif oblast == 10:
                abon_info += f"{moneyleft} из {price} руб <span class='{status_ico}'> $ </span><br>"

        user_abon[user.id] = abon_info.strip()

    for user in users:
        user.howknow_show = ""
        howknow = user.howknow
        if howknow != 0:
            user.howknow_show = f"<hr> <u>Как узнали?</u> - {how_know_func(howknow)}"

    return render(request, 'booking/user/users_list.html', {
        'users': users,
        'user_brones': user_brones,
        'user_abon': user_abon,
        'who_show': "| Клиенты" if not role_type or role_type == "" else "| Сотрудники",
        'where_oblast_show': "Показаны все" if not oblast_type else (
            "Школа" if oblast_type == "showusers_school" else "Студия" if oblast_type == "showusers_studia" else "Школа + студия" if oblast_type == "showusers_schoolstudia" else ""),
    })

