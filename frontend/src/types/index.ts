export type UserRole = 'runner' | 'coach' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  level: number;
  xp: number;
  total_distance_km: number;
  total_territory_km2: number;
  faction_color: string;
  resting_hr: number;
  max_hr: number;
  is_verified: boolean;
  is_strava_connected: boolean;
  health_conditions?: string[];
  created_at: string;
}

export interface Activity {
  id: number;
  user_id: number;
  title: string;
  activity_type: string;
  distance_meters: number;
  duration_seconds: number;
  elevation_gain_meters: number;
  avg_speed_mps: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  workload_score: number;
  rpe_score: number;
  territory_captured_km2: number;
  geojson_data?: {
    type: string;
    coordinates: number[][];
  };
  source: string;
  started_at: string;
  created_at: string;
}

export interface TerritoryFeature {
  type: string;
  id: number;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    id: number;
    zone_name: string;
    area_km2: number;
    defense_points: number;
    owner_id: number;
    owner_username: string;
    owner_color: string;
    is_user_owned: boolean;
    captured_at?: string;
  };
}

export interface TerritoryGeoJSONCollection {
  type: string;
  features: TerritoryFeature[];
}

export interface ACWRMetricPoint {
  date: string;
  acute_load: number;
  chronic_load: number;
  acwr_ratio: number;
  distance_km: number;
  risk_category: string;
}

export interface ACWRDashboardSummary {
  current_acwr: number;
  current_risk_category: string;
  acute_workload_7d: number;
  chronic_workload_28d: number;
  total_distance_7d_km: number;
  total_distance_28d_km: number;
  injury_risk_percentage: number;
  recommendation_badge: string;
  weekly_history: ACWRMetricPoint[];
}

export interface BiometricDayData {
  date: string;
  day_name: string;
  hrv_rmssd?: number;
  hrv_baseline: number;
  resting_hr?: number;
  rhr_baseline: number;
  sleep_hours?: number;
  sleep_quality?: number;
  readiness_score?: number;
  readiness_category?: string;
  glycogen_restored?: number;
}

export interface BiometricsDashboardData {
  has_data: boolean;
  current_readiness_score?: number;
  current_readiness_category?: string;
  current_hrv_rmssd?: number;
  current_resting_hr?: number;
  current_sleep_hours?: number;
  current_sleep_quality?: number;
  history: BiometricDayData[];
}

export interface BiometricEntryPayload {
  metric_date?: string;
  hrv_rmssd: number;
  resting_hr: number;
  sleep_hours: number;
  sleep_quality?: number;
}

export interface DailyCoachBriefing {
  title: string;
  greeting: string;
  injury_risk_assessment: string;
  acwr_status_summary: string;
  recommended_workout: string;
  suggested_target_zone: string;
  motivational_quote: string;
}

export interface WorkoutDay {
  day_of_week: string;
  day_name?: string;
  workout_type: string;
  title: string;
  distance_km: number;
  duration_minutes: number;
  target_hr_zone: string;
  target_pace?: string;
  description: string;
  intensity_rpe: number;
  is_rest_day?: boolean;
  pace_target?: string;
}

export interface TrainingWeek {
  week_number: number;
  theme: string;
  focus?: string;
  weekly_distance_km?: number;
  total_distance_km?: number;
  target_acwr?: number;
  days?: WorkoutDay[];
  workouts?: WorkoutDay[];
}

export interface AdaptiveTrainingPlan {
  plan_title?: string;
  plan_name?: string;
  goal_distance: string;
  fitness_level: string;
  duration_weeks: number;
  total_planned_distance_km: number;
  coach_strategy_notes?: string;
  medical_constraint_notes?: string;
  target_event_date?: string;
  weeks: TrainingWeek[];
}

export interface WorkoutPlanGeneratorRequest {
  goal_distance?: '5K' | '10K' | 'Half Marathon' | 'Marathon' | 'Territory Conquest' | string;
  target_race_distance?: string;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced' | string;
  duration_weeks?: number;
  days_per_week?: number;
  target_event_date?: string;
  notes?: string;
}

export interface SeasonInfo {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  seconds_remaining: number;
  reward_xp: number;
  is_active: boolean;
}

export interface FactionStanding {
  name: string;
  faction_color: string;
  total_territory_km2: number;
  share_percentage: number;
  active_runners: number;
  is_user_faction: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  faction_color: string;
  total_territory_km2: number;
  total_distance_km: number;
  level: number;
  xp?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
  error?: {
    code: string;
    details?: any;
  };
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  user: User;
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
}
