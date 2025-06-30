import sys
import os
from flask import Flask, jsonify
from flask_cors import CORS

# Этот блок добавляет корневую папку в пути для импорта
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# --- ГЛАВНОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ---
# Импортируем функцию с ПРАВИЛЬНЫМ названием
from db_handler import get_all_rentals_as_dicts

# Инициализируем Flask-приложение
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Разрешаем CORS-запросы
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/')
def index():
    """Отдает главную страницу приложения index.html."""
    return app.send_static_file('index.html')


@app.route('/<path:path>')
def static_proxy(path):
    """Отдает остальные статические файлы (css, js, картинки)."""
    return app.send_static_file(path)


@app.route('/api/games')
def api_get_games():
    """
    Вызывает функцию для получения реальных игр из БД,
    теперь с правильным именем функции.
    """
    try:
        # --- И ИСПОЛЬЗУЕМ ЕЕ ЗДЕСЬ ---
        games = get_all_rentals_as_dicts()
        return jsonify(games)
    except Exception as e:
        # Обработка ошибок, если что-то пойдет не так с базой данных
        print(f"Ошибка при получении игр из БД: {e}")
        return jsonify({"error": "Не удалось получить игры из базы данных"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)