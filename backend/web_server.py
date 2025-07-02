import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import pytz

# Добавляем корневую директорию проекта
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# --- ИСПРАВЛЕННЫЙ ИМПОРТ ---
# Импортируем все нужные компоненты напрямую и надежно
from db_handler import db_query, MOSCOW_TZ, create_rental_from_gui
# -----------------------------

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
        games = [{"id": g[0], "name": g[1]} for g in games_raw]
        return jsonify(games)
    except Exception as e:
        print(f"Ошибка при получении игр: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


def format_rentals_data(rentals_raw):
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
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = """
            SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time
            FROM rentals r
            LEFT JOIN accounts a ON r.account_id = a.id
            LEFT JOIN games g ON a.game_id = g.id
            WHERE r.end_time > ? AND (r.is_history = 0 OR r.is_history IS NULL)
            ORDER BY r.end_time ASC
        """
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        if rentals_raw is None:
            raise ConnectionError("Не удалось выполнить запрос.")
        return jsonify(format_rentals_data(rentals_raw))
    except Exception as e:
        print(f"Ошибка при получении активных аренд: {e}")
        return jsonify({"error": f"Внутренняя ошибка сервера: {e}"}), 500


@app.route('/api/rentals/history')
def api_get_history_rentals():
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = """
            SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time
            FROM rentals r
            LEFT JOIN accounts a ON r.account_id = a.id
            LEFT JOIN games g ON a.game_id = g.id
            WHERE r.end_time <= ? OR r.is_history = 1
            ORDER BY r.start_time DESC
            LIMIT 50
        """
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        if rentals_raw is None:
            raise ConnectionError("Не удалось выполнить запрос.")
        return jsonify(format_rentals_data(rentals_raw))
    except Exception as e:
        print(f"Ошибка при получении истории аренд: {e}")
        return jsonify({"error": f"Внутренняя ошибка сервера: {e}"}), 500


@app.route('/api/accounts/available')
def api_get_available_accounts():
    try:
        query = """
            SELECT a.id, a.login, g.name
            FROM accounts a
            JOIN games g ON a.game_id = g.id
            WHERE a.rented_by IS NULL OR a.rented_by = ''
            ORDER BY g.name, a.login
        """
        accounts_raw = db_query(query, fetch="all")
        if accounts_raw is None:
             raise ConnectionError("Не удалось выполнить запрос.")
        accounts = [{"id": acc[0], "login": acc[1], "game_name": acc[2]} for acc in accounts_raw]
        return jsonify(accounts)
    except Exception as e:
        print(f"Ошибка при получении свободных аккаунтов: {e}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


@app.route('/api/rentals/create', methods=['POST'])
def api_create_rental():
    data = request.get_json()
    client_name = data.get('client_name')
    account_id = data.get('account_id')
    total_minutes = data.get('total_minutes')

    if not all([client_name, account_id, total_minutes]):
        return jsonify({"success": False, "error": "Не все поля заполнены"}), 400

    try:
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
@app.route('/api/games/add', methods=['POST'])
def api_add_game():
    data = request.get_json()
    game_name = data.get('game_name')
    if not game_name:
        return jsonify({"success": False, "error": "Название игры не указано"}), 400
    try:
        add_game(game_name)
        return jsonify({"success": True, "message": f"Игра '{game_name}' успешно добавлена."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/accounts/add', methods=['POST'])
def api_add_account():
    data = request.get_json()
    game_id = data.get('game_id')
    login = data.get('login')
    password = data.get('password')
    if not all([game_id, login, password]):
        return jsonify({"success": False, "error": "Не все поля заполнены"}), 400
    try:
        add_account(login, password, int(game_id))
        return jsonify({"success": True, "message": f"Аккаунт '{login}' успешно добавлен."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/games/<int:game_id>/offers', methods=['GET'])
def api_get_game_offers(game_id):
    try:
        result = db_query("SELECT funpay_offer_ids FROM games WHERE id = ?", params=(game_id,), fetch="one")
        offers = result[0] if result else ""
        return jsonify({"success": True, "offers": offers or ""})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/games/offers/update', methods=['POST'])
def api_update_game_offers():
    data = request.get_json()
    game_id = data.get('game_id')
    offers = data.get('offers', '')
    if not game_id:
        return jsonify({"success": False, "error": "ID игры не указан"}), 400
    try:
        set_game_offer_ids(int(game_id), offers)
        return jsonify({"success": True, "message": "Лоты успешно обновлены."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


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