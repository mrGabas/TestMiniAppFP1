# run_bot.py
import logging
import threading
import time
import sys
import os
from FunPayAPI.account import Account

# Добавляем корневую директорию в путь, чтобы можно было импортировать модули
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
from db_handler import initialize_and_update_db
from bot_handler import funpay_bot_listener, expired_rentals_checker, sync_games_with_funpay_offers
# Изменяем импорт: вместо start_bot/stop_bot импортируем одну функцию initialize_bot
from telegram_bot import initialize_bot

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(funcName)s] - %(message)s',
    handlers=[
        logging.FileHandler(config.LOG_FILE, 'a', 'utf-8'),
        logging.StreamHandler()
    ]
)

# Отключаем слишком "шумные" логи от сторонних библиотек
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('telegram').setLevel(logging.WARNING)


def main():
    """Главная функция для инициализации и запуска всех компонентов бота."""
    logging.info("=" * 30)
    logging.info("🚀 Запуск приложения...")

    # 1. Проверка конфигурации
    if not config.GOLDEN_KEY or "вставьте" in config.GOLDEN_KEY:
        logging.critical("❌ GOLDEN_KEY не найден в .env файле. Завершение работы.")
        return
    if not config.USER_AGENT or "Mozilla" not in config.USER_AGENT:
        logging.warning("⚠️ USER_AGENT не задан или некорректен. Используется значение по умолчанию.")

    # 2. Инициализация базы данных
    try:
        initialize_and_update_db()
        logging.info("✅ База данных успешно инициализирована и обновлена.")
    except Exception as e:
        logging.critical(f"❌ Критическая ошибка при инициализации БД: {e}", exc_info=True)
        return

    # 3. Инициализация Telegram бота для уведомлений
    # Вместо запуска полноценного бота, мы просто инициализируем его для отправки сообщений.
    initialize_bot()

    # 4. Инициализация аккаунта FunPay
    try:
        fp_account = Account(golden_key=config.GOLDEN_KEY, user_agent=config.USER_AGENT)
        # Пробуем получить данные аккаунта для проверки авторизации
        fp_account.get()
        logging.info(f"✅ Успешная авторизация в FunPay как: {fp_account.username} (ID: {fp_account.id})")
    except Exception as e:
        # Если авторизация не удалась, отправляем уведомление и завершаем работу
        error_msg = f"Ошибка при инициализации аккаунта FunPay: {e}"
        logging.critical(f"❌ {error_msg}", exc_info=True)
        send_telegram_alert(f"Не удалось авторизоваться в FunPay. Проверьте golden_key.\n\nОшибка: `{e}`")
        return

    # 5. Создание и запуск фоновых потоков
    threads = [
        threading.Thread(target=funpay_bot_listener, args=(fp_account,), name="FunPayListener", daemon=True),
        threading.Thread(target=expired_rentals_checker, args=(fp_account,), name="RentalsChecker", daemon=True),
    ]

    try:
        logging.info("Первичная синхронизация игр и лотов...")
        sync_games_with_funpay_offers(fp_account)
        logging.info("✅ Первичная синхронизация завершена.")

        logging.info("🚀 Запуск всех фоновых процессов...")
        for t in threads:
            t.start()
        logging.info("✅ Все фоновые процессы успешно запущены.")

        send_telegram_notification(f"Бот успешно запущен!\nАккаунт: *{fp_account.username}*")

        # Основной поток будет ждать завершения (например, по Ctrl+C)
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logging.info("SIGINT получен, инициирована остановка...")
    except Exception as e:
        logging.critical(f"❌ Критическая ошибка в главном потоке: {e}", exc_info=True)
        send_telegram_alert(f"Произошла критическая ошибка в главном потоке:\n`{e}`")
    finally:
        # Больше не нужно вызывать stop_bot()
        logging.info("Приложение остановлено.")
        sys.exit(0)


if __name__ == '__main__':
    main()
