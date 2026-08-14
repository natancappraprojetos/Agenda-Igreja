// ============================================================
// AGENDA IGREJA — TypeScript Type Definitions
// ============================================================

// ---- Base entities ----

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  roles?: Role[];
  ministries?: Ministry[];
  person_roles?: PersonRole[];
  person_ministries?: PersonMinistry[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  category: 'liturgy' | 'administrative' | 'operational' | 'musical' | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PersonRole {
  id: string;
  person_id: string;
  role_id: string;
  created_at: string;
  role?: Role;
  person?: Person;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  members?: PersonMinistry[];
}

export interface PersonMinistry {
  id: string;
  person_id: string;
  ministry_id: string;
  is_leader: boolean;
  created_at: string;
  person?: Person;
  ministry?: Ministry;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
}

export interface EventType {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ---- Auth & Users ----

export type AppRoleName = 'admin' | 'anciao' | 'lider_ministerio' | 'operacional' | 'membro';

export interface AppRole {
  id: string;
  name: AppRoleName;
  description: string;
  level: number;
}

export interface User {
  id: string;
  person_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  person?: Person;
  app_roles?: UserAppRole[];
}

export interface UserAppRole {
  id: string;
  user_id: string;
  app_role_id: string;
  ministry_id: string | null;
  created_at: string;
  app_role?: AppRole;
  ministry?: Ministry;
}

// ---- Events ----

export type EventStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

export interface ChurchEvent {
  id: string;
  title: string;
  event_type_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location_id: string | null;
  ministry_id: string | null;
  responsible_person_id: string | null;
  preacher_id: string | null;
  worship_leader_id: string | null;
  description: string | null;
  notes: string | null;
  needs_sound: boolean;
  needs_worship: boolean;
  needs_deaconry: boolean;
  sound_person_id: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  event_type?: EventType;
  location?: Location;
  ministry?: Ministry;
  responsible_person?: Person;
  preacher?: Person;
  worship_leader?: Person;
  sound_person?: Person;
  participants?: EventParticipant[];
  liturgy?: Liturgy;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  person_id: string;
  role_id: string | null;
  notes: string | null;
  status: 'confirmed' | 'pending' | 'declined';
  created_at: string;
  person?: Person;
  role?: Role;
}

// ---- Schedules ----

export type ScheduleStatus = 'confirmed' | 'pending' | 'declined' | 'swapped';

export interface Schedule {
  id: string;
  event_id: string;
  person_id: string;
  role_id: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  // Joined
  event?: ChurchEvent;
  person?: Person;
  role?: Role;
}

// ---- Songs ----

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  category: string | null;
  duration_approx: string | null;
  link: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// ---- Liturgy ----

export interface LiturgyItemType {
  id: string;
  name: string;
  default_duration_minutes: number;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface LiturgyTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: LiturgyTemplateItem[];
}

export interface LiturgyTemplateItem {
  id: string;
  template_id: string;
  item_type_id: string | null;
  title: string;
  order_index: number;
  default_duration_minutes: number;
  is_fixed_time: boolean;
  fixed_time: string | null;
  notes: string | null;
  created_at: string;
  item_type?: LiturgyItemType;
}

export type LiturgyStatus = 'draft' | 'approved' | 'published';

export interface Liturgy {
  id: string;
  event_id: string;
  template_id: string | null;
  start_time: string;
  status: LiturgyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  event?: ChurchEvent;
  template?: LiturgyTemplate;
  items?: LiturgyItem[];
}

export interface LiturgyItem {
  id: string;
  liturgy_id: string;
  item_type_id: string | null;
  title: string;
  order_index: number;
  duration_minutes: number;
  is_fixed_time: boolean;
  fixed_time: string | null;
  calculated_time: string | null;
  responsible_person_id: string | null;
  song_id: string | null;
  notes: string | null;
  visibility: 'all' | 'louvor' | 'sonoplastia' | 'pregador' | 'diaconato';
  created_at: string;
  // Joined
  item_type?: LiturgyItemType;
  responsible_person?: Person;
  song?: Song;
}

// ---- Notifications ----

export type NotificationType = 'schedule' | 'change' | 'cancel' | 'reminder' | 'conflict';

export interface Notification {
  id: string;
  user_id: string | null;
  person_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  event_id: string | null;
  is_read: boolean;
  created_at: string;
  event?: ChurchEvent;
}

// ---- Audit ----

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'force_conflict';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  changed_by: string | null;
  created_at: string;
  user?: User;
}

// ---- Conflict Checking ----

export interface LocationConflict {
  event_id: string;
  event_title: string;
  event_start_time: string;
  event_end_time: string;
}

export interface PersonConflict {
  event_id: string;
  event_title: string;
  event_start_time: string;
  event_end_time: string;
  role_name: string | null;
}

// ---- Pendency ----

export interface EventPendency {
  event_id: string;
  title: string;
  date: string;
  start_time: string;
  event_type: string;
  has_preacher: boolean;
  has_worship_leader: boolean;
  has_sound: boolean;
  has_deaconry: boolean;
  has_responsible: boolean;
  has_location: boolean;
  pendency_status: 'complete' | 'pending';
}

// ---- Calendar ----

export type CalendarView = 'month' | 'week' | 'day';

// ---- Wizard ----

export interface EventWizardData {
  title: string;
  event_type_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location_id: string;
  ministry_id: string;
  responsible_person_id: string;
  preacher_id: string;
  worship_leader_id: string;
  needs_sound: boolean;
  sound_person_id: string;
  needs_worship: boolean;
  needs_deaconry: boolean;
  description: string;
  notes: string;
  participants: { person_id: string; role_id: string }[];
}

// ---- Auth Context ----

export interface AuthContextType {
  user: User | null;
  person: Person | null;
  roles: AppRoleName[];
  maxRoleLevel: number;
  isLoading: boolean;
  isAdmin: boolean;
  isLeadership: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
