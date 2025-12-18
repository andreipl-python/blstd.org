# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0018_scenario_min_booking_duration_minutes"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="scenario",
            name="min_booking_duration_minutes",
        ),
    ]
