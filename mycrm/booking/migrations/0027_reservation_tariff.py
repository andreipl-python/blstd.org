import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0026_reservation_people_count"),
    ]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="tariff",
            field=models.ForeignKey(
                blank=True,
                help_text="Тариф (для сценариев Репетиционная точка/Музыкальный класс)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reservations",
                to="booking.tariff",
                verbose_name="Тариф",
            ),
        ),
    ]
