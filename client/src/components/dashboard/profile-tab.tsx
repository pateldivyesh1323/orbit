"use client";

import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  EditableSection,
  FormActions,
  FormError,
} from "@/components/dashboard/editable-section";
import { InfoRow } from "@/components/dashboard/info-row";
import { ApiError } from "@/lib/api";
import {
  linesToGoals,
  linesToList,
  listToLines,
  selectClassName,
  timeInputValue,
  timeToApiValue,
} from "@/lib/form-helpers";
import { formatList, formatTime } from "@/lib/format";
import {
  COUNTRY_OPTIONS,
  ensureSelectOption,
  formatLanguageLabels,
  getDefaultTimezoneForCountry,
  getLocaleLabel,
  getTimezoneLabel,
  LANGUAGE_OPTIONS,
  LOCALE_OPTIONS,
  TIMEZONE_GROUPS,
} from "@/lib/location-options";
import { updateUserProfile } from "@/lib/users";
import type { UserProfile, UserProfileUpdate, WorkEntry } from "@/types/user";

type ProfileTabProps = {
  profile: UserProfile;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
};

function useSectionSave(
  token: string,
  onProfileUpdated: (profile: UserProfile) => void,
  onCancel: () => void,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: UserProfileUpdate) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateUserProfile(token, payload);
      onProfileUpdated(updated);
      onCancel();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, error };
}

