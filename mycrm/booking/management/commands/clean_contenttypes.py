from django.core.management.base import BaseCommand
from django.apps import apps
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = 'Удаляет мертвые записи из django_content_type'

    def handle(self, *args, **kwargs):
        all_models = set(f"{model._meta.app_label}.{model._meta.model_name}" for model in apps.get_models())
        content_types = ContentType.objects.all()

        for ct in content_types:
            model_label = f"{ct.app_label}.{ct.model}"
            if model_label not in all_models:
                ct.delete()
                self.stdout.write(f"Удалено: {model_label}")
