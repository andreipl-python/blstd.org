from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LogoutView
from django.http import HttpResponse
from django.shortcuts import render, redirect
from .models import User, Bron, Abon


class CustomLogoutView(LogoutView):
    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


def index(request):
    return render(request, 'booking/index.html')


def auth_view(request):
    if request.method == 'POST':
        username = request.POST['login']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('index')
        else:
            # Здесь можно добавить сообщение об ошибке
            pass

    return render(request, 'booking/user/auth.html')


@login_required(login_url='login')
def menu_view(request):
    users = User.objects.exclude(idoblast=666)

    filter_type = request.GET.get('filter_type')
    if filter_type == 'managerandprepod':
        users = users.filter(role__in=['manager', 'prepod'])
    elif filter_type == 'school':
        users = users.filter(idoblast=1)
    elif filter_type == 'studia':
        users = users.filter(idoblast=2)
    elif filter_type == 'schoolstudia':
        users = users.filter(idoblast=3)

    context = {
        'users': users,
        'filter_type': filter_type,
    }

    return render(request, 'booking/add/menu.html', context)


def user_menu_view(request, user_id):
    current_url = request.path
    context = {
        'user': request.user,  # если используется система авторизации, иначе заменить user на объект клиента
        'current_url': current_url
    }
    return render(request, 'booking/add/menu_cabinet.html', context)


@login_required(login_url='login')
def user_index(request):
    return render(request, 'booking/user/index.html')


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

    users = User.objects.all().order_by('-id')

    if filter_type == 'clients':
        users = users.exclude(role='hide')
    elif filter_type == 'workers':
        role_type = "workers"
        users = users.filter(role__in=['manager', 'prepod'])
    elif filter_type == 'school':
        users = users.filter(idoblast=1)
        oblast_type = 'showusers_school'
    elif filter_type == 'studio':
        users = users.filter(idoblast=2)
        oblast_type = 'showusers_studia'
    elif filter_type == 'schoolstudia':
        users = users.filter(idoblast__in=[1, 2])
        oblast_type = 'showusers_schoolstudia'

    user_brones = {}
    for user in users:
        brones = Bron.objects.filter(iduser=user.id).order_by('-idprepod').values('idprepod').distinct()
        bron_info = []
        for bron in brones:
            idprepod = bron['idprepod']
            if idprepod == 0:
                name_prepod = "Аренда"
                comment_prepod = "Помещения"
                color_user = "#cfcfcf"
            else:
                prepod_user = User.objects.filter(id=idprepod).first()
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


@login_required(login_url='login')
def smena_view(request):
    return render(request, 'booking/user/smena.html')


@login_required(login_url='login')
def smena_new_view(request):
    return render(request, 'booking/user/smena_new.html')


@login_required(login_url='login')
def admin_index_view(request):
    return render(request, 'booking/admin/index.html')


@login_required(login_url='login')
def user_payment_view(request):
    return render(request, 'booking/user/payment.html')


@login_required(login_url='login')
def user_paytable_view(request):
    return render(request, 'booking/user/paytable.html')


@login_required(login_url='login')
def user_stats_school_view(request):
    return render(request, 'booking/user/stats_school.html')


@login_required(login_url='login')
def user_stats_average_view(request):
    return render(request, 'booking/user/stats_average.html')


@login_required(login_url='login')
def user_stats_profit_view(request):
    return render(request, 'booking/user/stats_profit.html')


@login_required(login_url='login')
def user_stats_all_view(request):
    return render(request, 'booking/user/stats_all.html')