export function ProfileTab({ profile, token, onProfileUpdated }: ProfileTabProps) {
  const locationParts = [
    profile.location.city,
    profile.location.region,
    profile.location.country,
  ].filter(Boolean);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EditableSection
        title="Contact"
        description="Email and phone — WhatsApp is configured under Messaging & automation"
        view={
          <dl className="space-y-3">
            <InfoRow label="Email" value={profile.contact.email} />
            <InfoRow label="Phone" value={profile.contact.phone_number} />
            <InfoRow
              label="WhatsApp"
              value={
                profile.contact.whatsapp_number
                  ? `${profile.contact.whatsapp_number} (edit in Messaging tab)`
                  : "Not set — configure in Messaging tab"
              }
            />
          </dl>
        }
        form={({ onCancel }) => (
          <ContactForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        title="Identity"
        description="Your profile basics"
        view={
          <dl className="space-y-3">
            <InfoRow label="Display name" value={profile.identity.display_name} />
            <InfoRow label="Preferred name" value={profile.identity.preferred_name} />
            <InfoRow label="Bio" value={profile.identity.bio} />
          </dl>
        }
        form={({ onCancel }) => (
          <IdentityForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        title="Location"
        description="Timezone and locale"
        view={
          <dl className="space-y-3">
            <InfoRow label="Timezone" value={getTimezoneLabel(profile.location.timezone)} />
            <InfoRow label="Locale" value={getLocaleLabel(profile.location.locale)} />
            <InfoRow
              label="Location"
              value={locationParts.length ? locationParts.join(", ") : null}
            />
            <InfoRow
              label="Languages"
              value={formatLanguageLabels(profile.location.languages) || null}
            />
          </dl>
        }
        form={({ onCancel }) => (
          <LocationForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        title="Orbit preferences"
        description="How your copilot communicates — check-ins and nudges are under Messaging & automation"
        view={
          <dl className="space-y-3">
            <InfoRow
              label="Communication"
              value={profile.orbit_preferences.communication_style}
            />
            <InfoRow label="Nickname" value={profile.orbit_preferences.nickname} />
            <InfoRow
              label="Topics to avoid"
              value={formatList(profile.orbit_preferences.topics_to_avoid, "—")}
            />
            <InfoRow
              label="Custom instructions"
              value={profile.orbit_preferences.custom_instructions}
            />
          </dl>
        }
        form={({ onCancel }) => (
          <OrbitPreferencesForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        className="lg:col-span-2"
        title="Goals"
        description="What you are working toward"
        view={
          <div className="space-y-4">
            <dl className="space-y-3">
              <InfoRow label="Life mission" value={profile.goals.life_mission} />
              <InfoRow
                label="Personal goals"
                value={formatList(profile.goals.personal_goals ?? [], "—")}
              />
              <InfoRow
                label="Focus areas"
                value={formatList(profile.goals.focus_areas, "—")}
              />
              <InfoRow
                label="Weekly priorities"
                value={formatList(profile.goals.weekly_priorities, "—")}
              />
            </dl>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">
                  Short-term ({profile.goals.short_term.length})
                </p>
                {profile.goals.short_term.length ? (
                  <ul className="space-y-2 text-sm">
                    {profile.goals.short_term.map((goal) => (
                      <li key={goal.title} className="rounded-md border px-3 py-2">
                        {goal.title}
                        {goal.completed ? (
                          <Badge variant="secondary" className="ml-2">
                            Done
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No short-term goals yet.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Long-term ({profile.goals.long_term.length})
                </p>
                {profile.goals.long_term.length ? (
                  <ul className="space-y-2 text-sm">
                    {profile.goals.long_term.map((goal) => (
                      <li key={goal.title} className="rounded-md border px-3 py-2">
                        {goal.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No long-term goals yet.</p>
                )}
              </div>
            </div>
          </div>
        }
        form={({ onCancel }) => (
          <GoalsForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        title="Work"
        view={
          profile.work.roles.length ? (
            <dl className="space-y-4">
              {profile.work.roles.map((role, index) => (
                <div key={`${role.occupation ?? "role"}-${index}`} className="space-y-3">
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {role.occupation ?? "Role"}
                      {role.employer ? ` at ${role.employer}` : ""}
                    </p>
                    {role.is_primary ? <Badge variant="secondary">Primary</Badge> : null}
                  </div>
                  <InfoRow label="Work mode" value={role.work_mode} />
                  <InfoRow
                    label="Hours"
                    value={
                      role.work_hours_start && role.work_hours_end
                        ? `${formatTime(role.work_hours_start)} – ${formatTime(role.work_hours_end)}`
                        : null
                    }
                  />
                  <InfoRow
                    label="Projects"
                    value={formatList(role.current_projects, "—")}
                  />
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">No work roles added yet.</p>
          )
        }
        form={({ onCancel }) => (
          <WorkForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />

      <EditableSection
        title="Health & habits"
        view={
          <dl className="space-y-3">
            <InfoRow label="Fitness" value={profile.health.fitness_level} />
            <InfoRow
              label="Sleep target"
              value={
                profile.health.sleep_target_hours
                  ? `${profile.health.sleep_target_hours} hours`
                  : null
              }
            />
            <InfoRow
              label="Sleep schedule"
              value={
                profile.health.typical_bedtime && profile.health.typical_wake_time
                  ? `${formatTime(profile.health.typical_bedtime)} – ${formatTime(profile.health.typical_wake_time)}`
                  : null
              }
            />
            <InfoRow
              label="Health goals"
              value={formatList(profile.health.health_goals, "—")}
            />
            <InfoRow label="Morning routine" value={profile.habits.morning_routine} />
            <InfoRow label="Evening routine" value={profile.habits.evening_routine} />
          </dl>
        }
        form={({ onCancel }) => (
          <HealthHabitsForm
            profile={profile}
            token={token}
            onProfileUpdated={onProfileUpdated}
            onCancel={onCancel}
          />
        )}
      />
    </div>
  );
}

type FormProps = ProfileTabProps & { onCancel: () => void };

function ContactForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  const [email, setEmail] = useState(profile.contact.email);
  const [phone, setPhone] = useState(profile.contact.phone_number ?? "");
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      contact: {
        email,
        phone_number: phone.trim() || null,
        whatsapp_number: profile.contact.whatsapp_number,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-phone">Phone</Label>
        <Input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function IdentityForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  const [displayName, setDisplayName] = useState(profile.identity.display_name);
  const [preferredName, setPreferredName] = useState(
    profile.identity.preferred_name ?? "",
  );
  const [bio, setBio] = useState(profile.identity.bio ?? "");
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      identity: {
        ...profile.identity,
        display_name: displayName,
        preferred_name: preferredName.trim() || null,
        bio: bio.trim() || null,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="preferred-name">Preferred name</Label>
        <Input
          id="preferred-name"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
        />
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function LocationForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  const [timezone, setTimezone] = useState(profile.location.timezone);
  const [locale, setLocale] = useState(profile.location.locale);
  const [city, setCity] = useState(profile.location.city ?? "");
  const [region, setRegion] = useState(profile.location.region ?? "");
  const [country, setCountry] = useState(profile.location.country ?? "");
  const [languageCodes, setLanguageCodes] = useState(profile.location.languages);
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  const timezoneOptions = TIMEZONE_GROUPS.flatMap((group) => group.options);
  const hasKnownTimezone = timezoneOptions.some((option) => option.value === timezone);

  const countryOptions = ensureSelectOption(COUNTRY_OPTIONS, country || null);
  const localeOptions = ensureSelectOption(LOCALE_OPTIONS, locale);
  let languageOptions = LANGUAGE_OPTIONS;
  for (const code of languageCodes) {
    languageOptions = ensureSelectOption(languageOptions, code);
  }

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry);
    const defaultTimezone = getDefaultTimezoneForCountry(nextCountry);
    if (defaultTimezone && (timezone === "UTC" || !timezone)) {
      setTimezone(defaultTimezone);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      location: {
        ...profile.location,
        timezone,
        locale,
        city: city.trim() || null,
        region: region.trim() || null,
        country: country || null,
        languages: languageCodes.length ? languageCodes : ["en"],
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <select
          id="country"
          className={selectClassName}
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          <option value="">Select country</option>
          {countryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="e.g. San Francisco"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">State / region</Label>
          <Input
            id="region"
            placeholder="e.g. California"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          className={selectClassName}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          {!hasKnownTimezone && timezone ? (
            <option value={timezone}>{timezone} (saved)</option>
          ) : null}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="locale">Locale</Label>
        <select
          id="locale"
          className={selectClassName}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="languages">Languages</Label>
        <select
          id="languages"
          multiple
          className={`${selectClassName} h-auto min-h-28 py-2`}
          value={languageCodes}
          onChange={(e) =>
            setLanguageCodes(
              Array.from(e.target.selectedOptions, (option) => option.value),
            )
          }
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Hold Ctrl or Cmd to select multiple. Orbit uses this to choose response
          language and tone.
        </p>
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function OrbitPreferencesForm({
  profile,
  token,
  onProfileUpdated,
  onCancel,
}: FormProps) {
  const prefs = profile.orbit_preferences;
  const [communicationStyle, setCommunicationStyle] = useState(
    prefs.communication_style,
  );
  const [nickname, setNickname] = useState(prefs.nickname ?? "");
  const [topicsToAvoid, setTopicsToAvoid] = useState(listToLines(prefs.topics_to_avoid));
  const [customInstructions, setCustomInstructions] = useState(
    prefs.custom_instructions ?? "",
  );
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      orbit_preferences: {
        ...prefs,
        communication_style: communicationStyle as typeof prefs.communication_style,
        nickname: nickname.trim() || null,
        topics_to_avoid: linesToList(topicsToAvoid),
        custom_instructions: customInstructions.trim() || null,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="communication-style">Communication style</Label>
        <select
          id="communication-style"
          className={selectClassName}
          value={communicationStyle}
          onChange={(e) => setCommunicationStyle(e.target.value)}
        >
          <option value="casual">Casual</option>
          <option value="professional">Professional</option>
          <option value="motivating">Motivating</option>
          <option value="direct">Direct</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nickname">Nickname</Label>
        <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="topics-to-avoid">Topics to avoid (one per line)</Label>
        <Textarea
          id="topics-to-avoid"
          value={topicsToAvoid}
          onChange={(e) => setTopicsToAvoid(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custom-instructions">Custom instructions</Label>
        <Textarea
          id="custom-instructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={3}
        />
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function GoalsForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  const [lifeMission, setLifeMission] = useState(profile.goals.life_mission ?? "");
  const [personalGoals, setPersonalGoals] = useState(
    listToLines(profile.goals.personal_goals ?? []),
  );
  const [focusAreas, setFocusAreas] = useState(listToLines(profile.goals.focus_areas));
  const [weeklyPriorities, setWeeklyPriorities] = useState(
    listToLines(profile.goals.weekly_priorities),
  );
  const [shortTerm, setShortTerm] = useState(
    listToLines(profile.goals.short_term.map((g) => g.title)),
  );
  const [longTerm, setLongTerm] = useState(
    listToLines(profile.goals.long_term.map((g) => g.title)),
  );
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      goals: {
        ...profile.goals,
        life_mission: lifeMission.trim() || null,
        personal_goals: linesToList(personalGoals),
        focus_areas: linesToList(focusAreas),
        weekly_priorities: linesToList(weeklyPriorities),
        short_term: linesToGoals(shortTerm, profile.goals.short_term),
        long_term: linesToGoals(longTerm, profile.goals.long_term),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="life-mission">Life mission</Label>
        <Textarea
          id="life-mission"
          value={lifeMission}
          onChange={(e) => setLifeMission(e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="personal-goals">Personal goals (one per line)</Label>
        <Textarea
          id="personal-goals"
          value={personalGoals}
          onChange={(e) => setPersonalGoals(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="focus-areas">Focus areas (one per line)</Label>
        <Textarea
          id="focus-areas"
          value={focusAreas}
          onChange={(e) => setFocusAreas(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weekly-priorities">Weekly priorities (one per line)</Label>
        <Textarea
          id="weekly-priorities"
          value={weeklyPriorities}
          onChange={(e) => setWeeklyPriorities(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="short-term">Short-term goals (one per line)</Label>
        <Textarea
          id="short-term"
          value={shortTerm}
          onChange={(e) => setShortTerm(e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="long-term">Long-term goals (one per line)</Label>
        <Textarea
          id="long-term"
          value={longTerm}
          onChange={(e) => setLongTerm(e.target.value)}
          rows={4}
        />
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function WorkForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  type WorkRoleDraft = {
    occupation: string;
    employer: string;
    workMode: string;
    hoursStart: string;
    hoursEnd: string;
    projects: string;
    isPrimary: boolean;
  };

  function workEntryToDraft(entry: WorkEntry): WorkRoleDraft {
    return {
      occupation: entry.occupation ?? "",
      employer: entry.employer ?? "",
      workMode: entry.work_mode ?? "",
      hoursStart: timeInputValue(entry.work_hours_start),
      hoursEnd: timeInputValue(entry.work_hours_end),
      projects: listToLines(entry.current_projects),
      isPrimary: entry.is_primary,
    };
  }

  function emptyWorkRoleDraft(isPrimary: boolean): WorkRoleDraft {
    return {
      occupation: "",
      employer: "",
      workMode: "",
      hoursStart: "",
      hoursEnd: "",
      projects: "",
      isPrimary,
    };
  }

  const initialRoles =
    profile.work.roles.length > 0
      ? profile.work.roles.map(workEntryToDraft)
      : [emptyWorkRoleDraft(true)];

  const [roles, setRoles] = useState(initialRoles);
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  function updateRole(index: number, patch: Partial<WorkRoleDraft>) {
    setRoles((current) =>
      current.map((role, roleIndex) =>
        roleIndex === index ? { ...role, ...patch } : role,
      ),
    );
  }

  function setPrimaryRole(index: number) {
    setRoles((current) =>
      current.map((role, roleIndex) => ({
        ...role,
        isPrimary: roleIndex === index,
      })),
    );
  }

  function addRole() {
    setRoles((current) => [...current, emptyWorkRoleDraft(current.length === 0)]);
  }

  function removeRole(index: number) {
    setRoles((current) => {
      if (current.length <= 1) {
        return [emptyWorkRoleDraft(true)];
      }
      const next = current.filter((_, roleIndex) => roleIndex !== index);
      if (!next.some((role) => role.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const savedRoles = roles
      .filter(
        (role) =>
          role.occupation.trim() ||
          role.employer.trim() ||
          role.projects.trim() ||
          role.workMode,
      )
      .map((role) => ({
        occupation: role.occupation.trim() || null,
        employer: role.employer.trim() || null,
        industry: null,
        work_mode: role.workMode
          ? (role.workMode as WorkEntry["work_mode"])
          : null,
        work_hours_start: timeToApiValue(role.hoursStart),
        work_hours_end: timeToApiValue(role.hoursEnd),
        work_days: [],
        current_projects: linesToList(role.projects),
        is_primary: role.isPrimary,
      }));

    if (savedRoles.length && !savedRoles.some((role) => role.is_primary)) {
      savedRoles[0].is_primary = true;
    }

    await save({
      work: {
        ...profile.work,
        roles: savedRoles,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {roles.map((role, index) => (
        <div
          key={`work-role-${index}`}
          className="space-y-4 rounded-lg border border-border/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Role {index + 1}</p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="primary-work-role"
                  checked={role.isPrimary}
                  onChange={() => setPrimaryRole(index)}
                />
                Primary
              </label>
              {roles.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRole(index)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`occupation-${index}`}>Occupation</Label>
            <Input
              id={`occupation-${index}`}
              value={role.occupation}
              onChange={(e) => updateRole(index, { occupation: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`employer-${index}`}>Employer</Label>
            <Input
              id={`employer-${index}`}
              value={role.employer}
              onChange={(e) => updateRole(index, { employer: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`work-mode-${index}`}>Work mode</Label>
            <select
              id={`work-mode-${index}`}
              className={selectClassName}
              value={role.workMode}
              onChange={(e) => updateRole(index, { workMode: e.target.value })}
            >
              <option value="">Not set</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
              <option value="student">Student</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`work-start-${index}`}>Work starts</Label>
              <Input
                id={`work-start-${index}`}
                type="time"
                value={role.hoursStart}
                onChange={(e) => updateRole(index, { hoursStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`work-end-${index}`}>Work ends</Label>
              <Input
                id={`work-end-${index}`}
                type="time"
                value={role.hoursEnd}
                onChange={(e) => updateRole(index, { hoursEnd: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`projects-${index}`}>Current projects (one per line)</Label>
            <Textarea
              id={`projects-${index}`}
              value={role.projects}
              onChange={(e) => updateRole(index, { projects: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addRole}>
        Add another role
      </Button>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function HealthHabitsForm({ profile, token, onProfileUpdated, onCancel }: FormProps) {
  const [fitnessLevel, setFitnessLevel] = useState(profile.health.fitness_level ?? "");
  const [sleepTarget, setSleepTarget] = useState(
    profile.health.sleep_target_hours?.toString() ?? "",
  );
  const [bedtime, setBedtime] = useState(timeInputValue(profile.health.typical_bedtime));
  const [wakeTime, setWakeTime] = useState(
    timeInputValue(profile.health.typical_wake_time),
  );
  const [healthGoals, setHealthGoals] = useState(listToLines(profile.health.health_goals));
  const [morningRoutine, setMorningRoutine] = useState(
    profile.habits.morning_routine ?? "",
  );
  const [eveningRoutine, setEveningRoutine] = useState(
    profile.habits.evening_routine ?? "",
  );
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      health: {
        ...profile.health,
        fitness_level: fitnessLevel
          ? (fitnessLevel as typeof profile.health.fitness_level)
          : null,
        sleep_target_hours: sleepTarget ? Number(sleepTarget) : null,
        typical_bedtime: timeToApiValue(bedtime),
        typical_wake_time: timeToApiValue(wakeTime),
        health_goals: linesToList(healthGoals),
      },
      habits: {
        ...profile.habits,
        morning_routine: morningRoutine.trim() || null,
        evening_routine: eveningRoutine.trim() || null,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fitness-level">Fitness level</Label>
        <select
          id="fitness-level"
          className={selectClassName}
          value={fitnessLevel}
          onChange={(e) => setFitnessLevel(e.target.value)}
        >
          <option value="">Not set</option>
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="athlete">Athlete</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sleep-target">Sleep target (hours)</Label>
        <Input
          id="sleep-target"
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={sleepTarget}
          onChange={(e) => setSleepTarget(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bedtime">Typical bedtime</Label>
          <Input
            id="bedtime"
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wake-time">Typical wake time</Label>
          <Input
            id="wake-time"
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="health-goals">Health goals (one per line)</Label>
        <Textarea
          id="health-goals"
          value={healthGoals}
          onChange={(e) => setHealthGoals(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="morning-routine">Morning routine</Label>
        <Textarea
          id="morning-routine"
          value={morningRoutine}
          onChange={(e) => setMorningRoutine(e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evening-routine">Evening routine</Label>
        <Textarea
          id="evening-routine"
          value={eveningRoutine}
          onChange={(e) => setEveningRoutine(e.target.value)}
          rows={2}
        />
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} saving={saving} />
    </form>
  );
}
