"use client";

import { useEffect, useRef } from "react";

/**
 * In development, a previously-registered Service Worker from a prod build
 * can continue to control localhost and serve stale assets (like CSS),
 * which makes the app look unstyled or "broken". This helper unregisters
 * any existing Service Workers and clears runtime caches once per session.
 */
export function DevServiceWorkerReset() {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const reset = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        // Give the browser a tick to release SW control before a soft reload
        setTimeout(() => {
          // Avoid an infinite loop by only reloading once
          if (!sessionStorage.getItem("__sw_reset_done")) {
            sessionStorage.setItem("__sw_reset_done", "1");
            window.location.reload();
          }
        }, 50);
      } catch {
        // Silent — this is best-effort for dev only
      }
    };

    reset();
  }, []);

  return null;
}