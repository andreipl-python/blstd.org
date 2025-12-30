from django.db import migrations, models


def seed_specialist_services(apps, schema_editor):
    SpecialistService = apps.get_model("booking", "SpecialistService")

    services = [
        {"name": "Урок 45 минут", "duration_minutes": 45},
        {"name": "Урок 60 минут", "duration_minutes": 60},
        {"name": "Урок для чайников 30 минут", "duration_minutes": 30},
        {"name": "Урок для программистов 90 минут", "duration_minutes": 90},
    ]

    for item in services:
        SpecialistService.objects.get_or_create(
            name=item["name"],
            defaults={
                "active": True,
                "cost": 0,
                "duration_minutes": item["duration_minutes"],
            },
        )


def unseed_specialist_services(apps, schema_editor):
    SpecialistService = apps.get_model("booking", "SpecialistService")
    SpecialistService.objects.filter(
        name__in=[
            "Урок 45 минут",
            "Урок 60 минут",
            "Урок для чайников 30 минут",
            "Урок для программистов 90 минут",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0022_remove_specialist_scenario"),
    ]

    operations = [
        migrations.CreateModel(
            name="SpecialistService",
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
                        help_text="Наименование услуги специалиста",
                        max_length=150,
                        unique=True,
                        verbose_name="Наименование услуги",
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        default=True,
                        help_text="Активность услуги (включена или нет)",
                        verbose_name="Активность",
                    ),
                ),
                (
                    "cost",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Стоимость услуги",
                        max_digits=10,
                        verbose_name="Стоимость",
                    ),
                ),
                (
                    "duration_minutes",
                    models.PositiveIntegerField(
                        help_text="Длительность услуги в минутах",
                        verbose_name="Длительность, мин",
                    ),
                ),
            ],
            options={
                "db_table": "specialist_services",
                "verbose_name": "Услуга специалиста",
                "verbose_name_plural": "Услуги специалистов",
            },
        ),
        migrations.AddField(
            model_name="specialist",
            name="specialist_services",
            field=models.ManyToManyField(
                blank=True,
                help_text="Услуги, которые оказывает специалист",
                related_name="specialists",
                to="booking.specialistservice",
                verbose_name="Услуги специалистов",
            ),
        ),
        migrations.RunPython(
            seed_specialist_services, reverse_code=unseed_specialist_services
        ),
    ]
