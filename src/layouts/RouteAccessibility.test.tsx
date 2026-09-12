import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguageStore } from "@/store/languageStore";
import RouteAccessibility from "./RouteAccessibility";

let frames: FrameRequestCallback[];
beforeEach(() => {
  frames = [];
  useLanguageStore.setState({ language: "en" });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
function Fixture({ modal = false }: { modal?: boolean }) {
  return <MemoryRouter initialEntries={["/trading#main-content"]}><main id="main-content"><h1>Trading</h1></main>{modal && <div role="dialog" aria-modal="true"><input aria-label="Command" /></div>}<RouteAccessibility /></MemoryRouter>;
}
describe("RouteAccessibility", () => {
  it("focuses the hash destination and uses the page heading for its title", () => {
    render(<Fixture />);
    screen.getByRole("main").scrollIntoView = vi.fn();
    act(() => frames.forEach(callback => callback(0)));
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getByRole("main").scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
    expect(document.title).toBe("Trading — Nexus");
  });
  it("does not steal focus from a modal opened before the navigation frame", () => {
    render(<Fixture modal />);
    screen.getByRole("textbox").focus();
    act(() => frames.forEach(callback => callback(0)));
    expect(screen.getByRole("textbox")).toHaveFocus();
  });
  it("updates a heading that arrives after an exit transition", async () => {
    render(<Fixture />);
    screen.getByRole("heading").textContent = "Journal";
    await waitFor(() => expect(document.title).toBe("Journal — Nexus"));
  });
  it("sets the selected document language and restores it when leaving Main", () => {
    document.documentElement.lang = "en";
    useLanguageStore.setState({ language: "th" });
    const { unmount } = render(<Fixture />);
    expect(document.documentElement.lang).toBe("th");
    unmount();
    expect(document.documentElement.lang).toBe("en");
  });
});
