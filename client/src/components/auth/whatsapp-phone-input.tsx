"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_CODES } from "@/lib/phone";
import { cn } from "@/lib/utils";

type WhatsAppPhoneInputProps = {
  countryCode: string;
  nationalNumber: string;
  onCountryCodeChange: (code: string) => void;
  onNationalNumberChange: (number: string) => void;
  disabled?: boolean;
};

export function WhatsAppPhoneInput({
  countryCode,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  disabled = false,
}: WhatsAppPhoneInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="whatsapp-national">WhatsApp number (optional)</Label>
      <div className="flex gap-2">
        <select
          id="whatsapp-country"
          aria-label="Country code"
          disabled={disabled}
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className={cn(
            "h-8 w-[min(100%,11rem)] shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          )}
        >
          {COUNTRY_CODES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <Input
          id="whatsapp-national"
          type="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={nationalNumber}
          onChange={(e) => onNationalNumberChange(e.target.value)}
          placeholder="4155552671"
          className="min-w-0 flex-1"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Include country code. Example: +1 and 4155552671 → +14155552671
      </p>
    </div>
  );
}
