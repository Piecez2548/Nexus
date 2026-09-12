import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import UpdateNotice from "./UpdateNotice";
afterEach(() => vi.unstubAllGlobals());
function worker(controlled: boolean) {
  const serviceWorker = Object.assign(new EventTarget(), { controller: controlled ? {} : null });
  vi.stubGlobal("navigator", { serviceWorker });
  return serviceWorker;
}
it("offers a dismissible update without reloading an open document", () => {
  const sw = worker(true);
  render(<UpdateNotice />);
  act(() => sw.dispatchEvent(new Event("controllerchange")));
  expect(screen.getByRole("status")).toHaveTextContent("กรุณาบันทึกงาน");
  fireEvent.click(screen.getByRole("button", { name: "ไว้ภายหลัง" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("does not call a first installation an update", () => {
  const sw = worker(false);
  render(<UpdateNotice />);
  act(() => sw.dispatchEvent(new Event("controllerchange")));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  act(() => sw.dispatchEvent(new Event("controllerchange")));
  expect(screen.getByRole("button", { name: "รีเฟรชเวอร์ชันใหม่" })).toBeVisible();
});
