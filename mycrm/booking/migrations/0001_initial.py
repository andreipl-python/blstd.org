from django.db import migrations, models
import django.db.models.deletion


def skip_if_exists(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.RunPython(
            skip_if_exists,
            reverse_code=migrations.RunPython.noop
        ),
        migrations.CreateModel(
            name='ClientGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Название группы', max_length=100, unique=True, verbose_name='Название группы')),
            ],
            options={
                'verbose_name': 'Группа клиента',
                'verbose_name_plural': 'Группы клиентов',
                'db_table': 'client_groups',
            },
        ),
        migrations.CreateModel(
            name='Client',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='ФИО клиента', max_length=150, verbose_name='ФИО клиента')),
                ('comment', models.TextField(blank=True, help_text='Комментарий к клиенту', null=True, verbose_name='Комментарий к клиенту')),
                ('phone', models.CharField(blank=True, help_text='Телефон клиента', max_length=150, null=True, verbose_name='Телефон клиента')),
                ('group', models.ForeignKey(help_text='ID группы клиента', null=True, on_delete=django.db.models.deletion.PROTECT, to='booking.clientgroup', verbose_name='ID группы клиента')),
            ],
            options={
                'verbose_name': 'Клиент',
                'verbose_name_plural': 'Клиенты',
                'db_table': 'clients',
            },
        ),
        migrations.CreateModel(
            name='ClientRating',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(help_text='Оценка выставленная клиенту', verbose_name='Оценка клиента')),
                ('comment', models.TextField(blank=True, help_text='Комментарий к оценке', null=True, verbose_name='Комментарий к оценке')),
                ('client', models.ForeignKey(help_text='ID клиента', on_delete=django.db.models.deletion.PROTECT, to='booking.client')),
            ],
            options={
                'verbose_name': 'Оценка клиента',
                'verbose_name_plural': 'Оценки клиентов',
                'db_table': 'client_ratings',
            },
        ),
        migrations.CreateModel(
            name='ReservationStatusType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Название статуса', max_length=100, unique=True, verbose_name='Название')),
                ('description', models.TextField(blank=True, help_text='Описание статуса', null=True, verbose_name='Описание')),
            ],
            options={
                'verbose_name': 'Тип статуса бронирования',
                'verbose_name_plural': 'Типы статусов бронирования',
                'db_table': 'reservation_status_types',
            },
        ),
        migrations.CreateModel(
            name='ReservationType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Наименование типа бронирования (шаблона направления)', max_length=100, unique=True, verbose_name='Наименование типа бронирования')),
            ],
            options={
                'verbose_name': 'Тип бронирования (шаблон направления)',
                'verbose_name_plural': 'Типы бронирования (шаблоны направлений)',
                'db_table': 'reservation_types',
            },
        ),
        migrations.CreateModel(
            name='ServiceGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Наименование группы услуг', max_length=100, unique=True, verbose_name='Наименование группы услуг')),
                ('active', models.BooleanField(default=True, help_text='Активность группы услуг (включена или нет)', verbose_name='Активность группы услуг')),
            ],
            options={
                'verbose_name': 'Группа услуг',
                'verbose_name_plural': 'Группы услуг',
                'db_table': 'service_groups',
            },
        ),
        migrations.CreateModel(
            name='Service',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Наименование услуги', max_length=100, unique=True, verbose_name='Наименование услуги')),
                ('active', models.BooleanField(default=True, help_text='Активность услуги (включена или нет)', verbose_name='Активность услуги')),
                ('group', models.ForeignKey(blank=True, help_text='Группа услуг', null=True, on_delete=django.db.models.deletion.PROTECT, to='booking.servicegroup', verbose_name='Группа услуг')),
                ('reservation_type', models.ManyToManyField(help_text='Типы бронирования для услуги', related_name='services', to='booking.reservationtype', verbose_name='Типы бронирования')),
            ],
            options={
                'verbose_name': 'Услуга',
                'verbose_name_plural': 'Услуги',
                'db_table': 'services',
            },
        ),
        migrations.CreateModel(
            name='Room',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Наименование помещения', max_length=150, unique=True, verbose_name='Наименование помещения')),
                ('hourstart', models.TimeField(help_text='Время начала работы помещения', verbose_name='Начало работы')),
                ('hourend', models.TimeField(help_text='Время окончания работы помещения', verbose_name='Конец работы')),
                ('reservation_type', models.ManyToManyField(help_text='Типы бронирования, доступные для помещения', related_name='rooms', to='booking.reservationtype', verbose_name='Типы бронирования')),
                ('service', models.ManyToManyField(help_text='Услуги доступные для помещения', related_name='services', to='booking.service', verbose_name='Услуги')),
            ],
            options={
                'verbose_name': 'Помещение',
                'verbose_name_plural': 'Помещения',
                'db_table': 'rooms',
            },
        ),
        migrations.CreateModel(
            name='Specialist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='ФИО специалиста', max_length=100, unique=True, verbose_name='ФИО специалиста')),
                ('active', models.BooleanField(default=True, help_text='Активность специалиста (работает или нет)', verbose_name='Активность специалиста')),
                ('client', models.ForeignKey(help_text='ID клиента (для тех случаев, когда специалист выступает в роли клиента для бронирования)', null=True, on_delete=django.db.models.deletion.CASCADE, to='booking.client', verbose_name='ID клиента')),
                ('reservation_type', models.ManyToManyField(help_text='Типы бронирования доступные для специалиста', related_name='reservation_types', to='booking.reservationtype', verbose_name='Типы бронирования')),
            ],
            options={
                'verbose_name': 'Специалист',
                'verbose_name_plural': 'Специалисты',
                'db_table': 'specialists',
            },
        ),
        migrations.CreateModel(
            name='TariffUnit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('min_reservation_time', models.TimeField(help_text='Минимальное время бронирования (размер тарифной единицы)', verbose_name='Минимальное время бронирования')),
                ('tariff_unit_cost', models.DecimalField(decimal_places=2, help_text='Стоимость тарифной единицы', max_digits=10, verbose_name='Стоимость тарифной единицы')),
                ('reservation_type', models.ForeignKey(help_text='ID типа бронирования (сценария)', on_delete=django.db.models.deletion.PROTECT, to='booking.reservationtype', verbose_name='ID сценария')),
            ],
            options={
                'verbose_name': 'Тарифная единица',
                'verbose_name_plural': 'Тарифные единицы',
                'db_table': 'tariff_units',
            },
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('balance', models.IntegerField(help_text='Баланс тарифных единиц', verbose_name='Баланс тарифных единиц')),
                ('client', models.ForeignKey(help_text='ID клиента', on_delete=django.db.models.deletion.PROTECT, to='booking.client', verbose_name='ID клиента')),
                ('reservation_type', models.ForeignKey(help_text='ID сценария', on_delete=django.db.models.deletion.PROTECT, to='booking.reservationtype', verbose_name='ID сценария')),
            ],
            options={
                'verbose_name': 'Абонемент',
                'verbose_name_plural': 'Абонементы',
                'db_table': 'subscriptions',
            },
        ),
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datetimestart', models.DateTimeField(help_text='Дата и время начала брони', verbose_name='Datetime начала')),
                ('datetimeend', models.DateTimeField(help_text='Дата и время окончания брони', verbose_name='Datetime конца')),
                ('comment', models.TextField(help_text='Комментарий к брони', null=True, verbose_name='Комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Дата создания брони', verbose_name='Создана')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Дата обновления брони', verbose_name='Обновлена')),
                ('client', models.ForeignKey(help_text='ID клиента, закрепленного за бронью', on_delete=django.db.models.deletion.PROTECT, to='booking.client', verbose_name='ID клиента')),
                ('client_group', models.ForeignKey(help_text='ID группы (коллектива) клиента, закрепленного за бронью, если групповое бронирование', null=True, on_delete=django.db.models.deletion.PROTECT, to='booking.clientgroup', verbose_name='ID группы клиента')),
                ('reservation_type', models.ForeignKey(help_text='ID типа бронирования (шаблона направления)', on_delete=django.db.models.deletion.PROTECT, to='booking.reservationtype', verbose_name='ID типа брони')),
                ('room', models.ForeignKey(help_text='ID помещения, которое забронировано', on_delete=django.db.models.deletion.PROTECT, to='booking.room', verbose_name='ID помещения')),
                ('services', models.ManyToManyField(blank=True, help_text='Услуги, включенные в бронь', related_name='reservations', to='booking.service', verbose_name='Услуги')),
                ('specialist', models.ForeignKey(help_text='ID специалиста, закрепленного за бронью', null=True, on_delete=django.db.models.deletion.PROTECT, to='booking.specialist', verbose_name='ID специалиста')),
                ('status', models.ForeignKey(help_text='Статус брони', null=True, on_delete=django.db.models.deletion.PROTECT, to='booking.reservationstatustype', verbose_name='Статус')),
            ],
            options={
                'verbose_name': 'Бронь',
                'verbose_name_plural': 'Брони',
                'db_table': 'reservations',
            },
        ),
    ]

    def apply(self, project_state, schema_editor, collect_sql=False):
        # Проверяем существование таблиц перед созданием
        connection = schema_editor.connection
        existing_tables = connection.introspection.table_names()
        
        filtered_operations = []
        for operation in self.operations:
            if isinstance(operation, migrations.CreateModel):
                table_name = operation.options.get('db_table', operation.name.lower())
                if table_name not in existing_tables:
                    filtered_operations.append(operation)
            else:
                filtered_operations.append(operation)
        
        self.operations = filtered_operations
        return super().apply(project_state, schema_editor, collect_sql)
