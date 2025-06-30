import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Добавляем корневую папку в путь, чтобы можно было импортировать db_handler
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import db_handler

# Создаем веб-приложение
app = Flask(__name__)
# Разрешаем запросы с любого адреса (важно для связки с фронтендом)
CORS(app)

# --- Создаем наш первый "адрес" (API endpoint) ---
@app.route('/api/status')
def get_status():
    """Простой тестовый эндпоинт, чтобы проверить, что сервер работает."""
    return jsonify({"status": "ok", "message": "Сервер работает!"})

@app.route('/api/games')
def get_games():
    """Отдает список всех игр."""
    try:
        games_data = db_handler.db_query("SELECT id, name FROM games ORDER BY name", fetch="all")
        # Преобразуем данные в удобный формат
        games_list = [{"id": g[0], "name": g[1]} for g in games_data]
        return jsonify(games_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Запускаем наш веб-сервер для теста
    # host='0.0.0.0' делает его доступным извне виртуальной машины
    app.run(host='0.0.0.0', port=5000, debug=True)