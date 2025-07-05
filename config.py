# Рекомендуемая структура config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- ПУТИ ---
# Использование абсолютного пути, как в database.py, является хорошей практикой
SAVE_FOLDER = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(SAVE_FOLDER, "rentals.db")
LOG_FILE = os.path.join(SAVE_FOLDER, 'rentals_app.log')


# --- СЕКРЕТЫ (из .env) ---
GOLDEN_KEY = os.getenv("GOLDEN_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID") # Можно задать значение по умолчанию

# --- НАСТРОЙКИ ---
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
USE_EXPIRATION_GRACE_PERIOD = True
EXPIRATION_GRACE_PERIOD_MINUTES = 10
RENTAL_KEYWORDS = ['аренда', 'час', 'часа', 'часов', 'h', 'day', 'days', 'день', 'дня', 'дней']