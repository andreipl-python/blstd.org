import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0024_add_specialist_service_to_reservation"),
    ]

    operations = [
        migrations.CreateModel(
            name="Tariff",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Название тарифа",
                        max_length=150,
                        verbose_name="Название",
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        default=True,
                        help_text="Активен ли тариф",
                        verbose_name="Активен",
                    ),
                ),
                (
                    "max_people",
                    models.PositiveIntegerField(
                        help_text="Максимальное количество людей для тарифа",
                        verbose_name="Макс. людей",
                    ),
                ),
                (
                    "base_duration_minutes",
                    models.PositiveIntegerField(
                        help_text="Базовая длительность тарифа в минутах",
                        verbose_name="Базовая длительность, мин",
                    ),
                ),
                (
                    "base_cost",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Стоимость тарифа за базовую длительность",
                        max_digits=10,
                        verbose_name="Стоимость",
                    ),
                ),
                (
                    "rooms",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Комнаты, к которым привязан тариф",
                        related_name="tariffs",
                        to="booking.room",
                        verbose_name="Комнаты",
                    ),
                ),
                (
                    "scenarios",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Сценарии, к которым применяется тариф",
                        related_name="tariffs",
                        to="booking.scenario",
                        verbose_name="Сценарии",
                    ),
                ),
            ],
            options={
                "verbose_name": "Тариф",
                "verbose_name_plural": "Тарифы",
                "db_table": "tariffs",
            },
        ),
        migrations.CreateModel(
            name="TariffWeeklyInterval",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "weekday",
                    models.SmallIntegerField(
                        choices=[
                            (0, "Понедельник"),
                            (1, "Вторник"),
                            (2, "Среда"),
                            (3, "Четверг"),
                            (4, "Пятница"),
                            (5, "Суббота"),
                            (6, "Воскресенье"),
                        ],
                        help_text="0=Пн ... 6=Вс",
                        verbose_name="День недели",
                    ),
                ),
                (
                    "start_time",
                    models.TimeField(
                        help_text="Время начала интервала",
                        verbose_name="Начало",
                    ),
                ),
                (
                    "end_time",
                    models.TimeField(
                        help_text="Время окончания интервала",
                        verbose_name="Конец",
                    ),
                ),
                (
                    "tariff",
                    models.ForeignKey(
                        help_text="Тариф, для которого задан интервал",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_intervals",
                        to="booking.tariff",
                        verbose_name="Тариф",
                    ),
                ),
            ],
            options={
                "verbose_name": "Интервал действия тарифа (неделя)",
                "verbose_name_plural": "Интервалы действия тарифов (неделя)",
                "db_table": "tariff_weekly_intervals",
                "ordering": ("tariff", "weekday", "start_time"),
            },
        ),
        migrations.AddConstraint(
            model_name="tariffweeklyinterval",
            constraint=models.CheckConstraint(
                check=models.Q(("start_time__lt", models.F("end_time"))),
                name="tariff_weekly_interval_start_lt_end",
            ),
        ),
    ]
