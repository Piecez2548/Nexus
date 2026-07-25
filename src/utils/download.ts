// Excel on Windows guesses a UTF-8 CSV with no byte-order mark is ANSI,
// which garbles anything outside plain ASCII (Thai text, etc.) into
// mojibake — prefixing the BOM makes it detect UTF-8 correctly.
const UTF8_BOM = "﻿";

export function downloadFile(filename: string, content: string, mimeType: string) {
  const body = mimeType.startsWith("text/csv") ? UTF8_BOM + content : content;
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
