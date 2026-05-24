"use client";

import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { updateUserProfile } from "@/lib/users";
import type { UserProfile, UserProfileUpdate } from "@/types/user";

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
  const locationParts = [profile.location.city, profile.location.country].filter(
    Boolean,
  );

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
            <InfoRow label="Timezone" value={profile.location.timezone} />
            <InfoRow label="Locale" value={profile.location.locale} />
            <InfoRow
              label="Location"
              value={locationParts.length ? locationParts.join(", ") : null}
            />
            <InfoRow label="Languages" value={formatList(profile.location.languages)} />
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
          <dl className="space-y-3">
            <InfoRow label="Occupation" value={profile.work.occupation} />
            <InfoRow label="Employer" value={profile.work.employer} />
            <InfoRow label="Work mode" value={profile.work.work_mode} />
            <InfoRow
              label="Hours"
              value={
                profile.work.work_hours_start && profile.work.work_hours_end
                  ? `${formatTime(profile.work.work_hours_start)} – ${formatTime(profile.work.work_hours_end)}`
                  : null
              }
            />
            <InfoRow
              label="Projects"
              value={formatList(profile.work.current_projects, "—")}
            />
          </dl>
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
  const [country, setCountry] = useState(profile.location.country ?? "");
  const [languages, setLanguages] = useState(
    listToLines(profile.location.languages),
  );
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      location: {
        ...profile.location,
        timezone,
        locale,
        city: city.trim() || null,
        country: country.trim() || null,
        languages: linesToList(languages),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          placeholder="America/New_York"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="locale">Locale</Label>
        <Input
          id="locale"
          placeholder="en-US"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="languages">Languages (one per line)</Label>
        <Textarea
          id="languages"
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          rows={3}
        />
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
  const [occupation, setOccupation] = useState(profile.work.occupation ?? "");
  const [employer, setEmployer] = useState(profile.work.employer ?? "");
  const [workMode, setWorkMode] = useState(profile.work.work_mode ?? "");
  const [hoursStart, setHoursStart] = useState(
    timeInputValue(profile.work.work_hours_start),
  );
  const [hoursEnd, setHoursEnd] = useState(timeInputValue(profile.work.work_hours_end));
  const [projects, setProjects] = useState(listToLines(profile.work.current_projects));
  const { save, saving, error } = useSectionSave(token, onProfileUpdated, onCancel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save({
      work: {
        ...profile.work,
        occupation: occupation.trim() || null,
        employer: employer.trim() || null,
        work_mode: workMode
          ? (workMode as typeof profile.work.work_mode)
          : null,
        work_hours_start: timeToApiValue(hoursStart),
        work_hours_end: timeToApiValue(hoursEnd),
        current_projects: linesToList(projects),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="occupation">Occupation</Label>
        <Input
          id="occupation"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employer">Employer</Label>
        <Input id="employer" value={employer} onChange={(e) => setEmployer(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="work-mode">Work mode</Label>
        <select
          id="work-mode"
          className={selectClassName}
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
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
          <Label htmlFor="work-start">Work starts</Label>
          <Input
            id="work-start"
            type="time"
            value={hoursStart}
            onChange={(e) => setHoursStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="work-end">Work ends</Label>
          <Input
            id="work-end"
            type="time"
            value={hoursEnd}
            onChange={(e) => setHoursEnd(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="projects">Current projects (one per line)</Label>
        <Textarea
          id="projects"
          value={projects}
          onChange={(e) => setProjects(e.target.value)}
          rows={3}
        />
      </div>
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
