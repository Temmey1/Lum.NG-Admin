import { useEffect, useRef, useCallback } from 'react';
import { ordersApi } from '../api/index';

const SEEN_KEY = 'lumng_admin_seen_order_refs';
const POLL_INTERVAL_MS = 25000; // 25s — frequent enough to feel real-time, light on the backend

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  try {
    // Cap what's persisted so this never grows unbounded over months of use
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    // localStorage can throw in private-browsing/storage-full edge cases —
    // notifications just won't survive a refresh in that case, not fatal.
  }
}

/**
 * Polls GET /orders on an interval and calls onNewOrder(order) once for each
 * order not previously seen. On first run after a fresh page load, every
 * order currently in the database is marked "seen" without notifying — so
 * opening the dashboard doesn't fire a notification storm for pre-existing
 * orders, only genuinely new ones placed while the tab is open.
 */
export function useOrderNotifications({ enabled, onNewOrder }) {
  const seenRef = useRef(loadSeen());
  const initializedRef = useRef(false);
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder; // always call the latest closure

  const poll = useCallback(async () => {
    try {
      const { data } = await ordersApi.getAll();
      const orders = data.orders || [];
      const seen = seenRef.current;

      if (!initializedRef.current) {
        orders.forEach(o => seen.add(o.ref));
        initializedRef.current = true;
        saveSeen(seen);
        return;
      }

      const newOnes = orders.filter(o => !seen.has(o.ref));
      if (newOnes.length > 0) {
        newOnes.forEach(o => seen.add(o.ref));
        saveSeen(seen);
        // Oldest-first, so if several arrived between polls they notify in
        // the order they were actually placed.
        [...newOnes].reverse().forEach(o => onNewOrderRef.current?.(o));
      }
    } catch {
      // A failed poll just retries next interval — not worth surfacing as
      // an error banner for a background convenience feature.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);
}
