import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguageStore } from "@/store/languageStore";
import type { PermissionEntry } from "@/features/security/permissions/permissionManagerService";

const mockIsNativePlatform = vi.fn();
const mockListPermissions = vi.fn();
const mockAddListener = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capacitor/app", () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}));

vi.mock("@/features/security/permissions/permissionManagerService", () => ({
  listPermissions: (...args: unknown[]) => mockListPermissions(...args),
}));

const { default: PermissionManagerDrawer } = await import("./PermissionManagerDrawer");

function entries(overrides: Partial<Record<PermissionEntry["key"], Partial<PermissionEntry>>> = {}): PermissionEntry[] {
  const base: PermissionEntry[] = [
    { key: "gallery", status: "granted" },
    { key: "location", status: "granted" },
    { key: "localNotifications", status: "granted" },
    { key: "notificationAccess", status: "granted" },
  ];
  return base.map((e) => ({ ...e, ...overrides[e.key] }));
}

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  vi.clearAllMocks();
  mockIsNativePlatform.mockReturnValue(true);
  mockAddListener.mockResolvedValue({ remove: vi.fn() });
  mockListPermissions.mockResolvedValue(entries());
});

describe("PermissionManagerDrawer", () => {
  it("shows a web-unavailable message and never registers the native resume listener", async () => {
    mockIsNativePlatform.mockReturnValue(false);

    render(<PermissionManagerDrawer open onClose={() => {}} />);

    expect(await screen.findByText(/nothing to show here/i)).toBeInTheDocument();
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it("renders all four permissions with their granted status", async () => {
    render(<PermissionManagerDrawer open onClose={() => {}} />);

    expect(await screen.findByText("Photos & Gallery")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Notification Access")).toBeInTheDocument();
    expect(screen.getAllByText("Granted")).toHaveLength(4);
  });

  it("shows a Request button for a prompt-status permission and calls its request() on click", async () => {
    const request = vi.fn().mockResolvedValue("granted");
    mockListPermissions.mockResolvedValue(entries({ location: { status: "prompt", request } }));

    render(<PermissionManagerDrawer open onClose={() => {}} />);
    await screen.findByText("Not requested");

    await userEvent.click(screen.getByRole("button", { name: "Request" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  });

  it("shows an Open Settings button for a blocked permission and calls its openSettings() on click", async () => {
    const openSettings = vi.fn().mockResolvedValue(undefined);
    mockListPermissions.mockResolvedValue(entries({ location: { status: "blocked", openSettings } }));

    render(<PermissionManagerDrawer open onClose={() => {}} />);
    await screen.findByText("Blocked");

    await userEvent.click(screen.getByRole("button", { name: /open settings/i }));

    await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
  });

  it("does not fetch permissions when closed", () => {
    render(<PermissionManagerDrawer open={false} onClose={() => {}} />);
    expect(mockListPermissions).not.toHaveBeenCalled();
  });
});
