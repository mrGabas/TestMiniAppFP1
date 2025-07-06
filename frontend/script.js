document.addEventListener('DOMContentLoaded', () => {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        mainApp();
    } catch (e) {
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Критическая ошибка: ${e.message}</div>`;
    }
});

function mainApp() {
    const API_BASE_URL = 'https://4d06-186-139-105-180.ngrok-free.app'; // <-- УБЕДИТЕСЬ, ЧТО URL АКТУАЛЕН

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
    const showSettingsBtn = document.getElementById('show-settings-btn');

    // --- Контейнеры ---
    const rentalsContainer = document.getElementById('rentals-list-container');
    const manualRentalContainer = document.getElementById('manual-rental-container');
    const managementContainer = document.getElementById('management-container');
    const settingsContainer = document.getElementById('settings-container');

    // ### НОВЫЕ ЭЛЕМЕНТЫ ###
    const funpayBotToggle = document.getElementById('funpay-bot-toggle');
    const funpayLotsToggle = document.getElementById('funpay-lots-toggle');
    const forceDeactivateBtn = document.getElementById('force-deactivate-btn');
    // ### КОНЕЦ НОВЫХ ЭЛЕМЕНТОВ ###

    const rentalsTitle = document.getElementById('rentals-title');
    const rentalsListDiv = document.getElementById('rentals-list');

    const extendModal = document.getElementById('extend-modal');
    const confirmExtendBtn = document.getElementById('confirm-extend-btn');
    const cancelExtendBtn = document.getElementById('cancel-extend-btn');
    const extendMinutesInput = document.getElementById('extend-minutes-input');
    let currentRentalIdForExtend = null;

    const manualRentalForm = document.getElementById('manual-rental-form');
    const manualAccountSelect = document.getElementById('account-select');

    const addGameForm = document.getElementById('add-game-form');
    const addAccountForm = document.getElementById('add-account-form');
    const newAccountGameSelect = document.getElementById('new-account-game');
    const editOffersGameSelect = document.getElementById('edit-offers-game');
    const gameOffersTextarea = document.getElementById('game-offers');
    const saveOffersBtn = document.getElementById('save-offers-btn');

    if (statusDiv) statusDiv.textContent = 'Подключение успешно!';

    function showScreen(screenToShow) {
        [rentalsContainer, manualRentalContainer, managementContainer, settingsContainer].forEach(screen => {
            if (screen) screen.style.display = 'none';
        });
        if (screenToShow) screenToShow.style.display = 'block';
    }

    // --- ОБРАБОТЧИКИ КНОПОК НАВИГАЦИИ ---
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

    showManualRentalBtn.addEventListener('click', () => {
        showScreen(manualRentalContainer);
        fetchAvailableAccounts();
    });

    showManagementBtn.addEventListener('click', () => {
        showScreen(managementContainer);
        populateGameSelects();
    });

    showSettingsBtn.addEventListener('click', () => {
        showScreen(settingsContainer);
        fetchBotStatus();
        fetchLotsStatus(); // <-- ЗАГРУЖАЕМ СТАТУС ЛОТОВ
    });

    // --- ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ---
     async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);

            // ### ИЗМЕНЕНИЕ ЗДЕСЬ ###
            const contentType = response.headers.get("content-type");
            if (!response.ok) {
                let error_message = `Ошибка HTTP: ${response.status}`;
                if (contentType && contentType.includes("application/json")) {
                    const error_data = await response.json();
                    error_message = error_data.error || JSON.stringify(error_data);
                }
                throw new Error(error_message);
            }

            if (contentType && contentType.includes("application/json")) {
                 return await response.json();
            } else {
                // Если ответ не JSON, выводим ошибку, чтобы понять, что пришло
                const textResponse = await response.text();
                throw new Error(`Ответ сервера не является JSON. Ответ: ${textResponse.substring(0, 100)}...`);
            }
            // ### КОНЕЦ ИЗМЕНЕНИЯ ###

        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: error.message,
                buttons: [{type: 'ok'}]
            });
            throw error;
        }
    }

    async function fetchRentals(type) {
        if (!rentalsListDiv) return;
        rentalsListDiv.innerHTML = '<div class="list-item">Загрузка...</div>';
        try {
            const data = await fetchData(`${API_BASE_URL}/api/rentals/${type}`);
            rentalsListDiv.innerHTML = '';
            if (!data || data.length === 0) {
                rentalsListDiv.innerHTML = '<div class="list-item">Список пуст.</div>';
                return;
            }
            data.forEach(r => {
                const el = document.createElement('div');
                el.className = 'list-item';
                const rentalDate = new Date(r.rental_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
                const returnDate = r.return_date;

                let buttonsHtml = '';
                if (type === 'active') {
                    buttonsHtml = `<div class="item-actions"><button class="action-btn extend-btn" data-id="${r.id}">Продлить</button><button class="action-btn finish-btn" data-id="${r.id}">Завершить</button></div>`;
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
            if (rentalsListDiv) rentalsListDiv.innerHTML = '<div class="list-item">Не удалось загрузить аренды.</div>';
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

    async function fetchBotStatus() {
        if (!funpayBotToggle) return;
        try {
            const data = await fetchData(`${API_BASE_URL}/api/settings/bot_status`);
            funpayBotToggle.checked = data.is_bot_enabled;
        } catch (error) {
            /* Ошибка уже показана */
        }
    }

    // ### НОВЫЕ ФУНКЦИИ ###
    async function fetchLotsStatus() {
        if (!funpayLotsToggle) return;
        try {
            const data = await fetchData(`${API_BASE_URL}/api/settings/lots_status`);
            funpayLotsToggle.checked = data.are_lots_enabled;
        } catch (error) {
            /* Ошибка уже показана */
        }
    }

    async function setLotsStatus(isEnabled) {
        try {
            const result = await fetchData(`${API_BASE_URL}/api/settings/lots_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ are_lots_enabled: isEnabled })
            });
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
        } catch (error) {
            funpayLotsToggle.checked = !isEnabled;
        }
    }
    // ### КОНЕЦ НОВЫХ ФУНКЦИЙ ###

    async function setBotStatus(isEnabled) {
        try {
            const result = await fetchData(`${API_BASE_URL}/api/settings/bot_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_bot_enabled: isEnabled })
            });
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
        } catch (error) {
            funpayBotToggle.checked = !isEnabled;
        }
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    rentalsListDiv.addEventListener('click', async (event) => {
        const target = event.target;
        const rentalId = target.dataset.id;
        if (!rentalId) return;

        if (target.classList.contains('finish-btn')) {
            window.Telegram.WebApp.showConfirm(`Вы уверены, что хотите завершить аренду #${rentalId}?`, async (isConfirmed) => {
                if (isConfirmed) {
                    try {
                        const result = await fetchData(`${API_BASE_URL}/api/rentals/${rentalId}/finish`, { method: 'POST' });
                        window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
                        fetchRentals('active');
                    } catch (error) { /* Ошибка уже показана */ }
                }
            });
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
            window.Telegram.WebApp.showAlert('Введите корректное количество минут.');
            return;
        }
        try {
            const result = await fetchData(`${API_BASE_URL}/api/rentals/${currentRentalIdForExtend}/extend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: minutes })
            });
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
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
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
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
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
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
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
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

    if (funpayBotToggle) {
        funpayBotToggle.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            setBotStatus(isEnabled);
        });
    }

    if (saveOffersBtn) saveOffersBtn.addEventListener('click', async () => {
        const gameId = editOffersGameSelect.value;
        if (!gameId) { window.Telegram.WebApp.showAlert('Сначала выберите игру.'); return; }
        try {
            const result = await fetchData(`${API_BASE_URL}/api/games/offers/update`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id: gameId, offers: gameOffersTextarea.value })
            });
            window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
        } catch(error) { /* ... */ }
    });

    // ### НОВЫЕ ОБРАБОТЧИКИ ###
    if (funpayLotsToggle) {
        funpayLotsToggle.addEventListener('change', (event) => {
            setLotsStatus(event.target.checked);
        });
    }

    if (forceDeactivateBtn) {
        forceDeactivateBtn.addEventListener('click', () => {
            window.Telegram.WebApp.showConfirm('Вы уверены, что хотите принудительно деактивировать ВСЕ лоты?', async (isConfirmed) => {
                if(isConfirmed) {
                    try {
                        const result = await fetchData(`${API_BASE_URL}/api/settings/force_deactivate`, { method: 'POST' });
                        window.Telegram.WebApp.showPopup({title: 'Успех', message: result.message, buttons: [{type: 'ok'}]});
                    } catch(error) { /* Ошибка уже показана */ }
                }
            });
        });
    }
    // ### КОНЕЦ НОВЫХ ОБРАБОТЧИКОВ ###

    // --- Инициализация при запуске ---
    if (showActiveRentalsBtn) showActiveRentalsBtn.click();
}