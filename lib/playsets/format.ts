const PREFIX_CURRENCY_UNITS = /^[€£¥₱₹₩$]$/u;
const ATTACHED_SUFFIX_UNITS = /^(?:%|°|\/)/u;

export const DECIMAL_PRECISION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Auto (trim trailing zeros)" },
  { value: "0", label: "0 — Whole (1,234)" },
  { value: "1", label: "1 — 0.0 (1,234.5)" },
  { value: "2", label: "2 — 0.00 (1,234.56)" },
  { value: "3", label: "3 — 0.000" },
  { value: "4", label: "4 — 0.0000" },
  { value: "5", label: "5 — 0.00000" },
  { value: "6", label: "6 — 0.000000" },
];

export function decimalPrecisionLabel(decimalPlaces: number | null | undefined): string {
  if (typeof decimalPlaces !== "number" || !Number.isInteger(decimalPlaces)) {
    return "Auto precision";
  }
  return decimalPlaces === 0
    ? "0 decimals (whole numbers)"
    : decimalPlaces === 1
      ? "1 decimal place"
      : `${decimalPlaces} decimal places`;
}

function roundDecimalString(num: number, maxDecimals: number, fixedDecimals: boolean): string {
  // Use exponential notation expansion for half-up rounding without float drift on typical inputs.
  const factor = Math.pow(10, maxDecimals);
  const abs = Math.abs(num);
  const roundedAbs = Number.isFinite(abs * factor)
    ? Math.round((abs + Number.EPSILON) * factor) / factor
    : abs;
  const signed = num < 0 && roundedAbs !== 0 ? -roundedAbs : roundedAbs;

  if (Math.abs(signed) >= 1e21) {
    // Expand scientific notation if present via toLocaleString without grouping.
    const expanded = signed.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: fixedDecimals ? maxDecimals : 0,
    });
    return expanded;
  }

  const fixed = signed.toFixed(maxDecimals);
  if (fixedDecimals) return fixed;

  if (!fixed.includes(".")) return fixed;
  const [intPart, fracPart] = fixed.split(".");
  const trimmedFrac = fracPart.replace(/0+$/, "");
  return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
}

/**
 * Mirror backend `formatPlaysetDisplayValue()` so previews in Creator Studio
 * and Playset Details match in-game formatting cleanly.
 */
export function formatPlaysetDisplayValue(
  rawValue: number | string,
  metricUnit: string,
  decimalPlaces?: number | null,
): string {
  const num = typeof rawValue === "number" ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(num)) {
    return String(rawValue);
  }

  const hasExplicitDecimals =
    typeof decimalPlaces === "number" &&
    Number.isInteger(decimalPlaces) &&
    decimalPlaces >= 0 &&
    decimalPlaces <= 6;

  const fixed = hasExplicitDecimals
    ? roundDecimalString(num, decimalPlaces, true)
    : roundDecimalString(num, 6, false);

  const negative = fixed.startsWith("-");
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [intDigits, fracDigits] = unsigned.split(".");
  const groupedInt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const numText = fracDigits !== undefined ? `${groupedInt}.${fracDigits}` : groupedInt;
  const sign = negative && numText !== "0" && !/^0(?:\.0+)?$/.test(numText) ? "-" : "";

  const unit = metricUnit.trim();
  let formatted: string;
  if (!unit) {
    formatted = `${sign}${numText}`;
  } else if (PREFIX_CURRENCY_UNITS.test(unit)) {
    formatted = `${sign}${unit}${numText}`;
  } else if (ATTACHED_SUFFIX_UNITS.test(unit)) {
    formatted = `${sign}${numText}${unit}`;
  } else {
    formatted = `${sign}${numText} ${unit}`;
  }

  return formatted.slice(0, 100);
}
