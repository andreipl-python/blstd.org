import os

# Какие расширения считаем
EXTENSIONS = {'.py', '.js', '.php', '.html', '.css', '.ts'}

def count_lines(root='.'):
    total = 0
    for path, dirs, files in os.walk(root):
        for file in files:
            _, ext = os.path.splitext(file)
            if ext.lower() in EXTENSIONS:
                full_path = os.path.join(path, file)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = sum(1 for _ in f)
                        total += lines
                except Exception as e:
                    print(f'Не удалось прочитать {full_path}: {e}')
    return total

if __name__ == '__main__':
    print(f'Всего строк кода: {count_lines(".")}')
