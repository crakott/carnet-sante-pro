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
