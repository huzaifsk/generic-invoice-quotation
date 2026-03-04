import { useEffect, useRef } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const PING_ENDPOINT = `${API_BASE_URL.replace(/\/api$/, '')}/ping`;
const PING_INTERVAL = 7000; // 7 seconds

/**
 * Custom hook that pings the backend every 5 seconds to keep it alive
 * and monitor health in production
 */
export function useBackendPing() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countRef = useRef(0);

  useEffect(() => {
    const ping = async () => {
      try {
        const response = await fetch(PING_ENDPOINT, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        countRef.current += 1;
        if (response.ok) {
          const data = await response.json();
          // Every 10th ping, log it (every 50 seconds, keep logs clean)
          if (countRef.current % 10 === 0) {
            // eslint-disable-next-line no-console
            console.log('[Backend Alive]', {
              ok: data.ok,
              uptime: data.uptime,
              pingCount: countRef.current,
            });
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('[Ping Failed]', response.status);
        }
      } catch (error) {
        // Silently fail for ping - don't spam console
      }
    };

    // Ping immediately
    ping();

    // Then ping every 5 seconds
    intervalRef.current = setInterval(ping, PING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
