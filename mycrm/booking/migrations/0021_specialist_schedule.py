# Generated manually
#
# Добавляет модели расписания специалистов:
# - weekly интервалы (повторяются по дням недели)
# - overrides на конкретные даты (выходной или интервалы на дату)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0020_alter_reservation_client"),
    ]

    operations = [
        migrations.CreateModel(
            name="SpecialistScheduleOverride",
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
                    "date",
                    models.DateField(
                        help_text="Дата, на которую применяется исключение",
                        verbose_name="Дата",
                    ),
                ),
                (
                    "is_day_off",
                    models.BooleanField(
                        default=False,
                        help_text="Если включено — специалист не работает в эту дату",
                        verbose_name="Выходной",
                    ),
                ),
                (
                    "note",
                    models.CharField(
                        blank=True,
                        help_text="Причина/пояснение",
                        max_length=255,
                        null=True,
                        verbose_name="Комментарий",
                    ),
                ),
                (
                    "specialist",
                    models.ForeignKey(
                        help_text="Специалист, для которого задано исключение",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_overrides",
                        to="booking.specialist",
                        verbose_name="Специалист",
                    ),
                ),
            ],
            options={
                "verbose_name": "Исключение расписания специалиста",
                "verbose_name_plural": "Исключения расписания специалистов",
                "db_table": "specialist_schedule_overrides",
                "ordering": ("specialist", "date"),
                "unique_together": {("specialist", "date")},
            },
        ),
        migrations.CreateModel(
            name="SpecialistWeeklyInterval",
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
                    "specialist",
                    models.ForeignKey(
                        help_text="Специалист, для которого задан интервал",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_intervals",
                        to="booking.specialist",
                        verbose_name="Специалист",
                    ),
                ),
            ],
            options={
                "verbose_name": "Интервал работы специалиста (неделя)",
                "verbose_name_plural": "Интервалы работы специалистов (неделя)",
                "db_table": "specialist_weekly_intervals",
                "ordering": ("specialist", "weekday", "start_time"),
            },
        ),
        migrations.AddConstraint(
            model_name="specialistweeklyinterval",
            constraint=models.CheckConstraint(
                check=models.Q(("start_time__lt", models.F("end_time"))),
                name="weekly_interval_start_lt_end",
            ),
        ),
        migrations.CreateModel(
            name="SpecialistOverrideInterval",
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
                    "override",
                    models.ForeignKey(
                        help_text="Исключение расписания, к которому относится интервал",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="intervals",
                        to="booking.specialistscheduleoverride",
                        verbose_name="Исключение",
                    ),
                ),
            ],
            options={
                "verbose_name": "Интервал работы специалиста (исключение)",
                "verbose_name_plural": "Интервалы работы специалистов (исключения)",
                "db_table": "specialist_override_intervals",
                "ordering": ("override", "start_time"),
            },
        ),
        migrations.AddConstraint(
            model_name="specialistoverrideinterval",
            constraint=models.CheckConstraint(
                check=models.Q(("start_time__lt", models.F("end_time"))),
                name="override_interval_start_lt_end",
            ),
        ),
    ]
