document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.ready();

    // Элементы на странице
    const statusDiv = document.getElementById('connection-status');
    const showGamesBtn = document.getElementById('show-games-btn');
    const showRentalsBtn = document.getElementById('show-rentals-btn');
    const gamesContainer = document.getElementById('games-list-container');
    const rentalsContainer = document.getElementById('rentals-list-container');
    const gamesListDiv = document.getElementById('games-list');
    const rentalsListDiv = document.getElementById('rentals-list');

    // Базовый URL вашего API (ngrok)
    const API_BASE_URL = ' https://2b45-186-139-105-180.ngrok-free.app'; // <-- ЗАМЕНИТЕ НА ВАШ АКТУАЛЬНЫЙ NGROK URL

    statusDiv.textContent = 'Подключение успешно!';
    statusDiv.style.color = 'green';

    // --- ОБРАБОТЧИКИ КНОПОК ---

    // Показать список игр
    showGamesBtn.addEventListener('click', () => {
        rentalsContainer.style.display = 'none'; // Скрываем аренды
        gamesContainer.style.display = 'block';  // Показываем игры
        fetchGames();
    });

    // Показать список аренд (новая функция)
    showRentalsBtn.addEventListener('click', () => {
        gamesContainer.style.display = 'none';   // Скрываем игры
        rentalsContainer.style.display = 'block';// Показываем аренды
        fetchRentals();
    });

    // --- ФУНКЦИИ ДЛЯ ЗАГРУЗКИ ДАННЫХ ---

    // Функция для загрузки и отображения игр
    function fetchGames() {
        gamesListDiv.textContent = 'Загрузка игр...';
        fetch(`${API_BASE_URL}/api/games`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка! Статус: ${response.status}`);
                }
                return response.json();
            })
            .then(games => {
                gamesListDiv.innerHTML = ''; // Очищаем список
                if (games.length === 0) {
                    gamesListDiv.textContent = 'Игр в базе данных нет.';
                    return;
                }
                games.forEach(game => {
                    const gameElement = document.createElement('div');
                    gameElement.className = 'list-item';
                    gameElement.textContent = `[ID: ${game.id}] - ${game.name}`;
                    gamesListDiv.appendChild(gameElement);
                });
            })
            .catch(error => {
                console.error("Ошибка при загрузке игр:", error);
                gamesListDiv.textContent = 'Не удалось загрузить список игр.';
                gamesListDiv.style.color = 'red';
            });
    }

    // Новая функция для загрузки и отображения аренд
    function fetchRentals() {
        rentalsListDiv.textContent = 'Загрузка аренд...';
        fetch(`${API_BASE_URL}/api/rentals`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка! Статус: ${response.status}`);
                }
                return response.json();
            })
            .then(rentals => {
                rentalsListDiv.innerHTML = ''; // Очищаем список
                if (rentals.length === 0) {
                    rentalsListDiv.textContent = 'Активных или прошлых аренд не найдено.';
                    return;
                }
                rentals.forEach(rental => {
                    const rentalElement = document.createElement('div');
                    rentalElement.className = 'list-item';
                    rentalElement.innerHTML = `
                        <strong>Игра:</strong> ${rental.game_name} <br>
                        <strong>Пользователь:</strong> ${rental.user_name} (@${rental.user_username}) <br>
                        <strong>Дата аренды:</strong> ${new Date(rental.rental_date).toLocaleString()} <br>
                        <strong>Статус:</strong> ${rental.return_date}
                    `;
                    rentalsListDiv.appendChild(rentalElement);
                });
            })
            .catch(error => {
                console.error("Ошибка при загрузке аренд:", error);
                rentalsListDiv.textContent = 'Не удалось загрузить список аренд.';
                rentalsListDiv.style.color = 'red';
            });
    }

    // Загружаем игры по умолчанию при открытии
    showGamesBtn.click();
});