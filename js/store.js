/**
 * store.js — LocalStorage-backed data store for Budget Hero
 */

const Store = (() => {
    const STORAGE_KEY = 'budget_hero_data';

    const defaultData = () => ({
        transactions: [],
        budgets: {},      // monthly budgets keyed by "YYYY-MM" → [{category, amount}]
        goals: [],        // financial goals
        duePayments: [],  // recurring payment due dates
        settings: {
            theme: 'dark',
            currency: 'USD',
            customCategories: [],
            aiRules: []
        },
    });

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultData();
            const parsed = JSON.parse(raw);


            // Migrate old array-based budgets → monthly object
            if (Array.isArray(parsed.budgets)) {
                const now = new Date();
                const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const oldBudgets = parsed.budgets;
                parsed.budgets = {};
                if (oldBudgets.length > 0) parsed.budgets[key] = oldBudgets;
            }
            // Ensure duePayments array exists (migration)
            if (!parsed.duePayments) parsed.duePayments = [];
            return { ...defaultData(), ...parsed, budgets: parsed.budgets || {}, duePayments: parsed.duePayments || [] };
        } catch {
            return defaultData();
        }
    }

    function save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }

    let data = load();
    const listeners = new Set();

    function notify() {
        listeners.forEach(fn => fn(data));
    }

    // ---- Helpers ----
    function monthKey(year, month) {
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }

    function getDateRange(period) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let from, to;
        switch (period) {
            case 'day':
                from = to = todayStr;
                break;
            case 'week': {
                const d = new Date(now);
                const day = d.getDay();
                // Fix for Sunday (0) to behave as end of week or adjust to Monday
                // Using Monday as start
                const diff = day === 0 ? 6 : day - 1;
                d.setDate(d.getDate() - diff);
                from = d.toISOString().split('T')[0];
                to = todayStr;
                break;
            }
            case 'month':
                from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                to = todayStr;
                break;
            case 'year':
                from = `${now.getFullYear()}-01-01`;
                to = todayStr;
                break;
            default:
                from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                to = todayStr;
        }
        return { from, to };
    }

    return {
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        getData() {
            return data;
        },

        // ---- Transactions ----
        addTransaction(tx) {
            tx.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
            tx.createdAt = new Date().toISOString();
            // Sanitize input
            tx.date = tx.date || new Date().toISOString().split('T')[0];
            tx.amount = parseFloat(tx.amount) || 0;

            data.transactions.unshift(tx);

            // Update linked goal if savings
            if (tx.type === 'savings' && data.goals) {
                const goal = data.goals.find(g => g.id === tx.category);
                if (goal) {
                    goal.currentAmount = (goal.currentAmount || 0) + tx.amount;
                }
            }

            save(data);
            notify();
            return tx;
        },

        updateTransaction(id, updates) {
            const idx = data.transactions.findIndex(t => t.id === id);
            if (idx === -1) return null;
            const oldTx = data.transactions[idx];

            // Revert linked goal impact of old transaction
            if (oldTx.type === 'savings' && data.goals) {
                const oldGoal = data.goals.find(g => g.id === oldTx.category);
                if (oldGoal) {
                    oldGoal.currentAmount = (oldGoal.currentAmount || 0) - oldTx.amount;
                }
            }

            const updatedTx = { ...oldTx, ...updates };
            // Sanitize update
            if (updatedTx.amount !== undefined) updatedTx.amount = parseFloat(updatedTx.amount) || 0;
            if (updatedTx.date === undefined || updatedTx.date === '') updatedTx.date = new Date().toISOString().split('T')[0];

            data.transactions[idx] = updatedTx;

            // Apply linked goal impact of new transaction
            if (updatedTx.type === 'savings' && data.goals) {
                const newGoal = data.goals.find(g => g.id === updatedTx.category);
                if (newGoal) {
                    newGoal.currentAmount = (newGoal.currentAmount || 0) + updatedTx.amount;
                }
            }

            save(data);
            notify();
            return updatedTx;
        },

        deleteTransaction(id) {
            const idx = data.transactions.findIndex(t => t.id === id);
            if (idx === -1) return false;

            const tx = data.transactions[idx];
            // Revert linked goal impact
            if (tx.type === 'savings' && data.goals) {
                const goal = data.goals.find(g => g.id === tx.category);
                if (goal) {
                    goal.currentAmount = (goal.currentAmount || 0) - tx.amount;
                }
            }

            data.transactions.splice(idx, 1);
            save(data);
            notify();
            return true;
        },

        getTransactions(filters = {}) {
            let txs = [...(data.transactions || [])];

            try {
                if (filters.type) {
                    txs = txs.filter(t => t.type === filters.type);
                }
                if (filters.category) {
                    txs = txs.filter(t => t.category === filters.category);
                }
                if (filters.search) {
                    const q = filters.search.toLowerCase();
                    txs = txs.filter(t =>
                        (t.description && t.description.toLowerCase().includes(q)) ||
                        (t.notes && t.notes.toLowerCase().includes(q)) ||
                        (t.category && t.category.toLowerCase().includes(q))
                    );
                }
                if (filters.from) {
                    txs = txs.filter(t => t.date && t.date >= filters.from);
                }
                if (filters.to) {
                    txs = txs.filter(t => t.date && t.date <= filters.to);
                }

                // Sort by date descending, then by createdAt descending
                txs.sort((a, b) => {
                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    const dd = dateB.localeCompare(dateA);
                    if (dd !== 0) return dd;
                    const createdA = a.createdAt || '';
                    const createdB = b.createdAt || '';
                    return createdB.localeCompare(createdA);
                });
            } catch (err) {
                console.error('Error filtering transactions', err);
            }

            return txs;
        },

        // ---- Budgets (Monthly) ----
        setBudget(category, amount, year, month) {
            if (year === undefined || month === undefined) {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
            }
            const key = monthKey(year, month);
            if (!data.budgets[key]) data.budgets[key] = [];
            const existing = data.budgets[key].find(b => b.category === category);
            if (existing) {
                existing.amount = amount;
            } else {
                data.budgets[key].push({ category, amount });
            }
            save(data);
            notify();
        },

        removeBudget(category, year, month) {
            if (year === undefined || month === undefined) {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
            }
            const key = monthKey(year, month);
            if (data.budgets[key]) {
                data.budgets[key] = data.budgets[key].filter(b => b.category !== category);
                if (data.budgets[key].length === 0) delete data.budgets[key];
            }
            save(data);
            notify();
        },

        getBudgets(year, month) {
            if (year === undefined || month === undefined) {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
            }
            const key = monthKey(year, month);
            return [...(data.budgets[key] || [])];
        },

        copyBudgetsToMonth(fromYear, fromMonth, toYear, toMonth) {
            const fromKey = monthKey(fromYear, fromMonth);
            const toKey = monthKey(toYear, toMonth);
            const source = data.budgets[fromKey];
            if (!source || source.length === 0) return false;
            data.budgets[toKey] = source.map(b => ({ ...b }));
            save(data);
            notify();
            return true;
        },

        applyBudgetSet(budgetArray, year, month) {
            if (year === undefined || month === undefined) {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth();
            }
            const key = monthKey(year, month);
            data.budgets[key] = budgetArray.map(b => ({ category: b.category, amount: b.amount }));
            save(data);
            notify();
        },

        // ---- Goals ----
        addGoal(goal) {
            goal.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
            goal.createdAt = new Date().toISOString();
            goal.currentAmount = goal.currentAmount || 0;
            if (!data.goals) data.goals = [];
            data.goals.push(goal);
            save(data);
            notify();
            return goal;
        },

        updateGoal(id, updates) {
            if (!data.goals) return null;
            const idx = data.goals.findIndex(g => g.id === id);
            if (idx === -1) return null;
            data.goals[idx] = { ...data.goals[idx], ...updates };
            save(data);
            notify();
            return data.goals[idx];
        },

        deleteGoal(id) {
            if (!data.goals) return;
            data.goals = data.goals.filter(g => g.id !== id);
            save(data);
            notify();
        },

        getGoals() {
            return [...(data.goals || [])];
        },

        // ---- Settings ----
        getSettings() { return data.settings; },
        getSetting(key) { return data.settings[key]; },
        setSetting(key, value) {
            data.settings[key] = value;
            save(data);
            notify();
        },

        // ---- Custom Categories ----
        getCustomCategories() {
            return data.settings.customCategories || [];
        },
        addCustomCategory(cat) {
            if (!data.settings.customCategories) data.settings.customCategories = [];
            data.settings.customCategories.push(cat);
            save(data);
            notify();
        },
        deleteCustomCategory(id) {
            if (!data.settings.customCategories) return;
            data.settings.customCategories = data.settings.customCategories.filter(c => c.id !== id);
            save(data);
            notify();
        },

        // ---- AI Rules ----
        getAiRules() {
            return data.settings.aiRules || [];
        },
        addAiRule(rule) { // { pattern, categoryId }
            if (!data.settings.aiRules) data.settings.aiRules = [];
            // Remove existing rule for same pattern if exists
            data.settings.aiRules = data.settings.aiRules.filter(r => r.pattern !== rule.pattern);
            data.settings.aiRules.push(rule);
            save(data);
        },

        // ---- Due Payments (Calendar) ----
        addDuePayment(dp) {
            dp.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
            dp.createdAt = new Date().toISOString();
            dp.payments = dp.payments || {};
            dp.recurrence = dp.recurrence || 'monthly';
            if (!data.duePayments) data.duePayments = [];
            data.duePayments.push(dp);
            save(data);
            notify();
            return dp;
        },

        updateDuePayment(id, updates) {
            if (!data.duePayments) return null;
            const idx = data.duePayments.findIndex(d => d.id === id);
            if (idx === -1) return null;
            data.duePayments[idx] = { ...data.duePayments[idx], ...updates };
            save(data);
            notify();
            return data.duePayments[idx];
        },

        deleteDuePayment(id) {
            if (!data.duePayments) return;
            data.duePayments = data.duePayments.filter(d => d.id !== id);
            save(data);
            notify();
        },

        getDuePayments() {
            return [...(data.duePayments || [])];
        },

        markDuePaid(id, year, month, paidAmount) {
            if (!data.duePayments) return null;
            const dp = data.duePayments.find(d => d.id === id);
            if (!dp) return null;
            const key = monthKey(year, month);
            const amount = paidAmount || dp.amount || 0;
            // Create an expense transaction
            const tx = this.addTransaction({
                type: 'expense',
                description: `Pago: ${dp.name}`,
                category: dp.category || 'bills',
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                notes: `Pago registrado desde calendario de vencimientos`,
            });
            if (!dp.payments) dp.payments = {};
            dp.payments[key] = {
                paidDate: new Date().toISOString().split('T')[0],
                amount: amount,
                txId: tx.id,
            };
            save(data);
            notify();
            return dp;
        },

        unmarkDuePaid(id, year, month) {
            if (!data.duePayments) return null;
            const dp = data.duePayments.find(d => d.id === id);
            if (!dp || !dp.payments) return null;
            const key = monthKey(year, month);
            const payment = dp.payments[key];
            if (!payment) return null;
            // Delete the linked transaction
            if (payment.txId) {
                this.deleteTransaction(payment.txId);
            }
            delete dp.payments[key];
            save(data);
            notify();
            return dp;
        },

        getDuePaymentStatus(dp, year, month) {
            const key = monthKey(year, month);
            if (dp.payments && dp.payments[key]) return 'paid';
            const now = new Date();
            const dueDate = new Date(year, month, dp.dueDay);
            const diffDays = Math.ceil((dueDate - now) / 86400000);
            if (now.getFullYear() === year && now.getMonth() === month) {
                if (diffDays < 0) return 'overdue';
                if (diffDays <= 3) return 'upcoming';
            } else if (dueDate < now) {
                return 'overdue';
            }
            return 'pending';
        },

        // ---- Analytics ----
        getMonthlyTotals(year, month) {
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            const txs = data.transactions.filter(t => t.date && t.date.startsWith(prefix));

            let income = 0, expenses = 0, savings = 0;
            txs.forEach(t => {
                if (t.type === 'income') income += t.amount;
                else if (t.type === 'savings') savings += t.amount;
                else expenses += t.amount;
            });

            return { income, expenses, savings, net: income - expenses };
        },

        getTotalsForRange(from, to) {
            const txs = data.transactions.filter(t => t.date && t.date >= from && t.date <= to);
            let income = 0, expenses = 0, savings = 0;
            txs.forEach(t => {
                if (t.type === 'income') income += t.amount;
                else if (t.type === 'savings') savings += t.amount;
                else expenses += t.amount;
            });
            return { income, expenses, savings, net: income - expenses };
        },

        getTotalsForPeriod(period) {
            const { from, to } = getDateRange(period);
            return this.getTotalsForRange(from, to);
        },

        getDateRangeForPeriod(period) {
            return getDateRange(period);
        },

        getCategoryTotals(year, month) {
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            const txs = data.transactions.filter(t => t.date && t.date.startsWith(prefix) && t.type === 'expense');

            const totals = {};
            txs.forEach(t => {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            });

            return Object.entries(totals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);
        },

        getCategoryTotalsForRange(from, to, type = 'expense') {
            const txs = data.transactions.filter(t => t.date && t.date >= from && t.date <= to && t.type === type);
            const totals = {};
            txs.forEach(t => {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            });
            return Object.entries(totals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);
        },

        getCategoryTotalsForPeriod(period, type = 'expense') {
            const { from, to } = getDateRange(period);
            return this.getCategoryTotalsForRange(from, to, type);
        },

        getIncomeCategoryTotals(year, month) {
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            const txs = data.transactions.filter(t => t.date && t.date.startsWith(prefix) && t.type === 'income');
            const totals = {};
            txs.forEach(t => {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            });
            return Object.entries(totals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);
        },

        getSavingsCategoryTotals(year, month) {
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            const txs = data.transactions.filter(t => t.date && t.date.startsWith(prefix) && t.type === 'savings');

            const totals = {};
            txs.forEach(t => {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            });

            return Object.entries(totals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);
        },

        getDailyTotals(days) {
            const now = new Date();
            const result = [];

            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];

                let income = 0, expense = 0;
                data.transactions.forEach(t => {
                    if (t.date === dateStr) {
                        if (t.type === 'income') income += t.amount;
                        else if (t.type === 'expense') expense += t.amount;
                    }
                });

                result.push({ date: dateStr, income, expense });
            }

            return result;
        },

        getDailyTotalsForPeriod(period) {
            const { from, to } = getDateRange(period);
            const start = new Date(from + 'T12:00:00');
            const end = new Date(to + 'T12:00:00');
            const result = [];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                let income = 0, expense = 0;
                data.transactions.forEach(t => {
                    if (t.date === dateStr) {
                        if (t.type === 'income') income += t.amount;
                        else if (t.type === 'expense') expense += t.amount;
                    }
                });
                result.push({ date: dateStr, income, expense });
            }
            return result;
        },

        getTotalBalance() {
            let income = 0, expenses = 0, savings = 0;
            data.transactions.forEach(t => {
                if (t.type === 'income') income += t.amount;
                else if (t.type === 'savings') savings += t.amount;
                else expenses += t.amount;
            });
            const total = income - expenses;
            return { total, savings, operational: total - savings };
        },

        getMultiMonthCategoryAverages(months) {
            const now = new Date();
            const categoryTotals = {};
            const categoryCounts = {};

            for (let i = 1; i <= months; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const year = d.getFullYear();
                const month = d.getMonth();
                const totals = this.getCategoryTotals(year, month);
                totals.forEach(ct => {
                    categoryTotals[ct.category] = (categoryTotals[ct.category] || 0) + ct.amount;
                    categoryCounts[ct.category] = (categoryCounts[ct.category] || 0) + 1;
                });
            }

            return Object.entries(categoryTotals)
                .map(([category, total]) => ({
                    category,
                    average: total / Math.max(categoryCounts[category], 1),
                    total,
                    monthsWithData: categoryCounts[category],
                }))
                .sort((a, b) => b.average - a.average);
        },

        getMultiMonthIncome(months) {
            const now = new Date();
            let totalIncome = 0;
            let count = 0;
            for (let i = 1; i <= months; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const totals = this.getMonthlyTotals(d.getFullYear(), d.getMonth());
                totalIncome += totals.income;
                if (totals.income > 0) count++;
            }
            return { totalIncome, averageIncome: count > 0 ? totalIncome / count : 0, monthsWithIncome: count };
        },

        // ---- Demo Data ----
        loadDemoData() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            const demoTransactions = [
                { type: 'income', description: 'Salario Mensual', category: 'salary', amount: 5200, date: `${year}-${String(month + 1).padStart(2, '0')}-01`, notes: '' },
                { type: 'income', description: 'Cuota Alimentaria', category: 'salary', amount: 800, date: `${year}-${String(month + 1).padStart(2, '0')}-05`, notes: '' },
                { type: 'expense', description: 'Pago de Alquiler', category: 'housing', amount: 1400, date: `${year}-${String(month + 1).padStart(2, '0')}-01`, notes: 'Alquiler mensual' },
                { type: 'expense', description: 'Supermercado Carrefour', category: 'supermarket', amount: 156.43, date: `${year}-${String(month + 1).padStart(2, '0')}-03`, notes: 'Compras de la semana' },
                { type: 'expense', description: 'Colectivo SUBE', category: 'transport', amount: 12.00, date: `${year}-${String(month + 1).padStart(2, '0')}-04`, notes: '' },
                { type: 'expense', description: 'Suscripción Netflix', category: 'entertainment', amount: 15.99, date: `${year}-${String(month + 1).padStart(2, '0')}-05`, notes: 'Plan para los chicos' },
                { type: 'expense', description: 'Kiosco del Cole - Figuritas', category: 'kids', amount: 5.50, date: `${year}-${String(month + 1).padStart(2, '0')}-06`, notes: '' },
                { type: 'expense', description: 'Cuota Colegio', category: 'kids', amount: 350, date: `${year}-${String(month + 1).padStart(2, '0')}-07`, notes: 'Cuota mensual' },
                { type: 'expense', description: 'Antibiótico Farmacia', category: 'health', amount: 24.99, date: `${year}-${String(month + 1).padStart(2, '0')}-08`, notes: 'Fiebre del nene a las 3am' },
                { type: 'expense', description: 'Zapatillas Topper', category: 'kids', amount: 89.00, date: `${year}-${String(month + 1).padStart(2, '0')}-09`, notes: 'Se le agujerearon las viejas' },
                { type: 'expense', description: 'Empanadas Delivery', category: 'food', amount: 32.00, date: `${year}-${String(month + 1).padStart(2, '0')}-10`, notes: 'Viernes sin ganas de cocinar' },
                { type: 'expense', description: 'Factura de Luz', category: 'bills', amount: 95.00, date: `${year}-${String(month + 1).padStart(2, '0')}-11`, notes: '' },
                { type: 'expense', description: 'Viaje en Uber', category: 'transport', amount: 18.50, date: `${year}-${String(month + 1).padStart(2, '0')}-13`, notes: 'Turno del pediatra' },
                { type: 'expense', description: 'Súper Coto', category: 'supermarket', amount: 98.22, date: `${year}-${String(month + 1).padStart(2, '0')}-14`, notes: 'Reponer despensa' },
                { type: 'expense', description: 'Café para mí', category: 'personal', amount: 6.50, date: `${year}-${String(month + 1).padStart(2, '0')}-15`, notes: 'Mi momento de paz' },
                { type: 'expense', description: 'Kiosco del Cole - Alfajor', category: 'kids', amount: 3.00, date: `${year}-${String(month + 1).padStart(2, '0')}-16`, notes: '' },
                { type: 'expense', description: 'Factura de Internet', category: 'bills', amount: 59.99, date: `${year}-${String(month + 1).padStart(2, '0')}-18`, notes: 'Vital para tarea de los chicos' },
                { type: 'expense', description: 'Regalo Cumpleañito', category: 'kids', amount: 25.00, date: `${year}-${String(month + 1).padStart(2, '0')}-19`, notes: 'Compañerito del cole' },
                { type: 'savings', description: 'Ahorro Matafuegos', category: 'emergency_fund', amount: 100, date: `${year}-${String(month + 1).padStart(2, '0')}-01`, notes: 'Fondo de emergencia (Cap. 10)' },
                { type: 'savings', description: 'Ahorro general', category: 'general_savings', amount: 150, date: `${year}-${String(month + 1).padStart(2, '0')}-10`, notes: '' },
            ];

            demoTransactions.forEach(tx => this.addTransaction(tx));

            // Set demo budgets for current month
            this.setBudget('supermarket', 400, year, month);
            this.setBudget('food', 200, year, month);
            this.setBudget('kids', 500, year, month);
            this.setBudget('transport', 80, year, month);
            this.setBudget('entertainment', 50, year, month);
            this.setBudget('bills', 1600, year, month);
            this.setBudget('health', 100, year, month);
            this.setBudget('personal', 50, year, month);

            // Demo goals — aligned with ebook
            this.addGoal({
                name: 'Matafuegos Financiero',
                targetAmount: 500,
                currentAmount: 100,
                deadline: `${year + 1}-06-01`,
                type: 'savings',
                linkedCategory: '',
            });
            this.addGoal({
                name: 'Bajar el changuito un 20%',
                targetAmount: 320,
                currentAmount: 0,
                deadline: `${year}-${String(month + 1).padStart(2, '0')}-28`,
                type: 'spending',
                linkedCategory: 'supermarket',
            });

            // Demo due payments
            const mp = String(month + 1).padStart(2, '0');
            this.addDuePayment({
                name: 'Alquiler',
                icon: '🏠',
                dueDay: 1,
                amount: 1400,
                category: 'housing',
                notes: 'Alquiler mensual del departamento',
                payments: { [`${year}-${mp}`]: { paidDate: `${year}-${mp}-01`, amount: 1400, txId: null } },
            });
            this.addDuePayment({
                name: 'Factura de Luz',
                icon: '💡',
                dueDay: 11,
                amount: 95,
                category: 'bills',
                notes: '',
                payments: { [`${year}-${mp}`]: { paidDate: `${year}-${mp}-11`, amount: 95, txId: null } },
            });
            this.addDuePayment({
                name: 'Cuota Colegio',
                icon: '📚',
                dueDay: 7,
                amount: 350,
                category: 'kids',
                notes: 'Cuota mensual del colegio',
            });
            this.addDuePayment({
                name: 'Factura de Internet',
                icon: '🌐',
                dueDay: 18,
                amount: 59.99,
                category: 'bills',
                notes: 'Vital para tarea de los chicos',
            });
            this.addDuePayment({
                name: 'Netflix',
                icon: '📺',
                dueDay: 5,
                amount: 15.99,
                category: 'entertainment',
                notes: 'Plan para los chicos',
            });
            this.addDuePayment({
                name: 'Gas',
                icon: '🔥',
                dueDay: 20,
                amount: 45,
                category: 'bills',
                notes: '',
            });
            this.addDuePayment({
                name: 'Obra Social',
                icon: '🏥',
                dueDay: 10,
                amount: 120,
                category: 'bills',
                notes: 'Cobertura familiar',
            });
        }
    };
})();


