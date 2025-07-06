import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import pytz
# Добавляем корневую директорию
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import state_manager
# Импортируем все необходимые функции
from database import db_query
from db_handler import (
    initialize_and_update_db, MOSCOW_TZ, create_rental_from_gui, add_game,
    add_account, set_game_offer_ids, move_rental_to_history, extend_rental_from_gui
)

app = Flask(__name__, static_folder=os.path.join(project_root, 'frontend'), static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})


# --- ОБЩИЕ МАРШРУТЫ ---
@app.route('/')
def index(): return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path): return app.send_static_file(path)


# --- ХЕЛПЕРЫ ---
def format_rentals_data(rentals_raw):
    """Форматирует данные об арендах для JSON ответа."""
    rentals = []
    for row in rentals_raw:
        rentals.append({
            "id": row[0], "user_name": row[1], "user_username": row[2],
            "game_name": row[3], "rental_date": row[4], "return_date": row[5] or "Активна"
        })
    return rentals


# --- API ДЛЯ АРЕНД ---
@app.route('/api/rentals/<string:rental_type>')
def api_get_rentals(rental_type):
    """Получает список активных аренд или историю."""
    try:
        now_iso = datetime.now(MOSCOW_TZ).isoformat()
        if rental_type == 'active':
            query = "SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time FROM rentals r LEFT JOIN accounts a ON r.account_id = a.id LEFT JOIN games g ON a.game_id = g.id WHERE r.end_time > ? AND (r.is_history = 0 OR r.is_history IS NULL) ORDER BY r.end_time ASC"
            params = (now_iso,)
        elif rental_type == 'history':
            query = "SELECT r.id, r.client_name, a.login, g.name, r.start_time, r.end_time FROM rentals r LEFT JOIN accounts a ON r.account_id = a.id LEFT JOIN games g ON a.game_id = g.id WHERE r.end_time <= ? OR r.is_history = 1 ORDER BY r.start_time DESC LIMIT 50"
            params = (now_iso,)
        else:
            return jsonify({"success": False, "error": "Неверный тип аренд"}), 404

        rentals_raw = db_query(query, params=params, fetch="all")
        return jsonify(format_rentals_data(rentals_raw or []))
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API ДЛЯ УПРАВЛЕНИЯ АРЕНДАМИ ---
@app.route('/api/rentals/<string:rental_id>/finish', methods=['POST'])
def api_finish_rental(rental_id):
    try:
        if move_rental_to_history(rental_id):
            return jsonify({"success": True, "message": "Аренда успешно завершена."})
        return jsonify({"success": False, "error": "Не удалось завершить аренду."}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rentals/<string:rental_id>/extend', methods=['POST'])
def api_extend_rental(rental_id):
    data = request.get_json()
    minutes = data.get('minutes')
    if not minutes: return jsonify({"success": False, "error": "Не указано время."}), 400
    try:
        if extend_rental_from_gui(rental_id, int(minutes)):
            return jsonify({"success": True, "message": f"Аренда продлена на {minutes} минут."})
        return jsonify({"success": False, "error": "Не удалось продлить аренду."}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- API ДЛЯ ВКЛАДКИ "УПРАВЛЕНИЕ" ---
@app.route('/api/games', methods=['GET'])
def api_get_games():
    try:
        games_raw = db_query("SELECT id, name, funpay_offer_ids FROM games ORDER BY name", fetch="all")
        return jsonify([{"id": g[0], "name": g[1], "offers": g[2] or ""} for g in games_raw or []])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/games/<int:game_id>/offers', methods=['GET'])
def get_game_offers(game_id):
    try:
        result = db_query("SELECT funpay_offer_ids FROM games WHERE id = ?", (game_id,), fetch="one")
        offers = result[0] if result and result[0] else ""
        return jsonify({"success": True, "offers": offers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/accounts/available', methods=['GET'])
def api_get_available_accounts():
    try:
        query = "SELECT a.id, a.login, g.name FROM accounts a JOIN games g ON a.game_id = g.id WHERE a.rented_by IS NULL OR a.rented_by = '' ORDER BY g.name, a.login"
        accounts_raw = db_query(query, fetch="all")
        return jsonify([{"id": acc[0], "login": acc[1], "game_name": acc[2]} for acc in accounts_raw or []])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rentals/create', methods=['POST'])
def api_create_rental():
    data = request.get_json()
    try:
        if create_rental_from_gui(data.get('client_name'), int(data.get('account_id')), int(data.get('total_minutes')),
                                  "Создано вручную"):
            return jsonify({"success": True, "message": "Аренда успешно создана."})
        return jsonify({"success": False, "error": "Не удалось создать аренду."}), 400
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


@app.route('/api/settings/bot_status', methods=['GET'])
def api_get_bot_status():
    """Возвращает текущий статус работы FunPay бота."""
    try:
        return jsonify({"success": True, "is_bot_enabled": state_manager.is_bot_enabled})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/settings/bot_status', methods=['POST'])
def api_set_bot_status():
    """Включает или выключает FunPay бота."""
    data = request.get_json()
    if 'is_bot_enabled' not in data or not isinstance(data['is_bot_enabled'], bool):
        return jsonify({"success": False, "error": "Неверный формат запроса. Ожидается 'is_bot_enabled': true/false."}), 400

    try:
        new_status = data['is_bot_enabled']
        state_manager.is_bot_enabled = new_status
        action = "включен" if new_status else "выключен"
        return jsonify({"success": True, "message": f"Бот FunPay успешно {action}."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    try:
        initialize_and_update_db()
        print("База данных успешно инициализирована.")
    except Exception as e:
        print(f"Критическая ошибка: не удалось инициализировать базу данных. {e}")
        sys.exit(1)

    print("Запуск Flask-сервера на http://127.0.0.1:5000")
    # Убедитесь, что вы используете use_reloader=False, чтобы избежать двойного запуска
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
