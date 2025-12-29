# Generated manually
#
# Удаляет из модели Specialist связь M2M со Scenario как избыточную.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0021_specialist_schedule"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="specialist",
            name="scenario",
        ),
    ]
