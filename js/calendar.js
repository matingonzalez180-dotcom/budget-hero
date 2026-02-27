/**
 * calendar.js — Calendar rendering & due payment management for Budget Hero
 */

const CalendarModule = (() => {
    let calYear, calMonth;

    // Service icon suggestions by keyword
    const iconMap = {
        'luz': '💡', 'light': '💡', 'electricidad': '💡', 'eléctrica': '💡', 'edesur': '💡', 'edenor': '💡',
        'gas': '🔥', 'gasnor': '🔥', 'metrogas': '🔥',
        'agua': '💧', 'water': '💧', 'aysa': '💧',
        'alquiler': '🏠', 'rent': '🏠', 'expensas': '🏠', 'vivienda': '🏠',
        'internet': '🌐', 'wifi': '🌐', 'fibertel': '🌐', 'telecentro': '🌐',
        'teléfono': '📱', 'telefono': '📱', 'celular': '📱', 'phone': '📱', 'movistar': '📱', 'claro': '📱', 'personal': '📱',
        'tarjeta': '💳', 'visa': '💳', 'mastercard': '💳', 'amex': '💳', 'crédito': '💳', 'credito': '💳',
        'netflix': '📺', 'spotify': '🎵', 'youtube': '📺', 'disney': '📺', 'hbo': '📺', 'amazon': '📺', 'streaming': '📺',
        'seguro': '🛡️', 'insurance': '🛡️',
        'gimnasio': '🏋️', 'gym': '🏋️',
        'colegio': '📚', 'escuela': '📚', 'universidad': '📚', 'cuota': '📚',
        'obra social': '🏥', 'prepaga': '🏥', 'medicina': '🏥',
        'impuesto': '🏛️', 'abl': '🏛️', 'municipal': '🏛️',
    };

    const alertComments = {
        overdue: [
            '⚠️ ¡Ojo! Este pago venció. Pagalo hoy para no sumar recargos que te complican el mes.',
            '🔴 Pago atrasado. Cada día de atraso puede generar intereses que no necesitás.',
            '⏰ ¡No te olvides! Sacate este peso de encima y seguí tranquila.',
        ],
        upcoming: [
            '💡 Se viene este vencimiento. Separá la plata ahora y sacátelo de encima tranquila.',
            '🎯 Tip: Pagá antes del vencimiento y mantenete al día sin estrés.',
            '✅ Casi es hora. ¡Pagarlo a tiempo es un logro más para tu tranquilidad!',
        ],
        paid: [
            '🏆 ¡Pagado! Una menos de la lista. Cada cuenta al día es un peso menos de estrés.',
            '✨ ¡Genial! Pagaste a tiempo. Eso es disciplina financiera pura 💪',
            '🛡️ Pago registrado. ¡Seguí así, sos una genia!',
        ],
    };

    function suggestIcon(name) {
        const lower = (name || '').toLowerCase();
        for (const [keyword, icon] of Object.entries(iconMap)) {
            if (lower.includes(keyword)) return icon;
        }
        return '📄';
    }

    function getAlertComment(status) {
        const pool = alertComments[status] || alertComments.upcoming;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function init() {
        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
    }

    function changeMonth(delta) {
        calMonth += delta;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        if (calMonth < 0) { calMonth = 11; calYear--; }
    }

    function getMonthLabel() {
        const d = new Date(calYear, calMonth, 1);
        const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    function renderCalendarGrid(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const duePayments = Store.getDuePaymentsForMonth(calYear, calMonth);
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Monday = 0 ... Sunday = 6
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const today = new Date();
        const todayDate = today.getDate();
        const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;

        let html = '<div class="calendar-weekdays">';
        ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(d => {
            html += `<div class="calendar-weekday">${d}</div>`;
        });
        html += '</div><div class="calendar-days">';

        // Empty cells before first day
        for (let i = 0; i < startDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === todayDate;
            const duesForDay = duePayments.filter(dp => dp.dueDay === day);
            let dayClass = 'calendar-day clickable';
            if (isToday) dayClass += ' today';

            html += `<div class="${dayClass}" data-day="${day}" data-month="${calMonth}" data-year="${calYear}">`;
            html += `<span class="calendar-day-number">${day}</span>`;

            if (duesForDay.length > 0) {
                html += '<div class="calendar-day-icons">';
                duesForDay.forEach(dp => {
                    const status = Store.getDuePaymentStatus(dp, calYear, calMonth);
                    if (status !== 'hidden') {
                        html += `<span class="calendar-due-icon due-status-${status}" title="${dp.name} — ${status === 'paid' ? 'Pagado' : status === 'overdue' ? 'Vencido' : status === 'upcoming' ? 'Próximo' : 'Pendiente'}" data-id="${dp.id}">${dp.icon || '📄'}</span>`;
                    }
                });
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // Add click handlers on day cells to create new due payment
        container.querySelectorAll('.calendar-day.clickable').forEach(cell => {
            cell.addEventListener('click', (e) => {
                // Don't trigger if clicking on an existing due icon
                if (e.target.closest('.calendar-due-icon')) return;
                const day = parseInt(cell.dataset.day);
                const month = parseInt(cell.dataset.month);
                const year = parseInt(cell.dataset.year);
                if (typeof App !== 'undefined' && App.openDuePaymentModal) {
                    App.openDuePaymentModal(null, day, month, year);
                }
            });
        });
    }

    function renderDuePaymentsList(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const duePayments = Store.getDuePaymentsForMonth(calYear, calMonth);
        const filterStatus = options.filterStatus || '';
        const filterName = options.filterName || '';

        let filtered = duePayments.map(dp => ({
            ...dp,
            status: Store.getDuePaymentStatus(dp, calYear, calMonth),
        })).filter(dp => dp.status !== 'hidden');

        if (filterStatus) {
            filtered = filtered.filter(dp => dp.status === filterStatus);
        }
        if (filterName) {
            const q = filterName.toLowerCase();
            filtered = filtered.filter(dp => dp.name.toLowerCase().includes(q));
        }

        // Sort: overdue first, then upcoming, then pending, then paid
        const statusOrder = { overdue: 0, upcoming: 1, pending: 2, paid: 3 };
        filtered.sort((a, b) => (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2) || a.dueDay - b.dueDay);

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state-small">No hay vencimientos para este mes</div>';
            return;
        }

        container.innerHTML = filtered.map(dp => {
            const statusLabel = { paid: 'Pagado ✅', overdue: 'Vencido 🔴', upcoming: 'Próximo 🟡', pending: 'Pendiente' }[dp.status] || 'Pendiente';
            const cat = typeof Categories !== 'undefined' ? Categories.getById(dp.category) : { emoji: '📄', name: dp.category };
            const payment = dp.payments && dp.payments[`${calYear}-${String(calMonth + 1).padStart(2, '0')}`];
            const aiComment = getAlertComment(dp.status);

            return `
                <div class="due-payment-card due-status-${dp.status}">
                    <div class="due-card-header">
                        <div class="due-card-info">
                            <span class="due-card-icon">${dp.icon || '📄'}</span>
                            <div>
                                <div class="due-card-name">${dp.name}</div>
                                <div class="due-card-meta">${cat.emoji} ${cat.name} · Día ${dp.dueDay}${dp.recurring ? ' · 🔄 Recurrente' : ''}</div>
                            </div>
                        </div>
                        <div class="due-card-right">
                            <span class="due-card-amount">${dp.amount ? '$' + dp.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '—'}</span>
                            <span class="due-status-badge status-${dp.status}">${statusLabel}</span>
                        </div>
                    </div>
                    <div class="due-card-ai-comment">🤖 ${aiComment}</div>
                    <div class="due-card-actions">
                        ${dp.status !== 'paid'
                    ? `<button class="btn-mark-paid" data-id="${dp.id}" title="Marcar como pagado">✅ Marcar Pagado</button>`
                    : `<button class="btn-unmark-paid" data-id="${dp.id}" title="Desmarcar pago">↩️ Deshacer Pago</button>`
                }
                        <button class="btn-icon-sm btn-edit-due" data-id="${dp.id}" title="Editar">✏️</button>
                        <button class="btn-icon-sm btn-delete-due" data-id="${dp.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind actions
        container.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.addEventListener('click', () => {
                const dp = Store.getDuePayments().find(d => d.id === btn.dataset.id);
                if (dp) {
                    Store.markDuePaid(dp.id, calYear, calMonth, dp.amount);
                    if (typeof App !== 'undefined' && App.showToast) App.showToast('Pago registrado ✅ — Transacción creada');
                    renderCalendarGrid('calendar-grid');
                    renderDuePaymentsList('due-payments-list');
                    if (typeof App !== 'undefined' && App.renderDashboard) App.renderDashboard();
                }
            });
        });

        container.querySelectorAll('.btn-unmark-paid').forEach(btn => {
            btn.addEventListener('click', () => {
                Store.unmarkDuePaid(btn.dataset.id, calYear, calMonth);
                if (typeof App !== 'undefined' && App.showToast) App.showToast('Pago desmarcado ↩️ — Transacción eliminada');
                renderCalendarGrid('calendar-grid');
                renderDuePaymentsList('due-payments-list');
                if (typeof App !== 'undefined' && App.renderDashboard) App.renderDashboard();
            });
        });

        container.querySelectorAll('.btn-edit-due').forEach(btn => {
            btn.addEventListener('click', () => {
                const dp = Store.getDuePayments().find(d => d.id === btn.dataset.id);
                if (dp && typeof App !== 'undefined' && App.openDuePaymentModal) {
                    App.openDuePaymentModal(dp);
                }
            });
        });

        container.querySelectorAll('.btn-delete-due').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('¿Eliminar este vencimiento?')) {
                    Store.deleteDuePayment(btn.dataset.id);
                    if (typeof App !== 'undefined' && App.showToast) App.showToast('Vencimiento eliminado 🗑️');
                    renderCalendarGrid('calendar-grid');
                    renderDuePaymentsList('due-payments-list');
                }
            });
        });
    }

    function renderDashboardWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const duePayments = Store.getDuePaymentsForMonth(year, month);

        // Get upcoming and overdue payments for current month
        const alerts = duePayments
            .map(dp => ({ ...dp, status: Store.getDuePaymentStatus(dp, year, month) }))
            .filter(dp => dp.status === 'overdue' || dp.status === 'upcoming')
            .sort((a, b) => {
                const order = { overdue: 0, upcoming: 1 };
                return (order[a.status] || 2) - (order[b.status] || 2) || a.dueDay - b.dueDay;
            });

        const widget = container.closest('.dashboard-dues-card') || container.parentElement;
        if (alerts.length === 0) {
            if (widget) widget.style.display = 'none';
            return;
        }
        if (widget) widget.style.display = '';

        container.innerHTML = alerts.slice(0, 5).map(dp => {
            const aiComment = getAlertComment(dp.status);
            const statusClass = dp.status === 'overdue' ? 'alert-overdue' : 'alert-upcoming';
            return `
                <div class="due-alert ${statusClass}">
                    <div class="due-alert-header">
                        <span class="due-alert-icon">${dp.icon || '📄'}</span>
                        <div class="due-alert-info">
                            <span class="due-alert-name">${dp.name}</span>
                            <span class="due-alert-date">Día ${dp.dueDay} · ${dp.amount ? '$' + dp.amount.toLocaleString('es-AR') : ''}</span>
                        </div>
                        <span class="due-alert-badge badge-${dp.status}">${dp.status === 'overdue' ? '🔴 Vencido' : '🟡 Próximo'}</span>
                    </div>
                    <div class="due-alert-comment">🤖 ${aiComment}</div>
                </div>
            `;
        }).join('');
    }

    return {
        init,
        changeMonth,
        getMonthLabel,
        getYear: () => calYear,
        getMonth: () => calMonth,
        renderCalendarGrid,
        renderDuePaymentsList,
        renderDashboardWidget,
        suggestIcon,
        getAlertComment,
    };
})();
