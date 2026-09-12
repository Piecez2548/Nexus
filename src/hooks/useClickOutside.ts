import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void) {
  const dismiss = useRef(onOutsideClick);
  useEffect(() => { dismiss.current = onOutsideClick; }, [onOutsideClick]);
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        dismiss.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !ref.current?.contains(event.target as Node)) return;
      event.preventDefault();
      ref.current.querySelector<HTMLElement>('button[aria-expanded], input, button')?.focus();
      dismiss.current();
    }
    function handleFocus(event: FocusEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) dismiss.current();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [ref]);
}
