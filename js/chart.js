/**
 * chart.js — Lightweight canvas charting for Budget Hero
 * No external dependencies — pure Canvas 2D
 */

const Chart = (() => {
    let canvas, ctx;
    let currentData = [];
    let animationProgress = 0;
    let animationFrame = null;

    // --- Pie chart instances ---
    const pieInstances = {};

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        handleResize();
        window.addEventListener('resize', handleResize);
    }

    function handleResize() {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Hidden or collapsed
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        if (currentData.length) draw(currentData, 1);

        // Re-render all pie charts
        Object.keys(pieInstances).forEach(id => {
            const pi = pieInstances[id];
            if (pi && pi.data) drawPieStatic(id, pi.data, pi.options);
        });
    }

    function draw(data, progress) {
        if (!ctx || !canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };

        ctx.clearRect(0, 0, w, h);

        if (data.length === 0) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim();
            ctx.font = '13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sin datos para mostrar', w / 2, h / 2);
            return;
        }

        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        // Data
        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
        const gridLines = 4;
        const niceMax = Math.ceil(maxVal / gridLines) * gridLines;

        // Colors
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        // Grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';

        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + chartH - (i / gridLines) * chartH;
            const val = (i / gridLines) * niceMax;

            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillText('$' + formatShort(val), padding.left - 8, y + 4);
        }

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        const step = Math.max(1, Math.floor(data.length / 7));
        data.forEach((d, i) => {
            if (i % step !== 0 && i !== data.length - 1) return;
            const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
            const dateObj = new Date(d.date + 'T12:00:00');
            const label = dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            ctx.fillText(label, x, h - padding.bottom + 20);
        });

        // Draw area + line for expenses
        drawLine(data.map(d => d.expense), niceMax, chartW, chartH, padding, progress, '#F5576C', 'rgba(245, 87, 108, 0.08)');

        // Draw area + line for income
        drawLine(data.map(d => d.income), niceMax, chartW, chartH, padding, progress, '#00B894', 'rgba(0, 184, 148, 0.08)');

        // Draw dots
        drawDots(data.map(d => d.expense), niceMax, chartW, chartH, padding, progress, '#F5576C');
        drawDots(data.map(d => d.income), niceMax, chartW, chartH, padding, progress, '#00B894');
    }

    function drawLine(values, maxVal, chartW, chartH, padding, progress, color, fillColor) {
        if (!ctx || values.length < 2) return;

        const points = values.map((v, i) => ({
            x: padding.left + (i / (values.length - 1 || 1)) * chartW,
            y: padding.top + chartH - (v / maxVal) * chartH * progress,
        }));

        // Fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    function drawDots(values, maxVal, chartW, chartH, padding, progress, color) {
        if (!ctx) return;
        values.forEach((v, i) => {
            if (v === 0) return;
            const x = padding.left + (i / (values.length - 1 || 1)) * chartW;
            const y = padding.top + chartH - (v / maxVal) * chartH * progress;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Glow
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
            ctx.fill();
        });
    }

    function formatShort(n) {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return Math.round(n).toString();
    }

    function animate(data) {
        currentData = data;
        animationProgress = 0;
        if (animationFrame) cancelAnimationFrame(animationFrame);

        const start = performance.now();
        const duration = 800;

        function step(ts) {
            animationProgress = Math.min((ts - start) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - animationProgress, 3);
            draw(data, eased);
            if (animationProgress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        }

        animationFrame = requestAnimationFrame(step);
    }

    // =============================================
    //    PIE / DONUT CHART
    // =============================================

    /**
     * Animate a pie chart into existence
     * @param {string} canvasId - canvas element ID
     * @param {Array} data - [{label, value, color, emoji}]
     * @param {object} options - {title, donut, centerLabel}
     */
    function animatePie(canvasId, data, options = {}) {
        if (pieInstances[canvasId] && pieInstances[canvasId]._frame) cancelAnimationFrame(pieInstances[canvasId]._frame);

        pieInstances[canvasId] = { data, options };

        const cvs = document.getElementById(canvasId);
        if (!cvs) return;
        const pctx = cvs.getContext('2d');

        // Set up canvas size
        const rect = cvs.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        cvs.width = rect.width * dpr;
        cvs.height = rect.height * dpr;
        cvs.style.width = rect.width + 'px';
        cvs.style.height = rect.height + 'px';
        pctx.scale(dpr, dpr);

        const total = data.reduce((s, d) => s + d.value, 0);
        if (total === 0) {
            drawPieEmpty(pctx, rect.width, rect.height);
            return;
        }

        const start = performance.now();
        const duration = 900;
        let frame;

        function step(ts) {
            let progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            drawPie(pctx, rect.width, rect.height, data, total, eased, options);
            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        }

        if (pieInstances[canvasId]._frame) cancelAnimationFrame(pieInstances[canvasId]._frame);
        pieInstances[canvasId]._frame = requestAnimationFrame(step);
    }

    function drawPieStatic(canvasId, data, options = {}) {
        const cvs = document.getElementById(canvasId);
        if (!cvs) return;
        const pctx = cvs.getContext('2d');

        const rect = cvs.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        cvs.width = rect.width * dpr;
        cvs.height = rect.height * dpr;
        cvs.style.width = rect.width + 'px';
        cvs.style.height = rect.height + 'px';
        pctx.scale(dpr, dpr);

        const total = data.reduce((s, d) => s + d.value, 0);
        if (total === 0) {
            drawPieEmpty(pctx, rect.width, rect.height);
            return;
        }
        drawPie(pctx, rect.width, rect.height, data, total, 1, options);
    }

    function drawPieEmpty(pctx, w, h) {
        pctx.clearRect(0, 0, w, h);
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim();
        pctx.fillStyle = textColor;
        pctx.font = '13px Inter, sans-serif';
        pctx.textAlign = 'center';
        pctx.fillText('Sin datos', w / 2, h / 2);
    }

    function drawPie(pctx, w, h, data, total, progress, options) {
        pctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) - 10;
        const innerRadius = options.donut !== false ? radius * 0.55 : 0;

        let startAngle = -Math.PI / 2;

        data.forEach((item, idx) => {
            const sliceAngle = (item.value / total) * Math.PI * 2 * progress;
            const endAngle = startAngle + sliceAngle;

            // Draw segment
            pctx.beginPath();
            pctx.moveTo(
                cx + innerRadius * Math.cos(startAngle),
                cy + innerRadius * Math.sin(startAngle)
            );
            pctx.arc(cx, cy, radius, startAngle, endAngle);
            pctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
            pctx.closePath();

            pctx.fillStyle = item.color;
            pctx.fill();

            // Subtle separator
            pctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0a0a1a';
            pctx.lineWidth = 2;
            pctx.stroke();

            // Label on larger segments
            if (progress >= 0.9 && sliceAngle > 0.25) {
                const midAngle = startAngle + sliceAngle / 2;
                const labelR = (radius + innerRadius) / 2;
                const lx = cx + labelR * Math.cos(midAngle);
                const ly = cy + labelR * Math.sin(midAngle);

                pctx.fillStyle = '#fff';
                pctx.font = 'bold 11px Inter, sans-serif';
                pctx.textAlign = 'center';
                pctx.textBaseline = 'middle';
                const pct = Math.round((item.value / total) * 100);
                pctx.fillText(`${pct}%`, lx, ly);
            }

            startAngle = endAngle;
        });

        // Center label
        if (innerRadius > 0 && progress >= 0.9 && options.centerLabel) {
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
            pctx.fillStyle = textColor;
            pctx.font = 'bold 14px Inter, sans-serif';
            pctx.textAlign = 'center';
            pctx.textBaseline = 'middle';
            pctx.fillText(options.centerLabel, cx, cy);
        }
    }

    return {
        init,
        animate,
        animatePie,
        draw: (data) => { currentData = data; draw(data, 1); }
    };
})();
