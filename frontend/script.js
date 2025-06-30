// Ждем, когда приложение будет готово
document.addEventListener('DOMContentLoaded', function() {
    const statusDiv = document.getElementById('status');
    const gamesListUl = document.getElementById('games-list');

    // Адрес нашего бэкенда. Пока что для теста он будет локальным.
    const API_BASE_URL = 'http://127.0.0.1:5000';

    // 1. Проверяем статус сервера
    fetch(`${API_BASE_URL}/api/status`)
        .then(response => response.json())
        .then(data => {
            statusDiv.textContent = `Статус сервера: ${data.message}`;
            statusDiv.style.backgroundColor = '#d4edda'; // Зеленый фон
        })
        .catch(error => {
            statusDiv.textContent = 'Ошибка: Не удалось подключиться к серверу.';
            statusDiv.style.backgroundColor = '#f8d7da'; // Красный фон
            console.error('Ошибка подключения к API:', error);
        });

    // 2. Загружаем список игр
    fetch(`${API_BASE_URL}/api/games`)
        .then(response => response.json())
        .then(data => {
            gamesListUl.innerHTML = ''; // Очищаем список
            if (data.error) {
                throw new Error(data.error);
            }
            data.forEach(game => {
                const li = document.createElement('li');
                li.textContent = `[ID: ${game.id}] - ${game.name}`;
                gamesListUl.appendChild(li);
            });
        })
        .catch(error => {
            gamesListUl.innerHTML = '<li>Не удалось загрузить список игр.</li>';
            console.error('Ошибка загрузки игр:', error);
        });
});