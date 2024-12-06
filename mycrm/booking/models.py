from django.db import models
from django.db.models import PROTECT, CASCADE
from enum import IntEnum


class Subscription(models.Model):
    """Модель для хранения информации об абонементах"""
    id = models.AutoField(primary_key=True)
    client = models.ForeignKey('Client', on_delete=models.PROTECT, help_text='ID клиента', verbose_name='ID клиента')
    reservation_type = models.ForeignKey('ReservationType', on_delete=models.PROTECT, help_text='ID сценария', verbose_name='ID сценария')
    balance = models.IntegerField(help_text='Баланс тарифных единиц', verbose_name='Баланс тарифных единиц')

    class Meta:
        db_table = 'subscriptions'
        verbose_name = "Абонемент"
        verbose_name_plural = "Абонементы"

    def __str__(self):
        return f"{self.client} - {self.reservation_type} ({self.balance} ед.)"


class ReservationStatusType(models.Model):
    """Модель для хранения типов статусов бронирования"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=100,
        help_text='Название статуса',
        verbose_name='Название',
        unique=True
    )
    description = models.TextField(
        help_text='Описание статуса',
        verbose_name='Описание',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'reservation_status_types'
        verbose_name = "Тип статуса бронирования"
        verbose_name_plural = "Типы статусов бронирования"

    def __str__(self):
        return self.name


class Reservation(models.Model):
    """Модель для хранения информации о созданных бронях"""

    id = models.AutoField(primary_key=True)
    datetimestart = models.DateTimeField(help_text='Дата и время начала брони', verbose_name='Datetime начала',
                                         null=False, blank=False)
    datetimeend = models.DateTimeField(help_text='Дата и время окончания брони', verbose_name='Datetime конца',
                                       null=False, blank=False)
    specialist = models.ForeignKey('Specialist', on_delete=models.PROTECT,
                                   help_text='ID специалиста, закрепленного за бронью',
                                   verbose_name='ID специалиста', null=True)
    client = models.ForeignKey('Client', on_delete=models.PROTECT,
                               help_text='ID клиента, закрепленного за бронью', verbose_name='ID клиента',
                               null=False)
    client_group = models.ForeignKey('ClientGroup', on_delete=models.PROTECT,
                                     help_text='ID группы (коллектива) клиента, закрепленного за бронью, '
                                               'если групповое бронирование',
                                     verbose_name='ID группы клиента', null=True)
    room = models.ForeignKey('Room', on_delete=models.PROTECT,
                             help_text='ID помещения, которое забронировано', verbose_name='ID помещения',
                             null=False, blank=False)
    reservation_type = models.ForeignKey('ReservationType', on_delete=PROTECT,
                                         help_text='ID типа бронирования (шаблона направления)',
                                         verbose_name='ID типа брони', null=False)
    status = models.ForeignKey('ReservationStatusType', on_delete=models.PROTECT,
                              help_text='Статус брони',
                              verbose_name='Статус',
                              null=True)
    cancellation_reason = models.ForeignKey('CancellationReason', 
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text='Причина отмены брони',
        verbose_name='Причина отмены'
    )
    comment = models.TextField(help_text='Комментарий к брони', verbose_name='Комментарий', null=True)
    services = models.ManyToManyField('Service', related_name='reservations',
                                    help_text='Услуги, включенные в бронь',
                                    verbose_name='Услуги', blank=True)
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Общая стоимость брони',
        verbose_name='Стоимость',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Дата создания брони',
        verbose_name='Создана'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Дата обновления брони',
        verbose_name='Обновлена'
    )

    class Meta:
        db_table = 'reservations'
        verbose_name = "Бронь"
        verbose_name_plural = "Брони"


class ReservationType(models.Model):
    """Модель для хранения информации о типах бронирования (шаблонах направлений)"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(help_text='Наименование типа бронирования (шаблона направления)',
                            verbose_name='Наименование типа бронирования', max_length=100, null=False, unique=True)

    class Meta:
        db_table = 'reservation_types'
        verbose_name = "Тип бронирования (шаблон направления)"
        verbose_name_plural = "Типы бронирования (шаблоны направлений)"

    def __str__(self):
        return self.name


