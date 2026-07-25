import { useEffect } from "react";
import { useAppSettingsStore } from "@/store/appSettingsStore";
import { resolveIsDark } from "@/utils/theme";

// Applies the persisted theme preference to the document root so Tailwind's
// `dark:` variant (configured as a class strategy in index.css) takes effect
// app-wide. Renders nothing — this is a side-effect-only component.
export function ThemeEffect() {
  const themeMode = useAppSettingsStore((s) => s.themeMode);

  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle("dark", resolveIsDark(themeMode));
    };

    apply();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", apply);
      return () => mediaQuery.removeEventListener("change", apply);
    }
  }, [themeMode]);

  return null;
}
