export interface CouponEntry {
  id: string;
  code: string;
  discount: number;
  active: boolean;
  description: string;
}

export const COUPON_STORAGE_KEY = "shopscript.coupons.v1";

export const DEFAULT_COUPONS: CouponEntry[] = [
  { id: "save10", code: "SAVE10", discount: 0.1, active: true, description: "Default 10% student-friendly discount." },
  { id: "student10", code: "STUDENT10", discount: 0.1, active: true, description: "Academic/demo discount worth 10%." },
  { id: "none", code: "NONE", discount: 0, active: true, description: "Explicit no-discount coupon for testing." },
];

export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export function loadCoupons(): CouponEntry[] {
  try {
    const stored = localStorage.getItem(COUPON_STORAGE_KEY);
    if (!stored) return DEFAULT_COUPONS;
    const coupons = JSON.parse(stored) as CouponEntry[];
    return Array.isArray(coupons) ? coupons : DEFAULT_COUPONS;
  } catch {
    return DEFAULT_COUPONS;
  }
}