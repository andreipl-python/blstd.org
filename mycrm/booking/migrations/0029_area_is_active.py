from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0028_room_is_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="area",
            name="is_active",
            field=models.BooleanField(
                default=True,
                verbose_name="Активно",
                help_text="Доступно ли помещение для выбора и работы",
            ),
        ),
    ]
