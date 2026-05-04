export const PLATFORM_COMMISSION_RATE = 0;
export const PLATFORM_COMMISSION_PERCENT = PLATFORM_COMMISSION_RATE * 100;

export const BUSINESS_CATEGORIES = ["Кофейня", "Пекарня", "Ресторан", "Кондитерская", "Столовая", "Магазин"] as const;
export const DEFAULT_BUSINESS_CATEGORY = BUSINESS_CATEGORIES[0];

export const BUSINESS_CATEGORY_SEARCH_OPTIONS = [
  { label: "Кофейни", query: "Кофейни" },
  { label: "Пекарни", query: "Пекарни" },
  { label: "Рестораны", query: "Рестораны" },
  { label: "Десерты", query: "Десерты" },
  { label: "Магазины", query: "Магазины" },
] as const;
