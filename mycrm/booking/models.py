from django.db import models


from django.db import models


class Abon(models.Model):
    id = models.AutoField(primary_key=True)
    iduser = models.IntegerField()
    hours = models.CharField(max_length=50)
    hoursleft = models.CharField(max_length=50)
    price = models.CharField(max_length=50)
    moneyleft = models.CharField(max_length=50)
    validity = models.CharField(max_length=50)
    datesale = models.CharField(max_length=50)
    datefirstbron = models.CharField(max_length=50)
    dateexpired = models.CharField(max_length=50)
    oblast = models.IntegerField()
    probnoe = models.IntegerField()
    hide = models.IntegerField()
    idbron = models.IntegerField()

    class Meta:
        db_table = 'abon'


class ActiveClient(models.Model):
    id = models.AutoField(primary_key=True)
    iditem = models.IntegerField()
    date = models.CharField(max_length=150)
    num = models.IntegerField()

    class Meta:
        db_table = 'active_client'


class AuthTable(models.Model):
    id = models.AutoField(primary_key=True)
    iduser = models.IntegerField()
    hash = models.CharField(max_length=32)

    class Meta:
        db_table = 'authtable'


class Bron(models.Model):
    id = models.AutoField(primary_key=True)
    hash = models.CharField(max_length=50)
    day = models.CharField(max_length=50)
    mon = models.CharField(max_length=50)
    year = models.CharField(max_length=50)
    timestart = models.CharField(max_length=50)
    timeend = models.CharField(max_length=50)
    idprepod = models.IntegerField()
    iduser = models.IntegerField()
    idroom = models.IntegerField()
    period = models.CharField(max_length=50)
    hide = models.IntegerField()
    status = models.IntegerField()  # 0 - новая / 2 - 60% / 3 оплата
    pay = models.CharField(max_length=50)
    numbron = models.IntegerField()
    comment = models.TextField()

    class Meta:
        db_table = 'bron'


class ColoredBlock(models.Model):
    id = models.AutoField(primary_key=True)
    idroom = models.IntegerField()
    weekday = models.IntegerField()
    hour = models.IntegerField()
    min = models.IntegerField()

    class Meta:
        db_table = 'coloredblock'


class ConnectUser(models.Model):
    id = models.AutoField(primary_key=True)
    iduser1 = models.IntegerField()
    iduser2 = models.IntegerField()

    class Meta:
        db_table = 'connect_user'


class Gruslugi(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    prior = models.IntegerField()
    hide = models.IntegerField()

    class Meta:
        db_table = 'gruslugi'


class Log(models.Model):
    id = models.AutoField(primary_key=True)
    description = models.TextField()
    time = models.CharField(max_length=100)
    date = models.CharField(max_length=100)

    class Meta:
        db_table = 'log'


class ManagerSmena(models.Model):
    id = models.AutoField(primary_key=True)
    role = models.CharField(max_length=50)
    date = models.CharField(max_length=50)
    comment = models.TextField()
    iduser = models.IntegerField()
    timestart = models.CharField(max_length=50)
    timeend = models.CharField(max_length=50)

    class Meta:
        db_table = 'managersmena'


class Oblast(models.Model):
    id = models.AutoField(primary_key=True)
    nameru = models.CharField(max_length=150)

    class Meta:
        db_table = 'oblast'


class Payment(models.Model):
    id = models.AutoField(primary_key=True)
    idbron = models.IntegerField()
    typepay = models.CharField(max_length=50)
    money = models.CharField(max_length=50)
    hours = models.CharField(max_length=50)
    opisanie = models.TextField()
    date = models.CharField(max_length=50)
    time = models.CharField(max_length=50)
    idoblast = models.IntegerField()

    class Meta:
        db_table = 'payment'


class PaymentDetail(models.Model):
    id = models.AutoField(primary_key=True)
    idbron = models.IntegerField()
    idpaymenttype = models.IntegerField()
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'paymentdetail'


class PaymentType(models.Model):
    id = models.AutoField(primary_key=True)
    nameru = models.CharField(max_length=150)
    hide = models.IntegerField()
    prior = models.IntegerField()

    class Meta:
        db_table = 'paymenttype'


class Room(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField()
    hourstart = models.IntegerField()
    hourend = models.IntegerField()
    period = models.IntegerField()
    idoblast = models.IntegerField()
    prior = models.IntegerField()

    class Meta:
        db_table = 'room'


class Salary(models.Model):
    id = models.AutoField(primary_key=True)
    iduser = models.IntegerField()
    salary = models.CharField(max_length=50)

    class Meta:
        db_table = 'salary'


class Smena(models.Model):
    id = models.AutoField(primary_key=True)
    role = models.CharField(max_length=50)
    date = models.CharField(max_length=50)
    comment = models.TextField()
    iduser = models.IntegerField()

    class Meta:
        db_table = 'smena'


class Tarif(models.Model):
    id = models.AutoField(primary_key=True)
    tarifname = models.CharField(max_length=150)
    idroom = models.IntegerField()
    prior = models.IntegerField()

    class Meta:
        db_table = 'tarif'


class TarifSaveBron(models.Model):
    id = models.AutoField(primary_key=True)
    idbron = models.IntegerField()
    idtarif = models.IntegerField()
    skidka = models.CharField(max_length=50)

    class Meta:
        db_table = 'tarifsavebron'


class TarifSetting(models.Model):
    id = models.AutoField(primary_key=True)
    idtarif = models.IntegerField()
    day = models.IntegerField()
    timefrom = models.CharField(max_length=50)
    timeto = models.CharField(max_length=50)
    price = models.CharField(max_length=50)

    class Meta:
        db_table = 'tarifsetting'


class TryTable(models.Model):
    id = models.AutoField(primary_key=True)
    ip = models.CharField(max_length=150)
    datelogin = models.CharField(max_length=150)
    timelogin = models.CharField(max_length=150)

    class Meta:
        db_table = 'trytable'


class UserImage(models.Model):
    id = models.AutoField(primary_key=True)
    iduser = models.IntegerField()
    image = models.CharField(max_length=50)
    hide = models.IntegerField()

    class Meta:
        db_table = 'userimage'


class User(models.Model):
    id = models.AutoField(primary_key=True)
    login = models.CharField(max_length=50)
    password = models.CharField(max_length=32)
    hash = models.CharField(max_length=32)
    role = models.CharField(max_length=50)
    email = models.CharField(max_length=150)
    comment = models.TextField()
    color = models.CharField(max_length=50)
    idoblast = models.IntegerField()
    phone = models.CharField(max_length=150)
    howknow = models.IntegerField()
    comment2 = models.TextField()

    class Meta:
        db_table = 'users'


class Uslugi(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    price = models.CharField(max_length=150)
    prior = models.IntegerField()
    idgruppa = models.IntegerField()

    class Meta:
        db_table = 'uslugi'


class UslugiBron(models.Model):
    id = models.AutoField(primary_key=True)
    idbron = models.IntegerField()
    idusluga = models.IntegerField()
    timehour = models.CharField(max_length=50)
    skidka = models.CharField(max_length=50)

    class Meta:
        db_table = 'uslugibron'
