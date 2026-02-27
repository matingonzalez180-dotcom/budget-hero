/**
 * app.js — Main controller for Budget Hero
 */
window.App = (() => {
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    let currentPage = 'dashboard';
    let editingTx = null;
    let editingGoal = null;
    let editingDue = null;
    let dashboardPeriod = 'month';
    let budgetMonth = new Date().getMonth();
    let budgetYear = new Date().getFullYear();
    let aiBudgetData = null;

    function safeBind(selector, event, handler) {
        const el = $(selector);
        if (el) el.addEventListener(event, handler);
    }

    function init() {
        console.log('Initializing Budget Hero...');

        // Nav
        $$('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

        // Theme
        const theme = Store.getSetting('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = $('#theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

        // Reset
        safeBind('#btn-reset-app', 'click', () => {
            if (confirm('¿Seguro que querés borrar todos los datos y reiniciar la app?')) {
                localStorage.clear();
                location.reload();
            }
        });

        // Mobile menu toggle with overlay
        safeBind('#menu-toggle', 'click', () => {
            const sidebar = $('#sidebar');
            const overlay = $('#sidebar-overlay');
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
        });

        // Sidebar overlay close
        safeBind('#sidebar-overlay', 'click', () => {
            $('#sidebar').classList.remove('open');
            $('#sidebar-overlay').classList.remove('active');
        });

        // Mobile bottom nav
        $$('.mobile-nav-btn').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

        // Mobile FAB
        safeBind('#mobile-fab', 'click', () => openTransactionModal());

        // Date
        const dateEl = $('#current-date');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Transaction modal
        safeBind('#btn-add-transaction', 'click', () => openTransactionModal());
        safeBind('#modal-close', 'click', closeTransactionModal);
        safeBind('#btn-cancel', 'click', closeTransactionModal);
        safeBind('#transaction-form', 'submit', handleTransactionSubmit);
        $$('.type-btn').forEach(btn => btn.addEventListener('click', () => setTransactionType(btn.dataset.type)));
        safeBind('#tx-description', 'input', handleDescriptionInput);
        safeBind('#btn-apply-ai', 'click', applyAiSuggestion);

        // Budget modal
        safeBind('#btn-add-budget', 'click', openBudgetModal);
        safeBind('#budget-modal-close', 'click', closeBudgetModal);
        safeBind('#budget-cancel', 'click', closeBudgetModal);
        safeBind('#budget-form', 'submit', handleBudgetSubmit);

        // Budget month nav
        safeBind('#prev-month', 'click', () => changeBudgetMonth(-1));
        safeBind('#next-month', 'click', () => changeBudgetMonth(1));
        safeBind('#btn-copy-budget', 'click', handleCopyBudget);

        // AI Budget
        safeBind('#btn-ai-budget', 'click', openAiBudgetModal);
        safeBind('#ai-budget-modal-close', 'click', closeAiBudgetModal);
        safeBind('#ai-budget-cancel', 'click', closeAiBudgetModal);
        safeBind('#ai-budget-apply', 'click', handleApplyAiBudget);
        $$('.ai-budget-tab').forEach(tab => tab.addEventListener('click', () => switchAiBudgetTab(tab.dataset.aiType)));

        // Goal modal
        safeBind('#btn-add-goal', 'click', () => openGoalModal());
        safeBind('#goal-modal-close', 'click', closeGoalModal);
        safeBind('#goal-cancel', 'click', closeGoalModal);
        safeBind('#goal-form', 'submit', handleGoalSubmit);

        // Category Manager
        safeBind('#category-form', 'submit', handleNewCategory);
        safeBind('#category-modal-close', 'click', closeCategoryModal);

        // Calendar
        CalendarModule.init();
        safeBind('#cal-prev-month', 'click', () => { CalendarModule.changeMonth(-1); renderCalendar(); });
        safeBind('#cal-next-month', 'click', () => { CalendarModule.changeMonth(1); renderCalendar(); });
        safeBind('#btn-add-due', 'click', () => openDuePaymentModal());
        safeBind('#due-modal-close', 'click', closeDuePaymentModal);
        safeBind('#due-cancel', 'click', closeDuePaymentModal);
        safeBind('#due-payment-form', 'submit', handleDuePaymentSubmit);
        safeBind('#cal-filter-status', 'change', () => renderCalendar());
        // Icon picker
        document.querySelectorAll('#due-icon-picker .icon-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#due-icon-picker .icon-picker-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                $('#due-icon').value = btn.dataset.icon;
            });
        });
        // Auto-suggest icon on name input
        safeBind('#due-name', 'input', () => {
            const name = $('#due-name').value;
            const icon = CalendarModule.suggestIcon(name);
            const picker = document.querySelectorAll('#due-icon-picker .icon-picker-btn');
            picker.forEach(b => {
                b.classList.toggle('selected', b.dataset.icon === icon);
            });
            $('#due-icon').value = icon;
        });

        // Tx Category Change (to open manager)
        const txCat = $('#tx-category');
        if (txCat) {
            txCat.addEventListener('change', (e) => {
                if (e.target.value === 'manage_categories') {
                    openCategoryModal();
                    e.target.value = '';
                }
            });
        }

        // Load Custom Categories
        Categories.loadCustom(Store.getCustomCategories());

        // Dashboard goals link
        safeBind('#btn-view-goals', 'click', () => navigateTo('goals'));

        // Dashboard calendar link
        safeBind('#btn-view-calendar', 'click', () => navigateTo('calendar'));

        // View all transactions
        safeBind('#btn-view-all', 'click', () => navigateTo('transactions'));

        // Period selector
        $$('#period-selector .period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#period-selector .period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                dashboardPeriod = btn.dataset.period;
                renderDashboard();
            });
        });

        // Onboarding
        if (!Store.getSetting('onboarded')) {
            const onb = $('#onboarding');
            if (onb) onb.classList.add('active');
        }

        // Init
        Chart.init('spending-canvas');
        renderDashboard();
        updateBudgetMonthLabel();

        console.log('App initialized successfully');
    }

    function safeBind(selector, event, handler) {
        const el = $(selector);
        if (el) {
            el.addEventListener(event, handler);
        } else {
            console.warn(`Element not found for binding: ${selector}`);
        }
    }

    // ---- NAVIGATION ----
    function navigateTo(page) {
        currentPage = page;
        $$('.page').forEach(p => p.classList.remove('active'));
        $(`#page-${page}`).classList.add('active');
        // Sync sidebar nav
        $$('.nav-item').forEach(n => n.classList.remove('active'));
        const sidebarBtn = $(`.nav-item[data-page="${page}"]`);
        if (sidebarBtn) sidebarBtn.classList.add('active');
        // Sync mobile nav
        $$('.mobile-nav-btn').forEach(n => n.classList.remove('active'));
        const mobileBtn = $(`.mobile-nav-btn[data-page="${page}"]`);
        if (mobileBtn) mobileBtn.classList.add('active');
        const titles = { dashboard: 'Inicio', transactions: 'Transacciones', budgets: 'Presupuestos', goals: 'Objetivos', calendar: 'Calendario' };
        $('#page-title').textContent = titles[page] || page;
        if (page === 'transactions') renderAllTransactions();
        if (page === 'dashboard') renderDashboard();
        if (page === 'budgets') renderBudgets();
        if (page === 'goals') renderGoals();
        if (page === 'calendar') renderCalendar();
        // Close sidebar and overlay on mobile
        $('#sidebar').classList.remove('open');
        const overlay = $('#sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    // ---- THEME ----
    function toggleTheme() {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        Store.setSetting('theme', next);
        renderDashboard();
    }

    // ---- FORMAT ----
    function fmt(amount) {
        const currency = Store.getSetting('currency') || 'USD';
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
        } catch { return `$${amount.toFixed(2)}`; }
    }

    function fmtShort(amount) {
        const currency = Store.getSetting('currency') || 'USD';
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
        } catch { return `$${Math.round(amount)}`; }
    }

    // ---- PERIOD LABEL ----
    function periodLabel(period) {
        return { day: 'del Día', week: 'de la Semana', month: 'del Mes', year: 'del Año' }[period] || 'del Mes';
    }

    // === DASHBOARD ===
    function renderDashboard() {
        const now = new Date();
        const totals = Store.getTotalsForPeriod(dashboardPeriod);
        const balance = Store.getTotalBalance();
        const pLabel = periodLabel(dashboardPeriod);

        // Update labels
        $('#income-label').textContent = `Ingresos ${pLabel}`;
        $('#expense-label').textContent = `Gastos ${pLabel}`;
        $('#savings-label').textContent = `Ahorro ${pLabel}`;

        // Summary cards
        $('#total-balance').textContent = fmt(balance.total);
        $('#operational-balance').textContent = fmt(balance.operational);
        $('#monthly-income').textContent = fmt(totals.income);
        $('#monthly-expenses').textContent = fmt(totals.expenses);

        // Savings metric (numeric)
        $('#monthly-savings-amount').textContent = fmt(totals.savings);
        const savingsPct = totals.income > 0 ? Math.round((totals.savings / totals.income) * 100) : 0;
        $('#monthly-savings-pct').textContent = `${savingsPct}% de ingresos`;

        // Income vs Expenses bars
        const maxIE = Math.max(totals.income, totals.expenses, 1);
        const incBarFill = $('#income-bar-fill');
        const expBarFill = $('#expense-bar-fill');
        if (incBarFill) incBarFill.style.width = `${(totals.income / maxIE) * 100}%`;
        if (expBarFill) expBarFill.style.width = `${(totals.expenses / maxIE) * 100}%`;
        $('#income-bar-value').textContent = fmtShort(totals.income);
        $('#expense-bar-value').textContent = fmtShort(totals.expenses);

        // Calculate Total Budget (used for Gauge and Savings Rate)
        const budgets = Store.getBudgets(now.getFullYear(), now.getMonth());
        let totalBudget = 0;
        if (budgets.length > 0) {
            totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        }

        // Budget gauge
        const catTotals = Store.getCategoryTotalsForPeriod(dashboardPeriod);
        if (budgets.length > 0) {
            const spentMap = {};
            catTotals.forEach(ct => { spentMap[ct.category] = ct.amount; });
            let totalSpentOnBudgets = 0;
            budgets.forEach(b => { totalSpentOnBudgets += (spentMap[b.category] || 0); });

            const pct = totalBudget > 0 ? Math.min((totalSpentOnBudgets / totalBudget) * 100, 100) : 0;
            const offset = 157 - (157 * pct / 100);
            const gaugeFill = $('#gauge-fill');
            if (gaugeFill) gaugeFill.setAttribute('stroke-dashoffset', offset);
            $('#gauge-value').textContent = `${Math.round(pct)}%`;
        }

        // Savings rate donut (Smart Calculation)
        let savingsRate = 0;
        let warningText = '';
        const warningEl = $('#savings-warning');

        if (totals.income > 0) {
            if (dashboardPeriod === 'month' && totalBudget > 0) {
                // "Smart" Rate: Assume user spends ALL budget
                // Projected Savings = Income - TotalBudget
                // Rate = Projected Savings / Income
                const projectedSavings = Math.max(totals.income - totalBudget, 0);
                savingsRate = (projectedSavings / totals.income) * 100;

                // Pacing Warning
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const currentDay = Math.max(now.getDate(), 1);
                const dailyAvg = totals.expenses / currentDay; // Current pace
                const projectedMonthSpend = dailyAvg * daysInMonth;

                if (projectedMonthSpend > totalBudget) {
                    const over = projectedMonthSpend - totalBudget;
                    warningText = `⚠️ Proyección: -${fmtShort(over)}`;
                }
            } else {
                // Standard Rate (Historical): (Income - Expense) / Income
                // Or use totals.net / totals.income
                savingsRate = Math.min((totals.net / totals.income) * 100, 100);
            }
        }

        const donutOffset = 201 - (201 * Math.max(savingsRate, 0) / 100);
        const donutFill = $('#donut-fill');
        if (donutFill) donutFill.setAttribute('stroke-dashoffset', donutOffset);

        const donutValue = $('#donut-value');
        if (donutValue) donutValue.textContent = `${Math.round(Math.max(savingsRate, 0))}%`;

        if (warningEl) {
            warningEl.textContent = warningText;
            warningEl.className = 'savings-warning'; // Reset class
            if (warningText) {
                // Add critical class if pacing is very bad? optional
                // For now just standard warning
            }
        }

        // Render sub-components
        renderChart();
        renderPieCharts();
        renderCategoryBreakdown();
        renderDashboardBudgets();
        renderDashboardGoals();
        renderDashboardDues();

        renderRecentTransactions();
        updateMascot();
    }

    function renderChart() {
        let dailyData;
        if (dashboardPeriod === 'day') {
            dailyData = Store.getDailyTotals(1);
        } else if (dashboardPeriod === 'week') {
            dailyData = Store.getDailyTotalsForPeriod('week');
        } else if (dashboardPeriod === 'year') {
            dailyData = Store.getDailyTotals(365);
        } else {
            dailyData = Store.getDailyTotals(30);
        }
        Chart.animate(dailyData);
    }

    function renderPieCharts() {
        const expenseData = Store.getCategoryTotalsForPeriod(dashboardPeriod, 'expense');
        const incomeData = Store.getCategoryTotalsForPeriod(dashboardPeriod, 'income');

        const toChartData = (catTotals) => catTotals.map(ct => {
            const cat = Categories.getById(ct.category);
            return { label: cat.name, value: ct.amount, color: cat.color, emoji: cat.emoji };
        });

        const expenseChartData = toChartData(expenseData);
        const incomeChartData = toChartData(incomeData);

        Chart.animatePie('expense-pie-canvas', expenseChartData, { donut: true });
        Chart.animatePie('income-pie-canvas', incomeChartData, { donut: true });

        // Tips
        renderContextualTips('dashboard');
        renderPieLegend('expense-pie-legend', expenseChartData);
        renderPieLegend('income-pie-legend', incomeChartData);
    }

    function renderPieLegend(containerId, data) {
        const el = $(`#${containerId}`);
        if (!el) return;
        if (data.length === 0) { el.innerHTML = ''; return; }
        const total = data.reduce((s, d) => s + d.value, 0);
        el.innerHTML = data.map(d => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return `<span class="pie-legend-item"><span class="pie-legend-dot" style="background:${d.color}"></span>${d.emoji} ${d.label} ${pct}%</span>`;
        }).join('');
    }

    function renderCategoryBreakdown() {
        const catTotals = Store.getCategoryTotalsForPeriod(dashboardPeriod);
        const container = $('#category-breakdown');
        if (catTotals.length === 0) {
            container.innerHTML = '<div class="empty-state-small">Sin datos aún</div>';
            return;
        }
        const total = catTotals.reduce((s, c) => s + c.amount, 0);
        container.innerHTML = catTotals.slice(0, 6).map(ct => {
            const cat = Categories.getById(ct.category);
            const pct = total > 0 ? (ct.amount / total) * 100 : 0;
            return `<div class="category-row"><div class="category-info"><span class="category-emoji">${cat.emoji}</span><span class="category-name">${cat.name}</span></div><div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div><span class="category-amount">${fmtShort(ct.amount)}</span></div>`;
        }).join('');
    }

    function renderDashboardBudgets() {
        const now = new Date();
        const budgets = Store.getBudgets(now.getFullYear(), now.getMonth());
        const card = $('#dashboard-budget-overview');
        const container = $('#dashboard-budget-bars');
        if (budgets.length === 0) { card.style.display = 'none'; return; }
        card.style.display = '';
        const catTotals = Store.getCategoryTotalsForPeriod(dashboardPeriod);
        const spentMap = {};
        catTotals.forEach(ct => { spentMap[ct.category] = ct.amount; });
        container.innerHTML = budgets.map(b => {
            const cat = Categories.getById(b.category);
            const spent = spentMap[b.category] || 0;
            const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
            const over = spent > b.amount;
            return `<div class="dash-budget-row"><div class="dash-budget-info"><span>${cat.emoji} ${cat.name}</span><span class="dash-budget-amounts">${fmtShort(spent)} / ${fmtShort(b.amount)}</span></div><div class="dash-budget-bar"><div class="dash-budget-bar-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${over ? 'var(--danger)' : cat.color}"></div></div></div>`;
        }).join('');
    }

    function renderDashboardGoals() {
        const goals = Store.getGoals();
        const widget = $('#dashboard-goals-widget');
        const container = $('#dashboard-goals-list');
        if (goals.length === 0) { widget.style.display = 'none'; return; }
        widget.style.display = '';
        const now = new Date();
        container.innerHTML = goals.slice(0, 3).map(g => {
            const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0;
            const deadline = new Date((g.deadline || new Date().toISOString().split('T')[0]) + 'T12:00:00');
            const daysLeft = Math.ceil((deadline - now) / (86400000));
            const deadlineText = !isNaN(daysLeft) ? (daysLeft > 0 ? `${daysLeft} días restantes` : (daysLeft === 0 ? 'Hoy' : 'Vencido')) : '---';
            const icon = g.type === 'savings' ? '🏦' : '📉';
            return `<div class="dash-goal-item"><div class="dash-goal-header"><span class="dash-goal-name">${icon} ${g.name}</span><span class="dash-goal-pct" style="color:${pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--text-tertiary)'}">${pct}%</span></div><div class="dash-goal-bar"><div class="dash-goal-bar-fill" style="width:${pct}%"></div></div><div class="dash-goal-meta"><span>${fmtShort(g.currentAmount)} / ${fmtShort(g.targetAmount)}</span><span>${deadlineText}</span></div></div>`;
        }).join('');
    }

    function renderContextualTips(section) {
        const container = $(`#${section}-tips-container`);
        if (!container) return;

        const allTips = AI.generateContextualTips();
        const tips = allTips[section] || [];

        container.innerHTML = '';

        if (tips.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'grid';
        tips.forEach(tip => {
            const el = document.createElement('div');
            el.className = `contextual-tip ${tip.type}`;
            el.innerHTML = `
                <span class="contextual-tip-emoji">${tip.emoji}</span>
                <span>${tip.text}</span>
            `;
            container.appendChild(el);
        });
    }

    function renderRecentTransactions() {
        const txs = Store.getTransactions().slice(0, 5);
        const container = $('#recent-transactions');
        if (txs.length === 0) return;
        container.innerHTML = txs.map(tx => buildTxRow(tx)).join('');
    }

    function buildTxRow(tx) {
        const cat = Categories.getById(tx.category);
        const sign = tx.type === 'income' ? '+' : '-';
        const cls = tx.type === 'income' ? 'income' : (tx.type === 'savings' ? 'savings' : 'expense');
        const dateObj = new Date((tx.date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : '---';
        return `<div class="transaction-row" data-id="${tx.id}"><div class="tx-icon" style="background:${cat.color}22;color:${cat.color}">${cat.emoji}</div><div class="tx-info"><span class="tx-desc">${tx.description}</span><span class="tx-meta">${cat.name} · ${dateStr}</span></div><span class="tx-amount ${cls}">${sign}${fmt(tx.amount)}</span><div class="tx-actions"><button class="btn-icon-sm btn-edit-tx" data-id="${tx.id}" title="Editar">✏️</button><button class="btn-icon-sm btn-delete-tx" data-id="${tx.id}" title="Eliminar">🗑️</button></div></div>`;
    }

    // ---- MASCOT ----
    function updateMascot() {
        const name = Store.getSetting('name') || 'mamá';
        const txCount = Store.getTransactions().length;
        const level = Math.floor(txCount / 10) + 1;
        const xpPct = (txCount % 10) * 10;
        $('#mascot-name').textContent = `¡Hola, ${name}! 💪`;
        const msgs = [
            'Tu tranquilidad financiera empieza acá.',
            '¡Cada registro suma! Estás tomando el control 💪',
            '¡Sos una genia administrando! Tu familia lo nota ❤️',
            '¡Nivel impresionante! Tu esfuerzo da frutos 🌟'
        ];
        $('#mascot-msg').textContent = msgs[Math.min(level - 1, msgs.length - 1)];
        const xpEl = $('#mascot-xp');
        if (xpEl) {
            xpEl.querySelector('.mascot-xp-label').textContent = `Nivel ${level}`;
            xpEl.querySelector('.mascot-xp-fill').style.width = `${xpPct}%`;
        }
    }

    function renderAllTransactions() {
        const searchEl = $('#search-transactions');
        const catEl = $('#filter-category');
        const typeEl = $('#filter-type');

        const search = searchEl ? searchEl.value : '';
        const category = catEl ? catEl.value : '';
        const type = typeEl ? typeEl.value : '';

        const txs = Store.getTransactions({ search, category, type });
        const container = $('#all-transactions');

        if (!container) return;

        if (txs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No hay movimientos</h3>
                    <p>No se encontraron transacciones con los filtros actuales.</p>
                </div>`;
            return;
        }

        container.innerHTML = txs.map(tx => buildTxRow(tx)).join('');

        container.querySelectorAll('.btn-edit-tx').forEach(btn => btn.addEventListener('click', () => {
            editingTx = btn.dataset.id;
            const txToEdit = Store.getTransactions().find(t => t.id === editingTx);
            if (txToEdit) openTransactionModal(txToEdit);
        }));

        container.querySelectorAll('.btn-delete-tx').forEach(btn => btn.addEventListener('click', () => {
            if (confirm('¿Eliminar esta transacción?')) {
                Store.deleteTransaction(btn.dataset.id);
                renderAllTransactions();
                renderDashboard();
            }
        }));
    }

    function openTransactionModal(tx = null) {
        editingTx = tx ? tx.id : null;
        $('#modal-title').textContent = tx ? 'Editar Transacción' : 'Nueva Transacción';
        const type = tx ? tx.type : 'expense';
        setTransactionType(type);
        $('#tx-amount').value = tx ? tx.amount : '';
        $('#tx-description').value = tx ? tx.description : '';
        $('#tx-date').value = tx ? tx.date : new Date().toISOString().split('T')[0];
        $('#tx-notes').value = tx ? (tx.notes || '') : '';
        if (tx) $('#tx-category').value = tx.category;
        $('#ai-suggestion').style.display = 'none';
        $('#transaction-modal').classList.add('active');
        setTimeout(() => $('#tx-amount').focus(), 100);
    }

    function closeTransactionModal() {
        $('#transaction-modal').classList.remove('active');
        editingTx = null;
        $('#transaction-form').reset();
    }

    function setTransactionType(type) {
        $$('.type-btn').forEach(b => b.classList.remove('active'));
        $(`.type-btn[data-type="${type}"]`).classList.add('active');
        populateCategories(type);
    }

    function populateCategories(type) {
        const sel = $('#tx-category');
        sel.innerHTML = '<option value="">Seleccionar...</option>';
        let cats = [];

        if (type === 'income') {
            cats = [...Categories.income];
        } else if (type === 'savings') {
            // Base savings categories (excluding the generic 'savings_goal')
            cats = (Categories.savings || []).filter(c => c.id !== 'savings_goal');
            // Add actual user goals
            const goals = Store.getGoals().filter(g => g.type === 'savings');
            goals.forEach(g => {
                cats.push({ id: g.id, name: g.name, emoji: '🎯', color: '#A78BFA' });
            });
        } else {
            cats = [...Categories.expense];
        }

        cats.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = `${c.emoji} ${c.name}`;
            sel.appendChild(o);
        });

        const filterSel = $('#filter-category');
        if (filterSel && filterSel.options && filterSel.options.length <= 1) {
            filterSel.innerHTML = '<option value="">Todas las Categorías</option>';
            Categories.all.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.emoji} ${c.name}`; filterSel.appendChild(o); });
        }

        // Add Manage Option
        const manageOpt = document.createElement('option');
        manageOpt.value = 'manage_categories';
        manageOpt.textContent = '➕ Crear/Editar Categorías...';
        manageOpt.style.fontWeight = 'bold';
        manageOpt.style.color = 'var(--accent)';
        sel.appendChild(manageOpt);
    }

    let aiDebounce;
    function handleDescriptionInput() {
        clearTimeout(aiDebounce);
        aiDebounce = setTimeout(() => {
            const desc = $('#tx-description').value;
            const type = $('.type-btn.active').dataset.type;
            const cat = AI.suggest(desc, type);
            if (cat) {
                $('#ai-suggestion').style.display = 'flex';
                $('#ai-category-suggestion').textContent = `${cat.emoji} ${cat.name}`;
                $('#ai-suggestion').dataset.catId = cat.id;
            } else {
                $('#ai-suggestion').style.display = 'none';
            }
        }, 300);
    }

    function applyAiSuggestion() {
        const catId = $('#ai-suggestion').dataset.catId;
        if (!catId) return;

        // Determine type
        let type = 'expense';
        if (Categories.income.some(c => c.id === catId)) type = 'income';
        else if (Categories.savings.some(c => c.id === catId)) type = 'savings';

        // Switch type if needed
        const currentType = $('.type-btn.active').dataset.type;
        if (currentType !== type) {
            setTransactionType(type);
        }

        $('#tx-category').value = catId;
        $('#ai-suggestion').style.display = 'none';
    }

    function handleTransactionSubmit(e) {
        e.preventDefault();
        const type = $('.type-btn.active').dataset.type;
        const txData = {
            type,
            amount: parseFloat($('#tx-amount').value),
            description: $('#tx-description').value.trim(),
            category: $('#tx-category').value,
            date: $('#tx-date').value || new Date().toISOString().split('T')[0],
            notes: $('#tx-notes').value.trim(),
        };

        // Passive AI Learning
        if (!editingTx) {
            const suggested = AI.suggest(txData.description, txData.type);
            if (!suggested || suggested.id !== txData.category) {
                // If user selected something different (or AI had no idea), save as rule
                if (txData.description && txData.description.length > 2) {
                    Store.addAiRule({ pattern: txData.description.toLowerCase().trim(), categoryId: txData.category });
                }
            }
        }

        if (editingTx) { Store.updateTransaction(editingTx, txData); showToast('Transacción actualizada ✅'); }
        else { Store.addTransaction(txData); showToast('Transacción guardada ✅'); }
        closeTransactionModal();
        renderDashboard();
        if (currentPage === 'transactions') renderAllTransactions();
    }

    // === BUDGETS ===
    function changeBudgetMonth(delta) {
        budgetMonth += delta;
        if (budgetMonth > 11) { budgetMonth = 0; budgetYear++; }
        if (budgetMonth < 0) { budgetMonth = 11; budgetYear--; }
        updateBudgetMonthLabel();
        renderBudgets();
    }

    function updateBudgetMonthLabel() {
        const d = new Date(budgetYear, budgetMonth, 1);
        const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        $('#budget-month-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);
    }

    function renderBudgets() {
        const budgets = Store.getBudgets(budgetYear, budgetMonth);
        const catTotals = Store.getCategoryTotals(budgetYear, budgetMonth);
        const spentMap = {};
        catTotals.forEach(ct => { spentMap[ct.category] = ct.amount; });
        let totalSpent = 0, totalLimit = 0;
        budgets.forEach(b => { totalLimit += b.amount; totalSpent += (spentMap[b.category] || 0); });
        $('#budget-total-spent').textContent = fmtShort(totalSpent);
        $('#budget-total-limit').textContent = fmtShort(totalLimit);
        const totalPct = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0;
        $('#budget-total-progress').style.width = `${totalPct}%`;

        const container = $('#budget-categories');
        if (budgets.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Sin presupuestos definidos</p><span>Hacé clic en "Fijar Presupuesto" para definir límites de gasto</span></div>';
            return;
        }
        container.innerHTML = budgets.map(b => {
            const cat = Categories.getById(b.category);
            const spent = spentMap[b.category] || 0;
            const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
            const over = spent > b.amount;
            const remaining = b.amount - spent;
            return `<div class="card budget-category-card"><div class="budget-cat-header"><span class="budget-cat-icon" style="background:${cat.color}22;color:${cat.color}">${cat.emoji}</span><span class="budget-cat-name">${cat.name}</span><div class="budget-cat-actions"><button class="btn-icon-sm btn-edit-budget" data-cat="${b.category}" title="Editar">✏️</button><button class="btn-icon-sm btn-remove-budget" data-cat="${b.category}" title="Eliminar">🗑️</button></div></div><div class="budget-cat-amounts"><span class="budget-spent">${fmtShort(spent)}</span><span class="budget-sep">/</span><span class="budget-limit">${fmtShort(b.amount)}</span></div><div class="budget-bar"><div class="budget-bar-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${over ? 'var(--danger)' : cat.color}"></div></div><div class="budget-remaining ${over ? 'over' : ''}">${over ? `Excedido por ${fmtShort(Math.abs(remaining))}` : `Quedan ${fmtShort(remaining)}`}</div></div>`;
        }).join('');

        container.querySelectorAll('.btn-edit-budget').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const b = budgets.find(b => b.category === cat);
                if (b) { openBudgetModal(); $('#budget-category').value = cat; $('#budget-amount').value = b.amount; }
            });
        });
        container.querySelectorAll('.btn-remove-budget').forEach(btn => {
            btn.addEventListener('click', () => { Store.removeBudget(btn.dataset.cat, budgetYear, budgetMonth); renderBudgets(); renderDashboard(); });
        });
        renderContextualTips('budget');
    }

    function openBudgetModal() {
        const sel = $('#budget-category');
        sel.innerHTML = '';
        Categories.expense.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.emoji} ${c.name}`; sel.appendChild(o); });
        $('#budget-amount').value = '';
        $('#budget-modal').classList.add('active');
    }
    function closeBudgetModal() { $('#budget-modal').classList.remove('active'); }
    function handleBudgetSubmit(e) {
        e.preventDefault();
        Store.setBudget($('#budget-category').value, parseFloat($('#budget-amount').value), budgetYear, budgetMonth);
        closeBudgetModal();
        renderBudgets();
        renderDashboard();
        showToast('Presupuesto guardado ✅');
    }

    function handleCopyBudget() {
        let toMonth = budgetMonth + 1;
        let toYear = budgetYear;
        if (toMonth > 11) { toMonth = 0; toYear++; }
        const ok = Store.copyBudgetsToMonth(budgetYear, budgetMonth, toYear, toMonth);
        if (ok) {
            budgetMonth = toMonth;
            budgetYear = toYear;
            updateBudgetMonthLabel();
            renderBudgets();
            showToast('Presupuesto copiado al mes siguiente ✅');
        } else {
            showToast('No hay presupuesto para copiar ⚠️');
        }
    }

    // === AI BUDGET ===
    function openAiBudgetModal() {
        $('#ai-budget-modal').classList.add('active');
        switchAiBudgetTab('pattern');
    }
    function closeAiBudgetModal() { $('#ai-budget-modal').classList.remove('active'); aiBudgetData = null; }

    function switchAiBudgetTab(type) {
        $$('.ai-budget-tab').forEach(t => t.classList.remove('active'));
        $(`.ai-budget-tab[data-ai-type="${type}"]`).classList.add('active');
        let result;
        if (type === 'pattern') result = AI.generatePatternBudget();
        else if (type === 'goals') result = AI.generateGoalBudget();
        else result = AI.generateCombinedBudget();
        aiBudgetData = result;
        renderAiBudgetResult(result);
    }

    function renderAiBudgetResult(result) {
        const container = $('#ai-budget-content');
        const actions = $('#ai-budget-actions');
        if (!result.success) {
            container.innerHTML = `<div class="ai-budget-description">⚠️ ${result.message}</div>`;
            actions.style.display = 'none';
            return;
        }
        actions.style.display = 'flex';
        let html = `<h3 style="margin:0 0 var(--space-3)">${result.title}</h3>`;
        html += `<div class="ai-budget-description">${result.description}</div>`;
        html += `<div class="ai-budget-summary"><div class="ai-budget-stat"><div class="ai-budget-stat-label">Presupuesto Total</div><div class="ai-budget-stat-value">${fmtShort(result.totalBudget)}</div></div><div class="ai-budget-stat"><div class="ai-budget-stat-label">Ingreso Promedio</div><div class="ai-budget-stat-value">${fmtShort(result.averageIncome)}</div></div><div class="ai-budget-stat"><div class="ai-budget-stat-label">Ahorro Proyectado</div><div class="ai-budget-stat-value ${result.projectedSavings >= 0 ? 'positive' : 'negative'}">${fmtShort(result.projectedSavings)}</div></div></div>`;
        html += `<div class="ai-budget-items">`;
        result.items.forEach(item => {
            html += `<div class="ai-budget-item"><span class="ai-budget-item-emoji">${item.emoji}</span><div class="ai-budget-item-info"><div class="ai-budget-item-name">${item.name}</div><div class="ai-budget-item-reason">${item.reason}</div></div><div class="ai-budget-item-amounts"><div class="ai-budget-item-suggested">${fmtShort(item.amount)}</div><div class="ai-budget-item-average">Prom: ${fmtShort(item.average)}</div></div></div>`;
        });
        html += `</div>`;
        if (result.goalBreakdown && result.goalBreakdown.length > 0) {
            html += `<div class="ai-budget-goal-breakdown"><div class="ai-budget-goal-title">🎯 Desglose de Objetivos</div>`;
            result.goalBreakdown.forEach(gb => {
                html += `<div class="ai-budget-goal-item"><span>${gb.name} (${gb.monthsLeft} meses)</span><span>${fmtShort(gb.monthlyNeeded)}/mes</span></div>`;
            });
            html += `</div>`;
        }
        container.innerHTML = html;
    }

    function handleApplyAiBudget() {
        if (!aiBudgetData || !aiBudgetData.success) return;
        Store.applyBudgetSet(aiBudgetData.items, budgetYear, budgetMonth);
        closeAiBudgetModal();
        renderBudgets();
        renderDashboard();
        showToast('Presupuesto de IA aplicado ✅');
    }

    // === GOALS ===
    function renderGoals() {
        const goals = Store.getGoals();
        const container = $('#goals-list');
        if (!container) return;

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <h3>Sin Objetivos</h3>
                    <p>Define metas financieras para mantenerte motivado.</p>
                </div>`;
            return;
        }

        const now = new Date();
        container.innerHTML = goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0;
            let deadlineText = 'Sin fecha';
            let deadlineClass = '';

            if (g.deadline) {
                const deadline = new Date(g.deadline + 'T12:00:00');
                if (!isNaN(deadline.getTime())) {
                    const daysLeft = Math.ceil((deadline - now) / 86400000);
                    if (daysLeft < 0) { deadlineClass = 'expired'; deadlineText = 'Vencido'; }
                    else if (daysLeft <= 7) { deadlineClass = 'urgent'; deadlineText = `${daysLeft} días restantes`; }
                    else { deadlineText = `${daysLeft} días restantes`; }
                }
            }

            const pctClass = pct >= 75 ? 'on-track' : (pct >= 40 ? 'behind' : 'over');
            const fillClass = g.type === 'spending' ? (pct > 100 ? 'over' : 'spending') : '';
            const typeLabel = g.type === 'savings' ? 'Objetivo de ahorro' : 'Límite de gasto';
            const iconChar = g.type === 'savings' ? '🏦' : '📉';

            return `
                <div class="card goal-card">
                    <div class="goal-card-header">
                        <div class="goal-card-title">
                            <div class="goal-card-icon ${g.type}"><span>${iconChar}</span></div>
                            <div>
                                <div class="goal-card-name">${g.name}</div>
                                <div class="goal-card-type">${typeLabel}</div>
                            </div>
                        </div>
                        <div class="goal-card-actions">
                            <button class="btn-icon-sm btn-edit-goal" data-id="${g.id}" title="Editar">✏️</button>
                            <button class="btn-icon-sm btn-delete-goal" data-id="${g.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-amounts">
                            <span class="goal-current">${fmtShort(g.currentAmount)}</span>
                            <span class="goal-target">de ${fmtShort(g.targetAmount)}</span>
                        </div>
                        <div class="goal-bar">
                            <div class="goal-bar-fill ${fillClass}" style="width:${pct}%"></div>
                        </div>
                    </div>
                    <div class="goal-footer">
                        <span class="goal-deadline ${deadlineClass}">📅 ${deadlineText}</span>
                        <span class="goal-pct ${pctClass}">${pct}%</span>
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.btn-edit-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = goals.find(g => g.id === btn.dataset.id);
                if (goal) openGoalModal(goal);
            });
        });
        container.querySelectorAll('.btn-delete-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('¿Eliminar este objetivo?')) {
                    Store.deleteGoal(btn.dataset.id);
                    renderGoals();
                    renderDashboard();
                }
            });
        });

        renderContextualTips('goals');
    }

    function openGoalModal(goal = null) {
        editingGoal = goal ? goal.id : null;
        $('#goal-modal-title').textContent = goal ? 'Editar Objetivo' : 'Nuevo Objetivo';
        $('#goal-name').value = goal ? goal.name : '';
        $('#goal-type').value = goal ? goal.type : 'savings';
        $('#goal-target').value = goal ? goal.targetAmount : '';
        $('#goal-current').value = goal ? goal.currentAmount : '';
        $('#goal-deadline').value = goal ? goal.deadline : '';
        // Populate linked category
        const sel = $('#goal-linked-category');
        sel.innerHTML = '<option value="">Ninguna</option>';
        Categories.expense.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.emoji} ${c.name}`; sel.appendChild(o); });
        if (goal && goal.linkedCategory) sel.value = goal.linkedCategory;
        $('#goal-modal').classList.add('active');
    }
    function closeGoalModal() { $('#goal-modal').classList.remove('active'); editingGoal = null; }
    function handleGoalSubmit(e) {
        e.preventDefault();
        const goalData = {
            name: $('#goal-name').value.trim(),
            type: $('#goal-type').value,
            targetAmount: parseFloat($('#goal-target').value),
            currentAmount: parseFloat($('#goal-current').value) || 0,
            deadline: $('#goal-deadline').value || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            linkedCategory: $('#goal-linked-category').value,
        };
        if (editingGoal) { Store.updateGoal(editingGoal, goalData); showToast('Objetivo actualizado ✅'); }
        else { Store.addGoal(goalData); showToast('Objetivo creado ✅'); }
        closeGoalModal();
        renderGoals();
        renderDashboard();
    }

    // === TOAST ===
    function showToast(message) {
        const container = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
    }

    // === ONBOARDING ===
    let onboardingStep = 0;
    function onboardingNext() {
        onboardingStep++;
        $$('.onboarding-step').forEach(s => s.classList.remove('active'));
        $$('.onboarding-dot').forEach(d => d.classList.remove('active'));
        $(`.onboarding-step[data-step="${onboardingStep}"]`).classList.add('active');
        $(`.onboarding-dot[data-step="${onboardingStep}"]`).classList.add('active');
    }
    function onboardingPrev() {
        onboardingStep--;
        $$('.onboarding-step').forEach(s => s.classList.remove('active'));
        $$('.onboarding-dot').forEach(d => d.classList.remove('active'));
        $(`.onboarding-step[data-step="${onboardingStep}"]`).classList.add('active');
        $(`.onboarding-dot[data-step="${onboardingStep}"]`).classList.add('active');
    }
    function setOnboardingTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Store.setSetting('theme', theme);
        $$('.onb-theme-btn').forEach(b => b.classList.remove('active'));
        $(`.onb-theme-btn[data-theme="${theme}"]`).classList.add('active');
    }

    // === CATEGORY MANAGER ===
    function openCategoryModal() {
        $('#category-modal').classList.add('active');
        renderCategoryManager();
        $('#category-form').reset();
    }

    function closeCategoryModal() {
        $('#category-modal').classList.remove('active');
    }

    function renderCategoryManager() {
        const list = $('#custom-cat-list');
        const customs = Store.getCustomCategories();

        if (customs.length === 0) {
            list.innerHTML = '<div class="empty-state-small">No tenés categorías personalizadas.</div>';
            return;
        }

        list.innerHTML = customs.map(c => `
            <div class="custom-cat-item">
                <div class="cat-preview">
                    <span class="cat-dot" style="background:${c.color}"></span>
                    <span>${c.emoji} ${c.name}</span>
                    <span style="font-size:10px; opacity:0.7; border:1px solid currentColor; padding:0 4px; border-radius:4px; margin-left:4px">${c.type === 'expense' ? 'Gasto' : (c.type === 'income' ? 'Ingreso' : 'Ahorro')}</span>
                </div>
                <button type="button" class="btn-icon-sm delete-cat-btn" data-id="${c.id}" title="Eliminar">🗑️</button>
            </div>
        `).join('');

        list.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteCategory(btn.dataset.id));
        });
    }

    function handleNewCategory(e) {
        e.preventDefault();
        const name = $('#cat-name').value.trim();
        const emoji = $('#cat-emoji').value.trim() || '🏷️';
        const type = $('#cat-type').value;
        const color = $('#cat-color').value;

        if (!name) return;

        const id = 'custom_' + Date.now();
        const newCat = { id, name, emoji, type, color };

        Store.addCustomCategory(newCat);
        Categories.loadCustom(Store.getCustomCategories()); // Reload

        renderCategoryManager();
        $('#category-form').reset();
        showToast('Categoría creada ✅');

        // Refresh dropdowns if open
        const currentType = $('.type-btn.active').dataset.type;
        populateCategories(currentType);

        // Auto-select the new category
        const sel = $('#tx-category');
        if (sel) sel.value = newCat.id;

        // Close manager and return to transaction
        closeCategoryModal();
    }

    function handleDeleteCategory(id) {
        if (!confirm('¿Eliminar esta categoría? Se mantendrán las transacciones pero la categoría podría no mostrarse correctamente.')) return;
        Store.deleteCustomCategory(id);
        Categories.loadCustom(Store.getCustomCategories());
        renderCategoryManager();

        const currentType = $('.type-btn.active').dataset.type;
        populateCategories(currentType);
    }
    function finishOnboarding() {
        const name = $('#onb-name').value.trim() || 'Héroe';
        const currency = $('#onb-currency').value;
        Store.setSetting('name', name);
        Store.setSetting('currency', currency);
        Store.setSetting('onboarded', true);
        const balance = parseFloat($('#onb-balance').value);
        if (balance > 0) {
            Store.addTransaction({ type: 'income', description: 'Saldo Inicial', category: 'salary', amount: balance, date: new Date().toISOString().split('T')[0], notes: 'Saldo inicial configurado en el onboarding' });
        }
        $('#onboarding').classList.remove('active');
        renderDashboard();
        populateCategories('expense');
    }

    // === EXPORTS / SEARCH ====
    function initSearchAndExport() {
        safeBind('#search-transactions', 'input', renderAllTransactions);
        safeBind('#filter-category', 'change', renderAllTransactions);
        safeBind('#filter-type', 'change', renderAllTransactions);
        safeBind('#btn-export', 'click', exportCSV);
    }
    function exportCSV() {
        const txs = Store.getTransactions();
        if (txs.length === 0) { showToast('No hay transacciones para exportar'); return; }
        const header = 'Fecha,Tipo,Descripción,Categoría,Monto,Notas\n';
        const rows = txs.map(t => `${t.date},${t.type},\"${t.description}\",${t.category},${t.amount},\"${t.notes || ''}\"`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'budget_hero_transacciones.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exportación descargada ✅');
    }

    // === CALENDAR ===
    function renderCalendar() {
        const label = $('#cal-month-label');
        if (label) label.textContent = CalendarModule.getMonthLabel();
        CalendarModule.renderCalendarGrid('calendar-grid');
        const filterStatus = $('#cal-filter-status');
        CalendarModule.renderDuePaymentsList('due-payments-list', {
            filterStatus: filterStatus ? filterStatus.value : '',
        });
    }

    function renderDashboardDues() {
        CalendarModule.renderDashboardWidget('dashboard-dues-list');
    }


    function openDuePaymentModal(dp = null, day = null, month = null, year = null) {
        editingDue = dp ? dp.id : null;
        $('#due-modal-title').textContent = dp ? 'Editar Vencimiento' : 'Nuevo Vencimiento';
        $('#due-name').value = dp ? dp.name : '';
        $('#due-amount').value = dp ? (dp.amount || '') : '';
        $('#due-notes').value = dp ? (dp.notes || '') : '';

        // Determine the date and set the date input
        const dateInput = $('#due-date');
        if (dp) {
            // Editing: use existing date
            const m = dp.dueMonth !== undefined ? dp.dueMonth : CalendarModule.getMonth();
            const y = dp.dueYear !== undefined ? dp.dueYear : CalendarModule.getYear();
            dateInput.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(dp.dueDay).padStart(2, '0')}`;
        } else if (day !== null && month !== null && year !== null) {
            // Creating from calendar click
            dateInput.value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
            // Fallback: today's date
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Set recurring checkbox
        const recurringCb = $('#due-recurring');
        if (recurringCb) {
            recurringCb.checked = dp ? !!dp.recurring : false;
        }

        // Set icon
        const icon = dp ? (dp.icon || '📄') : '📄';
        $('#due-icon').value = icon;
        document.querySelectorAll('#due-icon-picker .icon-picker-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.icon === icon);
        });
        // Populate category
        const sel = $('#due-category');
        sel.innerHTML = '';
        Categories.expense.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = `${c.emoji} ${c.name}`;
            sel.appendChild(o);
        });
        if (dp && dp.category) sel.value = dp.category;
        else sel.value = 'bills';
        $('#due-payment-modal').classList.add('active');
    }

    function closeDuePaymentModal() {
        $('#due-payment-modal').classList.remove('active');
        editingDue = null;
        $('#due-payment-form').reset();
    }

    function handleDuePaymentSubmit(e) {
        e.preventDefault();
        // Parse date from the date input
        const dateVal = $('#due-date').value;
        const parsedDate = dateVal ? new Date(dateVal + 'T12:00:00') : new Date();
        const dpData = {
            name: $('#due-name').value.trim(),
            icon: $('#due-icon').value || '📄',
            dueDay: parsedDate.getDate(),
            dueMonth: parsedDate.getMonth(),
            dueYear: parsedDate.getFullYear(),
            recurring: $('#due-recurring') ? $('#due-recurring').checked : false,
            amount: parseFloat($('#due-amount').value) || null,
            category: $('#due-category').value,
            notes: $('#due-notes').value.trim(),
        };
        if (editingDue) {
            Store.updateDuePayment(editingDue, dpData);
            showToast('Vencimiento actualizado ✅');
        } else {
            Store.addDuePayment(dpData);
            showToast('Vencimiento creado ✅');
        }
        closeDuePaymentModal();
        renderCalendar();
        renderDashboard();
    }
    // ---- EBOOK BANNERS ----
    function dismissBanner(bannerId) {
        const el = document.getElementById('ebook-banner-' + bannerId);
        if (el) {
            el.style.transition = 'opacity 0.3s, max-height 0.3s, margin 0.3s, padding 0.3s';
            el.style.opacity = '0';
            el.style.maxHeight = '0';
            el.style.marginBottom = '0';
            el.style.paddingTop = '0';
            el.style.paddingBottom = '0';
            el.style.overflow = 'hidden';
            setTimeout(() => { el.style.display = 'none'; }, 300);
        }
        const dismissed = JSON.parse(localStorage.getItem('bh_dismissed_banners') || '[]');
        if (!dismissed.includes(bannerId)) {
            dismissed.push(bannerId);
            localStorage.setItem('bh_dismissed_banners', JSON.stringify(dismissed));
        }
    }

    function initBanners() {
        const dismissed = JSON.parse(localStorage.getItem('bh_dismissed_banners') || '[]');
        dismissed.forEach(id => {
            const el = document.getElementById('ebook-banner-' + id);
            if (el) el.style.display = 'none';
        });
    }

    // Boot
    document.addEventListener('DOMContentLoaded', () => { init(); initSearchAndExport(); populateCategories('expense'); initBanners(); });

    return { onboardingNext, onboardingPrev, setOnboardingTheme, finishOnboarding, showToast, renderDashboard, openDuePaymentModal, dismissBanner };
})();
