// EMVCo tag numbers and well-known constants, named so the field extractor
// reads declaratively. Root tags per the EMV QR Code Specification for Payment
// Systems (Merchant-Presented Mode), plus the Thai-domestic PromptPay
// application identifiers carried inside the merchant-account templates.

export const ROOT_TAG = {
  PAYLOAD_FORMAT: "00",
  INITIATION_METHOD: "01",
  MERCHANT_CATEGORY_CODE: "52",
  TRANSACTION_CURRENCY: "53",
  TRANSACTION_AMOUNT: "54",
  COUNTRY_CODE: "58",
  MERCHANT_NAME: "59",
  MERCHANT_CITY: "60",
  POSTAL_CODE: "61",
  ADDITIONAL_DATA: "62",
  CRC: "63",
} as const;

// Merchant Account Information templates occupy tags 02–51.
export const MERCHANT_ACCOUNT_TAG_MIN = 2;
export const MERCHANT_ACCOUNT_TAG_MAX = 51;

// Sub-tag 00 of every merchant-account template holds its globally-unique
// identifier (an Application ID or reverse-domain string).
export const ACCOUNT_SUBTAG = {
  GLOBALLY_UNIQUE_ID: "00",
  // PromptPay Credit Transfer proxies:
  MSISDN: "01", // mobile number
  NATIONAL_ID: "02", // citizen / tax ID
  EWALLET_ID: "03", // e-wallet ID
  // PromptPay Bill Payment:
  BILLER_ID: "01",
  REFERENCE_1: "02",
  REFERENCE_2: "03",
} as const;

// PromptPay AIDs begin with this prefix (assigned to ITMX). Both Credit
// Transfer (…0111) and Bill Payment (…0112) share it.
export const PROMPTPAY_AID_PREFIX = "A000000677010111";
export const PROMPTPAY_BILLPAYMENT_AID_PREFIX = "A000000677010112";

// Additional Data Field Template (tag 62) sub-tags.
export const ADDITIONAL_DATA_SUBTAG = {
  BILL_NUMBER: "01",
  MOBILE_NUMBER: "02",
  STORE_LABEL: "03",
  LOYALTY_NUMBER: "04",
  REFERENCE_LABEL: "05",
  CUSTOMER_LABEL: "06",
  TERMINAL_LABEL: "07",
  PURPOSE: "08",
} as const;

// Minimal ISO 4217 numeric → alpha map for the currencies a Thai slip scanner
// realistically encounters. Unknown codes are surfaced as their numeric string.
export const CURRENCY_ALPHA_BY_NUMERIC: Record<string, string> = {
  "764": "THB",
  "840": "USD",
  "978": "EUR",
  "826": "GBP",
  "392": "JPY",
};
