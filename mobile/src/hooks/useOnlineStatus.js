import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';

async function ping() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://connectivitycheck.gstatic.com/generate_204', {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  const check = useCallback(async () => {
    const online = await ping();
    setIsOnline(online);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') check();
    });
    const interval = setInterval(check, 30000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [check]);

  return isOnline;
}
