export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : 'unsupported';
}

/** Must be called from a user gesture (button click) — browsers block
 * permission prompts triggered automatically on page load. */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

const formatNaira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

/** Fires a native OS/browser notification for a new order. Silently does
 * nothing if unsupported or permission hasn't been granted — callers should
 * still show an in-app toast as a fallback so nothing is ever silently missed. */
export function fireOrderNotification(order) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('New order — LUM NG', {
      body: `${order.custName || 'A customer'} placed an order · ${formatNaira(order.total)}`,
      icon: '/logo.jpeg',
      tag: order.ref, // collapses duplicate notifications for the same order
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some browsers throw if called outside an active document/worker
    // context — never let a notification failure break the app.
  }
}
