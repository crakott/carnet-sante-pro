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
