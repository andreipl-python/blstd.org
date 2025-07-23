import logging
import os

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '..', 'logs')
LOG_DIR = os.path.abspath(LOG_DIR)
LOG_FILE = os.path.join(LOG_DIR, 'booking_integration.log')

# Создать директорию logs, если её нет
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger('booking_integration')
logger.setLevel(logging.INFO)

# Проверяем, чтобы не было повторных обработчиков
if not logger.handlers:
    file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
    formatter = logging.Formatter('[%(asctime)s] %(levelname)s %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
