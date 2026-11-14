import { type GalleryAlbum, NativeGalleryMedia } from "@/features/finance/slipScanner/gallery/media/nativeGalleryMediaPlugin";

// Thai banking and wallet apps save each transfer slip into their own gallery
// album (for example "Pictures/K PLUS/"). Limiting both the automatic scan
// and the Scan Gallery button to those albums makes them much faster and
// means the scanner never opens the person's other photos. Slips saved
// elsewhere (screenshots, chat downloads) can still be read by picking the
// files, and a device with no bank album still scans the whole gallery.

// Matched against the album name and its path, lower-cased, with "_-./"
// turned into spaces. Latin patterns use word boundaries so short codes such
// as "scb" or "ttb" do not match inside unrelated words. Grouped by the bank
// ids of bankRegistry.ts so a scan limited to some banks reads only their
// albums; "other" holds banks without an id there and generic slip albums.
const BANK_ALBUM_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = {
  kbank: [/\bk ?plus\b/, /\bkbank\b/, /\bkasikorn/, /กสิกร/],
  scb: [/\bscb\b/, /ไทยพาณิชย์/],
  ktb: [/\bkrungthai\b/, /\bktb\b/, /กรุงไทย/],
  bbl: [/\bbangkok ?bank\b/, /\bbualuang\b/, /\bbbl\b/, /กรุงเทพ/],
  bay: [/\bkrungsri\b/, /กรุงศรี/],
  ttb: [/\bttb\b/, /\btmb\b/, /\bthanachart\b/, /ทหารไทย/],
  uob: [/\buob\b/],
  gsb: [/\bgsb\b/, /\bmymo\b/, /ออมสิน/],
  baac: [/\bbaac\b/, /ธ\.?ก\.?ส/],
  paotang: [/\bpaotang\b/, /เป๋าตัง/],
  other: [/\bcimb\b/, /\bkkp\b/, /\bkiatnakin\b/, /\blh ?bank\b/, /\bicbc\b/, /\btrue ?money\b/, /\be ?slips?\b/, /สลิป/],
};

// App names too generic to match inside a longer album name ("MAKE" would
// match "makeup"), so they only count when they are the whole album name.
const EXACT_BANK_ALBUM_NAMES: Readonly<Record<string, string>> = {
  make: "kbank",
  next: "ktb",
  kma: "bay",
  "a mobile": "baac",
  tmrw: "uob",
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[_\-./\\]+/g, " ").replace(/\s+/g, " ").trim();
}

// The bank id an album belongs to ("other" for a generic slip album or a bank
// without an id), or null when it is not a bank album.
export function albumBankId(album: Pick<GalleryAlbum, "name" | "path">): string | null {
  const name = normalize(album.name);
  const exact = EXACT_BANK_ALBUM_NAMES[name];
  if (exact) return exact;
  const haystack = `${name} ${normalize(album.path)}`;
  for (const [bankId, patterns] of Object.entries(BANK_ALBUM_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(haystack))) return bankId;
  }
  return null;
}

export function isBankAlbum(album: Pick<GalleryAlbum, "name" | "path">): boolean {
  return albumBankId(album) !== null;
}

// Ids of the non-empty bank albums on this device. With `bankIds`, only those
// banks' albums plus generic slip albums ("other"), which may hold any bank's
// slips. Returns null when the albums cannot be listed (an APK built before
// albums() existed, or any native error); callers then scan the whole gallery
// as before, as they do when no album matches.
export async function findBankAlbumIds(bankIds?: readonly string[]): Promise<string[] | null> {
  const wanted = bankIds && bankIds.length > 0 ? new Set([...bankIds, "other"]) : null;
  try {
    const { albums } = await NativeGalleryMedia.albums();
    return albums
      .filter((album) => {
        if (album.count <= 0) return false;
        const bankId = albumBankId(album);
        return bankId !== null && (wanted === null || wanted.has(bankId));
      })
      .map((album) => album.id);
  } catch {
    return null;
  }
}
