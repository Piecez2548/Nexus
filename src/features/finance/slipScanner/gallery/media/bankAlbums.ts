import { type GalleryAlbum, NativeGalleryMedia } from "@/features/finance/slipScanner/gallery/media/nativeGalleryMediaPlugin";

// Thai banking and wallet apps save each transfer slip into their own gallery
// album (for example "Pictures/K PLUS/"). Limiting both the automatic scan
// and the Scan Gallery button to those albums makes them much faster and
// means the scanner never opens the person's other photos. Slips saved
// elsewhere (screenshots, chat downloads) can still be read by picking the
// files, and a device with no bank album still scans the whole gallery.

// Matched against the album name and its path, lower-cased, with "_-./"
// turned into spaces. Latin patterns use word boundaries so short codes such
// as "scb" or "ttb" do not match inside unrelated words.
const BANK_ALBUM_PATTERNS: readonly RegExp[] = [
  /\bk ?plus\b/,
  /\bkbank\b/,
  /\bkasikorn/,
  /\bscb\b/,
  /\bkrungthai\b/,
  /\bktb\b/,
  /\bbangkok ?bank\b/,
  /\bbualuang\b/,
  /\bbbl\b/,
  /\bkrungsri\b/,
  /\bttb\b/,
  /\btmb\b/,
  /\bthanachart\b/,
  /\buob\b/,
  /\bgsb\b/,
  /\bmymo\b/,
  /\bbaac\b/,
  /\bcimb\b/,
  /\bkkp\b/,
  /\bkiatnakin\b/,
  /\blh ?bank\b/,
  /\bicbc\b/,
  /\btrue ?money\b/,
  /\bpaotang\b/,
  /\be ?slips?\b/,
  /กสิกร/,
  /กรุงไทย/,
  /ไทยพาณิชย์/,
  /กรุงเทพ/,
  /กรุงศรี/,
  /ทหารไทย/,
  /ออมสิน/,
  /ธ\.?ก\.?ส/,
  /เป๋าตัง/,
  /สลิป/,
];

// App names too generic to match inside a longer album name ("MAKE" would
// match "makeup"), so they only count when they are the whole album name.
const EXACT_BANK_ALBUM_NAMES: ReadonlySet<string> = new Set(["make", "next", "kma", "a mobile", "tmrw"]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[_\-./\\]+/g, " ").replace(/\s+/g, " ").trim();
}

export function isBankAlbum(album: Pick<GalleryAlbum, "name" | "path">): boolean {
  const name = normalize(album.name);
  if (EXACT_BANK_ALBUM_NAMES.has(name)) return true;
  const haystack = `${name} ${normalize(album.path)}`;
  return BANK_ALBUM_PATTERNS.some((pattern) => pattern.test(haystack));
}

// Ids of the non-empty bank albums on this device. Returns null when the
// albums cannot be listed (an APK built before albums() existed, or any
// native error); callers then scan the whole gallery as before.
export async function findBankAlbumIds(): Promise<string[] | null> {
  try {
    const { albums } = await NativeGalleryMedia.albums();
    return albums.filter((album) => album.count > 0 && isBankAlbum(album)).map((album) => album.id);
  } catch {
    return null;
  }
}
