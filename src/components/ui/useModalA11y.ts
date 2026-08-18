import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

interface UseModalA11yOptions {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
}

// Shared keyboard/focus behavior for any overlay that covers or obscures
// the page behind it (Drawer, DropdownPanel) -- without this, a keyboard or
// screen-reader user loses their place every time one opens or closes,
// since focus otherwise just stays wherever it already was (often nothing
// at all, if the trigger itself unmounts).
//
// On open: remembers the element that had focus (the trigger), then moves
// focus into the container -- its first focusable descendant if it has
// one, else the container itself (given a tabIndex={-1} by the caller so
// it's programmatically focusable without joining the page's own Tab order).
// While open: Escape calls onClose(); Tab/Shift+Tab wrap at the container's
// own first/last focusable descendant instead of escaping to the page
// behind it. On close: focus returns to the original trigger, so the user
// picks up exactly where they left off.
export function useModalA11y({ open, onClose, containerRef }: UseModalA11yOptions): void {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (container) {
      const [first] = focusableElements(container);
      (first ?? container).focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !container) return;

      const focusable = focusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose intentionally not a dep: re-running this effect on every render would re-capture the trigger and re-focus the container each time
  }, [open, containerRef]);
}
