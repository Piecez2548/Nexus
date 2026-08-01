import { describe, expect, it } from "vitest";
import { todoSchema } from "./todoSchema";

const t = (key: string) => key;

const valid = { title: "ส่งรายงาน", priority: "medium" as const };

describe("todoSchema", () => {
  it("accepts a valid todo", () => {
    expect(todoSchema(t).safeParse(valid).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(todoSchema(t).safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(todoSchema(t).safeParse({ ...valid, priority: "urgent" }).success).toBe(false);
  });

  it("accepts optional notes and due date", () => {
    expect(
      todoSchema(t).safeParse({ ...valid, notes: "รายละเอียด", dueDate: "2026-08-01" }).success
    ).toBe(true);
  });
});
