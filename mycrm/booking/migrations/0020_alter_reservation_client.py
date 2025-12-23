# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0019_remove_scenario_min_booking_duration_minutes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="reservation",
            name="client",
            field=models.ForeignKey(
                blank=True,
                help_text="ID клиента, закрепленного за бронью",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="booking.client",
                verbose_name="ID клиента",
            ),
        ),
    ]
