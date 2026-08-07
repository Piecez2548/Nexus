import {
  ACCOUNT_SUBTAG,
  ADDITIONAL_DATA_SUBTAG,
  CURRENCY_ALPHA_BY_NUMERIC,
  MERCHANT_ACCOUNT_TAG_MAX,
  MERCHANT_ACCOUNT_TAG_MIN,
  PROMPTPAY_AID_PREFIX,
  ROOT_TAG,
} from "@/features/finance/slipScanner/engine/emvco/emvcoTags";
import {
  type EmvcoTlvNode,
  findTag,
  isCrcValid,
  parseTlv,
} from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";

export type PromptPayProxyType = "msisdn" | "nationalId" | "ewallet" | "billerId";

export interface PromptPayInfo {
  aid: string;
  proxyType?: PromptPayProxyType;
  proxyValue?: string;
}

export interface EmvcoAdditionalData {
  billNumber?: string;
  mobileNumber?: string;
  storeLabel?: string;
  loyaltyNumber?: string;
  referenceLabel?: string;
  customerLabel?: string;
  terminalLabel?: string;
  purpose?: string;
}

// The structured result of parsing an EMVCo QR payload. Fields are only present
// when the payload actually carries them. `crcValid` reports payload integrity
// (tag 63) — a false value means the QR was mis-decoded or tampered, not that
// parsing failed. Bank identity is intentionally NOT resolved here: the raw
// `merchantAccounts` templates are exposed for the pluggable bank identifier
// (GS-011). EMVCo payment QRs carry no transaction timestamp — that is supplied
// later by OCR (GS-012) or slip verification, never fabricated from the QR.
export interface EmvcoPayload {
  raw: string;
  crcValid: boolean;
  payloadFormat?: string;
  initiationMethod?: "static" | "dynamic";
  merchantAccounts: EmvcoTlvNode[];
  promptPay?: PromptPayInfo;
  merchantCategoryCode?: string;
  currencyNumeric?: string;
  currency?: string;
  amount?: number;
  countryCode?: string;
  merchantName?: string;
  merchantCity?: string;
  postalCode?: string;
  additionalData?: EmvcoAdditionalData;
  referenceIds: string[];
}

function isMerchantAccountTag(tag: string): boolean {
  const n = Number(tag);
  return Number.isInteger(n) && n >= MERCHANT_ACCOUNT_TAG_MIN && n <= MERCHANT_ACCOUNT_TAG_MAX;
}

function extractPromptPay(accounts: EmvcoTlvNode[]): PromptPayInfo | undefined {
  for (const account of accounts) {
    const children = account.children;
    if (!children) continue;

    const aid = findTag(children, ACCOUNT_SUBTAG.GLOBALLY_UNIQUE_ID)?.value;
    if (!aid || !aid.startsWith(PROMPTPAY_AID_PREFIX.slice(0, 15))) continue;

    const msisdn = findTag(children, ACCOUNT_SUBTAG.MSISDN)?.value;
    const nationalId = findTag(children, ACCOUNT_SUBTAG.NATIONAL_ID)?.value;
    const ewallet = findTag(children, ACCOUNT_SUBTAG.EWALLET_ID)?.value;

    if (msisdn !== undefined) return { aid, proxyType: "msisdn", proxyValue: msisdn };
    if (nationalId !== undefined) return { aid, proxyType: "nationalId", proxyValue: nationalId };
    if (ewallet !== undefined) return { aid, proxyType: "ewallet", proxyValue: ewallet };
    return { aid };
  }
  return undefined;
}

function extractAdditionalData(node: EmvcoTlvNode | undefined): EmvcoAdditionalData | undefined {
  const children = node?.children;
  if (!children) return undefined;

  const data: EmvcoAdditionalData = {};
  const assign = (subtag: string, key: keyof EmvcoAdditionalData): void => {
    const value = findTag(children, subtag)?.value;
    if (value !== undefined) data[key] = value;
  };

  assign(ADDITIONAL_DATA_SUBTAG.BILL_NUMBER, "billNumber");
  assign(ADDITIONAL_DATA_SUBTAG.MOBILE_NUMBER, "mobileNumber");
  assign(ADDITIONAL_DATA_SUBTAG.STORE_LABEL, "storeLabel");
  assign(ADDITIONAL_DATA_SUBTAG.LOYALTY_NUMBER, "loyaltyNumber");
  assign(ADDITIONAL_DATA_SUBTAG.REFERENCE_LABEL, "referenceLabel");
  assign(ADDITIONAL_DATA_SUBTAG.CUSTOMER_LABEL, "customerLabel");
  assign(ADDITIONAL_DATA_SUBTAG.TERMINAL_LABEL, "terminalLabel");
  assign(ADDITIONAL_DATA_SUBTAG.PURPOSE, "purpose");

  return Object.keys(data).length > 0 ? data : undefined;
}

// Collect the transaction-identifying references from the additional-data
// template, in declaration order, skipping empties.
function collectReferenceIds(data: EmvcoAdditionalData | undefined): string[] {
  if (!data) return [];
  return [
    data.billNumber,
    data.referenceLabel,
    data.terminalLabel,
    data.storeLabel,
    data.customerLabel,
    data.loyaltyNumber,
  ].filter((v): v is string => v !== undefined && v.length > 0);
}

// Parse a raw QR string into a structured EMVCo payload. Returns null when the
// string is not a well-formed EMVCo TLV sequence (so a non-slip QR — a URL,
// plain text — is cleanly rejected). A structurally-valid payload with a bad
// checksum still parses and is returned with `crcValid: false`.
export function parseEmvcoPayload(raw: string): EmvcoPayload | null {
  const nodes = parseTlv(raw);
  if (!nodes || nodes.length === 0) return null;

  const merchantAccounts = nodes.filter((n) => isMerchantAccountTag(n.tag));
  const additionalData = extractAdditionalData(findTag(nodes, ROOT_TAG.ADDITIONAL_DATA));

  const initiationRaw = findTag(nodes, ROOT_TAG.INITIATION_METHOD)?.value;
  const initiationMethod = initiationRaw === "12" ? "dynamic" : initiationRaw === "11" ? "static" : undefined;

  const amountRaw = findTag(nodes, ROOT_TAG.TRANSACTION_AMOUNT)?.value;
  const amount = amountRaw !== undefined && amountRaw.trim() !== "" ? Number(amountRaw) : undefined;

  const currencyNumeric = findTag(nodes, ROOT_TAG.TRANSACTION_CURRENCY)?.value;

  return {
    raw,
    crcValid: isCrcValid(raw),
    payloadFormat: findTag(nodes, ROOT_TAG.PAYLOAD_FORMAT)?.value,
    initiationMethod,
    merchantAccounts,
    promptPay: extractPromptPay(merchantAccounts),
    merchantCategoryCode: findTag(nodes, ROOT_TAG.MERCHANT_CATEGORY_CODE)?.value,
    currencyNumeric,
    currency: currencyNumeric ? (CURRENCY_ALPHA_BY_NUMERIC[currencyNumeric] ?? currencyNumeric) : undefined,
    amount: amount !== undefined && Number.isFinite(amount) ? amount : undefined,
    countryCode: findTag(nodes, ROOT_TAG.COUNTRY_CODE)?.value,
    merchantName: findTag(nodes, ROOT_TAG.MERCHANT_NAME)?.value,
    merchantCity: findTag(nodes, ROOT_TAG.MERCHANT_CITY)?.value,
    postalCode: findTag(nodes, ROOT_TAG.POSTAL_CODE)?.value,
    additionalData,
    referenceIds: collectReferenceIds(additionalData),
  };
}
