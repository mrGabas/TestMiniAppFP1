# telegram_bot.py
import logging
import asyncio
from telegram import Bot
from telegram.error import TelegramError
import config

# Глобальный объект бота, который будет использоваться для отправки сообщений.
# Он будет None, если токен или ID админа не указаны.
bot: Bot | None = None

def initialize_bot():
    """
    Инициализирует глобальный объект бота.
    Эта функция вызывается один раз при запуске приложения.
    """
    global bot
    # ИСПРАВЛЕНО: Используем TELEGRAM_ADMIN_CHAT_ID вместо TELEGRAM_ADMIN_ID
    if config.TELEGRAM_BOT_TOKEN and config.TELEGRAM_ADMIN_CHAT_ID:
        try:
            bot = Bot(token=config.TELEGRAM_BOT_TOKEN)
            logging.info("✅ Telegram бот для отправки уведомлений инициализирован.")
        except Exception as e:
            logging.error(f"❌ Не удалось инициализировать Telegram бота: {e}")
            bot = None
    else:
        logging.warning("⚠️ Токен Telegram или ID администратора не указаны в конфиге. Уведомления будут отключены.")
        bot = None

async def _send_message_async(text: str, is_alert: bool = False):
    """
    Приватная асинхронная функция для отправки сообщения.
    Она проверяет, был ли бот инициализирован и есть ли ID админа.
    """
    # Если бот не настроен, просто логируем сообщение и выходим.
    # ИСПРАВЛЕНО: Используем TELEGRAM_ADMIN_CHAT_ID вместо TELEGRAM_ADMIN_ID
    if not bot or not config.TELEGRAM_ADMIN_CHAT_ID:
        log_level = logging.ERROR if is_alert else logging.INFO
        # Выводим в консоль то, что должны были отправить
        logging.log(log_level, f"[TG-SEND-SKIPPED] {text}")
        return

    try:
        # Отправляем сообщение администратору
        await bot.send_message(
            # ИСПРАВЛЕНО: Используем TELEGRAM_ADMIN_CHAT_ID вместо TELEGRAM_ADMIN_ID
            chat_id=config.TELEGRAM_ADMIN_CHAT_ID,
            text=text,
            parse_mode="Markdown"
        )
        logging.info(f"Уведомление отправлено администратору: {text[:50].replace(chr(10), ' ')}...")
    except TelegramError as e:
        logging.error(f"❌ Ошибка при отправке сообщения в Telegram: {e}")

def send_telegram_notification(text: str):
    """
    Отправляет обычное уведомление администратору (синхронный вызов).
    Форматирует сообщение и вызывает асинхронную отправку.
    """
    # asyncio.run() позволяет вызывать async-функцию из обычного sync-кода
    asyncio.run(_send_message_async(f"ℹ️ *Уведомление*\n\n{text}", is_alert=False))

def send_telegram_alert(text: str):
    """
    Отправляет важное уведомление (ошибку) администратору (синхронный вызов).
    Форматирует сообщение и вызывает асинхронную отправку.
    """
    asyncio.run(_send_message_async(f"🚨 *ВНИМАНИЕ*\n\n{text}", is_alert=True))
