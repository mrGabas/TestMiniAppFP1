import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Добавляем корневую директорию проекта в пути Python
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Импортируем обработчик запросов к БД
try:
    from db_handler import db_query
except ImportError:
    from database import db_query

# Инициализируем Flask-приложение
app = Flask(__name__, static_folder=os.path.join(project_root, 'frontend'), static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/')
def index():
    """Отдает главную страницу index.html."""
    return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path):
    """Отдает статические файлы (css, js)."""
    return app.send_static_file(path)


@app.route('/api/games')
def api_get_games():
    """API для получения списка всех игр."""
    try:
        games_raw = db_query("SELECT id, name FROM games ORDER BY name", fetch="all")
        if games_raw is None:
            raise ConnectionError("Не удалось выполнить запрос к базе данных.")

        games = [{"id": game_id, "name": game_name} for game_id, game_name in games_raw]
        return jsonify(games)
    except Exception as e:
        print(f"Ошибка при получении игр из БД: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


# -- НОВЫЙ КОД НАЧИНАЕТСЯ ЗДЕСЬ --

@app.route('/api/rentals')
def api_get_rentals():
    """API для получения списка всех аренд с детальной информацией."""
    try:
        # Более сложный запрос с JOIN для получения имен пользователей и названий игр
        query = """
                SELECT r.id, \
                       u.first_name, \
                       u.username, \
                       g.name, \
                       r.rental_date, \
                       r.return_date
                FROM rentals r
                         JOIN users u ON r.user_id = u.id
                         JOIN games g ON r.game_id = g.id
                ORDER BY r.rental_date DESC \
                """
        rentals_raw = db_query(query, fetch="all")
        if rentals_raw is None:
            raise ConnectionError("Не удалось выполнить запрос к базе данных.")

        # Форматируем данные в удобный JSON
        rentals = []
        for row in rentals_raw:
            rentals.append({
                "id": row[0],
                "user_name": row[1] or "N/A",  # Имя пользователя
                "user_username": row[2] or "N/A",  # Username в Telegram
                "game_name": row[3],
                "rental_date": row[4],
                "return_date": row[5] or "Не возвращена"  # Показываем, если дата возврата NULL
            })

        return jsonify(rentals)
    except Exception as e:
        print(f"Ошибка при получении аренд из БД: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


# -- НОВЫЙ КОД ЗАКАНЧИВАЕТСЯ ЗДЕСЬ --

if __name__ == '__main__':
    try:
        from db_handler import initialize_and_update_db

        initialize_and_update_db()
        print("База данных успешно инициализирована.")
    except Exception as e:
        print(f"Критическая ошибка: не удалось инициализировать базу данных. {e}")
        sys.exit(1)

    print("Запуск Flask-сервера на http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)