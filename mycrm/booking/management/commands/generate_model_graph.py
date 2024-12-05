import inspect
from django.core.management.base import BaseCommand
from django.apps import apps
from graphviz import Digraph


class Command(BaseCommand):
    help = "Генерирует граф моделей и связей с использованием Graphviz"

    def add_arguments(self, parser):
        parser.add_argument(
            '--app',
            type=str,
            default=None,
            help='Название приложения, для которого генерировать граф (по умолчанию все приложения)',
        )
        parser.add_argument(
            '--output',
            type=str,
            default='models_graph',
            help='Путь к выходному файлу без расширения (по умолчанию models_graph)',
        )

    def handle(self, *args, **options):
        app_label = options['app']
        output_path = options['output']

        dot = Digraph(format="png", strict=True)
        dot.attr(rankdir="LR")

        self.stdout.write("Начинаю генерацию графа моделей...")

        if app_label:
            models = [m for m in apps.get_models(include_auto_created=False) if m._meta.app_label == app_label]
            if not models:
                self.stdout.write(self.style.ERROR(f"Приложение '{app_label}' не найдено или не содержит моделей."))
                return
        else:
            models = apps.get_models(include_auto_created=False)

        for model in models:
            model_name = model.__name__
            model_doc = inspect.getdoc(model) or "Нет описания"

            # Узел для модели
            model_description = f"<<b>{model_name}</b><br/><i>{model_doc}</i>>"
            dot.node(model_name, model_description, shape="box", style="rounded,filled", fillcolor="lightblue")

            # Узлы для полей
            for field in model._meta.fields:
                field_info = f"{field.name}: {field.get_internal_type()} ({field.help_text or 'No help_text'})"
                dot.node(
                    f"{model_name}.{field.name}",
                    field_info,
                    shape="ellipse",
                    style="filled",
                    fillcolor="white",
                )
                dot.edge(model_name, f"{model_name}.{field.name}", arrowhead="none")

                # Связываем отношения
                if field.is_relation:
                    related_model = field.related_model
                    if related_model:
                        dot.edge(
                            f"{model_name}.{field.name}",
                            related_model.__name__,
                            label=f"{field.name} (rel)",
                            arrowhead="normal",
                        )

        # Сохраняем результат
        dot.render(output_path, cleanup=True)
        self.stdout.write(self.style.SUCCESS(f"Граф успешно создан: {output_path}.png"))
