/**
 * Phone number normalization and validation utility.
 * Focuses on Egyptian mobile numbers (010, 011, 012, 015) while supporting international standard.
 * Normalizes all numbers into canonical E.164 format (e.g., +201012345678).
 */

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function convertArabicDigits(input: string): string {
  let result = input;
  for (let i = 0; i < ARABIC_INDIC_DIGITS.length; i++) {
    result = result.replaceAll(ARABIC_INDIC_DIGITS[i], i.toString());
  }
  return result;
}

export function normalizePhoneNumber(rawInput: string): string {
  if (!rawInput) return "";

  // 1. Convert Arabic-Indic numerals to Latin digits
  let cleaned = convertArabicDigits(rawInput.trim());

  // 2. Remove all spaces, dashes, dots, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, "");

  // 3. Handle Egyptian mobile numbers
  // Format: 00201XXXXXXXXX -> +201XXXXXXXXX
  if (cleaned.startsWith("0020")) {
    cleaned = "+" + cleaned.slice(2);
  }
  // Format: 201XXXXXXXXX (without +)
  else if (cleaned.startsWith("201") && (cleaned.length === 12)) {
    cleaned = "+" + cleaned;
  }
  // Format: 010XXXXXXXX, 011XXXXXXXX, 012XXXXXXXX, 015XXXXXXXX (11 digits)
  else if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = "+20" + cleaned.slice(1);
  }
  // If user entered already with +
  else if (cleaned.startsWith("+")) {
    // Keep it if valid
  }

  return cleaned;
}

export function isValidEgyptianPhone(normalized: string): boolean {
  // E.164 for Egypt mobile: +20 followed by 10, 11, 12, or 15 and 8 digits
  // Total 13 characters: +201[0125]xxxxxxxx
  return /^\+201[0125]\d{8}$/.test(normalized);
}

export function isValidPhone(rawInput: string): boolean {
  const normalized = normalizePhoneNumber(rawInput);
  if (!normalized) return false;
  if (isValidEgyptianPhone(normalized)) return true;
  // Fallback for valid international E.164: + followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export function formatPhoneDisplay(normalized: string): string {
  if (!normalized) return "";
  if (isValidEgyptianPhone(normalized)) {
    // e.g. +201012345678 -> 010 1234 5678
    const local = "0" + normalized.slice(3);
    return `${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7)}`;
  }
  return normalized;
}

