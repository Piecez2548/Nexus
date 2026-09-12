/** Pointer-driven depth only: no idle loop, React renders or 3D runtime. */
export function initializeMonogramTilt(root: HTMLElement) {
  const scene = root.querySelector<HTMLElement>(".hero-image");
  const image = scene?.querySelector<HTMLImageElement>("img");
  if (!scene || !image) return () => {};
  const permitted = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  let frame = 0;
  let x = 0;
  let y = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    image.style.removeProperty("transform");
  };
  const move = (event: PointerEvent) => {
    if (!permitted.matches || document.hidden || event.pointerType === "touch") return;
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const bounds = scene.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const horizontal = Math.max(-1, Math.min(1, (x - bounds.left) / bounds.width * 2 - 1));
      const vertical = Math.max(-1, Math.min(1, (y - bounds.top) / bounds.height * 2 - 1));
      image.style.transform = `rotateX(${-vertical * 5}deg) rotateY(${horizontal * 7}deg)`;
    });
  };
  scene.addEventListener("pointermove", move, { passive: true });
  scene.addEventListener("pointerleave", reset);
  scene.addEventListener("pointercancel", reset);
  permitted.addEventListener("change", reset);
  document.addEventListener("visibilitychange", reset);
  window.addEventListener("blur", reset);
  window.addEventListener("scroll", reset, { passive: true });
  return () => {
    reset();
    scene.removeEventListener("pointermove", move);
    scene.removeEventListener("pointerleave", reset);
    scene.removeEventListener("pointercancel", reset);
    permitted.removeEventListener("change", reset);
    document.removeEventListener("visibilitychange", reset);
    window.removeEventListener("blur", reset);
    window.removeEventListener("scroll", reset);
  };
}