class TariffUnit(models.Model):
    """Модель для хранения информации о тарифных единицах"""

    reservation_type = models.ForeignKey('ReservationType', on_delete=models.PROTECT,
                                         help_text='ID типа бронирования (сценария)', verbose_name='ID сценария')
    min_reservation_time = models.TimeField(help_text='Минимальное время бронирования (размер тарифной единицы)',
                                            verbose_name='Минимальное время бронирования')
    tariff_unit_cost = models.DecimalField(max_digits=10, decimal_places=2, help_text='Стоимость тарифной единицы', 
                                            verbose_name='Стоимость тарифной единицы')

    class Meta:
        db_table = 'tariff_units'
        verbose_name = "Тарифная единица"
        verbose_name_plural = "Тарифные единицы"

    def __str__(self):
        return f"{self.reservation_type} - {self.min_reservation_time} ({self.tariff_unit_cost} руб.)"


class ServiceGroup(models.Model):
    """Модель для хранения информации о группах услуг"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(help_text='Наименование группы услуг',
                            verbose_name='Наименование группы услуг',
                            max_length=100,
                            unique=True)
    active = models.BooleanField(help_text='Активность группы услуг (включена или нет)',
                                 verbose_name='Активность группы услуг',
                                 default=True)

    class Meta:
        db_table = 'service_groups'
        verbose_name = "Группа услуг"
        verbose_name_plural = "Группы услуг"

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)


class Service(models.Model):
    """Модель для хранения информации об услугах"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(help_text='Наименование услуги',
                            verbose_name='Наименование услуги',
                            max_length=100,
                            unique=True)
    active = models.BooleanField(help_text='Активность услуги (включена или нет)',
                                 verbose_name='Активность услуги',
                                 default=True)
    group = models.ForeignKey('ServiceGroup',
                              on_delete=PROTECT,
                              help_text='Группа услуг',
                              verbose_name='Группа услуг',
                              null=True,
                              blank=True)
    reservation_type = models.ManyToManyField('ReservationType',
                                          help_text='Типы бронирования для услуги',
                                          verbose_name='Типы бронирования',
                                          related_name='services')

    class Meta:
        db_table = 'services'
        verbose_name = "Услуга"
        verbose_name_plural = "Услуги"

    def __str__(self):
        return self.name


class Specialist(models.Model):
    """Модель для хранения информации о специалистах"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(help_text='ФИО специалиста', verbose_name='ФИО специалиста', max_length=100, null=False,
                            unique=True)
    active = models.BooleanField(help_text='Активность специалиста (работает или нет)',
                                 verbose_name='Активность специалиста', default=True)
    client = models.ForeignKey('Client', on_delete=CASCADE,
                               help_text='ID клиента (для тех случаев, когда специалист выступает в роли клиента '
                                         'для бронирования)', verbose_name='ID клиента', null=True)
    reservation_type = models.ManyToManyField('ReservationType', related_name='reservation_types',
                                              help_text='Типы бронирования доступные для специалиста',
                                              verbose_name='Типы бронирования',)

    class Meta:
        db_table = 'specialists'
        verbose_name = "Специалист"
        verbose_name_plural = "Специалисты"

    def __str__(self):
        return self.name


class Client(models.Model):
    """Модель для хранения информации о клиентах"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, help_text='ФИО клиента', verbose_name='ФИО клиента', null=False,
                            blank=False)
    comment = models.TextField(help_text='Комментарий к клиенту', verbose_name='Комментарий к клиенту', null=True,
                               blank=True)
    phone = models.CharField(max_length=150, help_text='Телефон клиента', verbose_name='Телефон клиента', null=True,
                             blank=True)
    group = models.ForeignKey('ClientGroup', on_delete=models.PROTECT, help_text='ID группы клиента', verbose_name='ID группы клиента',
                             null=True)

    class Meta:
        db_table = 'clients'
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"

    def __str__(self):
        return self.name

    @property
    def rating(self):
        """Возвращает средний рейтинг клиента"""
        ratings = self.clientrating_set.all()
        if ratings.exists():
            return ratings.aggregate(models.Avg('rating'))['rating__avg']
        return None  # Если нет оценок


