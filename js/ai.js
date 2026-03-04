/**
 * ai.js — Motor de categorización, insights y generación de presupuestos con IA para Budget Hero
 *
 * En producción llamaría a una API de LLM; por ahora usa
 * coincidencia de palabras clave y análisis de reglas.
 */

const AI = (() => {
    // ---- Category suggestion rules ----
    const rules = [
        // --- FOOD & DRINKS ---
        { keywords: ['coffee', 'starbucks', 'café', 'cafe', 'latte', 'espresso', 'cappuccino', 'pastry', 'bakery', 'cafetería', 'medialuna', 'panadería', 'facturas', 'desayuno', 'merienda', 'mate', 'dunkin', 'restaurant', 'restaurante', 'dinner', 'cena', 'lunch', 'almuerzo', 'brunch', 'pizza', 'sushi', 'burger', 'hamburguesa', 'mcdonald', 'chipotle', 'doordash', 'uber eats', 'rappi', 'pedidosya', 'ifood', 'comida', 'delivery', 'parrilla', 'asado', 'empanada', 'milanesa', 'helado', 'heladería', 'bar', 'cerveza', 'bebida', 'vino', 'snack'], category: 'food' },

        // --- SUPERMARKET (separated for mothers to track the "changuito") ---
        { keywords: ['grocery', 'supermarket', 'supermercado', 'walmart', 'costco', 'trader', 'whole foods', 'market', 'mercado', 'almacén', 'verdulería', 'carnicería', 'fiambrería', 'mayorista', 'coto', 'jumbo', 'disco', 'día', 'changomas', 'vea', 'changuito', 'carrefour', 'makro', 'diarco', 'vital', 'despensa', 'súper', 'super'], category: 'supermarket' },

        // --- KIDS & SCHOOL ---
        { keywords: ['colegio', 'escuela', 'cuota colegio', 'cuota escolar', 'jardín', 'guardería', 'maternal', 'jardín de infantes', 'uniforme', 'mochila', 'útiles', 'útiles escolares', 'carpeta', 'cuaderno', 'lapicera', 'figuritas', 'kiosco del cole', 'golosina', 'golosinas', 'juguete', 'juguetería', 'pañales', 'leche', 'mamadera', 'zapatillas niño', 'ropa niño', 'campera niño', 'cumpleañito', 'regalo cumple', 'fiesta infantil', 'cumpleaños hijo', 'pediatra', 'vacuna niño', 'taller infantil', 'colonia', 'actividad niños'], category: 'kids' },

        // --- HOUSING / VIVIENDA ---
        { keywords: ['alquiler', 'rent', 'arriendo', 'renta', 'expensas', 'consorcio', 'hipoteca', 'mortgage', 'inmobiliaria', 'departamento', 'depto', 'vivienda', 'casa', 'hogar', 'mudanza', 'propiedad', 'alquiler casa', 'alquiler depto', 'cuota vivienda', 'mensual casa', 'condominio', 'administración edificio'], category: 'housing' },

        // --- TRANSPORT ---
        { keywords: ['uber', 'lyft', 'taxi', 'cabify', 'didi', 'beat', 'gas', 'gasolina', 'nafta', 'gnc', 'fuel', 'combustible', 'parking', 'estacionamiento', 'cochera', 'toll', 'peaje', 'metro', 'subte', 'subway', 'bus', 'colectivo', 'bondi', 'train', 'tren', 'flight', 'vuelo', 'avión', 'airline', 'transporte', 'estación', 'sube', 'bicicleta', 'bici', 'ecobici', 'patín', 'monopatín', 'auto', 'coche', 'mecánico', 'taller', 'aceite', 'neumático', 'vtv', 'patente', 'seguro auto', 'multa', 'infracción'], category: 'transport' },

        // --- SHOPPING ---
        { keywords: ['amazon', 'ebay', 'mercadolibre', 'mercado libre', 'target', 'shopping', 'compras', 'clothes', 'ropa', 'zapatillas', 'shoes', 'zapatos', 'headphones', 'auriculares', 'electronics', 'electrónica', 'furniture', 'muebles', 'ikea', 'tech', 'gadget', 'celular nuevo', 'notebook', 'computadora', 'tablet', 'decoración', 'bazar', 'ferretería', 'herramienta', 'shein', 'zara', 'h&m', 'nike', 'adidas', 'indumentaria', 'accesorios', 'reloj', 'lentes', 'anteojos', 'joyas', 'perfume', 'cosmética', 'maquillaje'], category: 'shopping' },

        // --- ENTERTAINMENT ---
        { keywords: ['netflix', 'spotify', 'hulu', 'disney', 'disney+', 'hbo', 'hbo max', 'max', 'paramount', 'star+', 'prime video', 'youtube premium', 'crunchyroll', 'twitch', 'movie', 'película', 'peli', 'cinema', 'cine', 'game', 'juego', 'videojuego', 'playstation', 'ps5', 'xbox', 'nintendo', 'steam', 'concert', 'concierto', 'recital', 'show', 'ticket', 'entrada', 'theater', 'teatro', 'entretenimiento', 'museo', 'parque', 'zoo', 'escape room', 'bowling', 'karaoke', 'fiesta', 'salida', 'boliche', 'club', 'aplicación', 'app store', 'google play', 'suscripción app', 'kiosco'], category: 'entertainment' },

        // --- BILLS & SERVICES ---
        { keywords: ['electric', 'electricidad', 'luz', 'edenor', 'edesur', 'water', 'agua', 'aysa', 'internet', 'wifi', 'fibra', 'phone', 'teléfono', 'celular plan', 'plan datos', 'movistar', 'claro', 'personal', 'tuenti', 'insurance', 'seguro', 'utility', 'servicio', 'bill', 'factura', 'cuenta', 'suscripción', 'subscripción', 'abono', 'prepaga', 'obra social', 'monotributo', 'arca', 'impuesto', 'abl', 'inmobiliario', 'patente', 'gas natural', 'metrogas', 'cable', 'directv', 'flow', 'contadora', 'contador'], category: 'bills' },

        // --- HEALTH ---
        { keywords: ['gym', 'gimnasio', 'fitness', 'crossfit', 'yoga', 'pilates', 'doctor', 'médico', 'turno médico', 'consulta', 'pharmacy', 'farmacia', 'hospital', 'clínica', 'dental', 'dentista', 'odontólogo', 'medicine', 'medicina', 'medicamento', 'remedio', 'health', 'salud', 'vitamin', 'vitamina', 'suplemento', 'proteína', 'psicólogo', 'psicóloga', 'terapia', 'terapeuta', 'nutricionista', 'oculista', 'oftalmólogo', 'traumatólogo', 'kinesiólogo', 'fisioterapia', 'spa', 'masajes', 'dermatólogo', 'análisis', 'estudio médico', 'radiografía', 'membresía gym', 'cuota gym', 'antibiótico'], category: 'health' },

        // --- EDUCATION ---
        { keywords: ['course', 'curso', 'udemy', 'coursera', 'platzi', 'domestika', 'coder', 'coderhouse', 'henry', 'digital house', 'book', 'libro', 'ebook', 'kindle', 'tuition', 'matrícula', 'university', 'universidad', 'facultad', 'education', 'educación', 'class', 'clase', 'tutorial', 'capacitación', 'workshop', 'seminario', 'congreso', 'conferencia', 'masterclass', 'bootcamp', 'idioma', 'inglés', 'cuota universidad'], category: 'education' },

        // --- PERSONAL CARE ("Mi momento") ---
        { keywords: ['peluquería', 'barbería', 'corte', 'pelo', 'manicura', 'pedicura', 'uñas', 'depilación', 'estética', 'skincare', 'crema', 'shampoo', 'jabón', 'higiene', 'lavandería', 'tintorería', 'limpieza', 'productos de limpieza', 'mi momento', 'mi gustito', 'para mí'], category: 'personal' },

        // --- PETS ---
        { keywords: ['mascota', 'perro', 'gato', 'veterinario', 'veterinaria', 'alimento mascota', 'comida perro', 'comida gato', 'pet shop', 'petshop', 'vacuna mascota', 'peluquería canina'], category: 'pets' },

        // --- INCOME CATEGORIES ---
        { keywords: ['salary', 'salario', 'sueldo', 'paycheck', 'nómina', 'wage', 'pay', 'pago mensual', 'aguinaldo', 'bono', 'bonus', 'premio', 'liquidación', 'ayuda familiar', 'cuota alimentaria', 'pensión', 'asignación'], category: 'salary' },
        { keywords: ['freelance', 'consulting', 'consultoría', 'gig', 'contract', 'contrato', 'project pay', 'proyecto', 'honorario', 'facturación', 'cliente', 'trabajo extra', 'changa', 'changas'], category: 'freelance' },
        { keywords: ['dividend', 'dividendo', 'interest', 'interés', 'stock', 'acción', 'crypto', 'cripto', 'bitcoin', 'ethereum', 'investment', 'inversión', 'return', 'rendimiento', 'plazo fijo', 'fondo común', 'bono', 'cedear', 'dólar', 'mep', 'blue'], category: 'investment' },
        { keywords: ['gift', 'regalo', 'birthday', 'cumpleaños', 'present', 'navidad', 'reyes', 'day', 'aniversario'], category: 'gift' },
    ];

    // Fixed categories — which are needs vs wants (for 50/30/20 budgeting)
    const essentialCategories = ['food', 'supermarket', 'kids', 'housing', 'transport', 'bills', 'health', 'education'];
    const discretionaryCategories = ['shopping', 'entertainment', 'personal', 'pets', 'other'];

    /**
     * Suggest a category based on description text
     */
    function suggest(description, type) {
        if (!description || description.length < 2) return null;
        const lower = description.toLowerCase().trim();

        // 1. User Rules (High Priority)
        const userRules = Store.getAiRules();
        for (const rule of userRules) {
            if (lower.includes(rule.pattern)) {
                return Categories.getById(rule.categoryId);
            }
        }

        // 2. Default Rules

        for (const rule of rules) {
            for (const kw of rule.keywords) {
                if (lower.includes(kw)) {
                    const cat = Categories.getById(rule.category);
                    const correctList = type === 'income' ? Categories.income : Categories.expense;
                    if (correctList.some(c => c.id === cat.id)) return cat;
                }
            }
        }
        return null;
    }

    /**
     * Generate contextual financial tips organized by section.
     *
     * Filosofía: Budget Hero funciona como una estratega financiera de élite.
     * Regla de Oro: El dinero nunca duerme. Prohibido sugerir pagar antes del
     * vencimiento — el capital debe rendir intereses hasta el último momento.
     *
     * Estructura de cada tip:
     *   1. Análisis del Flujo  — qué detectamos
     *   2. Estrategia de Rendimiento — qué hacer con el dinero
     *   3. Concepto del Ebook — educación financiera
     *   4. Misión Hero — acción concreta
     */
    function generateContextualTips() {
        const tips = {
            dashboard: [],
            budget: [],
            goals: []
        };
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const currentDay = now.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totals = Store.getMonthlyTotals(year, month);
        const transactions = Store.getTransactions();
        const budgets = Store.getBudgets(year, month);
        const catTotals = Store.getCategoryTotals(year, month);
        const balance = Store.getTotalBalance();

        // ---- Tasa de referencia simulada (TNA conservadora cuenta remunerada) ----
        const ANNUAL_RATE = 0.45; // 45% TNA — cuenta remunerada promedio AR
        const DAILY_RATE = ANNUAL_RATE / 365;

        if (transactions.length === 0) {
            tips.dashboard.push({ emoji: '🧠', text: 'Cada centavo que registrás es un centavo que defendés. Anotá todo — incluso el kiosco del cole. "Si sale plata de tu bolsillo, tiene que quedar registrado" (Cap. 3).', type: 'info' });
            tips.dashboard.push({ emoji: '💰', text: 'Mientras organizás tus finanzas, ¿tu plata está durmiendo en una cuenta corriente? Mové cualquier excedente a una cuenta remunerada hoy. El interés compuesto empieza desde el día 1.', type: 'info' });
            return tips;
        }

        // =================================================================
        //   DASHBOARD TIPS — ESTRATEGA FINANCIERA
        // =================================================================

        // ---- 1. DETECCIÓN DE DINERO OCIOSO (Costo de Oportunidad) ----
        if (balance.operational > 0) {
            // Simular cuánto ganaría el saldo operativo en un mes
            const monthlyInterest = balance.operational * DAILY_RATE * daysInMonth;
            if (monthlyInterest > 0) {
                // Convertir a algo tangible del ebook
                let tangible = '';
                if (monthlyInterest >= 50) tangible = `una salida con los chicos`;
                else if (monthlyInterest >= 20) tangible = `las figuritas del mes`;
                else if (monthlyInterest >= 10) tangible = `un café para vos`;
                else tangible = `un gustito bien merecido`;

                tips.dashboard.push({
                    emoji: '💸',
                    text: `Tenés ${formatTipCurrency(balance.operational)} en saldo operativo. Si estuviera en una cuenta remunerada, este mes te daría ~${formatTipCurrency(Math.round(monthlyInterest))} en intereses — alcanza para ${tangible}. ¿Tu plata está trabajando o durmiendo? (Cap. 7)`,
                    type: 'warning'
                });
            }
        }

        // ---- 2. ARBITRAJE DE VENCIMIENTOS (Regla de Oro: no pagar antes) ----
        const duePayments = Store.getDuePayments();
        if (duePayments.length > 0) {
            const upcoming = duePayments.filter(dp => {
                const status = Store.getDuePaymentStatus(dp, year, month);
                return status === 'upcoming' || status === 'pending';
            });

            upcoming.forEach(dp => {
                const daysUntilDue = dp.dueDay - currentDay;
                if (daysUntilDue > 1 && dp.amount > 0) {
                    const interestGain = dp.amount * DAILY_RATE * daysUntilDue;
                    if (interestGain >= 1) {
                        tips.dashboard.push({
                            emoji: '🏦',
                            text: `📋 ${dp.icon || '📄'} ${dp.name} vence el día ${dp.dueDay}. No lo pagues hoy. Mantené esos ${formatTipCurrency(dp.amount)} en tu cuenta remunerada ${daysUntilDue} días más y ganá ~${formatTipCurrency(Math.round(interestGain))} extra. Programá el pago para el día del vencimiento. (Cap. 7)`,
                            type: 'info'
                        });
                    }
                }
            });

            // Alerta si ya pagaron algo antes del vencimiento
            const paidEarly = duePayments.filter(dp => {
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                if (dp.payments && dp.payments[key]) {
                    const paidDate = new Date(dp.payments[key].paidDate + 'T12:00:00');
                    return paidDate.getDate() < dp.dueDay - 2; // Pagó 3+ días antes
                }
                return false;
            });

            if (paidEarly.length > 0) {
                const totalEarlyAmount = paidEarly.reduce((s, dp) => s + (dp.amount || 0), 0);
                const avgDaysEarly = Math.round(paidEarly.reduce((s, dp) => {
                    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                    const paidDay = new Date(dp.payments[key].paidDate + 'T12:00:00').getDate();
                    return s + (dp.dueDay - paidDay);
                }, 0) / paidEarly.length);
                const lostInterest = totalEarlyAmount * DAILY_RATE * avgDaysEarly;

                if (lostInterest >= 1) {
                    tips.dashboard.push({
                        emoji: '⏳',
                        text: `Pagaste ${paidEarly.length} servicio${paidEarly.length > 1 ? 's' : ''} un promedio de ${avgDaysEarly} días antes del vencimiento. Eso es ${formatTipCurrency(Math.round(lostInterest))} en intereses que dejaste sobre la mesa. Recordá: el dinero nunca duerme. (Cap. 7)`,
                        type: 'warning'
                    });
                }
            }
        }

        // ---- 3. INGRESO ALTO A PRINCIPIO DE MES → Sugerir inversión ----
        if (totals.income > 0 && currentDay <= 10) {
            const surplus = totals.income - totals.expenses;
            if (surplus > 0) {
                const daysToInvest = daysInMonth - currentDay;
                const potentialGain = surplus * DAILY_RATE * daysToInvest;
                tips.dashboard.push({
                    emoji: '🚀',
                    text: `Detecté un excedente de ${formatTipCurrency(surplus)} temprano en el mes. Si colocás ese capital en un instrumento de liquidez inmediata hoy, podés generar ~${formatTipCurrency(Math.round(potentialGain))} este mes. El interés compuesto diario pone tu plata a trabajar las 24hs. (Cap. 7)`,
                    type: 'success'
                });
            }
        }

        // ---- 4. TASA DE AHORRO + Estrategia ----
        if (totals.income > 0) {
            const savingsRate = (totals.net / totals.income) * 100;
            if (savingsRate >= 20) {
                tips.dashboard.push({ emoji: '🏆', text: `¡Estás ahorrando el ${Math.round(savingsRate)}% de tus ingresos! Eso es nivel tesorera de empresa. Asegurate de que ese ahorro esté generando rendimiento, no durmiendo en la cuenta. 💪 (Cap. 7)`, type: 'success' });
            } else if (savingsRate < 0) {
                tips.dashboard.push({ emoji: '💛', text: `Este mes el flujo quedó en rojo. No te castigues — es información, no un veredicto. Revisá los vencimientos que quedan: ¿podés postergar algún pago opcional hasta el próximo ingreso? (Cap. 1)`, type: 'danger' });
            } else if (savingsRate < 10) {
                tips.dashboard.push({ emoji: '🔍', text: `Tu tasa de ahorro es del ${Math.round(savingsRate)}%. Cada punto que subas es plata que trabaja para vos. ¿Ya calculaste tu "Sueldo Real"? Ingreso total menos gastos innegociables = tu verdadera base. (Cap. 1)`, type: 'info' });
            }
        }

        // ---- 5. VAMPIROS FINANCIEROS (Cap. 2) — enhanced ----
        const thisMonthTxs = transactions.filter(tx => {
            const d = new Date(tx.date + 'T12:00:00');
            return d.getFullYear() === year && d.getMonth() === month && tx.type === 'expense';
        });
        const descCounts = {};
        thisMonthTxs.forEach(tx => {
            const key = tx.description.toLowerCase().trim();
            if (!descCounts[key]) descCounts[key] = { count: 0, total: 0 };
            descCounts[key].count++;
            descCounts[key].total += tx.amount;
        });
        for (const [desc, data] of Object.entries(descCounts)) {
            if (data.count >= 3 && data.total > 0) {
                const yearlyLeak = data.total * 12;
                const yearlyIfInvested = yearlyLeak * (1 + ANNUAL_RATE);
                tips.dashboard.push({
                    emoji: '🧛',
                    text: `Vampiro financiero: "${desc}" × ${data.count} = ${formatTipCurrency(data.total)}/mes. Si redirigís esa plata a una cuenta remunerada, en un año tendrías ${formatTipCurrency(Math.round(yearlyIfInvested))} en vez de nada. ¿Es necesidad real o inercia? (Cap. 2)`,
                    type: 'info'
                });
                break;
            }
        }

        // ---- 6. SEMÁFORO DE GASTOS DE HIJOS (Cap. 4) — enhanced ----
        const kidsSpent = catTotals.find(ct => ct.category === 'kids');
        if (kidsSpent && kidsSpent.amount > 0 && totals.expenses > 0) {
            const kidsPct = Math.round((kidsSpent.amount / totals.expenses) * 100);
            if (kidsPct > 25) {
                tips.dashboard.push({
                    emoji: '🚦',
                    text: `Los gastos de los chicos representan el ${kidsPct}% del total. Aplicá el Semáforo Estratégico: 🟢 Esencial → pagar en el vencimiento. 🟡 Negociable → ¿puede esperar al próximo ingreso? 🔴 Postergable → ese dinero rinde más invertido. (Cap. 4)`,
                    type: 'warning'
                });
            }
        }

        // ---- 7. MÉTRICA DE RENDIMIENTO MENSUAL ----
        // Calcular intereses simulados ganados por esperar vencimientos
        if (duePayments.length > 0) {
            let totalSimulatedInterest = 0;
            duePayments.forEach(dp => {
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                if (dp.payments && dp.payments[key] && dp.amount > 0) {
                    const paidDay = new Date(dp.payments[key].paidDate + 'T12:00:00').getDate();
                    // Interés ganado = días que tuvo el dinero × tasa diaria × monto
                    const daysHeld = Math.max(0, paidDay - 1); // Desde el día 1 del mes
                    totalSimulatedInterest += dp.amount * DAILY_RATE * daysHeld;
                }
            });
            if (totalSimulatedInterest >= 1) {
                tips.dashboard.push({
                    emoji: '📈',
                    text: `💰 Rendimiento del mes: gestionando tu flujo de caja, tu capital generó ~${formatTipCurrency(Math.round(totalSimulatedInterest))} en intereses potenciales. Seguí así — cada día que tu plata trabaja es un día que gana para tu familia.`,
                    type: 'success'
                });
            }
        }

        // ---- 8. INFLACIÓN PERSONAL (dinero estático perdiendo valor) ----
        if (balance.total > 0 && totals.savings === 0 && currentDay >= 15) {
            tips.dashboard.push({
                emoji: '📉',
                text: `Llevás 15 días sin destinar una parte a ahorro o inversión. Tu saldo está perdiendo valor frente a la inflación cada día que pasa. Incluso ${formatTipCurrency(Math.round(balance.total * 0.05))} en una cuenta remunerada marca la diferencia. (Cap. 7)`,
                type: 'danger'
            });
        }

        // =================================================================
        //   BUDGET TIPS — GESTIÓN ESTRATÉGICA
        // =================================================================
        if (budgets.length > 0) {
            const spentMap = {};
            catTotals.forEach(ct => { spentMap[ct.category] = ct.amount; });
            const overBudget = budgets.filter(b => (spentMap[b.category] || 0) > b.amount);

            overBudget.forEach(b => {
                const cat = Categories.getById(b.category);
                const excess = (spentMap[b.category] || 0) - b.amount;
                tips.budget.push({
                    emoji: '🔴',
                    text: `Te excediste en ${cat.name} por ${formatTipCurrency(excess)}. Ese exceso invertido hoy generaría ${formatTipCurrency(Math.round(excess * DAILY_RATE * (daysInMonth - currentDay)))} de intereses este mes. Recortá con bisturí, no con hacha — cada peso que salvas rinde. (Cap. 5)`,
                    type: 'danger',
                    categoryId: b.category
                });
            });

            const nearLimit = budgets.filter(b => {
                const spent = spentMap[b.category] || 0;
                return spent > b.amount * 0.8 && spent <= b.amount;
            });
            nearLimit.forEach(b => {
                const cat = Categories.getById(b.category);
                const remaining = b.amount - (spentMap[b.category] || 0);
                tips.budget.push({
                    emoji: '⚠️',
                    text: `Estás al 80%+ en ${cat.name}. Te quedan ${formatTipCurrency(remaining)}. Si no gastás ese remanente, dejalo generando interés. No gastes por gastar.`,
                    type: 'warning',
                    categoryId: b.category
                });
            });

            // Presupuesto subutilizado = dinero que puede rendir
            const underUsed = budgets.filter(b => {
                const spent = spentMap[b.category] || 0;
                return spent < b.amount * 0.5 && b.amount > 0 && currentDay >= 20;
            });
            if (underUsed.length > 0) {
                const totalUnused = underUsed.reduce((s, b) => s + (b.amount - (spentMap[b.category] || 0)), 0);
                tips.budget.push({
                    emoji: '🎯',
                    text: `Tenés ${formatTipCurrency(Math.round(totalUnused))} sin usar en ${underUsed.length} categoría${underUsed.length > 1 ? 's' : ''}. Misión Hero: Redirigí ese excedente a tu cuenta remunerada antes de que termine el mes. ¡Es plata que ya le ganaste al presupuesto!`,
                    type: 'success'
                });
            }
        } else {
            tips.budget.push({ emoji: '📊', text: 'Sin presupuesto, tu plata se escapa sin control. Armá tu presupuesto base con un "Fondo de Culpa Cero": un 5% que es TUYO, sin culpa, y que rinde intereses mientras decidís en qué usarlo. (Cap. 6)', type: 'info' });
        }

        // =================================================================
        //   GOAL TIPS — RENDIMIENTO + PROGRESO
        // =================================================================
        const goals = Store.getGoals();
        goals.forEach(goal => {
            if (goal.type === 'savings' && goal.targetAmount > 0) {
                const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
                if (pct >= 100) {
                    tips.goals.push({ emoji: '🎉', text: `¡Lograste "${goal.name}"! 🏆 Ahora esos fondos pueden seguir rindiendo intereses mientras decidís el próximo paso. No los dejes quietos.`, type: 'success', goalId: goal.id });
                } else {
                    const deadline = new Date(goal.deadline + 'T12:00:00');
                    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                    const remaining = goal.targetAmount - goal.currentAmount;

                    if (daysLeft > 0) {
                        // Cuánto necesita ahorrar por día
                        const dailyNeeded = remaining / daysLeft;
                        const monthlyNeeded = dailyNeeded * 30;

                        if (daysLeft <= 30 && pct < 80) {
                            tips.goals.push({
                                emoji: '⏰',
                                text: `Quedan ${daysLeft} días para "${goal.name}" (${pct}%). Necesitás ${formatTipCurrency(Math.round(dailyNeeded))}/día. Cada peso que destines hoy empieza a generar interés compuesto inmediatamente. ¡Vos podés! 💪`,
                                type: 'warning',
                                goalId: goal.id
                            });
                        } else if (pct >= 50 && pct < 100) {
                            // Proyectar cuánto generará en intereses lo ya ahorrado
                            const interestOnSaved = goal.currentAmount * DAILY_RATE * daysLeft;
                            if (interestOnSaved >= 1) {
                                tips.goals.push({
                                    emoji: '💎',
                                    text: `"${goal.name}" va por el ${pct}%. Lo que ya ahorraste (${formatTipCurrency(goal.currentAmount)}) puede generar ~${formatTipCurrency(Math.round(interestOnSaved))} en intereses hasta tu fecha límite. Tu plata trabaja para vos.`,
                                    type: 'success',
                                    goalId: goal.id
                                });
                            }
                        }
                    }
                }
            }
        });
        if (goals.length === 0) {
            tips.goals.push({ emoji: '🎯', text: '¿Ya creaste tu Matafuegos Financiero? Es tu primer escudo: un fondo de emergencia que rinde intereses mientras te protege. Empezá con lo que puedas — cada peso cuenta. (Cap. 10)', type: 'info' });
        }

        return tips;
    }

    // =========================================
    //    AI BUDGET GENERATION
    // =========================================

    /**
     * Generate budget based on historical spending patterns (3-month average + 10% buffer)
     */
    function generatePatternBudget() {
        let averages = Store.getMultiMonthCategoryAverages(3);
        let incomeData = Store.getMultiMonthIncome(3);

        // Fallback: Use current month data if no history
        if (averages.length === 0) {
            const now = new Date();
            const currentTotals = Store.getCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentTotals.length > 0) {
                averages = currentTotals.map(t => ({
                    category: t.category,
                    average: t.amount,
                    total: t.amount,
                    monthsWithData: 1
                }));
            }
        }

        if (incomeData.totalIncome === 0) {
            const now = new Date();
            const currentIncome = Store.getIncomeCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentIncome.length > 0) {
                const total = currentIncome.reduce((s, t) => s + t.amount, 0);
                incomeData = { totalIncome: total, averageIncome: total, monthsWithIncome: 1 };
            }
        }

        if (averages.length === 0) {
            return { success: false, message: 'No hay suficiente historial. Registrá al menos un gasto para generar un presupuesto.' };
        }

        const budgetItems = averages.map(avg => {
            const cat = Categories.getById(avg.category);
            const suggested = Math.ceil(avg.average * 1.1); // 10% buffer
            const isEssential = essentialCategories.includes(avg.category);

            return {
                category: avg.category,
                amount: suggested,
                average: Math.round(avg.average),
                emoji: cat.emoji,
                name: cat.name,
                reason: isEssential
                    ? `Promedio de ${formatTipCurrency(Math.round(avg.average))}/mes + 10% de margen`
                    : `Promedio de ${formatTipCurrency(Math.round(avg.average))}/mes + margen flexible`,
                isEssential,
                monthsWithData: avg.monthsWithData,
            };
        });

        const totalBudget = budgetItems.reduce((s, b) => s + b.amount, 0);

        return {
            success: true,
            type: 'pattern',
            title: '📊 Presupuesto basado en patrones',
            description: `Analicé tus gastos de los últimos 3 meses. Este presupuesto refleja tus hábitos reales con un margen del 10%.`,
            items: budgetItems,
            totalBudget,
            averageIncome: Math.round(incomeData.averageIncome),
            projectedSavings: Math.round(incomeData.averageIncome - totalBudget),
        };
    }

    /**
     * Generate budget optimized to meet financial goals
     */
    function generateGoalBudget() {
        const goals = Store.getGoals().filter(g => g.type === 'savings' && g.targetAmount > 0);
        let averages = Store.getMultiMonthCategoryAverages(3);
        let incomeData = Store.getMultiMonthIncome(3);

        // Fallback: Use current month data if no history
        if (averages.length === 0) {
            const now = new Date();
            const currentTotals = Store.getCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentTotals.length > 0) {
                averages = currentTotals.map(t => ({
                    category: t.category,
                    average: t.amount,
                    total: t.amount,
                    monthsWithData: 1
                }));
            }
        }

        if (incomeData.totalIncome === 0) {
            const now = new Date();
            const currentIncome = Store.getIncomeCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentIncome.length > 0) {
                const total = currentIncome.reduce((s, t) => s + t.amount, 0);
                incomeData = { totalIncome: total, averageIncome: total, monthsWithIncome: 1 };
            }
        }

        if (goals.length === 0) {
            return { success: false, message: 'No tenés objetivos de ahorro definidos. Creá uno primero.' };
        }
        if (averages.length === 0) {
            return { success: false, message: 'No hay suficiente historial para generar un presupuesto.' };
        }

        const now = new Date();
        let totalMonthlySavingsNeeded = 0;
        const goalBreakdown = [];

        goals.forEach(goal => {
            const remaining = goal.targetAmount - (goal.currentAmount || 0);
            if (remaining <= 0) return;
            const deadline = new Date(goal.deadline + 'T12:00:00');
            const monthsLeft = Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24 * 30)));
            const monthlyNeeded = Math.ceil(remaining / monthsLeft);
            totalMonthlySavingsNeeded += monthlyNeeded;

            goalBreakdown.push({
                name: goal.name,
                remaining,
                monthsLeft,
                monthlyNeeded,
            });
        });

        // Calculate how much we need to cut from discretionary spending
        const currentTotalExpense = averages.reduce((s, a) => s + a.average, 0);
        const availableForExpenses = Math.max(0, incomeData.averageIncome - totalMonthlySavingsNeeded);
        const reductionNeeded = Math.max(0, currentTotalExpense - availableForExpenses);

        // Reduce discretionary categories proportionally
        const discretionaryTotal = averages
            .filter(a => discretionaryCategories.includes(a.category))
            .reduce((s, a) => s + a.average, 0);

        const budgetItems = averages.map(avg => {
            const cat = Categories.getById(avg.category);
            const isEssential = essentialCategories.includes(avg.category);
            let suggested;
            let reason;

            if (isEssential) {
                suggested = Math.ceil(avg.average);
                reason = `Gasto esencial — se mantiene en ${formatTipCurrency(suggested)}`;
            } else {
                // Reduce discretionary proportionally
                const reductionPct = discretionaryTotal > 0 ? Math.min(reductionNeeded / discretionaryTotal, 0.5) : 0;
                suggested = Math.ceil(avg.average * (1 - reductionPct));
                const savedAmount = Math.round(avg.average - suggested);
                if (savedAmount > 0) {
                    reason = `Reducido ${formatTipCurrency(savedAmount)}/mes para alcanzar tus objetivos`;
                } else {
                    reason = `Se mantiene en tu promedio`;
                }
            }

            return {
                category: avg.category,
                amount: suggested,
                average: Math.round(avg.average),
                emoji: cat.emoji,
                name: cat.name,
                reason,
                isEssential,
            };
        });

        const totalBudget = budgetItems.reduce((s, b) => s + b.amount, 0);

        return {
            success: true,
            type: 'goals',
            title: '🎯 Presupuesto para tus objetivos',
            description: `Para alcanzar tus ${goals.length} objetivo${goals.length > 1 ? 's' : ''}, necesitás ahorrar ${formatTipCurrency(totalMonthlySavingsNeeded)}/mes. Ajusté los gastos discrecionales para lograrlo.`,
            items: budgetItems,
            totalBudget,
            averageIncome: Math.round(incomeData.averageIncome),
            projectedSavings: Math.round(incomeData.averageIncome - totalBudget),
            goalBreakdown,
            monthlySavingsNeeded: totalMonthlySavingsNeeded,
        };
    }

    /**
     * Generate combined budget: patterns + goals optimization
     */
    function generateCombinedBudget() {
        const goals = Store.getGoals().filter(g => g.type === 'savings' && g.targetAmount > 0);
        let averages = Store.getMultiMonthCategoryAverages(3);
        let incomeData = Store.getMultiMonthIncome(3);

        // Fallback: Use current month data if no history
        if (averages.length === 0) {
            const now = new Date();
            const currentTotals = Store.getCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentTotals.length > 0) {
                averages = currentTotals.map(t => ({
                    category: t.category,
                    average: t.amount,
                    total: t.amount,
                    monthsWithData: 1
                }));
            }
        }

        if (incomeData.totalIncome === 0) {
            const now = new Date();
            const currentIncome = Store.getIncomeCategoryTotals(now.getFullYear(), now.getMonth());
            if (currentIncome.length > 0) {
                const total = currentIncome.reduce((s, t) => s + t.amount, 0);
                incomeData = { totalIncome: total, averageIncome: total, monthsWithIncome: 1 };
            }
        }

        if (averages.length === 0) {
            return { success: false, message: 'No hay suficiente historial para generar un presupuesto.' };
        }

        const now = new Date();
        let totalMonthlySavingsNeeded = 0;
        const goalBreakdown = [];

        goals.forEach(goal => {
            const remaining = goal.targetAmount - (goal.currentAmount || 0);
            if (remaining <= 0) return;
            const deadline = new Date(goal.deadline + 'T12:00:00');
            const monthsLeft = Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24 * 30)));
            const monthlyNeeded = Math.ceil(remaining / monthsLeft);
            totalMonthlySavingsNeeded += monthlyNeeded;
            goalBreakdown.push({ name: goal.name, remaining, monthsLeft, monthlyNeeded });
        });

        // Smart allocation: essential categories get average, discretionary gets balanced reduction
        const currentTotalExpense = averages.reduce((s, a) => s + a.average, 0);
        const targetTotal = Math.max(currentTotalExpense * 0.85, incomeData.averageIncome - totalMonthlySavingsNeeded);

        const discretionaryTotal = averages
            .filter(a => discretionaryCategories.includes(a.category))
            .reduce((s, a) => s + a.average, 0);
        const essentialTotal = averages
            .filter(a => essentialCategories.includes(a.category))
            .reduce((s, a) => s + a.average, 0);

        const maxCut = Math.min(currentTotalExpense - targetTotal, discretionaryTotal * 0.4);
        const actualReduction = Math.max(0, maxCut);

        const budgetItems = averages.map(avg => {
            const cat = Categories.getById(avg.category);
            const isEssential = essentialCategories.includes(avg.category);
            let suggested;
            let reason;

            if (isEssential) {
                // Essentials: use average with small 5% buffer
                suggested = Math.ceil(avg.average * 1.05);
                reason = `Esencial: promedio + 5% de seguridad`;
            } else {
                // Discretionary: reduce proportionally
                const catShare = avg.average / (discretionaryTotal || 1);
                const cutForThis = actualReduction * catShare;
                suggested = Math.max(Math.ceil(avg.average * 0.6), Math.ceil(avg.average - cutForThis));
                const savedAmount = Math.round(avg.average - suggested);
                if (savedAmount > 0) {
                    reason = `Ajustado: ahorrás ${formatTipCurrency(savedAmount)}/mes (${Math.round((savedAmount / avg.average) * 100)}% menos)`;
                } else {
                    reason = `Sin cambios respecto al promedio`;
                }
            }

            return {
                category: avg.category,
                amount: suggested,
                average: Math.round(avg.average),
                emoji: cat.emoji,
                name: cat.name,
                reason,
                isEssential,
            };
        });

        const totalBudget = budgetItems.reduce((s, b) => s + b.amount, 0);
        const hasGoals = goals.length > 0;

        let description;
        if (hasGoals) {
            description = `Combiné tus patrones de gasto con tus ${goals.length} objetivo${goals.length > 1 ? 's' : ''}. Los gastos esenciales se mantienen y los discrecionales se ajustan para maximizar tu ahorro.`;
        } else {
            description = `Optimicé tu presupuesto basándome en tus patrones. Los gastos esenciales tienen un margen de seguridad y los discrecionales están ligeramente reducidos para fomentar el ahorro.`;
        }

        return {
            success: true,
            type: 'combined',
            title: '🤖 Presupuesto inteligente combinado',
            description,
            items: budgetItems,
            totalBudget,
            averageIncome: Math.round(incomeData.averageIncome),
            projectedSavings: Math.round(incomeData.averageIncome - totalBudget),
            goalBreakdown: hasGoals ? goalBreakdown : [],
            monthlySavingsNeeded: totalMonthlySavingsNeeded,
        };
    }

    function formatTipCurrency(amount) {
        const currency = Store.getSetting('currency') || 'USD';
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
        } catch {
            return `$${Math.round(amount)}`;
        }
    }

    return {
        suggest,
        generateContextualTips,
        generatePatternBudget,
        generateGoalBudget,
        generateCombinedBudget,
    };
})();
