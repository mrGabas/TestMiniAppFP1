// Эта функция содержит всю основную логику вашего приложения.
function mainApp() {
    const API_BASE_URL = 'https://4d06-186-139-105-180.ngrok-free.app'; // <-- УБЕДИТЕСЬ, ЧТО URL АКТУАЛЕН

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

    // Элементы для управления арендой
    const extendModal = document.getElementById('extend-modal');
    const confirmExtendBtn = document.getElementById('confirm-extend-btn');
    const cancelExtendBtn = document.getElementById('cancel-extend-btn');
    const extendMinutesInput = document.getElementById('extend-minutes-input');
    let currentRentalIdForExtend = null;

    // Элементы ручной аренды
    const manualRentalForm = document.getElementById('manual-rental-form');
    const manualAccountSelect = document.getElementById('account-select');

    // Элементы управления
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
            const responseData = await response.json();
            if (!response.ok) {
                const errorMessage = responseData.error || `Ошибка сервера (статус: ${response.status})`;
                throw new Error(errorMessage);
            }
            return responseData;
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            alert(`Произошла ошибка: ${error.message}`);
            throw error;
        }
    }

    async function fetchRentals(type) {
        if (!rentalsListDiv) return;
        rentalsListDiv.innerHTML = 'Загрузка...';
        try {
            const data = await fetchData(`${API_BASE_URL}/api/rentals/${type}`);
            rentalsListDiv.innerHTML = '';
            if (!data || data.length === 0) {
                rentalsListDiv.textContent = 'Список пуст.';
                return;
            }
            data.forEach(r => {
                const el = document.createElement('div');
                el.className = 'list-item';
                const rentalDate = new Date(r.rental_date).toLocaleString('ru-RU');
                const returnDate = r.return_date;

                let buttonsHtml = '';
                if (type === 'active') {
                    buttonsHtml = `
                        <div class="item-actions">
                            <button class="action-btn extend-btn" data-id="${r.id}">Продлить</button>
                            <button class="action-btn finish-btn" data-id="${r.id}">Завершить</button>
                        </div>
                    `;
                }
                el.innerHTML = `
                    <div class="rental-card-game">${r.game_name || 'N/A'}</div>
                    <div class="rental-card-row"><span class="rental-card-label">Клиент:</span><span class="rental-card-value">${r.user_name} (${r.user_username || 'N/A'})</span></div>
                    <div class="rental-card-row"><span class="rental-card-label">Начало:</span><span class="rental-card-value">${rentalDate}</span></div>
                    <div class="rental-card-row"><span class="rental-card-label">Конец:</span><span class="rental-card-value">${returnDate}</span></div>
                    ${buttonsHtml}
                `;
                rentalsListDiv.appendChild(el);
            });
        } catch (error) {
            if (rentalsListDiv) rentalsListDiv.textContent = 'Не удалось загрузить аренды.';
        }
    }

    async function fetchAvailableAccounts() {
        if (!manualAccountSelect) return;
        manualAccountSelect.innerHTML = '<option value="">Загрузка...</option>';
        try {
            const accounts = await fetchData(`${API_BASE_URL}/api/accounts/available`);
            manualAccountSelect.innerHTML = '<option value="">-- Выберите аккаунт --</option>';
            if (accounts && accounts.length > 0) {
                accounts.forEach(acc => manualAccountSelect.add(new Option(`${acc.game_name} - ${acc.login}`, acc.id)));
            } else {
                manualAccountSelect.innerHTML = '<option value="">Нет свободных аккаунтов</option>';
            }
        } catch (error) {
            if (manualAccountSelect) manualAccountSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        }
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
        } catch (error) { /* Ошибка уже показана */ }
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    rentalsListDiv.addEventListener('click', async (event) => {
        const target = event.target;
        const rentalId = target.dataset.id;
        if (!rentalId) return;

        if (target.classList.contains('finish-btn')) {
            if (confirm(`Вы уверены, что хотите завершить аренду #${rentalId}?`)) {
                try {
                    const result = await fetchData(`${API_BASE_URL}/api/rentals/${rentalId}/finish`, { method: 'POST' });
                    alert(result.message);
                    fetchRentals('active');
                } catch (error) { /* Ошибка уже показана */ }
            }
        }

        if (target.classList.contains('extend-btn')) {
            currentRentalIdForExtend = rentalId;
            if (extendModal) extendModal.style.display = 'flex';
        }
    });

    if (cancelExtendBtn) cancelExtendBtn.addEventListener('click', () => {
        if (extendModal) extendModal.style.display = 'none';
        currentRentalIdForExtend = null;
    });

    if (confirmExtendBtn) confirmExtendBtn.addEventListener('click', async () => {
        const minutes = extendMinutesInput.value;
        if (!minutes || minutes < 1) {
            alert('Введите корректное количество минут.');
            return;
        }
        try {
            const result = await fetchData(`${API_BASE_URL}/api/rentals/${currentRentalIdForExtend}/extend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: minutes })
            });
            alert(result.message);
            if (extendModal) extendModal.style.display = 'none';
            fetchRentals('active');
        } catch (error) { /* Ошибка уже показана */ }
    });

    if (manualRentalForm) manualRentalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rentalData = {
            client_name: document.getElementById('client-name').value,
            account_id: manualAccountSelect.value,
            total_minutes: document.getElementById('rental-duration').value
        };
        try {
            const result = await fetchData(`${API_BASE_URL}/api/rentals/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rentalData)
            });
            alert(result.message || 'Успешно!');
            manualRentalForm.reset();
            if (showActiveRentalsBtn) showActiveRentalsBtn.click();
        } catch(error) { /* Ошибка уже показана */ }
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
