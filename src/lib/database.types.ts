// Types that describe the database, so TypeScript can check every query.
// They mirror supabase/migrations/0001_schema.sql and 0002_security_and_functions.sql.
// If you change the SQL, update this file too.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RequestType = "quote" | "service";
export type RequestStatus = "received" | "assigned" | "scheduled" | "done";
export type RequestUrgency = "critical" | "high" | "normal" | "low";
export type SiteType =
  | "farm"
  | "factory"
  | "hotel_real_estate"
  | "construction"
  | "government"
  | "oil_gas"
  | "other";
export type ProductArea =
  | "submersible_pumps"
  | "centrifugal_pumps"
  | "chemical_dosing"
  | "firefighting_systems"
  | "water_treatment"
  | "pressure_booster"
  | "solar_pumps"
  | "sanitary_pumps"
  | "not_sure";
export type WaterSource = "borehole" | "river_well" | "municipal" | "tank" | "other";
export type WaterNeedBand = "under_5k" | "from_5k_to_20k" | "from_20k_to_100k" | "over_100k" | "not_sure";
export type QuoteTimeline = "asap" | "within_1_month" | "one_to_3_months" | "over_3_months" | "just_exploring";
export type IssueType = "emergency_repair" | "scheduled_maintenance" | "spare_parts" | "technical_advice";
export type NoteVisibility = "public" | "internal";
export type NotificationChannel = "email" | "whatsapp";
export type NotificationEvent = "received" | "status_change" | "note_added";

export type RequestRow = {
  id: string;
  reference: string;
  type: RequestType;
  status: RequestStatus;
  urgency: RequestUrgency;
  full_name: string;
  company: string | null;
  email: string;
  phone: string;
  email_normalized: string;
  phone_normalized: string;
  state: string | null;
  town: string | null;
  site_type: SiteType | null;
  product_area: ProductArea | null;
  water_source: WaterSource | null;
  daily_water_need: WaterNeedBand | null;
  preferred_timeline: QuoteTimeline | null;
  notes: string | null;
  equipment_or_site: string | null;
  issue_type: IssueType | null;
  description: string | null;
  assigned_engineer_id: string | null;
  done_at: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
};

// What the public form may send. Status, engineer, reference and dates are
// set by the database, never by the public.
export type RequestInsert = {
  id?: string;
  type: RequestType;
  urgency?: RequestUrgency;
  full_name: string;
  company?: string | null;
  email: string;
  phone: string;
  state?: string | null;
  town?: string | null;
  site_type?: SiteType | null;
  product_area?: ProductArea | null;
  water_source?: WaterSource | null;
  daily_water_need?: WaterNeedBand | null;
  preferred_timeline?: QuoteTimeline | null;
  notes?: string | null;
  equipment_or_site?: string | null;
  issue_type?: IssueType | null;
  description?: string | null;
};

export type RequestUpdate = {
  status?: RequestStatus;
  urgency?: RequestUrgency;
  assigned_engineer_id?: string | null;
};

export type RequestPhotoRow = {
  id: string;
  request_id: string;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  created_at: string;
};

export type StatusHistoryRow = {
  id: number;
  request_id: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  changed_by: string | null;
  note: string | null;
  changed_at: string;
};

export type RequestNoteRow = {
  id: string;
  request_id: string;
  visibility: NoteVisibility;
  body: string;
  author_id: string | null;
  created_at: string;
};

export type NotificationLogRow = {
  id: number;
  request_id: string;
  status_history_id: number | null;
  event: NotificationEvent;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  message: string;
  delivery_status: "simulated";
  created_at: string;
};

export type EngineerRow = {
  id: string;
  full_name: string;
  specialty: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type StaffMemberRow = {
  user_id: string;
  full_name: string;
  created_at: string;
};

// Shape returned by the track_request() database function.
export type TrackingResult = {
  reference: string;
  type: RequestType;
  status: RequestStatus;
  submitted_at: string;
  updated_at: string;
  summary: string;
  engineer_first_name: string | null;
  timeline: { status: RequestStatus; at: string }[];
  public_notes: { body: string; at: string }[];
};

export type DashboardStats = {
  open: number;
  critical_open: number;
  completed_this_week: number;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert = never, Update = never, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rels;
};

type RequestChild = [
  {
    foreignKeyName: string;
    columns: ["request_id"];
    isOneToOne: false;
    referencedRelation: "requests";
    referencedColumns: ["id"];
  },
];

export type Database = {
  public: {
    Tables: {
      requests: Table<
        RequestRow,
        RequestInsert,
        RequestUpdate,
        [
          {
            foreignKeyName: "requests_assigned_engineer_id_fkey";
            columns: ["assigned_engineer_id"];
            isOneToOne: false;
            referencedRelation: "engineers";
            referencedColumns: ["id"];
          },
        ]
      >;
      request_photos: Table<
        RequestPhotoRow,
        Pick<RequestPhotoRow, "request_id" | "storage_path" | "mime_type" | "size_bytes">,
        never,
        RequestChild
      >;
      status_history: Table<StatusHistoryRow, never, never, RequestChild>;
      request_notes: Table<
        RequestNoteRow,
        Pick<RequestNoteRow, "request_id" | "visibility" | "body" | "author_id">,
        never,
        RequestChild
      >;
      notifications_log: Table<NotificationLogRow, never, never, RequestChild>;
      engineers: Table<EngineerRow>;
      staff_members: Table<StaffMemberRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      reference_for_new_request: { Args: { p_request_id: string }; Returns: string | null };
      track_request: { Args: { p_reference: string; p_contact: string }; Returns: Json };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      staff_update_request: {
        Args: {
          p_request_id: string;
          p_status?: RequestStatus;
          p_engineer_id?: string;
          p_clear_engineer?: boolean;
          p_public_note?: string;
          p_internal_note?: string;
        };
        Returns: undefined;
      };
      staff_dashboard_stats: { Args: Record<string, never>; Returns: Json };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      normalize_ng_phone: { Args: { p_phone: string }; Returns: string | null };
    };
    Enums: {
      request_type: RequestType;
      request_status: RequestStatus;
      request_urgency: RequestUrgency;
      site_type: SiteType;
      product_area: ProductArea;
      water_source: WaterSource;
      water_need_band: WaterNeedBand;
      quote_timeline: QuoteTimeline;
      issue_type: IssueType;
      note_visibility: NoteVisibility;
      notification_channel: NotificationChannel;
      notification_event: NotificationEvent;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
