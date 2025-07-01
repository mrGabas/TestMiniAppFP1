document.addEventListener('DOMContentLoaded', function() {
    const tg = window.Telegram.WebApp;
    tg.ready();

    const statusDiv = document.getElementById('connection-status');
    const showGamesBtn = document.getElementById('show-games-btn');
    const showActiveRentalsBtn = document.getElementById('show-active-rentals-btn');
    const showHistoryRentalsBtn = document.getElementById('show-history-rentals-btn');

    const gamesContainer = document.getElementById('games-list-container');
    const rentalsContainer = document.getElementById('rentals-list-container');
    const rentalsTitle = document.getElementById('rentals-title');
    const gamesListDiv = document.getElementById('games-list');
    const rentalsListDiv = document.getElementById('rentals-list');

    const API_BASE_URL = 'https://7e5e-186-139-105-180.ngrok-free.app'; // <-- НЕ ЗАБУДЬТЕ ЗАМЕНИТЬ НА ВАШ АКТУАЛЬНЫЙ NGROK URL

     function showScreen(screenToShow) {
        [rentalsContainer, gamesContainer, manualRentalContainer].forEach(screen => {
            screen.style.display = 'none';
        });
        screenToShow.style.display = 'block';
    }

    statusDiv.textContent = 'Подключение успешно!';
    statusDiv.style.color = 'green';

    // --- Обработчики кнопок ---
    showGamesBtn.addEventListener('click', () => {
        rentalsContainer.style.display = 'none';
        gamesContainer.style.display = 'block';
        fetchGames();
    });

    showActiveRentalsBtn.addEventListener('click', () => {
        gamesContainer.style.display = 'none';
        rentalsContainer.style.display = 'block';
        rentalsTitle.textContent = 'Активные аренды';
        fetchRentals('active');
    });

    showHistoryRentalsBtn.addEventListener('click', () => {
        gamesContainer.style.display = 'none';
        rentalsContainer.style.display = 'block';
        rentalsTitle.textContent = 'История аренд';
        fetchRentals('history');
    });

        showManualRentalBtn.addEventListener('click', () => {
        showScreen(manualRentalContainer);
        fetchAvailableAccounts();
    });

    // Загрузка свободных аккаунтов в <select>
    function fetchAvailableAccounts() {
        accountSelect.innerHTML = '<option value="">Загрузка...</option>';
        fetch(`${API_BASE_URL}/api/accounts/available`)
            .then(response => response.json())
            .then(accounts => {
                accountSelect.innerHTML = '<option value="">-- Выберите аккаунт --</option>';
                if (accounts.length > 0) {
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

    // Отправка формы
    manualRentalForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Предотвращаем стандартную отправку формы

        const rentalData = {
            client_name: document.getElementById('client-name').value,
            account_id: accountSelect.value,
            total_minutes: document.getElementById('rental-duration').value
        };

        if (!rentalData.account_id) {
            alert('Пожалуйста, выберите аккаунт.');
            return;
        }

        fetch(`${API_BASE_URL}/api/rentals/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rentalData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                manualRentalForm.reset(); // Очищаем форму
                showActiveRentalsBtn.click(); // Переключаемся на активные аренды
            } else {
                alert(`Ошибка: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Ошибка при создании аренды:', error);
            alert('Произошла сетевая ошибка.');
        });
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

   function fetchRentals(type) { // type может быть 'active' или 'history'
        rentalsListDiv.textContent = 'Загрузка...';
        fetch(`${API_BASE_URL}/api/rentals/${type}`)
            .then(response => response.json())
            .then(rentals => {
                rentalsListDiv.innerHTML = '';
                if (rentals.length === 0) {
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
                        <strong>Игра:</strong> ${rental.game_name} <br>
                        <strong>Клиент:</strong> ${rental.user_name} (${rental.user_username}) <br>
                        <strong>Начало:</strong> ${rentalDate} <br>
                        <strong>Конец:</strong> ${returnDate}
                    `;
                    rentalsListDiv.appendChild(rentalElement);
                });
            })
            .catch(error => {
                console.error(`Ошибка при загрузке аренд (${type}):`, error);
                rentalsListDiv.textContent = 'Не удалось загрузить список.';
                rentalsListDiv.style.color = 'red';
            });
    }

    // Загружаем активные аренды по умолчанию
    showActiveRentalsBtn.click();
});