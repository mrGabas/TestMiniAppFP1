// Ждем, пока вся страница (DOM) будет готова к работе
document.addEventListener('DOMContentLoaded', () => {
    // Находим ключевые элементы на странице по их настоящим ID
    const gamesList = document.getElementById('games-list');
    const statusDiv = document.getElementById('status'); // ИСПРАВЛЕНО: используем 'status'

    // Устанавливаем начальный статус
    statusDiv.textContent = 'Подключение к серверу...';

    // Пытаемся получить данные с сервера
    fetch('/api/games')
        .then(response => {
            if (!response.ok) {
                // Если от сервера пришла ошибка, генерируем свою
                throw new Error('Сервер ответил с ошибкой');
            }
            return response.json(); // Преобразуем ответ в JSON
        })
        .then(games => {
            // УСПЕХ! Мы получили данные.
            // Убираем статусное сообщение
            statusDiv.textContent = 'Подключение успешно!';
            // Можно и вовсе его спрятать:
            // statusDiv.style.display = 'none';

            // Очищаем старый список
            gamesList.innerHTML = '';

            // Заполняем список играми
            if (games.length === 0) {
                gamesList.textContent = 'Игр для отображения нет.';
            } else {
                games.forEach(game => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `[ID: ${game.id}] - ${game.name}`;
                    gamesList.appendChild(listItem);
                });
            }
        })
        .catch(error => {
            // ОШИБКА! Не смогли получить данные.
            console.error('Ошибка при загрузке игр:', error);
            // Показываем финальное сообщение об ошибке в правильном элементе
            statusDiv.textContent = 'Ошибка: Не удалось подключиться к серверу.';
            // Очищаем список игр
            gamesList.innerHTML = '';
        });
});