class ClientGroup(models.Model):
    """Модель для хранения информации о группах клиентов"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(help_text='Название группы', verbose_name='Название группы', max_length=100, null=False,
                            unique=True)

    class Meta:
        db_table = 'client_groups'
        verbose_name = "Группа клиента"
        verbose_name_plural = "Группы клиентов"


class ClientRating(models.Model):
    """Модель для хранения оценок клиентов"""
    client = models.ForeignKey('Client', on_delete=models.PROTECT, help_text='ID клиента', null=False)
    rating = models.IntegerField(help_text='Оценка выставленная клиенту', verbose_name='Оценка клиента', null=False, blank=False)
    comment = models.TextField(help_text='Комментарий к оценке', verbose_name='Комментарий к оценке', null=True,
                               blank=True)

    class Meta:
        db_table = 'client_ratings'
        verbose_name = 'Оценка клиента'
        verbose_name_plural = 'Оценки клиентов'

    def __str__(self):
        return f"Оценка {self.rating} для {self.client}"


class Room(models.Model):
    """Модель для хранения информации о помещениях"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, help_text='Наименование помещения', verbose_name='Наименование помещения',
                            null=False, blank=False, unique=True)
    hourstart = models.TimeField(help_text="Время начала работы помещения", verbose_name="Начало работы")
    hourend = models.TimeField(help_text="Время окончания работы помещения", verbose_name="Конец работы")
    reservation_type = models.ManyToManyField('ReservationType', related_name='rooms',
                                              help_text="Типы бронирования, доступные для помещения",
                                              verbose_name="Типы бронирования")
    service = models.ManyToManyField('Service', related_name='services', help_text='Услуги доступные для помещения', verbose_name='Услуги')

    class Meta:
        db_table = 'rooms'
        verbose_name = 'Помещение'
        verbose_name_plural = 'Помещения'

    def __str__(self):
        return self.name


class SpecialistColor(models.Model):
    specialist = models.OneToOneField(
        Specialist, 
        on_delete=models.PROTECT,
        related_name='color_scheme',
        verbose_name='Специалист'
    )
    primary_color = models.CharField(
        max_length=7,
        help_text='HEX код цвета (например, #FF5733)',
        verbose_name='Основной цвет'
    )
    secondary_color = models.CharField(
        max_length=7,
        help_text='HEX код цвета для градиента',
        verbose_name='Дополнительный цвет'
    )
    
    def __str__(self):
        return f'Цветовая схема: {self.specialist.name}'

    class Meta:
        db_table = 'specialist_colors'
        verbose_name = 'Цветовая схема специалиста'
        verbose_name_plural = 'Цветовые схемы специалистов'


class CancellationPolicy(models.Model):
    """Модель для хранения правил отмены бронирования"""
    
    reservation_type = models.OneToOneField(
        'ReservationType',
        on_delete=models.PROTECT,
        related_name='cancellation_policy',
        help_text='Тип бронирования, к которому применяется политика отмены',
        verbose_name='Тип бронирования'
    )
    
    hours_before = models.PositiveIntegerField(
        help_text='За сколько часов до начала брони можно отменить без штрафа',
        verbose_name='Часов до начала',
        default=2
    )
    
    class Meta:
        db_table = 'cancellation_policies'
        verbose_name = 'Правило отмены бронирования'
        verbose_name_plural = 'Правила отмены бронирования'

    def __str__(self):
        return f'Политика отмены для {self.reservation_type.name}'


class CancellationReason(models.Model):
    """Модель для хранения причин отмены броней"""
    
    name = models.CharField(
        max_length=255,
        verbose_name='Причина отмены',
        help_text='Название причины отмены брони'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активна',
        help_text='Показывать ли эту причину в списке'
    )
    order = models.IntegerField(
        default=0,
        verbose_name='Порядок отображения',
        help_text='Порядок отображения в списке (меньше = выше)'
    )
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'cancellation_reasons'
        verbose_name = 'Причина отмены'
        verbose_name_plural = 'Причины отмены'
        ordering = ['order', 'name']


class PaymentType(models.Model):
    """Модель для хранения типов оплаты"""
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=100,
        help_text='Название типа оплаты',
        verbose_name='Название',
        unique=True
    )
    description = models.TextField(
        help_text='Описание типа оплаты',
        verbose_name='Описание',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'payment_types'
        verbose_name = "Тип оплаты"
        verbose_name_plural = "Типы оплаты"

    def __str__(self):
        return self.name


class Payment(models.Model):
    """Модель для хранения информации о платежах"""
    id = models.AutoField(primary_key=True)
    reservation = models.ForeignKey(
        'Reservation',
        on_delete=models.PROTECT,
        help_text='Бронь, к которой относится платёж',
        verbose_name='Бронь'
    )
    payment_type = models.ForeignKey(
        'PaymentType',
        on_delete=models.PROTECT,
        help_text='Тип платежа',
        verbose_name='Тип платежа'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Сумма платежа',
        verbose_name='Сумма'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Дата создания платежа',
        verbose_name='Создан'
    )
    comment = models.TextField(
        help_text='Комментарий к платежу',
        verbose_name='Комментарий',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'payments'
        verbose_name = "Платёж"
        verbose_name_plural = "Платежи"

    def __str__(self):
        return f"Платёж {self.id} для брони {self.reservation.id}"
