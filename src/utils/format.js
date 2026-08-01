// Format an ISO date string (YYYY-MM-DD) to DD/MM/YYYY for display
export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Compute a human-readable age ("2 ans 3 mois") from a birth date
export const computeAge = (dateNaissance) => {
    if (!dateNaissance) return null;
    const birth = new Date(dateNaissance);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    if (years <= 0) return `${Math.max(months, 0)} mois`;
    return months > 0 ? `${years} an${years > 1 ? 's' : ''} ${months} mois` : `${years} an${years > 1 ? 's' : ''}`;
};

// Human-readable description of a reminder's due date, including overdue items
export const formatReminderDelay = (daysUntil) => {
    if (daysUntil < 0) {
        const n = Math.abs(daysUntil);
        return `en retard de ${n} jour${n > 1 ? 's' : ''}`;
    }
    if (daysUntil === 0) return `à faire aujourd'hui`;
    return `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
};

// Compute the number of days remaining until a date, with a display label and color
export const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const days = Math.round((target - today) / (1000 * 60 * 60 * 24));
    let label, color;
    if (days < 0) {
        label = `En retard de ${Math.abs(days)} j`;
        color = '#ef4444';
    } else if (days === 0) {
        label = `Aujourd'hui`;
        color = '#ef4444';
    } else if (days <= 7) {
        label = `Dans ${days} j`;
        color = '#f59e0b';
    } else {
        label = `Dans ${days} j`;
        color = '#10b981';
    }
    return { days, label, color };
};
