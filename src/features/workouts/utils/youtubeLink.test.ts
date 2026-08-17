import { describe, expect, it } from "vitest";
import { buildYoutubeUrl } from "./youtubeLink";

describe("buildYoutubeUrl", () => {
  it("uses the explicit youtubeUrl when set", () => {
    const url = buildYoutubeUrl({ name: "Push-up", youtubeUrl: "https://youtube.com/watch?v=abc123" });
    expect(url).toBe("https://youtube.com/watch?v=abc123");
  });

  it("falls back to a URL-encoded YouTube search when youtubeUrl is absent", () => {
    const url = buildYoutubeUrl({ name: "Jumping Jacks" });
    expect(url).toBe("https://www.youtube.com/results?search_query=Jumping%20Jacks%20exercise%20form");
  });

  it("falls back to search when youtubeUrl is blank", () => {
    const url = buildYoutubeUrl({ name: "Plank", youtubeUrl: "   " });
    expect(url).toContain("search_query=Plank");
  });
});
