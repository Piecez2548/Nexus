import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/database/db";
import type { AuditLogRow } from "@/features/security/auditLog";
import { useLanguageStore } from "@/store/languageStore";

import AuditLogDrawer from "./AuditLogDrawer";

const entry = (over: Partial<AuditLogRow> = {}): AuditLogRow => ({
  type: "auth",
  action: "sign-in",
  at: Date.parse("2026-08-17T10:00:00.000Z"),
  ...over,
});

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.auditLog.clear();
});

describe("AuditLogDrawer", () => {
  it("shows the empty state when there are no events", async () => {
    render(<AuditLogDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("No audit events yet")).toBeInTheDocument());
  });

  it("lists events with action and detail", async () => {
    await db.auditLog.add(entry({ type: "auth", action: "sign-in", detail: { success: true } }));
    await db.auditLog.add(entry({ type: "vault", action: "created", detail: { entryType: "password" } }));

    render(<AuditLogDrawer open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("sign-in")).toBeInTheDocument());
    expect(screen.getByText("created")).toBeInTheDocument();
    expect(screen.getByText("success: true")).toBeInTheDocument();
    expect(screen.getByText("entryType: password")).toBeInTheDocument();
  });

  it("filters by type", async () => {
    const user = userEvent.setup();
    await db.auditLog.add(entry({ type: "auth", action: "sign-in" }));
    await db.auditLog.add(entry({ type: "vault", action: "created" }));

    render(<AuditLogDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("sign-in")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Vault" }));
    expect(screen.queryByText("sign-in")).not.toBeInTheDocument();
    expect(screen.getByText("created")).toBeInTheDocument();
  });

  it("filters by search text over the action", async () => {
    const user = userEvent.setup();
    await db.auditLog.add(entry({ type: "auth", action: "sign-in" }));
    await db.auditLog.add(entry({ type: "lock", action: "unlock-failed" }));

    render(<AuditLogDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("sign-in")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Search audit log..."), "unlock");
    expect(screen.queryByText("sign-in")).not.toBeInTheDocument();
    expect(screen.getByText("unlock-failed")).toBeInTheDocument();
  });

  it("clears the log after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await db.auditLog.add(entry());

    render(<AuditLogDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("sign-in")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Clear Audit Log" }));
    await waitFor(() => expect(screen.getByText("No audit events yet")).toBeInTheDocument());
    expect(await db.auditLog.count()).toBe(0);

    vi.restoreAllMocks();
  });

  it("does not clear the log when the confirmation is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await db.auditLog.add(entry());

    render(<AuditLogDrawer open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("sign-in")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Clear Audit Log" }));
    expect(screen.getByText("sign-in")).toBeInTheDocument();
    expect(await db.auditLog.count()).toBe(1);

    vi.restoreAllMocks();
  });
});
