"use client";

import { useMemo, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// อ่านค่า JSON จาก localStorage แบบปลอดภัยกับ SSR/hydration (ฝั่งเซิร์ฟเวอร์ได้ undefined)
// checked = true เมื่อรู้ผลฝั่งเบราว์เซอร์แล้ว (แทน state "profileChecked" + useEffect เดิม)
export function useStoredJson<T>(key: string): { value: T | null; checked: boolean } {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null; // private mode ฯลฯ ถือว่าไม่มีข้อมูล
      }
    },
    () => undefined
  );

  const value = useMemo<T | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);

  return { value, checked: raw !== undefined };
}
