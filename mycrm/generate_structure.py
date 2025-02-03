import os


def generate_tree(startpath, exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = {'__pycache__', '.git', '.idea', '.pytest_cache',
                        'node_modules'}  # Добавьте сюда другие папки, которые хотите исключить

    for root, dirs, files in os.walk(startpath):
        # Исключаем папки из обхода
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        # Считаем уровень вложенности
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * level  # Уровни в дереве
        print(f"{indent}├── {os.path.basename(root)}/")  # Для текущей директории
        subindent = '│   ' * (level + 1)  # Для файлов в директории
        for f in files:
            print(f"{subindent}├── {f}")  # Для файлов


# Путь к корневой папке проекта
project_path = r'C:\Users\Andrei\PycharmProjects\blstd.org\mycrm'
generate_tree(project_path)
