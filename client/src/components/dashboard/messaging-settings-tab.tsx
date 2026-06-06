"use client";

import { useState } from "react";
import { BellOff, Clock, MessageCircle, RefreshCw } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/dashboard/editable-section";
import { ApiError } from "@/lib/api";
import { optionClassName, selectClassName } from "@/lib/form-helpers";
import { formatDateTime } from "@/lib/format";
import { formatWhatsAppE164, parseWhatsAppE164 } from "@/lib/phone";
import { updateUserProfile } from "@/lib/users";
import type {
  CheckInFrequency,
  UserOrbitPreferences,
  UserProfile,
} from "@/types/user";

type MessagingSettingsTabProps = {
  profile: UserProfile;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
};

function shortTime(value: string | null): string {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function snoozeRemaining(snoozeUntil: string | null): string | null {
  if (!snoozeUntil) return null;
  const until = new Date(snoozeUntil);
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export function MessagingSettingsTab({
  profile,
  token,
  onProfileUpdated,
}: MessagingSettingsTabProps) {
  const parsed = parseWhatsAppE164(profile.contact.whatsapp_number);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [whatsappNational, setWhatsappNational] = useState(parsed.nationalNumber);
  const [checkInFrequency, setCheckInFrequency] = useState<CheckInFrequency>(
    profile.orbit_preferences.check_in_frequency,
  );
  const [proactiveNudges, setProactiveNudges] = useState(
    profile.orbit_preferences.proactive_nudges_enabled,
  );
  const [quietStart, setQuietStart] = useState(
    shortTime(profile.orbit_preferences.quiet_hours_start),
  );
  const [quietEnd, setQuietEnd] = useState(
    shortTime(profile.orbit_preferences.quiet_hours_end),
  );
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [clearingSnooze, setClearingSnooze] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [automationSaved, setAutomationSaved] = useState(false);

  const whatsappLinked = Boolean(profile.contact.whatsapp_number);
  const remaining = snoozeRemaining(profile.orbit_preferences.snooze_until);
  const lastProactive = profile.orbit_preferences.last_proactive_check_in_at;

  async function patchPreferences(
    patch: Partial<UserOrbitPreferences>,
  ): Promise<UserProfile> {
    return updateUserProfile(token, {
      orbit_preferences: {
        ...profile.orbit_preferences,
        ...patch,
      },
    });
  }

  async function saveWhatsApp(e: React.FormEvent<HTMLFormElement>) {
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

  async function saveAutomation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingAutomation(true);
    setAutomationError(null);
    setAutomationSaved(false);
    try {
      const updated = await patchPreferences({
        check_in_frequency: checkInFrequency,
        proactive_nudges_enabled: proactiveNudges,
        quiet_hours_start: quietStart.trim() || null,
        quiet_hours_end: quietEnd.trim() || null,
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

  async function endSnooze() {
    setClearingSnooze(true);
    try {
      const updated = await patchPreferences({ snooze_until: null });
      onProfileUpdated(updated);
    } catch (err) {
      setAutomationError(
        err instanceof Error ? err.message : "Failed to clear snooze",
      );
    } finally {
      setClearingSnooze(false);
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

      {remaining ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3 text-sm">
              <BellOff className="mt-0.5 size-4 text-amber-600" />
              <div>
                <p className="font-medium">
                  Proactive check-ins snoozed for {remaining}
                </p>
                <p className="text-muted-foreground text-xs">
                  Resumes{" "}
                  {formatDateTime(profile.orbit_preferences.snooze_until)}. You
                  can still message Orbit anytime.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={endSnooze}
              disabled={clearingSnooze}
            >
              {clearingSnooze ? "Ending…" : "End snooze now"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
            How often Orbit proactively reaches out, and when to stay quiet.
            Orbit itself can adjust the snooze when you ask it to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveAutomation} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="check-in-frequency">Frequency</Label>
                <select
                  id="check-in-frequency"
                  className={selectClassName}
                  value={checkInFrequency}
                  onChange={(e) =>
                    setCheckInFrequency(e.target.value as CheckInFrequency)
                  }
                >
                  <option className={optionClassName} value="off">
                    Off — never check in
                  </option>
                  <option className={optionClassName} value="low">
                    Low — twice a day
                  </option>
                  <option className={optionClassName} value="medium">
                    Medium — every ~4 hours
                  </option>
                  <option className={optionClassName} value="high">
                    High — every ~90 minutes
                  </option>
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-1 text-sm">
                <input
                  type="checkbox"
                  checked={proactiveNudges}
                  onChange={(e) => setProactiveNudges(e.target.checked)}
                  className="size-4 accent-primary dark:scheme-dark"
                />
                Allow proactive nudges
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Quiet hours start</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  placeholder="22:00"
                  className="dark:scheme-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">Quiet hours end</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  placeholder="08:00"
                  className="dark:scheme-dark"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Times are in your local timezone ({profile.location.timezone}).
              Leave blank to use the default 22:00–08:00 window.
            </p>

            {lastProactive ? (
              <p className="text-muted-foreground text-xs">
                Last proactive check-in: {formatDateTime(lastProactive)}
              </p>
            ) : null}

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
                Scheduled jobs pull integration data and send proactive
                check-ins. Point your scheduler at the endpoints below with the
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  CRON_SECRET
                </code>
                bearer token.
              </CardDescription>
            </div>
            <Badge variant="outline">Endpoints live</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-md bg-muted/40 p-2 font-mono text-xs">
            POST /api/cron/sync — re-syncs all integrations
          </div>
          <div className="rounded-md bg-muted/40 p-2 font-mono text-xs">
            POST /api/cron/nudge — runs proactive check-ins for due users
          </div>
          <p className="text-muted-foreground text-xs">
            Suggested cadence: sync every 1–6 hours, nudge every 15–30 minutes.
            Per-user rules (frequency, quiet hours, snooze) decide who actually
            gets a message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
