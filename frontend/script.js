// --- Блок немедленной инициализации Telegram ---
// Это самое важное для борьбы с серым экраном.
try {
    const tg = window.Telegram.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    } else {
        console.error("Telegram WebApp object not found!");
    }
} catch (e) {
    console.error("Error initializing Telegram WebApp:", e);
}
// --- Конец блока инициализации ---


// Основная логика приложения запускается после загрузки всего HTML
document.addEventListener('DOMContentLoaded', function() {

    // --- Константы и URL API ---
    const API_BASE_URL = 'https://2b45-186-139-105-180.ngrok-free.app'; // <-- ЗАМЕНИТЕ НА ВАШ АКТУАЛЬНЫЙ NGROK URL

    // --- Элементы на странице ---
    const statusDiv = document.getElementById('connection-status');
    const showActiveRentalsBtn = document.getElementById('show-active-rentals-btn');
    const showHistoryRentalsBtn = document.getElementById('show-history-rentals-btn');
    const showGamesBtn = document.getElementById('show-games-btn');
    const showManualRentalBtn = document.getElementById('show-manual-rental-btn');

    const rentalsContainer = document.getElementById('rentals-list-container');
    const gamesContainer = document.getElementById('games-list-container');
    const manualRentalContainer = document.getElementById('manual-rental-container');

    const rentalsTitle = document.getElementById('rentals-title');
    const gamesListDiv = document.getElementById('games-list');
    const rentalsListDiv = document.getElementById('rentals-list');

    const manualRentalForm = document.getElementById('manual-rental-form');
    const accountSelect = document.getElementById('account-select');

    if (statusDiv) {
        statusDiv.textContent = 'Подключение успешно!';
        statusDiv.style.color = 'green';
    }
    // --- Функция для переключения экранов ---
    function showScreen(screenToShow) {
        [rentalsContainer, gamesContainer, manualRentalContainer].forEach(screen => {
            screen.style.display = 'none';
        });
        screenToShow.style.display = 'block';
    }

    // --- Обработчики кнопок ---
    showActiveRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        rentalsTitle.textContent = 'Активные аренды';
        fetchRentals('active');
    });

    showHistoryRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        rentalsTitle.textContent = 'История аренд';
        fetchRentals('history');
    });

    showGamesBtn.addEventListener('click', () => {
        showScreen(gamesContainer);
        fetchGames();
    });

    showManualRentalBtn.addEventListener('click', () => {
        showScreen(manualRentalContainer);
        fetchAvailableAccounts();
    });

    // --- Функции для загрузки данных ---

    // Загрузка списка игр
    function fetchGames() {
        gamesListDiv.textContent = 'Загрузка игр...';
        fetch(`${API_BASE_URL}/api/games`)
            .then(response => response.json())
            .then(games => {
                gamesListDiv.innerHTML = '';
                if (!games || games.length === 0) {
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
            });
    }

    // Загрузка аренд (активных или истории)
    function fetchRentals(type) {
        rentalsListDiv.textContent = `Загрузка (${type})...`;
        fetch(`${API_BASE_URL}/api/rentals/${type}`)
            .then(response => response.json())
            .then(rentals => {
                rentalsListDiv.innerHTML = '';
                if (!rentals || rentals.length === 0) {
                    rentalsListDiv.textContent = 'Список пуст.';
                    return;
                }
                rentals.forEach(rental => {
                    const rentalElement = document.createElement('div');
                    rentalElement.className = 'list-item';
                    const rentalDate = new Date(rental.rental_date).toLocaleString('ru-RU');
                    const returnDate = rental.return_date !== 'Не возвращена'
                        ? new Date(rental.return_date).toLocaleString('ru-RU')
                        : 'Активна';

                    rentalElement.innerHTML = `
                        <strong>Игра:</strong> ${rental.game_name || 'N/A'} <br>
                        <strong>Клиент:</strong> ${rental.user_name} (${rental.user_username || 'N/A'}) <br>
                        <strong>Начало:</strong> ${rentalDate} <br>
                        <strong>Конец:</strong> ${returnDate}
                    `;
                    rentalsListDiv.appendChild(rentalElement);
                });
            })
            .catch(error => {
                console.error(`Ошибка при загрузке аренд (${type}):`, error);
                rentalsListDiv.textContent = 'Не удалось загрузить список.';
            });
    }

    // Загрузка свободных аккаунтов для формы
    function fetchAvailableAccounts() {
        accountSelect.innerHTML = '<option value="">Загрузка...</option>';
        fetch(`${API_BASE_URL}/api/accounts/available`)
            .then(response => response.json())
            .then(accounts => {
                accountSelect.innerHTML = '<option value="">-- Выберите аккаунт --</option>';
                if (accounts && accounts.length > 0) {
                    accounts.forEach(acc => {
                        const option = document.createElement('option');
                        option.value = acc.id;
                        option.textContent = `${acc.game_name} - ${acc.login}`;
                        accountSelect.appendChild(option);
                    });
                } else {
                    accountSelect.innerHTML = '<option value="">Нет свободных аккаунтов</option>';
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки аккаунтов:', error);
                accountSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
            });
    }

    // --- Логика формы ручной аренды ---
    manualRentalForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const rentalData = {
            client_name: document.getElementById('client-name').value,
            account_id: accountSelect.value,
            total_minutes: document.getElementById('rental-duration').value
        };

        if (!rentalData.account_id) {
            alert('Пожалуйста, выберите аккаунт.');
            return;
        }

        // Отправка данных на сервер
        fetch(`${API_BASE_URL}/api/rentals/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rentalData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message || 'Аренда успешно создана!');
                manualRentalForm.reset();
                showActiveRentalsBtn.click(); // Показать активные аренды после успеха
            } else {
                alert(`Ошибка: ${data.error || 'Неизвестная ошибка сервера'}`);
            }
        })
        .catch(error => {
            console.error('Ошибка при создании аренды:', error);
            alert('Произошла сетевая ошибка.');
        });
    });

    // --- Первоначальная загрузка ---
    showActiveRentalsBtn.click();
});