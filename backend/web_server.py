import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import pytz

# Добавляем корневую директорию
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# --- ИСПРАВЛЕННЫЙ ИМПОРТ ---
# Убедимся, что все необходимые функции импортированы
from database import db_query
from db_handler import (
    MOSCOW_TZ, create_rental_from_gui, add_game, add_account,
    set_game_offer_ids, move_rental_to_history, extend_rental_from_gui
)

# -----------------------------

app = Flask(__name__, static_folder=os.path.join(project_root, 'frontend'), static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})


# --- ОБЩИЕ МАРШРУТЫ ---
@app.route('/')
def index(): return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path): return app.send_static_file(path)


# --- ФОРМАТИРОВАНИЕ ДАННЫХ ---
def format_rentals_data(rentals_raw):
    rentals = []
    for row in rentals_raw:
        rentals.append({
            "id": row[0], "user_name": row[1] or "N/A", "user_username": row[2] or "N/A",
            "game_name": row[3] or "Игра не найдена", "rental_date": row[4], "return_date": row[5] or "Не возвращена"
        })
    return rentals


# --- API ДЛЯ АРЕНД ---
@app.route('/api/rentals/active')
def api_get_active_rentals():
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = "SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time FROM rentals r LEFT JOIN accounts a ON r.account_id = a.id LEFT JOIN games g ON a.game_id = g.id WHERE r.end_time > ? AND (r.is_history = 0 OR r.is_history IS NULL) ORDER BY r.end_time ASC"
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        return jsonify(format_rentals_data(rentals_raw or []))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rentals/history')
def api_get_history_rentals():
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        query = "SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time FROM rentals r LEFT JOIN accounts a ON r.account_id = a.id LEFT JOIN games g ON a.game_id = g.id WHERE r.end_time <= ? OR r.is_history = 1 ORDER BY r.start_time DESC LIMIT 50"
        rentals_raw = db_query(query, params=(now_iso,), fetch="all")
        return jsonify(format_rentals_data(rentals_raw or []))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- API ДЛЯ УПРАВЛЕНИЯ АРЕНДАМИ ---
@app.route('/api/rentals/<string:rental_id>/finish', methods=['POST'])
def api_finish_rental(rental_id):
    try:
        success = move_rental_to_history(rental_id)
        return jsonify(
            {"success": success, "message": "Аренда успешно завершена." if success else "Не удалось завершить аренду."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rentals/<string:rental_id>/extend', methods=['POST'])
def api_extend_rental(rental_id):
    data = request.get_json()
    minutes_to_add = data.get('minutes')
    if not minutes_to_add:
        return jsonify({"success": False, "error": "Не указано время для продления."}), 400
    try:
        success = extend_rental_from_gui(rental_id, int(minutes_to_add))
        return jsonify({"success": success,
                        "message": f"Аренда продлена на {minutes_to_add} минут." if success else "Не удалось продлить аренду."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API ДЛЯ ВКЛАДКИ "УПРАВЛЕНИЕ" ---
@app.route('/api/games')
def api_get_games():
    try:
        games_raw = db_query("SELECT id, name, funpay_offer_ids FROM games ORDER BY name", fetch="all")
        games = [{"id": g[0], "name": g[1], "offers": g[2] or ""} for g in games_raw or []]
        return jsonify(games)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/accounts/available')
def api_get_available_accounts():
    try:
        query = "SELECT a.id, a.login, g.name FROM accounts a JOIN games g ON a.game_id = g.id WHERE a.rented_by IS NULL OR a.rented_by = '' ORDER BY g.name, a.login"
        accounts_raw = db_query(query, fetch="all")
        accounts = [{"id": acc[0], "login": acc[1], "game_name": acc[2]} for acc in accounts_raw or []]
        return jsonify(accounts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rentals/create', methods=['POST'])
def api_create_rental():
    data = request.get_json()
    try:
        success = create_rental_from_gui(
            client_name=data.get('client_name'), account_id=int(data.get('account_id')),
            total_minutes=int(data.get('total_minutes')), info="Создано вручную через веб-панель"
        )
        return jsonify(
            {"success": success, "message": "Аренда успешно создана." if success else "Не удалось создать аренду."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/games/add', methods=['POST'])
def api_add_game():
    data = request.get_json()
    try:
        add_game(data.get('game_name'))
        return jsonify({"success": True, "message": f"Игра '{data.get('game_name')}' добавлена."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/accounts/add', methods=['POST'])
def api_add_account():
    data = request.get_json()
    try:
        add_account(data.get('login'), data.get('password'), int(data.get('game_id')))
        return jsonify({"success": True, "message": f"Аккаунт '{data.get('login')}' добавлен."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/games/offers/update', methods=['POST'])
def api_update_game_offers():
    data = request.get_json()
    try:
        set_game_offer_ids(int(data.get('game_id')), data.get('offers', ''))
        return jsonify({"success": True, "message": "Лоты обновлены."})
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
