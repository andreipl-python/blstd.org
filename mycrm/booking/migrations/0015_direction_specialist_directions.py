from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("booking", "0014_payment_canceled"),
    ]

    operations = [
        migrations.CreateModel(
            name="Direction",
            fields=[
                ("id", models.IntegerField(primary_key=True, serialize=False)),
                (
                    "name",
                    models.CharField(
                        help_text="Название направления (инструмент/специализация)",
                        verbose_name="Название направления",
                        max_length=100,
                        unique=True,
                        null=False,
                        blank=False,
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        help_text="Активность направления",
                        verbose_name="Активно",
                        default=True,
                    ),
                ),
            ],
            options={
                "db_table": "directions",
                "verbose_name": "Направление",
                "verbose_name_plural": "Направления",
            },
        ),
        migrations.AddField(
            model_name="specialist",
            name="directions",
            field=models.ManyToManyField(
                blank=True,
                help_text="Направления деятельности специалиста (фортепиано, бубен и т.п.)",
                related_name="specialists",
                to="booking.direction",
                verbose_name="Направления",
            ),
        ),
    ]
