import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import * as Sentry from "@sentry/react";

import { translations } from "@/i18n/translations";
import { useLanguageStore } from "@/store/languageStore";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// A class component because getDerivedStateFromError/componentDidCatch have
// no hook equivalent — this is the one place in the app that can't use the
// useTranslation() hook, so it reads the language store directly instead.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
    // A no-op if Sentry was never initialized (no DSN configured) — safe
    // to call unconditionally.
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const language = useLanguageStore.getState().language;
    const t = translations[language].errorBoundary;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle size={32} className="text-red-500" />
        </div>

        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h1>

        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{t.description}</p>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          <RotateCcw size={16} />
          {t.reload}
        </button>
      </div>
    );
  }
}
