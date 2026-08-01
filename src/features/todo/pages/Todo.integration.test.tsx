import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Todo from "./Todo";
import { db } from "@/database/db";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useGamificationStore } from "@/store/gamificationStore";

describe("Todo page", () => {
  beforeEach(async () => {
    await db.todos.clear();
    useTodoStore.setState({ todos: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("creates a new todo and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<Todo />);

    await user.click(screen.getByRole("button", { name: /add todo/i }));
    await user.type(await screen.findByLabelText("Task name"), "ส่งรายงาน");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("ส่งรายงาน")).toBeInTheDocument();
    expect(screen.getByText("1 tasks remaining")).toBeInTheDocument();
  });

  it("toggles a todo as complete", async () => {
    await db.todos.add({
      title: "ซื้อของ",
      priority: "medium",
      completed: false,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Todo />);

    await user.click(await screen.findByRole("button", { name: "Mark ซื้อของ as done" }));

    await waitFor(() => {
      expect(screen.getByText("0 tasks remaining")).toBeInTheDocument();
    });

    const stored = await db.todos.toArray();
    expect(stored[0].completed).toBe(true);
    expect(stored[0].completedAt).toBeDefined();
  });

  it("edits a todo in place", async () => {
    await db.todos.add({
      title: "ซื้อของ",
      priority: "low",
      completed: false,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Todo />);

    await user.click(await screen.findByRole("button", { name: "Edit ซื้อของ" }));
    const titleInput = screen.getByLabelText("Task name");
    await user.clear(titleInput);
    await user.type(titleInput, "ซื้อของเข้าบ้าน");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("ซื้อของเข้าบ้าน")).toBeInTheDocument();
    expect(screen.queryByText("ซื้อของ", { exact: true })).not.toBeInTheDocument();
  });

  it("deletes a todo", async () => {
    await db.todos.add({
      title: "ซื้อของ",
      priority: "medium",
      completed: false,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Todo />);

    await user.click(await screen.findByRole("button", { name: "Delete ซื้อของ" }));

    await waitFor(() => {
      expect(screen.getByText("No tasks to do yet")).toBeInTheDocument();
    });
  });

  it("shows a validation error instead of saving an empty title", async () => {
    const user = userEvent.setup();
    render(<Todo />);

    await user.click(screen.getByRole("button", { name: /add todo/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Task name is required")).toBeInTheDocument();
    expect(await db.todos.toArray()).toHaveLength(0);
  });

  it("awards xp weighted by priority when a todo is completed", async () => {
    await db.todos.add({
      title: "งานสำคัญมาก",
      priority: "high",
      completed: false,
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<Todo />);

    await user.click(await screen.findByRole("button", { name: "Mark งานสำคัญมาก as done" }));

    await waitFor(() => {
      expect(useGamificationStore.getState().xp).toBe(20);
    });
  });

  it("filters todos by search text, status, and priority", async () => {
    await db.todos.bulkAdd([
      { title: "ส่งรายงาน", priority: "high", completed: false, createdAt: new Date().toISOString() },
      { title: "ซื้อของ", priority: "low", completed: true, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ]);

    const user = userEvent.setup();
    render(<Todo />);

    expect(await screen.findByText("ส่งรายงาน")).toBeInTheDocument();
    expect(screen.getByText("ซื้อของ")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search todos..."), "ส่งรายงาน");
    expect(screen.getByText("ส่งรายงาน")).toBeInTheDocument();
    expect(screen.queryByText("ซื้อของ")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search todos..."));
    await user.selectOptions(screen.getByDisplayValue("All"), "completed");
    expect(screen.getByText("ซื้อของ")).toBeInTheDocument();
    expect(screen.queryByText("ส่งรายงาน")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue("Done"), "all");
    await user.selectOptions(screen.getByDisplayValue("All Priorities"), "high");
    expect(screen.getByText("ส่งรายงาน")).toBeInTheDocument();
    expect(screen.queryByText("ซื้อของ")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByText("ส่งรายงาน")).toBeInTheDocument();
    expect(screen.getByText("ซื้อของ")).toBeInTheDocument();
  });
});
