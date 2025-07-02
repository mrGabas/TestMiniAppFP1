import sqlite3
import logging
import os

# --- ГЛАВНОЕ ИСПРАВЛЕНИЕ ---
# Определяем абсолютный путь к корневой папке проекта (где лежит этот файл)
_project_root = os.path.dirname(os.path.abspath(__file__))
# Создаем ПОЛНЫЙ, АБСОЛЮТНЫЙ путь к файлу базы данных.
# Теперь неважно, откуда запускается скрипт, он всегда найдет правильный файл.
DB_FILE = os.path.join(_project_root, 'rentals.db')
# -----------------------------

# Настройка логирования для отладки
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def init_database():
    """
    Создает все необходимые таблицы в базе данных, если они еще не существуют.
    Теперь использует правильный, абсолютный путь к файлу БД.
    """
    try:
        # Используем исправленный DB_FILE
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            # Создание таблицы для игр
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    players_min INTEGER,
                    players_max INTEGER,
                    funpay_offer_ids TEXT
                )
            """)
            # Создание таблицы для аккаунтов
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    login TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    game_id INTEGER,
                    rented_by TEXT,
                    FOREIGN KEY (game_id) REFERENCES games (id)
                )
            """)
            # Создание таблицы для аренд
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS rentals (
                    id TEXT PRIMARY KEY,
                    client_name TEXT,
                    account_id INTEGER,
                    start_time TEXT,
                    end_time TEXT,
                    remind_time TEXT,
                    initial_minutes INTEGER,
                    info TEXT,
                    is_history INTEGER DEFAULT 0,
                    funpay_chat_id TEXT,
                    pre_reminded INTEGER DEFAULT 0,
                    user_id INTEGER,
                    game_id INTEGER,
                    rental_date TEXT,
                    return_date TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts (id)
                )
            """)
            logging.info(f"База данных по пути {DB_FILE} проверена и готова.")
    except sqlite3.Error as e:
        logging.critical(f"КРИТИЧЕСКАЯ ОШИБКА при инициализации БД: {e}")
        raise

def db_query(query, params=(), fetch=None, many=False):
    """
    Выполняет SQL-запрос к базе данных.
    Теперь использует правильный, абсолютный путь к файлу БД.
    """
    try:
        # Используем исправленный DB_FILE
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            if many:
                cursor.executemany(query, params)
            else:
                cursor.execute(query, params)

            if fetch == "one":
                return cursor.fetchone()
            elif fetch == "all":
                return cursor.fetchall()
            else:
                conn.commit()
                return cursor.lastrowid
    except sqlite3.Error as e:
        logging.error(f"Ошибка БД: '{e}'\nЗапрос: '{query}'\nПараметры: '{params}'")
        return None

