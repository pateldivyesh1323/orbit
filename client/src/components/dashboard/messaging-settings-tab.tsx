"use client";

import { FormEvent, useState } from "react";
import { Clock, MessageCircle, RefreshCw } from "lucide-react";

import { WhatsAppPhoneInput } from "@/components/auth/whatsapp-phone-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/dashboard/editable-section";
import { ApiError } from "@/lib/api";
import { selectClassName } from "@/lib/form-helpers";
import { formatWhatsAppE164, parseWhatsAppE164 } from "@/lib/phone";
import { updateUserProfile } from "@/lib/users";
import type { UserProfile } from "@/types/user";

type MessagingSettingsTabProps = {
  profile: UserProfile;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
};

export function MessagingSettingsTab({
  profile,
  token,
  onProfileUpdated,
}: MessagingSettingsTabProps) {
  const parsed = parseWhatsAppE164(profile.contact.whatsapp_number);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [whatsappNational, setWhatsappNational] = useState(parsed.nationalNumber);
  const [checkInFrequency, setCheckInFrequency] = useState(
    profile.orbit_preferences.check_in_frequency,
  );
  const [proactiveNudges, setProactiveNudges] = useState(
    profile.orbit_preferences.proactive_nudges_enabled,
  );
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [automationSaved, setAutomationSaved] = useState(false);

  const whatsappLinked = Boolean(profile.contact.whatsapp_number);

  async function saveWhatsApp(e: FormEvent) {
    e.preventDefault();
    setSavingWhatsApp(true);
    setWhatsappError(null);
    setWhatsappSaved(false);
    try {
      let whatsapp_number: string | null = null;
      if (whatsappNational.trim()) {
        whatsapp_number =
          formatWhatsAppE164(countryCode, whatsappNational) ?? null;
      }
      const updated = await updateUserProfile(token, {
        contact: {
          ...profile.contact,
          whatsapp_number,
        },
      });
      onProfileUpdated(updated);
      setWhatsappSaved(true);
    } catch (err) {
      setWhatsappError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to save WhatsApp settings",
      );
    } finally {
      setSavingWhatsApp(false);
    }
  }

  async function saveAutomation(e: FormEvent) {
    e.preventDefault();
    setSavingAutomation(true);
    setAutomationError(null);
    setAutomationSaved(false);
    try {
      const updated = await updateUserProfile(token, {
        orbit_preferences: {
          ...profile.orbit_preferences,
          check_in_frequency: checkInFrequency,
          proactive_nudges_enabled: proactiveNudges,
        },
      });
      onProfileUpdated(updated);
      setAutomationSaved(true);
    } catch (err) {
      setAutomationError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to save automation settings",
      );
    } finally {
      setSavingAutomation(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Messaging & automation</CardTitle>
          <CardDescription>
            How Orbit reaches you on WhatsApp and when background jobs run to
            sync data and send check-ins.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="size-4 text-primary" />
                WhatsApp channel
              </CardTitle>
              <CardDescription>
                Link the number you message Orbit from. Must match your Twilio
                sandbox join number in development.
              </CardDescription>
            </div>
            <Badge variant={whatsappLinked ? "secondary" : "outline"}>
              {whatsappLinked ? "Linked" : "Not linked"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveWhatsApp} className="space-y-4">
            <WhatsAppPhoneInput
              countryCode={countryCode}
              nationalNumber={whatsappNational}
              onCountryCodeChange={setCountryCode}
              onNationalNumberChange={setWhatsappNational}
              disabled={savingWhatsApp}
            />
            {profile.contact.whatsapp_number ? (
              <p className="text-muted-foreground text-xs">
                Current: {profile.contact.whatsapp_number}
              </p>
            ) : null}
            <FormError message={whatsappError} />
            {whatsappSaved ? (
              <p className="text-primary text-sm">WhatsApp settings saved.</p>
            ) : null}
            <Button type="submit" disabled={savingWhatsApp}>
              {savingWhatsApp ? "Saving…" : "Save WhatsApp number"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            Check-ins & nudges
          </CardTitle>
          <CardDescription>
            Controls how often Orbit proactively messages you. Cron jobs will
            use these preferences when nudge automation is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveAutomation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="check-in-frequency">Check-in frequency</Label>
              <select
                id="check-in-frequency"
                className={selectClassName}
                value={checkInFrequency}
                onChange={(e) => setCheckInFrequency(e.target.value)}
              >
                <option value="low">Low — occasional</option>
                <option value="medium">Medium — regular</option>
                <option value="high">High — frequent</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={proactiveNudges}
                onChange={(e) => setProactiveNudges(e.target.checked)}
              />
              Allow proactive nudges from Orbit
            </label>
            <FormError message={automationError} />
            {automationSaved ? (
              <p className="text-primary text-sm">Automation settings saved.</p>
            ) : null}
            <Button type="submit" disabled={savingAutomation}>
              {savingAutomation ? "Saving…" : "Save check-in preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="size-4 text-primary" />
                Background sync (cron)
              </CardTitle>
              <CardDescription>
                Scheduled jobs pull integration data and refresh Orbit&apos;s
                context. Not active yet — coming in the next phase.
              </CardDescription>
            </div>
            <Badge variant="outline">Coming soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Data sync</span> —
            Pulls GitHub, WakaTime, and Calendar snapshots into Memory on a
            schedule (e.g. every 6 hours).
          </p>
          <p>
            <span className="font-medium text-foreground">Morning nudge</span> —
            Sends a WhatsApp check-in based on your timezone and check-in
            frequency.
          </p>
          <p>
            <span className="font-medium text-foreground">Weekly review</span> —
            Summarizes progress against your goals and focus areas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
