import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type Settings = { theme: Theme; autoRead: boolean };

const KEY = "k8s-settings-v2";

function load(): Settings {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const fallback: Settings = { theme: systemDark ? "dark" : "light", autoRead: true };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") return { ...fallback, ...saved };
  } catch {
    // ignorera trasig eller blockerad lagring
  }
  return fallback;
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // lagring kan vara blockerad
    }
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update] as const;
}
