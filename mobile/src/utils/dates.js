import { colors } from '../theme';

export const todayStr = () => new Date().toISOString().split('T')[0];

// Convert YYYY-MM-DD to DD/MM/YYYY for display
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const addDays = (dateStr, days) => {
  const d = new Date(new Date(dateStr).getTime() + days * 86400000);
  return d.toISOString().split('T')[0];
};

export const addMonths = (dateStr, months) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + parseInt(months || 1, 10));
  return d.toISOString().split('T')[0];
};

// Number of days remaining until a date, with a display label and color (mirrors getCountdown in the web app)
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
    color = colors.red;
  } else if (days === 0) {
    label = `Aujourd'hui`;
    color = colors.red;
  } else if (days <= 7) {
    label = `Dans ${days} j`;
    color = colors.yellow;
  } else {
    label = `Dans ${days} j`;
    color = colors.primary;
  }
  return { days, label, color };
};

// Convert YYYY-MM-DD to DD/MM/YYYY for text input (display format)
export const isoToDisplay = (iso) => {
  if (!iso || iso.length !== 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Convert DD/MM/YYYY to YYYY-MM-DD for Firestore storage
export const displayToIso = (display) => {
  if (!display || display.replace(/\D/g, '').length < 8) return '';
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
};

// Auto-insert '/' as user types a date: "0101" → "01/01", "010120" → "01/01/20"
export const formatDateInput = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

// Human-readable age from a birth date, e.g. "2 ans 3 mois" (mirrors computeAge in the web app)
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
