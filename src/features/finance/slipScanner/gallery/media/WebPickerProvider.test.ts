import { describe, expect, it } from "vitest";
import { WebPickerProvider } from "./WebPickerProvider";

function image(name: string, localYear: number, localMonth: number, localDay: number): File {
  return new File([name], name, { type: "image/jpeg", lastModified: new Date(localYear, localMonth - 1, localDay, 12).getTime() });
}

describe("WebPickerProvider", () => {
  it("includes images from the complete From/To local calendar range", async () => {
    const provider = new WebPickerProvider([
      image("before.jpg", 2026, 9, 14),
      image("first.jpg", 2026, 9, 15),
      image("last.jpg", 2026, 9, 16),
      image("after.jpg", 2026, 9, 17),
    ]);
    const names: string[] = [];
    for await (const asset of provider.enumerate({ since: "2026-09-15", until: "2026-09-16" })) names.push(asset.filename!);
    expect(names).toEqual(["first.jpg", "last.jpg"]);
  });
});
