import { useToastStore } from "@/store/toastStore";

export function useToast() {
  const show = useToastStore((s) => s.show);

  return {
    success: (message: string) => show("success", message),
    error: (message: string) => show("error", message),
    warning: (message: string) => show("warning", message),
    info: (message: string) => show("info", message),
  };
}
