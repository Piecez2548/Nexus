import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import FormField from "./FormField";

test("links nested field errors without losing existing descriptions or input state", () => {
  const { rerender } = render(<FormField label="Name" htmlFor="name" error="Enter a name"><div><input id="name" defaultValue="Ada" aria-describedby="hint" /></div></FormField>);
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", "hint name-error");
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a name");
  rerender(<FormField label="Name" htmlFor="name"><div><input id="name" defaultValue="Ada" aria-describedby="hint" /></div></FormField>);
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", "hint");
  expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  expect(screen.getByLabelText("Name")).toHaveValue("Ada");
});
