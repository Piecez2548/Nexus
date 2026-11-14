import { beforeEach, describe, expect, it, vi } from "vitest";

const albums = vi.fn();

vi.mock("./nativeGalleryMediaPlugin", () => ({
  NativeGalleryMedia: { albums: (...args: unknown[]) => albums(...args) },
}));

const { albumBankId, findBankAlbumIds, isBankAlbum } = await import("./bankAlbums");

const album = (name: string, path = "") => ({ name, path });

beforeEach(() => {
  albums.mockReset();
});

describe("isBankAlbum", () => {
  it.each([
    "K PLUS",
    "KPLUS",
    "K-PLUS",
    "SCB EASY",
    "Krungthai NEXT",
    "Bualuang mBanking",
    "Krungsri",
    "ttb touch",
    "UOB TMRW",
    "MyMo",
    "CIMB THAI",
    "TrueMoney",
    "MAKE",
    "KMA",
    "สลิป",
    "กรุงไทย",
    "เป๋าตัง",
    "e-slip",
  ])("matches the bank album %s", (name) => {
    expect(isBankAlbum(album(name))).toBe(true);
  });

  it("matches on the album path when the name alone is generic", () => {
    expect(isBankAlbum(album("Slips", "Pictures/K PLUS/Slips/"))).toBe(true);
    expect(isBankAlbum(album("Download", "Pictures/SCB_EASY/"))).toBe(true);
  });

  it.each(["Camera", "Screenshots", "WhatsApp Images", "Makeup", "Next trip", "Instagram", "Subscribed", "Kmart"])(
    "does not match the ordinary album %s",
    (name) => {
      expect(isBankAlbum(album(name, `Pictures/${name}/`))).toBe(false);
    },
  );
});

describe("findBankAlbumIds", () => {
  it("returns only non-empty bank albums", async () => {
    albums.mockResolvedValue({
      albums: [
        { id: "1", name: "Camera", path: "DCIM/Camera/", count: 900 },
        { id: "2", name: "K PLUS", path: "Pictures/K PLUS/", count: 40 },
        { id: "3", name: "SCB EASY", path: "Pictures/SCB EASY/", count: 0 },
        { id: "4", name: "Krungthai NEXT", path: "Pictures/Krungthai NEXT/", count: 3 },
      ],
    });
    await expect(findBankAlbumIds()).resolves.toEqual(["2", "4"]);
  });

  it("returns an empty list when no album looks like a bank album", async () => {
    albums.mockResolvedValue({ albums: [{ id: "1", name: "Camera", path: "DCIM/Camera/", count: 5 }] });
    await expect(findBankAlbumIds()).resolves.toEqual([]);
  });

  it("returns null when albums cannot be listed (older APK)", async () => {
    albums.mockRejectedValue(new Error("albums is not implemented on android"));
    await expect(findBankAlbumIds()).resolves.toBeNull();
  });

  it("limits the albums to the chosen banks, keeping generic slip albums", async () => {
    albums.mockResolvedValue({
      albums: [
        { id: "1", name: "K PLUS", path: "Pictures/K PLUS/", count: 40 },
        { id: "2", name: "SCB EASY", path: "Pictures/SCB EASY/", count: 12 },
        { id: "3", name: "สลิป", path: "Pictures/สลิป/", count: 5 },
        { id: "4", name: "MAKE", path: "Pictures/MAKE/", count: 2 },
      ],
    });
    await expect(findBankAlbumIds(["kbank"])).resolves.toEqual(["1", "3", "4"]);
    await expect(findBankAlbumIds(["scb"])).resolves.toEqual(["2", "3"]);
    await expect(findBankAlbumIds([])).resolves.toEqual(["1", "2", "3", "4"]);
  });
});

describe("albumBankId", () => {
  it.each([
    ["K PLUS", "kbank"],
    ["MAKE", "kbank"],
    ["SCB EASY", "scb"],
    ["Krungthai NEXT", "ktb"],
    ["NEXT", "ktb"],
    ["KMA", "bay"],
    ["ttb touch", "ttb"],
    ["UOB TMRW", "uob"],
    ["MyMo", "gsb"],
    ["เป๋าตัง", "paotang"],
    ["CIMB THAI", "other"],
    ["e-slip", "other"],
  ])("maps %s to %s", (name, bankId) => {
    expect(albumBankId(album(name))).toBe(bankId);
  });

  it("returns null for an ordinary album", () => {
    expect(albumBankId(album("Camera", "DCIM/Camera/"))).toBeNull();
  });
});
