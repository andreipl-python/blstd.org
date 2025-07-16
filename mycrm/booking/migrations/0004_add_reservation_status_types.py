from django.db import migrations

NEW_STATUS_TYPES = [
    {"id": 1079, "name": "pending", "description": "На рассмотрении"},
    {"id": 1080, "name": "approved", "description": "Одобрено"},
    {"id": 1081, "name": "completed", "description": "Состоялось"},
    {"id": 1082, "name": "cancelled", "description": "Отменено"},
    {"id": 1084, "name": "rejected", "description": "Отклонено объектом"},
    {"id": 1085, "name": "overdue", "description": "Просрочено"},
    {"id": 1104, "name": "with_client", "description": "У клиента"},
    {"id": 1105, "name": "waiting_offer", "description": "Ожидает предложения"},
    {"id": 1106, "name": "rejected_by_client", "description": "Отклонено клиентом"},
]

def add_status_types(apps, schema_editor):
    ReservationStatusType = apps.get_model("booking", "ReservationStatusType")
    for status in NEW_STATUS_TYPES:
        ReservationStatusType.objects.update_or_create(
            id=status["id"],
            defaults={"name": status["name"], "description": status["description"]}
        )

def remove_status_types(apps, schema_editor):
    ReservationStatusType = apps.get_model("booking", "ReservationStatusType")
    for status in NEW_STATUS_TYPES:
        ReservationStatusType.objects.filter(id=status["id"]).delete()

class Migration(migrations.Migration):
    dependencies = [
        ("booking", "0003_room_scenario"),
    ]

    operations = [
        migrations.RunPython(add_status_types, remove_status_types),
    ]
