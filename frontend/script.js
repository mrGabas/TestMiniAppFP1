// Вся логика приложения будет внутри этой функции
function mainApp() {
    const API_BASE_URL = 'https://eab2-186-139-105-180.ngrok-free.app'; // <-- УБЕДИТЕСЬ, ЧТО URL АКТУАЛЕН

    // Показываем основной контейнер и скрываем загрузку
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';

    const showManagementBtn = document.getElementById('show-management-btn');
    const managementContainer = document.getElementById('management-container');

    // Форма добавления игры
    const addGameForm = document.getElementById('add-game-form');

    // Форма добавления аккаунта
    const addAccountForm = document.getElementById('add-account-form');
    const newAccountGameSelect = document.getElementById('new-account-game');

    // Форма редактирования лотов
    const editOffersGameSelect = document.getElementById('edit-offers-game');
    const gameOffersTextarea = document.getElementById('game-offers');
    const saveOffersBtn = document.getElementById('save-offers-btn');
    // Элементы на странице
    const statusDiv = document.getElementById('connection-status');
    // ... (весь остальной ваш код без изменений)
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

    // ... (все ваши функции showScreen, fetchGames, fetchRentals и т.д. без изменений)
    function showScreen(screenToShow) {
        [rentalsContainer, manualRentalContainer, managementContainer].forEach(screen => {
            if (screen) screen.style.display = 'none';
        });
        if (screenToShow) screenToShow.style.display = 'block';
    }

    if(showActiveRentalsBtn) showActiveRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        rentalsTitle.textContent = 'Активные аренды';
        fetchRentals('active');
    });

    if(showHistoryRentalsBtn) showHistoryRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        rentalsTitle.textContent = 'История аренд';
        fetchRentals('history');
    });

    if(showGamesBtn) showGamesBtn.addEventListener('click', () => {
        showScreen(gamesContainer);
        fetchGames();
    });

    if(showManualRentalBtn) showManualRentalBtn.addEventListener('click', () => {
        showScreen(manualRentalContainer);
        fetchAvailableAccounts();
    });

    showManagementBtn.addEventListener('click', () => {
        showScreen(managementContainer);
        // При открытии вкладки загружаем список игр в выпадающие списки
        populateGameSelects();
    });

        async function populateGameSelects() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/games`);
            const games = await response.json();

            newAccountGameSelect.innerHTML = '<option value="">-- Выберите игру --</option>';
            editOffersGameSelect.innerHTML = '<option value="">-- Выберите игру --</option>';

            if (games && games.length > 0) {
                games.forEach(game => {
                    const option1 = new Option(`${game.name} (ID: ${game.id})`, game.id);
                    const option2 = new Option(`${game.name} (ID: ${game.id})`, game.id);
                    newAccountGameSelect.add(option1);
                    editOffersGameSelect.add(option2);
                });
            }
        } catch (error) {
            console.error("Ошибка загрузки игр:", error);
        }
    }

    // 2. Добавление новой игры
    addGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const gameName = document.getElementById('new-game-name').value;
        const response = await fetch(`${API_BASE_URL}/api/games/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_name: gameName })
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (result.success) {
            addGameForm.reset();
            populateGameSelects(); // Обновляем списки игр
        }
    });

    // 3. Добавление нового аккаунта
    addAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const accountData = {
            game_id: newAccountGameSelect.value,
            login: document.getElementById('new-account-login').value,
            password: document.getElementById('new-account-password').value
        };
        const response = await fetch(`${API_BASE_URL}/api/accounts/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountData)
        });
        const result = await response.json();
        alert(result.message || result.error);
        if (result.success) addAccountForm.reset();
    });

    // 4. Редактирование лотов
    editOffersGameSelect.addEventListener('change', async (e) => {
        const gameId = e.target.value;
        if (!gameId) {
            gameOffersTextarea.value = '';
            return;
        }
        const response = await fetch(`${API_BASE_URL}/api/games/${gameId}/offers`);
        const result = await response.json();
        if (result.success) {
            gameOffersTextarea.value = result.offers;
        } else {
            alert(result.error);
        }
    });

    saveOffersBtn.addEventListener('click', async () => {
        const gameId = editOffersGameSelect.value;
        const offers = gameOffersTextarea.value;
        if (!gameId) {
            alert('Сначала выберите игру.');
            return;
        }
        const response = await fetch(`${API_BASE_URL}/api/games/offers/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_id: gameId, offers: offers })
        });
        const result = await response.json();
        alert(result.message || result.error);
    });

    function fetchGames() {
        gamesListDiv.textContent = 'Загрузка игр...';
        fetch(`${API_BASE_URL}/api/games`).then(response => response.json()).then(games => {
            gamesListDiv.innerHTML = '';
            if (!games || games.length === 0) { gamesListDiv.textContent = 'Игр нет.'; return; }
            games.forEach(game => {
                const el = document.createElement('div');
                el.className = 'list-item';
                el.textContent = `[ID: ${game.id}] - ${game.name}`;
                gamesListDiv.appendChild(el);
            });
        }).catch(err => { gamesListDiv.textContent = 'Ошибка загрузки игр.'; });
    }

    function fetchRentals(type) {
        rentalsListDiv.textContent = `Загрузка...`;
        fetch(`${API_BASE_URL}/api/rentals/${type}`).then(response => response.json()).then(rentals => {
            rentalsListDiv.innerHTML = '';
            if (!rentals || rentals.length === 0) { rentalsListDiv.textContent = 'Список пуст.'; return; }
            rentals.forEach(r => {
                const el = document.createElement('div');
                el.className = 'list-item';
                const rentalDate = new Date(r.rental_date).toLocaleString('ru-RU');
                const returnDate = r.return_date !== 'Не возвращена' ? new Date(r.return_date).toLocaleString('ru-RU') : 'Активна';
                el.innerHTML = `<strong>Игра:</strong> ${r.game_name || 'N/A'} <br><strong>Клиент:</strong> ${r.user_name} (${r.user_username || 'N/A'}) <br><strong>Начало:</strong> ${rentalDate} <br><strong>Конец:</strong> ${returnDate}`;
                rentalsListDiv.appendChild(el);
            });
        }).catch(err => { rentalsListDiv.textContent = 'Ошибка загрузки аренд.'; });
    }

    function fetchAvailableAccounts() {
        accountSelect.innerHTML = '<option value="">Загрузка...</option>';
        fetch(`${API_BASE_URL}/api/accounts/available`).then(response => response.json()).then(accounts => {
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
        }).catch(err => { accountSelect.innerHTML = '<option value="">Ошибка загрузки</option>'; });
    }

    if(manualRentalForm) manualRentalForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const rentalData = {
            client_name: document.getElementById('client-name').value,
            account_id: accountSelect.value,
            total_minutes: document.getElementById('rental-duration').value
        };
        if (!rentalData.account_id) { alert('Пожалуйста, выберите аккаунт.'); return; }
        fetch(`${API_BASE_URL}/api/rentals/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rentalData),
        }).then(response => response.json()).then(data => {
            if (data.success) {
                alert(data.message || 'Аренда успешно создана!');
                manualRentalForm.reset();
                if(showActiveRentalsBtn) showActiveRentalsBtn.click();
            } else {
                alert(`Ошибка: ${data.error || 'Неизвестная ошибка сервера'}`);
            }
        }).catch(err => { alert('Произошла сетевая ошибка.'); });
    });

    if(showActiveRentalsBtn) showActiveRentalsBtn.click();
}

// Запускаем приложение только после того, как Telegram API готово
try {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    mainApp();
} catch (e) {
    // Если Telegram API не загрузился, наша ловушка в index.html поймает эту ошибку
    console.error(e);
}