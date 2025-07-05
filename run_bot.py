import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from config import TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID
from db_handler import (
    initialize_and_update_db, check_and_process_expired_rentals,
    get_rentals_for_reminder, mark_rental_as_reminded
)

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


async def send_admin_message(bot: Bot, text: str):
    """Отправляет сообщение админу."""
    try:
        if TELEGRAM_ADMIN_CHAT_ID:
            await bot.send_message(TELEGRAM_ADMIN_CHAT_ID, text)
    except Exception as e:
        logging.error(f"Не удалось отправить сообщение админу: {e}")


async def check_rentals_periodically(bot: Bot):
    """Периодически проверяет истекшие аренды и отправляет напоминания."""
    while True:
        try:
            # 1. Проверка истекших аренд
            freed_games = check_and_process_expired_rentals()
            if freed_games:
                logging.info(f"Завершены аренды для игр с ID: {freed_games}")
                await send_admin_message(bot, f"✅ Аренды завершены, аккаунты освобождены.")

            # 2. Отправка напоминаний
            rentals_to_remind = get_rentals_for_reminder()
            if rentals_to_remind:
                for rental_id, client_name, chat_id in rentals_to_remind:
                    try:
                        await send_admin_message(bot,
                                                 f"🔔 Пора отправить напоминание клиенту {client_name} (аренда #{rental_id})")
                        mark_rental_as_reminded(rental_id)
                    except Exception as e:
                        logging.error(f"Ошибка отправки напоминания для аренды {rental_id}: {e}")

        except Exception as e:
            logging.error(f"Ошибка в цикле проверки аренд: {e}")
            await send_admin_message(bot, f"❗️ Критическая ошибка в фоновой задаче проверки аренд: {e}")

        # Проверка каждую минуту
        await asyncio.sleep(60)


async def main():
    """Главная функция для запуска бота."""
    # Инициализация бота и диспетчера
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    # Инициализируем базу данных
    initialize_and_update_db()

    # Запускаем фоновую задачу проверки аренд
    asyncio.create_task(check_rentals_periodically(bot))

    # Здесь в будущем можно будет запустить прослушиватель FunPay
    # asyncio.create_task(listen_funpay(bot))

    # Отправляем сообщение админу о том, что бот запущен
    await send_admin_message(bot, "🚀 Бот (фоновый сервис) запущен.")

    # Запускаем long polling
    try:
        # Мы удаляем все накопленные обновления, чтобы бот не отвечал на старые команды
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Бот остановлен.")
