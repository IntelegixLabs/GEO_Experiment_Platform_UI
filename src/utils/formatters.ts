import type { Condition, Product } from "../types";

export function formatPrice(product: Pick<Product, "price" | "currency">): string {
  if (product.price === null || product.price === undefined || product.price === "") {
    return "Offer not supplied";
  }
  const price = Number(product.price);
  if (!Number.isFinite(price)) return "Offer not supplied";
  const currency = (!product.currency || product.currency === "USD") ? "INR" : product.currency;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
}

export function calculateDiscountPercentage(
  discountPrice?: number | string | null,
  actualPrice?: number | string | null,
  price?: number | string | null
): number | null {
  const effPrice = Number(discountPrice ?? price);
  const origPrice = Number(actualPrice);
  if (!Number.isFinite(effPrice) || !Number.isFinite(origPrice) || origPrice <= 0 || effPrice >= origPrice) {
    return null;
  }
  return Math.round(((origPrice - effPrice) / origPrice) * 100);
}

export function formatNumber(value: number | string | null | undefined, digits = 0): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
    : "\u2014";
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "\u2014" : `${(value * 100).toFixed(1)}%`;
}

export function conditionLabel(condition: Condition): string {
  return condition === "GEO_OPTIMIZED" ? "GEO-optimized" : condition === "CONTROL" ? "Control" : condition;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Returns an empty string to remove legacy emojis as requested by UI/UX polish.
 */
export function categoryIcon(category: string): string {
  const value = category.toLocaleLowerCase();

  if (/(all products|all departments)/.test(value)) return "\u{1F6CD}\uFE0F";
  if (/(mobile|phone|tablet)/.test(value)) return "\u{1F4F1}";
  if (/(tv|audio|camera|electronic|computer|laptop)/.test(value)) return "\u{1F4FA}";
  if (/(shoe|footwear)/.test(value)) return "\u{1F45F}";
  if (/(bag|luggage)/.test(value)) return "\u{1F9F3}";
  if (/accessor/.test(value)) return "\u231A";
  if (/appliance/.test(value)) return "\u{1F50C}";
  if (/(kitchen|cookware)/.test(value)) return "\u{1F373}";
  if (/(home|furniture|decor|bedding)/.test(value)) return "\u{1F3E0}";
  if (/(fashion|clothing)/.test(value)) return "\u{1F455}";
  if (/(beauty|health|personal care)/.test(value)) return "\u2728";
  if (/(grocery|food|gourmet)/.test(value)) return "\u{1F6D2}";
  if (/(car|motorbike|auto|vehicle)/.test(value)) return "\u{1F697}";
  if (/(sports|fitness|outdoor)/.test(value)) return "\u{1F3C3}";
  if (/(toy|baby|kid)/.test(value)) return "\u{1F9F8}";
  if (/(pet|animal)/.test(value)) return "\u{1F43E}";
  if (/(book|office|stationery)/.test(value)) return "\u{1F4DA}";
  if (/(music|instrument)/.test(value)) return "\u{1F3B5}";
  if (/(industrial|tools|supply)/.test(value)) return "\u{1F6E0}\uFE0F";
  if (/(store|market)/.test(value)) return "\u{1F3EC}";

  return "\u{1F6CD}\uFE0F";
}
