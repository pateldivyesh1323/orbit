export type SelectOption = {
  value: string;
  label: string;
};

export type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

export const TIMEZONE_GROUPS: SelectOptionGroup[] = [
  {
    label: "UTC",
    options: [{ value: "UTC", label: "UTC — Coordinated Universal Time" }],
  },
  {
    label: "Americas",
    options: [
      { value: "America/New_York", label: "Eastern Time — New York" },
      { value: "America/Chicago", label: "Central Time — Chicago" },
      { value: "America/Denver", label: "Mountain Time — Denver" },
      { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
      { value: "America/Phoenix", label: "Arizona — Phoenix" },
      { value: "America/Anchorage", label: "Alaska — Anchorage" },
      { value: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
      { value: "America/Toronto", label: "Canada — Toronto" },
      { value: "America/Vancouver", label: "Canada — Vancouver" },
      { value: "America/Mexico_City", label: "Mexico — Mexico City" },
      { value: "America/Sao_Paulo", label: "Brazil — São Paulo" },
      { value: "America/Buenos_Aires", label: "Argentina — Buenos Aires" },
      { value: "America/Bogota", label: "Colombia — Bogotá" },
      { value: "America/Lima", label: "Peru — Lima" },
      { value: "America/Santiago", label: "Chile — Santiago" },
    ],
  },
  {
    label: "Europe",
    options: [
      { value: "Europe/London", label: "United Kingdom — London" },
      { value: "Europe/Dublin", label: "Ireland — Dublin" },
      { value: "Europe/Paris", label: "France — Paris" },
      { value: "Europe/Berlin", label: "Germany — Berlin" },
      { value: "Europe/Amsterdam", label: "Netherlands — Amsterdam" },
      { value: "Europe/Brussels", label: "Belgium — Brussels" },
      { value: "Europe/Madrid", label: "Spain — Madrid" },
      { value: "Europe/Rome", label: "Italy — Rome" },
      { value: "Europe/Stockholm", label: "Sweden — Stockholm" },
      { value: "Europe/Warsaw", label: "Poland — Warsaw" },
      { value: "Europe/Athens", label: "Greece — Athens" },
      { value: "Europe/Istanbul", label: "Turkey — Istanbul" },
      { value: "Europe/Moscow", label: "Russia — Moscow" },
    ],
  },
  {
    label: "Africa & Middle East",
    options: [
      { value: "Africa/Cairo", label: "Egypt — Cairo" },
      { value: "Africa/Johannesburg", label: "South Africa — Johannesburg" },
      { value: "Africa/Lagos", label: "Nigeria — Lagos" },
      { value: "Africa/Nairobi", label: "Kenya — Nairobi" },
      { value: "Asia/Dubai", label: "UAE — Dubai" },
      { value: "Asia/Riyadh", label: "Saudi Arabia — Riyadh" },
      { value: "Asia/Jerusalem", label: "Israel — Jerusalem" },
    ],
  },
  {
    label: "Asia",
    options: [
      { value: "Asia/Kolkata", label: "India — Kolkata" },
      { value: "Asia/Karachi", label: "Pakistan — Karachi" },
      { value: "Asia/Dhaka", label: "Bangladesh — Dhaka" },
      { value: "Asia/Bangkok", label: "Thailand — Bangkok" },
      { value: "Asia/Singapore", label: "Singapore" },
      { value: "Asia/Jakarta", label: "Indonesia — Jakarta" },
      { value: "Asia/Manila", label: "Philippines — Manila" },
      { value: "Asia/Kuala_Lumpur", label: "Malaysia — Kuala Lumpur" },
      { value: "Asia/Hong_Kong", label: "Hong Kong" },
      { value: "Asia/Shanghai", label: "China — Shanghai" },
      { value: "Asia/Tokyo", label: "Japan — Tokyo" },
      { value: "Asia/Seoul", label: "South Korea — Seoul" },
    ],
  },
  {
    label: "Pacific & Australia",
    options: [
      { value: "Australia/Sydney", label: "Australia — Sydney" },
      { value: "Australia/Melbourne", label: "Australia — Melbourne" },
      { value: "Australia/Brisbane", label: "Australia — Brisbane" },
      { value: "Australia/Perth", label: "Australia — Perth" },
      { value: "Pacific/Auckland", label: "New Zealand — Auckland" },
    ],
  },
];

export const COUNTRY_OPTIONS: SelectOption[] = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Ireland", label: "Ireland" },
  { value: "Australia", label: "Australia" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "India", label: "India" },
  { value: "Pakistan", label: "Pakistan" },
  { value: "Bangladesh", label: "Bangladesh" },
  { value: "Singapore", label: "Singapore" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Philippines", label: "Philippines" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Japan", label: "Japan" },
  { value: "South Korea", label: "South Korea" },
  { value: "China", label: "China" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Belgium", label: "Belgium" },
  { value: "Sweden", label: "Sweden" },
  { value: "Poland", label: "Poland" },
  { value: "Greece", label: "Greece" },
  { value: "Turkey", label: "Turkey" },
  { value: "Russia", label: "Russia" },
  { value: "Brazil", label: "Brazil" },
  { value: "Mexico", label: "Mexico" },
  { value: "Argentina", label: "Argentina" },
  { value: "Colombia", label: "Colombia" },
  { value: "Chile", label: "Chile" },
  { value: "Peru", label: "Peru" },
  { value: "South Africa", label: "South Africa" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Kenya", label: "Kenya" },
  { value: "Egypt", label: "Egypt" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "Israel", label: "Israel" },
];

export const LOCALE_OPTIONS: SelectOption[] = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-IN", label: "English (India)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "it-IT", label: "Italian (Italy)" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
  { value: "ko-KR", label: "Korean (South Korea)" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { value: "ru-RU", label: "Russian (Russia)" },
  { value: "tr-TR", label: "Turkish (Turkey)" },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "ur", label: "Urdu" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
];

const COUNTRY_DEFAULT_TIMEZONE: Record<string, string> = {
  India: "Asia/Kolkata",
  Pakistan: "Asia/Karachi",
  Bangladesh: "Asia/Dhaka",
  Singapore: "Asia/Singapore",
  Malaysia: "Asia/Kuala_Lumpur",
  Philippines: "Asia/Manila",
  Indonesia: "Asia/Jakarta",
  Japan: "Asia/Tokyo",
  "South Korea": "Asia/Seoul",
  China: "Asia/Shanghai",
  "Hong Kong": "Asia/Hong_Kong",
  "United Kingdom": "Europe/London",
  Ireland: "Europe/Dublin",
  Germany: "Europe/Berlin",
  France: "Europe/Paris",
  Spain: "Europe/Madrid",
  Italy: "Europe/Rome",
  Netherlands: "Europe/Amsterdam",
  Belgium: "Europe/Brussels",
  Sweden: "Europe/Stockholm",
  Poland: "Europe/Warsaw",
  Greece: "Europe/Athens",
  Turkey: "Europe/Istanbul",
  Russia: "Europe/Moscow",
  Brazil: "America/Sao_Paulo",
  Mexico: "America/Mexico_City",
  Argentina: "America/Buenos_Aires",
  Colombia: "America/Bogota",
  Chile: "America/Santiago",
  Peru: "America/Lima",
  "South Africa": "Africa/Johannesburg",
  Nigeria: "Africa/Lagos",
  Kenya: "Africa/Nairobi",
  Egypt: "Africa/Cairo",
  "United Arab Emirates": "Asia/Dubai",
  "Saudi Arabia": "Asia/Riyadh",
  Israel: "Asia/Jerusalem",
  "New Zealand": "Pacific/Auckland",
};

const optionLabelMap = (options: SelectOption[]) =>
  new Map(options.map((option) => [option.value, option.label]));

const timezoneLabelMap = optionLabelMap(
  TIMEZONE_GROUPS.flatMap((group) => group.options),
);
const countryLabelMap = optionLabelMap(COUNTRY_OPTIONS);
const localeLabelMap = optionLabelMap(LOCALE_OPTIONS);
const languageLabelMap = optionLabelMap(LANGUAGE_OPTIONS);

export function getDefaultTimezoneForCountry(country: string): string | null {
  return COUNTRY_DEFAULT_TIMEZONE[country] ?? null;
}

export function getTimezoneLabel(value: string): string {
  return timezoneLabelMap.get(value) ?? value;
}

export function getCountryLabel(value: string): string {
  return countryLabelMap.get(value) ?? value;
}

export function getLocaleLabel(value: string): string {
  return localeLabelMap.get(value) ?? value;
}

export function getLanguageLabel(value: string): string {
  return languageLabelMap.get(value) ?? value;
}

export function formatLanguageLabels(codes: string[]): string {
  if (!codes.length) return "";
  return codes.map((code) => getLanguageLabel(code)).join(", ");
}

export function ensureSelectOption(
  options: SelectOption[],
  current: string | null | undefined,
): SelectOption[] {
  if (!current || options.some((option) => option.value === current)) {
    return options;
  }
  return [{ value: current, label: `${current} (saved)` }, ...options];
}

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function detectBrowserLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
  } catch {
    return "en-US";
  }
}
