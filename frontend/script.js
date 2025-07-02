// Эта функция содержит всю основную логику вашего приложения.
function mainApp() {
    const API_BASE_URL = 'https://eab2-186-139-105-180.ngrok-free.app'; // <-- УБЕДИТЕСЬ, ЧТО URL АКТУАЛЕН

    // Показываем основной контейнер и скрываем загрузку
    const appLoading = document.getElementById('app-loading');
    if (appLoading) appLoading.style.display = 'none';

    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.style.display = 'block';

    // --- Элементы на странице ---
    const statusDiv = document.getElementById('connection-status');
    const showActiveRentalsBtn = document.getElementById('show-active-rentals-btn');
    const showHistoryRentalsBtn = document.getElementById('show-history-rentals-btn');
    const showManualRentalBtn = document.getElementById('show-manual-rental-btn');
    const showManagementBtn = document.getElementById('show-management-btn');

    const rentalsContainer = document.getElementById('rentals-list-container');
    const manualRentalContainer = document.getElementById('manual-rental-container');
    const managementContainer = document.getElementById('management-container');

    const rentalsTitle = document.getElementById('rentals-title');
    const rentalsListDiv = document.getElementById('rentals-list');

    const manualRentalForm = document.getElementById('manual-rental-form');
    const manualAccountSelect = document.getElementById('account-select');

    const addGameForm = document.getElementById('add-game-form');
    const addAccountForm = document.getElementById('add-account-form');
    const newAccountGameSelect = document.getElementById('new-account-game');
    const editOffersGameSelect = document.getElementById('edit-offers-game');
    const gameOffersTextarea = document.getElementById('game-offers');
    const saveOffersBtn = document.getElementById('save-offers-btn');

    if (statusDiv) {
        statusDiv.textContent = 'Подключение успешно!';
        statusDiv.style.color = 'green';
    }

    function showScreen(screenToShow) {
        [rentalsContainer, manualRentalContainer, managementContainer].forEach(screen => {
            if (screen) screen.style.display = 'none';
        });
        if (screenToShow) screenToShow.style.display = 'block';
    }

    // --- ОБРАБОТЧИКИ КНОПОК НАВИГАЦИИ ---
    if (showActiveRentalsBtn) showActiveRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        if (rentalsTitle) rentalsTitle.textContent = 'Активные аренды';
        fetchRentals('active');
    });

    if (showHistoryRentalsBtn) showHistoryRentalsBtn.addEventListener('click', () => {
        showScreen(rentalsContainer);
        if (rentalsTitle) rentalsTitle.textContent = 'История аренд';
        fetchRentals('history');
    });

    if (showManualRentalBtn) showManualRentalBtn.addEventListener('click', () => {
        showScreen(manualRentalContainer);
        fetchAvailableAccounts();
    });

    if (showManagementBtn) showManagementBtn.addEventListener('click', () => {
        showScreen(managementContainer);
        populateGameSelects();
    });

    // --- УЛУЧШЕННЫЕ ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ---
    async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Сетевой ответ был не в порядке: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Ошибка сервера: ${data.error}`);
            }
            return data;
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            alert(`Произошла ошибка: ${error.message}`);
            throw error; // Пробрасываем ошибку дальше, чтобы остановить выполнение
        }
    }

    function fetchRentals(type) {
        if (!rentalsListDiv) return;
        rentalsListDiv.innerHTML = 'Загрузка...';
        fetchData(`${API_BASE_URL}/api/rentals/${type}`)
            .then(data => {
                rentalsListDiv.innerHTML = '';
                if (!data || data.length === 0) {
                    rentalsListDiv.textContent = 'Список пуст.';
                    return;
                }
                data.forEach(r => {
                    const el = document.createElement('div');
                    el.className = 'list-item';
                    const rentalDate = new Date(r.rental_date).toLocaleString('ru-RU');
                    const returnDate = r.return_date !== 'Не возвращена' ? new Date(r.return_date).toLocaleString('ru-RU') : 'Активна';
                    el.innerHTML = `<strong>Игра:</strong> ${r.game_name || 'N/A'} <br><strong>Клиент:</strong> ${r.user_name} (${r.user_username || 'N/A'}) <br><strong>Начало:</strong> ${rentalDate} <br><strong>Конец:</strong> ${returnDate}`;
                    rentalsListDiv.appendChild(el);
                });
            }).catch(() => { if (rentalsListDiv) rentalsListDiv.textContent = 'Не удалось загрузить аренды.'; });
    }

    function fetchAvailableAccounts() {
        if (!manualAccountSelect) return;
        manualAccountSelect.innerHTML = '<option value="">Загрузка...</option>';
        fetchData(`${API_BASE_URL}/api/accounts/available`)
            .then(accounts => {
                manualAccountSelect.innerHTML = '<option value="">-- Выберите аккаунт --</option>';
                if (accounts && accounts.length > 0) {
                    accounts.forEach(acc => manualAccountSelect.add(new Option(`${acc.game_name} - ${acc.login}`, acc.id)));
                } else {
                    manualAccountSelect.innerHTML = '<option value="">Нет свободных аккаунтов</option>';
                }
            }).catch(() => { if (manualAccountSelect) manualAccountSelect.innerHTML = '<option value="">Ошибка загрузки</option>'; });
    }

    async function populateGameSelects() {
        try {
            const games = await fetchData(`${API_BASE_URL}/api/games`);
            const selects = [newAccountGameSelect, editOffersGameSelect];
            selects.forEach(select => {
                if (select) select.innerHTML = '<option value="">-- Выберите игру --</option>';
            });
            if (games && games.length > 0) {
                games.forEach(game => {
                    selects.forEach(select => {
                        if (select) select.add(new Option(game.name, game.id));
                    });
                });
            }
        } catch (error) { /* Ошибка уже обработана в fetchData */ }
    }

    // --- ОБРАБОТЧИКИ ФОРМ ---
    if (manualRentalForm) manualRentalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rentalData = {
            client_name: document.getElementById('client-name').value,
            account_id: manualAccountSelect.value,
            total_minutes: document.getElementById('rental-duration').value
        };
        if (!rentalData.account_id) { alert('Выберите аккаунт.'); return; }

        try {
            const result = await fetchData(`${API_BASE_URL}/api/rentals/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rentalData)
            });
            alert(result.message || 'Успешно!');
            manualRentalForm.reset();
            if (showActiveRentalsBtn) showActiveRentalsBtn.click();
        } catch(error) { /* Ошибка уже обработана */ }
    });

    if (addGameForm) addGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const gameName = document.getElementById('new-game-name').value;
        try {
            const result = await fetchData(`${API_BASE_URL}/api/games/add`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_name: gameName })
            });
            alert(result.message);
            addGameForm.reset();
            populateGameSelects();
        } catch(error) { /* ... */ }
    });

    if (addAccountForm) addAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const accountData = {
            game_id: newAccountGameSelect.value,
            login: document.getElementById('new-account-login').value,
            password: document.getElementById('new-account-password').value
        };
        try {
            const result = await fetchData(`${API_BASE_URL}/api/accounts/add`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountData)
            });
            alert(result.message);
            addAccountForm.reset();
        } catch(error) { /* ... */ }
    });

    if (editOffersGameSelect) editOffersGameSelect.addEventListener('change', async (e) => {
        const gameId = e.target.value;
        if (gameOffersTextarea) gameOffersTextarea.value = '';
        if (!gameId) return;
        try {
            const result = await fetchData(`${API_BASE_URL}/api/games/${gameId}/offers`);
            if (gameOffersTextarea) gameOffersTextarea.value = result.offers;
        } catch(error) { /* ... */ }
    });

    if (saveOffersBtn) saveOffersBtn.addEventListener('click', async () => {
        const gameId = editOffersGameSelect.value;
        if (!gameId) { alert('Сначала выберите игру.'); return; }
        try {
            const result = await fetchData(`${API_BASE_URL}/api/games/offers/update`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id: gameId, offers: gameOffersTextarea.value })
            });
            alert(result.message);
        } catch(error) { /* ... */ }
    });

    // --- Инициализация при запуске ---
    if (showActiveRentalsBtn) showActiveRentalsBtn.click();
}

// --- ГЛАВНЫЙ ВХОД В ПРИЛОЖЕНИЕ ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        mainApp();
    } catch (e) {
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Критическая ошибка при инициализации: ${e.message}</div>`;
    }
});
