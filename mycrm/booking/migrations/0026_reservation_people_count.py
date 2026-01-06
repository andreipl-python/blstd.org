from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0025_tariff"),
    ]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="people_count",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Количество людей (необязательное поле)",
                null=True,
                verbose_name="Количество людей",
            ),
        ),
    ]
