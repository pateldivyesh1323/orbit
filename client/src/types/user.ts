export type UserContact = {
  email: string;
  phone_number: string | null;
  whatsapp_number: string | null;
};

export type UserIdentity = {
  display_name: string;
  legal_name: string | null;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export type UserLocation = {
  timezone: string;
  locale: string;
  city: string | null;
  region: string | null;
  country: string | null;
  nationality: string | null;
  languages: string[];
};

export type GoalItem = {
  title: string;
  description: string | null;
  area: string | null;
  target_date: string | null;
  completed: boolean;
};

export type UserGoals = {
  life_mission: string | null;
  personal_goals: string[];
  short_term: GoalItem[];
  long_term: GoalItem[];
  focus_areas: string[];
  weekly_priorities: string[];
};

export type UserHabits = {
  morning_routine: string | null;
  evening_routine: string | null;
  tracked_habits: { name: string; frequency: string; target: string | null; active: boolean }[];
  habits_to_build: string[];
  habits_to_break: string[];
};

export type UserHealth = {
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: string | null;
  sleep_target_hours: number | null;
  typical_bedtime: string | null;
  typical_wake_time: string | null;
  dietary_preferences: string[];
  allergies: string[];
  conditions: string[];
  medications: string[];
  health_goals: string[];
  medical_notes: string | null;
  mental_health_notes: string | null;
};

export type WorkEntry = {
  occupation: string | null;
  employer: string | null;
  industry: string | null;
  work_mode: string | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  work_days: string[];
  current_projects: string[];
  is_primary: boolean;
};

export type UserWork = {
  roles: WorkEntry[];
  productivity_goals: string[];
  skills: string[];
  career_goals: string[];
};

export type CheckInFrequency = "off" | "low" | "medium" | "high";

export type UserOrbitPreferences = {
  communication_style: string;
  check_in_frequency: CheckInFrequency;
  proactive_nudges_enabled: boolean;
  nickname: string | null;
  topics_to_avoid: string[];
  custom_instructions: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  snooze_until: string | null;
  last_proactive_check_in_at: string | null;
};

export type UserEmergency = {
  contacts: { name: string; relationship: string | null; phone: string }[];
  notes: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  contact: UserContact;
  identity: UserIdentity;
  location: UserLocation;
  goals: UserGoals;
  habits: UserHabits;
  health: UserHealth;
  work: UserWork;
  orbit_preferences: UserOrbitPreferences;
  emergency: UserEmergency;
  is_active: boolean;
  is_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserProfileUpdate = {
  contact?: UserContact;
  identity?: UserIdentity;
  location?: UserLocation;
  goals?: UserGoals;
  habits?: UserHabits;
  health?: UserHealth;
  work?: UserWork;
  orbit_preferences?: UserOrbitPreferences;
  emergency?: UserEmergency;
};
