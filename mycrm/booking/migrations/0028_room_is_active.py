from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0027_reservation_tariff"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="is_active",
            field=models.BooleanField(
                default=True,
                verbose_name="Активна",
                help_text="Доступна ли комната для выбора и бронирования",
            ),
        ),
    ]
