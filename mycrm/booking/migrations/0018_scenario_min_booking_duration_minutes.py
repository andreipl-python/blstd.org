from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0017_scenario_work_time_end_scenario_work_time_start"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="min_booking_duration_minutes",
            field=models.PositiveIntegerField(
                default=60,
                help_text="Минимальная длительность брони по сценарию (в минутах)",
                verbose_name="Минимальная длительность брони (мин)",
            ),
        ),
    ]
