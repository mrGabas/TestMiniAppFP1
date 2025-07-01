import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import pytz  # <-- Добавим импорт для работы со временем

# Добавляем корневую директорию проекта в пути Python
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Импортируем обработчик запросов к БД
try:
    from db_handler import db_query, MOSCOW_TZ  # <-- Импортируем и часовой пояс
except ImportError:
    from database import db_query

    MOSCOW_TZ = pytz.timezone('Europe/Moscow')

# Инициализируем Flask-приложение
app = Flask(__name__, static_folder=os.path.join(project_root, 'frontend'), static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)


@app.route('/api/games')
def api_get_games():
    try:
        games_raw = db_query("SELECT id, name FROM games ORDER BY name", fetch="all")
        if games_raw is None:
            raise ConnectionError("Не удалось выполнить запрос к базе данных.")

        games = [{"id": game_id, "name": game_name} for game_id, game_name in games_raw]
        return jsonify(games)
    except Exception as e:
        print(f"Ошибка при получении игр из БД: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


@app.route('/api/accounts/available')
def api_get_available_accounts():
    """Отдает список свободных аккаунтов для формы ручной аренды."""
    try:
        query = """
                SELECT a.id, a.login, g.name
                FROM accounts a
                         JOIN games g ON a.game_id = g.id
                WHERE a.rented_by IS NULL \
                   OR a.rented_by = ''
                ORDER BY g.name, a.login \
                """
        accounts_raw = db_query(query, fetch="all")
        accounts = [{"id": acc[0], "login": acc[1], "game_name": acc[2]} for acc in accounts_raw]
        return jsonify(accounts)
    except Exception as e:
        print(f"Ошибка при получении свободных аккаунтов: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


@app.route('/api/rentals/create', methods=['POST'])
def api_create_rental():
    """Создает аренду вручную. Вызывает create_rental_from_gui."""
    data = request.get_json()
    client_name = data.get('client_name')
    account_id = data.get('account_id')
    total_minutes = data.get('total_minutes')

    if not all([client_name, account_id, total_minutes]):
        return jsonify({"success": False, "error": "Не все поля заполнены"}), 400

    try:
        # Используем вашу функцию из db_handler
        success = create_rental_from_gui(
            client_name=client_name,
            account_id=int(account_id),
            total_minutes=int(total_minutes),
            info="Создано вручную через веб-панель"
        )
        if success:
            return jsonify({"success": True, "message": "Аренда успешно создана!"})
        else:
            return jsonify({"success": False, "error": "Не удалось создать аренду (ошибка на сервере)"}), 500
    except Exception as e:
        print(f"Ошибка при создании аренды вручную: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
# --- ИЗМЕНЕННЫЙ БЛОК ДЛЯ АРЕНД ---

def format_rentals_data(rentals_raw):
    """Вспомогательная функция для форматирования данных об арендах."""
    rentals = []
    for row in rentals_raw:
        rentals.append({
            "id": row[0],
            "user_name": row[1] or "N/A",
            "user_username": row[2] or "N/A",
            "game_name": row[3] or "Игра не найдена",
            "rental_date": row[4],
            "return_date": row[5] or "Не возвращена"
        })
    return rentals


@app.route('/api/rentals/active')
def api_get_active_rentals():
    """API для получения списка АКТИВНЫХ аренд."""
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = """
                SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time
                FROM rentals r
                         LEFT JOIN accounts a ON r.account_id = a.id
                         LEFT JOIN games g ON a.game_id = g.id
                WHERE r.end_time > ? \
                  AND (r.is_history = 0 OR r.is_history IS NULL)
                ORDER BY r.end_time ASC \
                """
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        return jsonify(format_rentals_data(rentals_raw))
    except Exception as e:
        print(f"Ошибка при получении активных аренд: {e}")
        return jsonify({"error": f"Внутренняя ошибка сервера: {e}"}), 500


@app.route('/api/rentals/history')
def api_get_history_rentals():
    """API для получения ИСТОРИИ аренд."""
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = """
                SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time
                FROM rentals r
                         LEFT JOIN accounts a ON r.account_id = a.id
                         LEFT JOIN games g ON a.game_id = g.id
                WHERE r.end_time <= ? \
                   OR r.is_history = 1
                ORDER BY r.start_time DESC LIMIT 50 \
                """
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        return jsonify(format_rentals_data(rentals_raw))
    except Exception as e:
        print(f"Ошибка при получении истории аренд: {e}")
        return jsonify({"error": f"Внутренняя ошибка сервера: {e}"}), 500


# --- КОНЕЦ БЛОКА ---

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