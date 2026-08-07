// Low-level EMVCo QR parsing primitives. An EMVCo (EMV QR Code) payload is a
// flat string of Tag-Length-Value fields: a 2-digit tag, a 2-digit decimal
// length, then that many value characters, repeated. Some tags are "templates"
// whose value is itself a nested TLV sequence (e.g. PromptPay merchant account
// info, the additional-data field). This module walks that structure and
// checks the trailing CRC; it makes no assumptions about which tags mean what
// (that mapping lives in emvcoPayloadParser.ts).

export interface EmvcoTlvNode {
  tag: string;
  value: string;
  // Present only for template tags whose value parsed cleanly as nested TLV.
  children?: EmvcoTlvNode[];
}

// Tags whose value is a nested TLV sequence per the EMVCo spec:
//  - 02–51  Merchant Account Information (PromptPay lives here)
//  - 62     Additional Data Field Template
//  - 64     Merchant Information — Language Template
//  - 80–99  Unreserved Templates
function isTemplateTag(tag: string): boolean {
  const n = Number(tag);
  if (!Number.isInteger(n)) return false;
  return (n >= 2 && n <= 51) || n === 62 || n === 64 || (n >= 80 && n <= 99);
}

// Parse a string as an exact sequence of TLV fields. Returns null when the
// string is not well-formed EMVCo TLV (bad length, truncated value, trailing
// bytes) — e.g. a URL or plain-text QR — so callers can cleanly reject non-QR
// payloads. Template values are recursively parsed; if a template's value is
// not itself valid TLV (e.g. a card-scheme GUID), the node keeps its raw value
// with no children instead of failing the whole parse.
export function parseTlv(input: string): EmvcoTlvNode[] | null {
  const nodes: EmvcoTlvNode[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Need at least tag(2) + length(2).
    if (pos + 4 > input.length) return null;

    const tag = input.slice(pos, pos + 2);
    const lengthField = input.slice(pos + 2, pos + 4);
    if (!/^\d{2}$/.test(lengthField)) return null;

    const length = Number(lengthField);
    const valueStart = pos + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > input.length) return null;

    const value = input.slice(valueStart, valueEnd);
    const node: EmvcoTlvNode = { tag, value };

    if (isTemplateTag(tag)) {
      const children = parseTlv(value);
      if (children) node.children = children;
    }

    nodes.push(node);
    pos = valueEnd;
  }

  return nodes;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection) — the checksum
// EMVCo mandates in tag 63. Canonical check value: crc16ccitt("123456789") ===
// 0x29B1.
export function crc16ccitt(input: string): number {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

// Verify the trailing CRC field. EMVCo requires the payload to end with tag 63,
// length 04, then 4 hex digits, and the CRC is computed over everything up to
// and including "6304". Returns false if the field is absent/misplaced or the
// checksum doesn't match.
export function isCrcValid(raw: string): boolean {
  const marker = raw.slice(-8, -4);
  if (marker !== "6304") return false;

  const expected = raw.slice(-4).toUpperCase();
  const computed = crc16ccitt(raw.slice(0, -4)).toString(16).toUpperCase().padStart(4, "0");
  return expected === computed;
}

// Find a direct child node by tag within a node list.
export function findTag(nodes: EmvcoTlvNode[], tag: string): EmvcoTlvNode | undefined {
  return nodes.find((n) => n.tag === tag);
}
