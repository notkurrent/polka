import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** «1 позиция», «2 позиции», «5 позиций» для подписей в UI */
export function formatPositionsCount(n: number): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return `${n} позиций`
  if (mod10 === 1) return `${n} позиция`
  if (mod10 >= 2 && mod10 <= 4) return `${n} позиции`
  return `${n} позиций`
}
