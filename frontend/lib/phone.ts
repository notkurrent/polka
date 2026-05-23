export const KZ_PHONE_DIGITS = 11;
export const KZ_PHONE_MAX_LENGTH = 18; // +7 (700) 123-45-67

export function normalizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  const hasExplicitCountry = value.trim().startsWith("+");

  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }
  if (digits.length === 10 && !hasExplicitCountry) {
    digits = `7${digits}`;
  }
  if (digits && !digits.startsWith("7")) {
    digits = `7${digits}`;
  }

  if (!digits) return "+7";

  const national = digits.startsWith("7") ? digits.slice(1) : digits;
  const operator = national.slice(0, 3);
  const first = national.slice(3, 6);
  const second = national.slice(6, 8);
  const third = national.slice(8, 10);

  let formatted = "+7";
  if (operator) formatted += ` (${operator}`;
  if (operator.length === 3 && first) formatted += ")";
  if (first) formatted += ` ${first}`;
  if (second) formatted += `-${second}`;
  if (third) formatted += `-${third}`;
  if (national.length > 10) formatted += ` ${national.slice(10)}`;

  return formatted;
}

export function isPhoneComplete(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === KZ_PHONE_DIGITS && digits.startsWith("7");
}
