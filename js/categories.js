/**
 * categories.js — Definiciones de categorías para Budget Hero
 */

const Categories = (() => {
    const defaults = {
        expense: [
            { id: 'food', name: 'Comida y Restaurantes', emoji: '🍔', color: '#FB7185' },
            { id: 'supermarket', name: 'Supermercado', emoji: '🛒', color: '#F97316' },
            { id: 'kids', name: 'Hijos y Escuela', emoji: '👦', color: '#38BDF8' },
            { id: 'housing', name: 'Vivienda', emoji: '🏠', color: '#C084FC' },
            { id: 'transport', name: 'Transporte', emoji: '🚗', color: '#2DD4BF' },
            { id: 'shopping', name: 'Compras', emoji: '🛍️', color: '#E879F9' },
            { id: 'entertainment', name: 'Entretenimiento', emoji: '🎬', color: '#FBBF24' },
            { id: 'bills', name: 'Cuentas y Servicios', emoji: '📄', color: '#60A5FA' },
            { id: 'health', name: 'Salud y Bienestar', emoji: '💊', color: '#A78BFA' },
            { id: 'education', name: 'Educación', emoji: '📚', color: '#34D399' },
            { id: 'personal', name: 'Mi momento', emoji: '💆', color: '#F9A8D4' },
            { id: 'pets', name: 'Mascotas', emoji: '🐾', color: '#FB923C' },
            { id: 'other', name: 'Otros', emoji: '📦', color: '#94A3B8' },
        ],
        income: [
            { id: 'salary', name: 'Salario', emoji: '💰', color: '#6EE7B7' },
            { id: 'freelance', name: 'Freelance', emoji: '💻', color: '#818CF8' },
            { id: 'investment', name: 'Inversiones', emoji: '📈', color: '#FDE68A' },
            { id: 'gift', name: 'Regalos', emoji: '🎁', color: '#FB923C' },
            { id: 'other_income', name: 'Otros Ingresos', emoji: '💵', color: '#94A3B8' },
        ],
        savings: [
            { id: 'general_savings', name: 'Ahorro General', emoji: '🏦', color: '#67E8F9' },
            { id: 'emergency_fund', name: 'Fondo de Emergencia', emoji: '🛡️', color: '#F472B6' },
            { id: 'savings_goal', name: 'Meta Específica', emoji: '🎯', color: '#A78BFA' },
        ]
    };

    let custom = [];

    function getAll() {
        return [
            ...defaults.expense,
            ...defaults.income,
            ...defaults.savings,
            ...custom
        ];
    }

    return {
        // Expose defaults if needed
        defaults,

        // Merged Lists (Getters)
        get expense() { return [...defaults.expense, ...custom.filter(c => c.type === 'expense')]; },
        get income() { return [...defaults.income, ...custom.filter(c => c.type === 'income')]; },
        get savings() { return [...defaults.savings, ...custom.filter(c => c.type === 'savings')]; },

        get all() { return getAll(); },

        loadCustom(cats) {
            custom = cats || [];
        },

        getById(id) {
            return getAll().find(c => c.id === id) || { id: 'other', name: 'Otros', emoji: '📦', color: '#94A3B8' };
        },

        getForType(type) {
            if (type === 'income') return this.income;
            if (type === 'savings') return this.savings;
            return this.expense;
        },
    };
})();
