import { describe, expect, it, beforeEach } from "vitest";
import { useAiCoachSettingsStore } from "./aiCoachSettingsStore";

describe("aiCoachSettingsStore", () => {
  beforeEach(() => {
    useAiCoachSettingsStore.setState({ enabled: false });
  });

  it("defaults to disabled", () => {
    expect(useAiCoachSettingsStore.getState().enabled).toBe(false);
  });

  it("can be enabled and disabled", () => {
    useAiCoachSettingsStore.getState().setEnabled(true);
    expect(useAiCoachSettingsStore.getState().enabled).toBe(true);

    useAiCoachSettingsStore.getState().setEnabled(false);
    expect(useAiCoachSettingsStore.getState().enabled).toBe(false);
  });
});
