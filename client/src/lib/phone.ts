export type CountryCodeOption = {
  code: string;
  label: string;
};

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+91", label: "India (+91)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+86", label: "China (+86)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+34", label: "Spain (+34)" },
  { code: "+39", label: "Italy (+39)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+82", label: "South Korea (+82)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+46", label: "Sweden (+46)" },
  { code: "+41", label: "Switzerland (+41)" },
];

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function formatWhatsAppE164(
  countryCode: string,
  nationalNumber: string,
): string | undefined {
  const nationalDigits = nationalNumber.replace(/\D/g, "");
  if (!nationalDigits) return undefined;

  const codeDigits = countryCode.replace(/\D/g, "");
  if (!codeDigits) return undefined;

  const e164 = `+${codeDigits}${nationalDigits}`;
  if (!E164_PATTERN.test(e164)) {
    throw new Error(
      "Enter a valid phone number with country code, e.g. +1 and 4155552671",
    );
  }

  return e164;
}

export function parseWhatsAppE164(
  e164: string | null | undefined,
): { countryCode: string; nationalNumber: string } {
  if (!e164) {
    return { countryCode: "+1", nationalNumber: "" };
  }

  const match = COUNTRY_CODES.map((c) => c.code)
    .sort((a, b) => b.length - a.length)
    .find((code) => e164.startsWith(code));

  if (match) {
    return {
      countryCode: match,
      nationalNumber: e164.slice(match.length).replace(/\D/g, ""),
    };
  }

  return { countryCode: "+1", nationalNumber: e164.replace(/\D/g, "") };
}
