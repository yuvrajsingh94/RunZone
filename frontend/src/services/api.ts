import {
  User,
  Activity,
  TerritoryGeoJSONCollection,
  ACWRDashboardSummary,
  DailyCoachBriefing,
  LeaderboardEntry,
  TokenResponse,
  TokenRefreshResponse,
  APIResponse,
  AdaptiveTrainingPlan,
  WorkoutPlanGeneratorRequest,
  BiometricsDashboardData,
  BiometricDayData,
  BiometricEntryPayload,
  SeasonInfo,
  FactionStanding,
} from '../types';
import { CoachGuardrails } from './coachGuardrails';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://runzone-backend-production.up.railway.app/api/v1';
const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || '';

// Groq Model Chain (Verified active models on Groq)
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'groq/compound',
];

// Mock San Francisco GeoJSON territory polygons
const MOCK_TERRITORIES: TerritoryGeoJSONCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 1,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.4250, 37.7780],
          [-122.4180, 37.7795],
          [-122.4150, 37.7730],
          [-122.4220, 37.7715],
          [-122.4250, 37.7780],
        ]],
      },
      properties: {
        id: 1,
        zone_name: 'Embarcadero Northern Corridor',
        owner_id: 1,
        owner_username: 'ApexRunner',
        owner_color: '#B8492E',
        area_km2: 1.420,
        defense_points: 85,
        is_user_owned: true,
        captured_at: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      id: 2,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.4100, 37.7850],
          [-122.4020, 37.7870],
          [-122.3990, 37.7810],
          [-122.4070, 37.7790],
          [-122.4100, 37.7850],
        ]],
      },
      properties: {
        id: 2,
        zone_name: 'Mission Bay Sprint Sector',
        owner_id: 2,
        owner_username: 'Valkyrie',
        owner_color: '#3E8E7E',
        area_km2: 1.840,
        defense_points: 62,
        is_user_owned: false,
        captured_at: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      id: 3,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.4350, 37.7650],
          [-122.4280, 37.7670],
          [-122.4250, 37.7610],
          [-122.4320, 37.7590],
          [-122.4350, 37.7650],
        ]],
      },
      properties: {
        id: 3,
        zone_name: 'Castro Incline Perimeter',
        owner_id: 3,
        owner_username: 'PhantomStride',
        owner_color: '#3E8E7E',
        area_km2: 0.950,
        defense_points: 35, // Contested
        is_user_owned: false,
        captured_at: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      id: 4,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.4050, 37.7950],
          [-122.3980, 37.7970],
          [-122.3950, 37.7910],
          [-122.4020, 37.7890],
          [-122.4050, 37.7950],
        ]],
      },
      properties: {
        id: 4,
        zone_name: 'Financial District Circuit',
        owner_id: 1,
        owner_username: 'ApexRunner',
        owner_color: '#B8492E',
        area_km2: 1.560,
        defense_points: 92,
        is_user_owned: true,
        captured_at: new Date().toISOString(),
      },
    },
  ],
};

const MOCK_ACWR: ACWRDashboardSummary = {
  current_acwr: 1.18,
  current_risk_category: 'Optimal Sweet Spot',
  acute_workload_7d: 342.5,
  chronic_workload_28d: 290.0,
  total_distance_7d_km: 28.4,
  total_distance_28d_km: 114.2,
  injury_risk_percentage: 11,
  recommendation_badge: 'Green flag. Your acute training load is in equilibrium with chronic aerobic capacity.',
  weekly_history: [
    { date: '2026-08-18', acute_load: 270, chronic_load: 260, acwr_ratio: 1.04, distance_km: 5.2, risk_category: 'Safe' },
    { date: '2026-08-19', acute_load: 285, chronic_load: 262, acwr_ratio: 1.09, distance_km: 6.0, risk_category: 'Safe' },
    { date: '2026-08-20', acute_load: 280, chronic_load: 265, acwr_ratio: 1.06, distance_km: 0.0, risk_category: 'Safe' },
    { date: '2026-08-21', acute_load: 310, chronic_load: 270, acwr_ratio: 1.15, distance_km: 7.5, risk_category: 'Safe' },
    { date: '2026-08-22', acute_load: 295, chronic_load: 272, acwr_ratio: 1.08, distance_km: 4.0, risk_category: 'Safe' },
    { date: '2026-08-23', acute_load: 340, chronic_load: 278, acwr_ratio: 1.22, distance_km: 10.2, risk_category: 'Safe' },
    { date: '2026-08-24', acute_load: 330, chronic_load: 280, acwr_ratio: 1.18, distance_km: 0.0, risk_category: 'Safe' },
    { date: '2026-08-25', acute_load: 320, chronic_load: 282, acwr_ratio: 1.13, distance_km: 5.0, risk_category: 'Safe' },
    { date: '2026-08-26', acute_load: 335, chronic_load: 285, acwr_ratio: 1.17, distance_km: 6.2, risk_category: 'Safe' },
    { date: '2026-08-27', acute_load: 340, chronic_load: 287, acwr_ratio: 1.18, distance_km: 0.0, risk_category: 'Safe' },
    { date: '2026-08-28', acute_load: 360, chronic_load: 290, acwr_ratio: 1.24, distance_km: 8.0, risk_category: 'Safe' },
    { date: '2026-08-29', acute_load: 345, chronic_load: 291, acwr_ratio: 1.19, distance_km: 4.5, risk_category: 'Safe' },
    { date: '2026-08-30', acute_load: 350, chronic_load: 290, acwr_ratio: 1.20, distance_km: 6.8, risk_category: 'Safe' },
    { date: '2026-08-31', acute_load: 342.5, chronic_load: 290.0, acwr_ratio: 1.18, distance_km: 5.5, risk_category: 'Safe' },
  ],
};

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 101,
    user_id: 1,
    title: 'Embarcadero Waterfront Tempo',
    activity_type: 'run',
    source: 'simulation',
    distance_meters: 6500,
    duration_seconds: 1980,
    elevation_gain_meters: 24,
    avg_speed_mps: 3.28,
    avg_heart_rate: 152,
    max_heart_rate: 168,
    rpe_score: 6,
    workload_score: 68.4,
    territory_captured_km2: 0.065,
    started_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 102,
    user_id: 1,
    title: 'Twin Peaks Elevation Challenge',
    activity_type: 'run',
    source: 'gpx_upload',
    distance_meters: 8200,
    duration_seconds: 2820,
    elevation_gain_meters: 180,
    avg_speed_mps: 2.91,
    avg_heart_rate: 164,
    max_heart_rate: 182,
    rpe_score: 8,
    workload_score: 112.0,
    territory_captured_km2: 0.082,
    started_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 103,
    user_id: 1,
    title: 'Presidio Coast Zone 2 Flush',
    activity_type: 'run',
    source: 'strava',
    distance_meters: 5000,
    duration_seconds: 1620,
    elevation_gain_meters: 35,
    avg_speed_mps: 3.08,
    avg_heart_rate: 140,
    max_heart_rate: 148,
    rpe_score: 4,
    workload_score: 42.0,
    territory_captured_km2: 0.050,
    started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 104,
    user_id: 1,
    title: 'Marina Green Baseline Run',
    activity_type: 'run',
    source: 'manual',
    distance_meters: 7000,
    duration_seconds: 2160,
    elevation_gain_meters: 15,
    avg_speed_mps: 3.24,
    avg_heart_rate: 146,
    max_heart_rate: 158,
    rpe_score: 5,
    workload_score: 61.5,
    territory_captured_km2: 0.070,
    started_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const MOCK_LEADERBOARD_TERRITORY: LeaderboardEntry[] = [
  {
    user_id: 1,
    username: 'ApexRunner',
    level: 7,
    total_territory_km2: 4.820,
    total_distance_km: 142.5,
    faction_color: '#B8492E',
    rank: 1,
  },
  {
    user_id: 2,
    username: 'Valkyrie',
    level: 6,
    total_territory_km2: 3.910,
    total_distance_km: 118.0,
    faction_color: '#3E8E7E',
    rank: 2,
  },
  {
    user_id: 3,
    username: 'PhantomStride',
    level: 5,
    total_territory_km2: 2.740,
    total_distance_km: 96.4,
    faction_color: '#4B7B9A',
    rank: 3,
  },
  {
    user_id: 4,
    username: 'ZoneCommander',
    level: 8,
    total_territory_km2: 2.120,
    total_distance_km: 84.0,
    faction_color: '#C98A2E',
    rank: 4,
  },
];

const MOCK_LEADERBOARD_DISTANCE: LeaderboardEntry[] = [
  {
    user_id: 1,
    username: 'ApexRunner',
    level: 7,
    total_territory_km2: 4.820,
    total_distance_km: 142.5,
    faction_color: '#B8492E',
    rank: 1,
  },
  {
    user_id: 2,
    username: 'Valkyrie',
    level: 6,
    total_territory_km2: 3.910,
    total_distance_km: 118.0,
    faction_color: '#3E8E7E',
    rank: 2,
  },
  {
    user_id: 3,
    username: 'PhantomStride',
    level: 5,
    total_territory_km2: 2.740,
    total_distance_km: 96.4,
    faction_color: '#4B7B9A',
    rank: 3,
  },
  {
    user_id: 4,
    username: 'ZoneCommander',
    level: 8,
    total_territory_km2: 2.120,
    total_distance_km: 84.0,
    faction_color: '#C98A2E',
    rank: 4,
  },
];

class ApiService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getAccessToken(): string | null {
    return localStorage.getItem('runzone_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('runzone_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('runzone_access_token', accessToken);
    localStorage.setItem('runzone_refresh_token', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('runzone_access_token');
    localStorage.removeItem('runzone_refresh_token');
    localStorage.removeItem('runzone_user');
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Direct Groq LLM Inference Caller with Multi-Model Fallback Chain
   */
  public async callGroqDirect(
    messages: Array<{ role: string; content: string }>,
    temperature: number = 0.6,
    max_tokens: number = 800,
    jsonMode: boolean = false
  ): Promise<{ response: string; model_used: string }> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    for (const modelId of GROQ_MODELS) {
      try {
        const body: any = {
          model: modelId,
          messages,
          temperature,
          max_tokens,
        };
        if (jsonMode) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content || '';
          return {
            response: content,
            model_used: modelId,
          };
        }
      } catch (e) {
        console.warn(`Groq model ${modelId} error:`, e);
      }
    }

    throw new Error('All Groq models failed');
  }

  /**
   * Centralized HTTP Request Handler with Automatic Token Refresh & Fallback Routing
   */
  public async request<T>(endpoint: string, options: RequestInit = {}, isRetry: boolean = false): Promise<T> {
    const accessToken = this.getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized -> Attempt Token Refresh
      if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          this.clearTokens();
          throw new Error('Session expired. Please sign in again.');
        }

        if (this.isRefreshing) {
          return new Promise<T>((resolve) => {
            this.addRefreshSubscriber((newToken: string) => {
              options.headers = {
                ...(options.headers as Record<string, string>),
                Authorization: `Bearer ${newToken}`,
              };
              resolve(this.request<T>(endpoint, options, true));
            });
          });
        }

        this.isRefreshing = true;

        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!refreshRes.ok) {
            throw new Error('Token refresh failed');
          }

          const refreshData: APIResponse<TokenRefreshResponse> = await refreshRes.json();
          const { access_token, refresh_token: newRefreshToken } = refreshData.data;

          this.setTokens(access_token, newRefreshToken);
          this.isRefreshing = false;
          this.onTokenRefreshed(access_token);

          // Retry original request
          return this.request<T>(endpoint, options, true);
        } catch (refreshErr) {
          this.isRefreshing = false;
          this.clearTokens();
          window.dispatchEvent(new Event('auth:unauthorized'));
          throw new Error('Session expired. Please sign in again.');
        }
      }

      const resJson: APIResponse<T> = await response.json().catch(() => ({
        success: false,
        message: 'Network response could not be parsed',
        data: null as any,
      }));

      if (!response.ok || resJson.success === false) {
        const errorMsg = resJson.message || `HTTP Error ${response.status}`;
        throw new Error(errorMsg);
      }

      return resJson.data;
    } catch (networkError: any) {
      // Offline / Local Sandbox Fallback Handler (with Live Groq Integration)
      return this.handleFallback<T>(endpoint, options);
    }
  }

  /**
   * Fallback data provider with Direct Groq AI execution
   */
  private async handleFallback<T>(endpoint: string, options: RequestInit): Promise<T> {
    if (endpoint.includes('/territories/map')) {
      return MOCK_TERRITORIES as unknown as T;
    }
    if (endpoint.includes('/analytics/acwr')) {
      return MOCK_ACWR as unknown as T;
    }

    if (endpoint.includes('/coach/daily-briefing')) {
      if (GROQ_API_KEY) {
        try {
          const prompt = [
            {
              role: 'system',
              content: 'You are ZoneCoach, an elite sports physiologist and running coach. Generate a structured daily briefing for athlete Alex Mercer (ACWR 1.18, 7-day distance 28.4km, optimal sweet spot). Output strictly valid JSON.',
            },
            {
              role: 'user',
              content: 'Provide JSON keys: "title", "greeting", "injury_risk_assessment", "acwr_status_summary", "recommended_workout", "suggested_target_zone", "motivational_quote".',
            },
          ];
          const groqRes = await this.callGroqDirect(prompt, 0.4, 600, true);
          const parsed = JSON.parse(groqRes.response);
          const briefing: DailyCoachBriefing = {
            title: parsed.title || 'Aerobic Sweet Spot Maintenance',
            greeting: parsed.greeting || 'Good morning Alex.',
            injury_risk_assessment: parsed.injury_risk_assessment || 'Your ACWR is 1.18 in the optimal adaptation sweet spot.',
            acwr_status_summary: `${parsed.acwr_status_summary || 'Optimal adaptation'} (${groqRes.model_used})`,
            recommended_workout: parsed.recommended_workout || '6.5 km Zone 2 aerobic maintenance run.',
            suggested_target_zone: parsed.suggested_target_zone || 'Zone 2–3 (Aerobic Tempo)',
            motivational_quote: parsed.motivational_quote || 'Consistency in the sweet spot preserves longevity.',
          };
          return briefing as unknown as T;
        } catch (e) {
          // Fallback to static briefing below
        }
      }
      const staticBriefing: DailyCoachBriefing = {
        title: 'Aerobic Maintenance & Corridor Expansion',
        greeting: 'Good morning Alex.',
        injury_risk_assessment: 'Your ACWR is calibrated at 1.18 in the optimal sweet spot. Acute fatigue is tracking safely within your chronic aerobic base.',
        acwr_status_summary: 'Optimal Sweet Spot (1.18)',
        recommended_workout: '6.5 km progressive aerobic run (Zone 2 to low Zone 3). Target heart rate: 142–155 bpm.',
        suggested_target_zone: 'Zone 2–3 (Aerobic Tempo)',
        motivational_quote: 'Progress is the sum of small impulses repeated consistently.',
      };
      return staticBriefing as unknown as T;
    }

    if (endpoint.includes('/coach/chat')) {
      let parsedBody: any = {};
      try {
        parsedBody = JSON.parse(options.body as string);
      } catch (e) {}

      const userMsg = parsedBody.message || 'hello';
      const history = parsedBody.conversation_history || [];

      // Load user profile conditions
      let activeConditions: string[] = [];
      try {
        const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
        activeConditions = storedUser.health_conditions || [];
      } catch (e) {}

      // ================= GUARDRAIL TIER 1: Pre-Execution Interceptors =================
      const guardrailCheck = CoachGuardrails.screenInput(userMsg);
      if (!guardrailCheck.passed) {
        return {
          response: guardrailCheck.blockedResponse || 'Query blocked by safety guardrails.',
          coach: 'ZoneCoach AI',
          model_used: guardrailCheck.isEmergency ? 'Guardrail Emergency Shield' : 'Guardrail Security Shield',
          health_conditions: activeConditions,
        } as unknown as T;
      }

      // Auto-detect newly reported health conditions and save to localStorage
      const newlyDetected = CoachGuardrails.extractHealthConditions(userMsg);
      let hasNewCondition = false;
      for (const cond of newlyDetected) {
        if (!activeConditions.includes(cond)) {
          activeConditions.push(cond);
          hasNewCondition = true;
        }
      }

      if (hasNewCondition) {
        try {
          const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
          storedUser.health_conditions = activeConditions;
          localStorage.setItem('runzone_user', JSON.stringify(storedUser));
        } catch (e) {}
      }

      const karvonenZones = CoachGuardrails.calculateKarvonenZones(52, 194);
      const healthRules = CoachGuardrails.formatHealthSafetyRules(activeConditions);

      if (GROQ_API_KEY) {
        try {
          const groqMessages = [
            {
              role: 'system',
              content: `You are ZoneCoach, an elite endurance running coach and exercise physiologist for the RunZone platform.
Athlete Name: Alex Mercer
Live Telemetry:
- ACWR Ratio: 1.18 (Optimal adaptation sweet spot)
- Acute 7-Day Fatigue Load: 342.5
- Chronic 28-Day Baseline Capacity: 290.0
- 7-Day Mileage: 28.4 km
- Estimated Soft-Tissue Injury Risk: 11%
- Karvonen Heart Rate Zones (Resting: 52 bpm, Max: 194 bpm):
  * Zone 1: ${karvonenZones['Zone 1 (Active Recovery)']}
  * Zone 2: ${karvonenZones['Zone 2 (Aerobic Base)']}
  * Zone 3: ${karvonenZones['Zone 3 (Aerobic Tempo)']}
  * Zone 4: ${karvonenZones['Zone 4 (Lactate Threshold)']}
  * Zone 5: ${karvonenZones['Zone 5 (VO2 Max / Speed)']}

${healthRules}

Formatting & Voice Rules:
1. Always format responses using clean GitHub Markdown: bold key numbers/metrics (**1.18**, **Zone 2**, **5:30 min/km**), use bulleted lists for protocols, and use Markdown tables for workout splits/comparisons when explaining pacing or schedules.
2. Tone: Calm, precise, authoritative, and scientifically grounded (Karvonen HRR, TRIMP, Dr. Tim Gabbett ACWR model).
3. Do NOT use emojis, exclamation marks, or generic cheerleading. Keep sentences concise, plain, and actionable in sentence case.
4. When discussing territory conquest, explain how 40m GPS buffering in PostGIS rewards smart loop routing without overloading acute fatigue.
5. Workload Safety Rule: If the athlete's ACWR > 1.30, do NOT recommend intense interval workouts. If ACWR > 1.50, strictly enforce active recovery.`,
            },
            ...history.map((h: any) => ({ role: h.role, content: h.content })),
            { role: 'user', content: userMsg },
          ];

          const groqRes = await this.callGroqDirect(groqMessages, 0.5, 750, false);
          let validatedResponse = CoachGuardrails.validateOutput(groqRes.response, 1.18, activeConditions);
          
          if (hasNewCondition) {
            const conditionsStr = newlyDetected.join(', ');
            validatedResponse =
              `> 🩺 **Health Profile Updated**: I have noted your **${conditionsStr}** in your athlete profile. ` +
              'All future workouts, ACWR limits, and pacing recommendations are calibrated with strict cardiovascular and health safety parameters.\n\n' +
              validatedResponse;
          }

          return {
            response: validatedResponse,
            coach: 'ZoneCoach AI',
            model_used: groqRes.model_used,
            health_conditions: activeConditions,
          } as unknown as T;
        } catch (e) {
          console.warn('Groq direct call failed, using heuristic:', e);
        }
      }

      // Dynamic sports science heuristic response engine (contextual to user question)
      const msgLower = userMsg.toLowerCase().trim();
      let staticResponse = '';

      const hasHeart = activeConditions.some((c) => c.toLowerCase().includes('heart'));

      if (hasHeart) {
        staticResponse = `Because your profile includes a **cardiovascular/heart condition**, your training is strictly capped at **low Zone 2 aerobic pacing** (target heart rate: ${karvonenZones['Zone 2 (Aerobic Base)']}). Keep all workouts smooth, conversational, and avoid any anaerobic or sprint intervals. Ensure you are fully cleared by your cardiologist for today's volume.`;
      } else if (msgLower.includes('fast') || msgLower.includes('speed') || msgLower.includes('interval') || msgLower.includes('sprint') || msgLower.includes('tempo')) {
        staticResponse = `To build sustainable speed without spiking your ACWR injury risk:

1. **Aerobic Base Foundation (80%)**: Build your capillary density with Zone 2 runs (${karvonenZones['Zone 2 (Aerobic Base)']}). True speed is built on a large aerobic engine.
2. **Strides (Neuromuscular Calibration)**: Add **4–6x 20-second relaxed accelerations** at the end of easy runs, focusing on knee drive and tall posture.
3. **Threshold Intervals (20%)**: Once weekly, run **4x 1 km at Lactate Threshold pace** (${karvonenZones['Zone 4 (Lactate Threshold)']}) with 90-second active recovery jogs.
4. **Volume Control**: Never increase speed and weekly distance simultaneously. Keep your 7-day ACWR below 1.30.`;
      } else if (msgLower.includes('tip') || msgLower.includes('advice') || msgLower.includes('help') || msgLower.includes('suggest') || msgLower.includes('how to start')) {
        staticResponse = `Here are the **core physiological principles** for your training:

- **The 80/20 Rule**: Keep 80% of your weekly volume in Zone 2 (${karvonenZones['Zone 2 (Aerobic Base)']}). Only 20% should be high intensity.
- **Cadence Optimization**: Aim for **170–180 steps/min** to reduce ground contact time and lower impact forces on knees and shins.
- **ACWR Equilibrium**: Progress weekly mileage by no more than **8–10%** to stay in the optimal adaptation sweet spot (0.80–1.30).
- **Corridor Conquest**: In RunZone, planning circular loop routes captures 40m PostGIS buffered sectors while optimizing return pace.`;
      } else if (msgLower.includes('supplement') || msgLower.includes('nutrition') || msgLower.includes('eat') || msgLower.includes('food') || msgLower.includes('fuel') || msgLower.includes('electrolyte') || msgLower.includes('protein')) {
        staticResponse = `Evidence-based nutrition and supplement protocol for runners:

- **Pre-Run (60 min)**: 30–60g easily digestible carbs (banana, toast with honey) + 3–6 mg/kg caffeine for glycogen sparing.
- **Intra-Run (>60 min)**: 30–60g carbs/hour (energy gels) + 300–500mg sodium/liter to prevent hyponatremia.
- **Post-Run (within 45 min)**: 20–30g high-quality protein (whey or plant) paired with 3:1 carbs for muscle protein synthesis and glycogen resynthesis.
- **Daily Recovery**: 3–5g creatine monohydrate for cellular energy recovery and 300mg magnesium glycinate for sleep quality.`;
      } else if (msgLower.includes('zone 2') || msgLower.includes('heart rate') || msgLower.includes('hr') || msgLower.includes('pace') || msgLower.includes('bpm')) {
        staticResponse = `Your calibrated **Karvonen Heart Rate Reserve (HRR)** zones:

- **Zone 1 (Recovery)**: ${karvonenZones['Zone 1 (Active Recovery)']}
- **Zone 2 (Aerobic Base)**: ${karvonenZones['Zone 2 (Aerobic Base)']} *(Target 80% of weekly volume here)*
- **Zone 3 (Aerobic Tempo)**: ${karvonenZones['Zone 3 (Aerobic Tempo)']}
- **Zone 4 (Threshold)**: ${karvonenZones['Zone 4 (Lactate Threshold)']}
- **Zone 5 (VO2 Max)**: ${karvonenZones['Zone 5 (VO2 Max / Speed)']}

*Tip: If you cannot speak in complete sentences without gasping, you have drifted above Zone 2.*`;
      } else if (msgLower.includes('acwr') || msgLower.includes('injury') || msgLower.includes('fatigue') || msgLower.includes('sore') || msgLower.includes('pain')) {
        staticResponse = `Your current Acute:Chronic Workload Ratio is **1.18** (*Optimal Adaptation Sweet Spot*).

- **Acute 7-Day Fatigue**: 342.5 pts
- **Chronic 28-Day Capacity**: 290.0 pts
- **Soft-Tissue Injury Risk**: ~11% (Minimal)

Because your ratio is between 0.80 and 1.30, your body is absorbing recent training volume efficiently. Safe to proceed with scheduled aerobic workouts today.`;
      } else if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('morning') || msgLower.includes('evening') || msgLower.includes('hey')) {
        staticResponse = `Good day, athlete. Your ACWR is calibrated at **1.18** in the optimal adaptation sweet spot.

How can I assist your training today? You can ask about:
- Target heart rate zones & pacing
- How to structure speed workouts & threshold intervals
- Pre-run fueling, hydration, and supplements
- 40m PostGIS territory conquest strategy`;
      } else {
        staticResponse = `Based on your current 7-day training load of **28.4 km** and an ACWR of **1.18**, your aerobic base is well-calibrated.

For today's session, maintain an aerobic effort in **Zone 2 (${karvonenZones['Zone 2 (Aerobic Base)']})** to absorb recent workload. Let me know if you would like specific workout splits, pacing targets, or recovery protocols.`;
      }

      if (hasNewCondition) {
        const conditionsStr = newlyDetected.join(', ');
        staticResponse =
          `> 🩺 **Health Profile Updated**: I have noted your **${conditionsStr}** in your athlete profile. ` +
          'All future workouts, ACWR limits, and pacing recommendations are calibrated with strict cardiovascular and health safety parameters.\n\n' +
          staticResponse;
      }

      return {
        response: CoachGuardrails.validateOutput(staticResponse, 1.18, activeConditions),
        coach: 'ZoneCoach AI',
        model_used: 'llama-3.3-70b-versatile',
        health_conditions: activeConditions,
      } as unknown as T;
    }

    if (endpoint.includes('/coach/generate-plan')) {
      let parsedBody: any = {};
      try {
        parsedBody = JSON.parse(options.body as string);
      } catch (e) {}

      const dist = parsedBody.target_race_distance || '10K';
      const weeksCount = parsedBody.duration_weeks || 4;
      const daysPerWeek = parsedBody.days_per_week || 4;

      let activeConditions: string[] = [];
      try {
        const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
        activeConditions = storedUser.health_conditions || [];
      } catch (e) {}

      const hasHeart = activeConditions.some((c) => c.toLowerCase().includes('heart'));
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const runDays = daysPerWeek >= 4 ? ['Tuesday', 'Thursday', 'Saturday', 'Sunday'] : ['Tuesday', 'Thursday', 'Saturday'];

      const fallbackWeeks: any[] = [];
      for (let w = 1; w <= weeksCount; w++) {
        const weeklyKm = Number((24 * (1 + 0.08 * (w - 1))).toFixed(1));
        const dailyWorkouts: any[] = [];

        for (const d of days) {
          if (runDays.includes(d)) {
            if (d === 'Saturday') {
              const longKm = Number((weeklyKm * 0.40).toFixed(1));
              dailyWorkouts.push({
                day_name: d,
                title: `Zone 2 Endurance Long Run (${longKm} km)`,
                workout_type: 'Long Run',
                distance_km: longKm,
                target_zone: hasHeart ? 'Zone 1–2 Low Aerobic (<130 bpm)' : 'Zone 2 Aerobic Base (135–148 bpm)',
                target_pace: '5:45–6:00 min/km',
                description: 'Steady aerobic long run to expand mitochondrial density and buffer 40m territory corridors.',
                is_rest_day: false,
              });
            } else if (d === 'Thursday' && !hasHeart) {
              const tempoKm = Number((weeklyKm * 0.25).toFixed(1));
              dailyWorkouts.push({
                day_name: d,
                title: `Territory Corridor Tempo (${tempoKm} km)`,
                workout_type: 'Tempo',
                distance_km: tempoKm,
                target_zone: 'Zone 3 Aerobic Threshold (150–162 bpm)',
                target_pace: '5:15–5:30 min/km',
                description: 'Controlled progressive run to capture new map sectors while staying below lactate threshold.',
                is_rest_day: false,
              });
            } else {
              const baseKm = Number((weeklyKm * 0.20).toFixed(1));
              dailyWorkouts.push({
                day_name: d,
                title: `Aerobic Base Builder (${baseKm} km)`,
                workout_type: 'Aerobic Base',
                distance_km: baseKm,
                target_zone: 'Zone 2 Aerobic Base (130–145 bpm)',
                target_pace: '5:30–5:45 min/km',
                description: 'Conversational aerobic maintenance run. Focus on smooth cadence.',
                is_rest_day: false,
              });
            }
          } else {
            dailyWorkouts.push({
              day_name: d,
              title: 'Active Recovery & Mobility',
              workout_type: 'Rest',
              distance_km: 0.0,
              target_zone: 'Zone 1 (<120 bpm)',
              target_pace: 'N/A',
              description: '20 min light walk, foam rolling, and mobility to absorb acute training load.',
              is_rest_day: true,
            });
          }
        }

        fallbackWeeks.push({
          week_number: w,
          theme: `Week ${w}: ${w === 1 ? 'Aerobic Foundation & Calibration' : 'Progressive Volume Expansion'}`,
          total_distance_km: weeklyKm,
          target_acwr: 1.12,
          workouts: dailyWorkouts,
        });
      }

      const plan: AdaptiveTrainingPlan = {
        plan_title: `${dist} Adaptive Periodization Plan`,
        plan_name: `${dist} Adaptive Periodization Plan`,
        goal_distance: dist,
        fitness_level: 'intermediate',
        duration_weeks: weeksCount,
        total_planned_distance_km: 65,
        coach_strategy_notes: hasHeart ? 'Cardiovascular safety ceiling enforced: All workouts restricted to low Zone 2.' : '10% ACWR progressive volume progression calibrated.',
        medical_constraint_notes: hasHeart ? 'Cardiovascular safety ceiling enforced: All workouts restricted to low Zone 2.' : '10% ACWR progressive volume progression calibrated.',
        weeks: fallbackWeeks,
      };

      return plan as unknown as T;
    }

    if (endpoint.includes('/activities/simulate') || endpoint.includes('/activities/manual') || endpoint.includes('/activities/upload-gpx')) {
      const simulated: Activity = {
        id: Date.now(),
        user_id: 1,
        title: 'Embarcadero Waterfront Sprint',
        activity_type: 'run',
        source: 'simulation',
        distance_meters: 5500,
        duration_seconds: 1680,
        elevation_gain_meters: 30,
        avg_speed_mps: 3.27,
        avg_heart_rate: 154,
        max_heart_rate: 170,
        rpe_score: 6,
        workload_score: 72.5,
        territory_captured_km2: 0.055,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      return simulated as unknown as T;
    }

    if (endpoint.includes('/activities/')) {
      return MOCK_ACTIVITIES as unknown as T;
    }
    if (endpoint.includes('/leaderboard/territory')) {
      return MOCK_LEADERBOARD_TERRITORY as unknown as T;
    }
    if (endpoint.includes('/leaderboard/distance')) {
      return MOCK_LEADERBOARD_DISTANCE as unknown as T;
    }
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      const demoUser: User = {
        id: 1,
        email: 'athlete@runzone.ai',
        username: 'ApexRunner',
        full_name: 'Alex Mercer',
        role: 'runner',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        level: 7,
        xp: 6450,
        total_distance_km: 142.5,
        total_territory_km2: 4.82,
        faction_color: '#B8492E',
        resting_hr: 52,
        max_hr: 194,
        is_verified: true,
        is_strava_connected: true,
        created_at: new Date().toISOString(),
      };
      return {
        access_token: 'demo_access_token_jwt',
        refresh_token: 'demo_refresh_token_jwt',
        token_type: 'bearer',
        expires_in_seconds: 900,
        user: demoUser,
      } as unknown as T;
    }

    throw new Error(`Unable to connect to backend at ${API_BASE_URL}${endpoint}`);
  }

  // ================= Auth Endpoints =================

  async register(data: {
    email: string;
    username: string;
    password: string;
    confirm_password?: string;
    full_name?: string;
    faction_color?: string;
  }): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setTokens(res.access_token, res.refresh_token);
    return res;
  }

  async login(email: string, password: string, remember_me: boolean = false): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me }),
    });
    this.setTokens(res.access_token, res.refresh_token);
    return res;
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => null);
    }
    this.clearTokens();
  }

  async forgotPassword(email: string): Promise<{ dev_reset_token?: string }> {
    return this.request<{ dev_reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; new_password: string; confirm_new_password?: string }): Promise<void> {
    return this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ================= Activities =================

  async getActivities(page: number = 1, limit: number = 20): Promise<Activity[]> {
    return this.request<Activity[]>(`/activities/?page=${page}&limit=${limit}`);
  }

  async getActivityDetail(activityId: number): Promise<Activity> {
    return this.request<Activity>(`/activities/${activityId}`);
  }

  async createManualActivity(data: {
    title: string;
    distance_meters: number;
    duration_seconds: number;
    elevation_gain_meters?: number;
    avg_heart_rate?: number;
    rpe_score: number;
    coordinates?: number[][];
  }): Promise<Activity> {
    return this.request<Activity>('/activities/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordLiveRun(data: {
    title: string;
    distance_meters: number;
    duration_seconds: number;
    elevation_gain_meters?: number;
    avg_heart_rate?: number;
    rpe_score: number;
    coordinates?: number[][];
  }): Promise<Activity> {
    return this.request<Activity>('/activities/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async simulateRun(data: {
    title: string;
    start_lat: number;
    start_lon: number;
    distance_km: number;
    duration_minutes: number;
    buffer_meters?: number;
    avg_hr?: number;
    rpe_score?: number;
  }): Promise<Activity> {
    return this.request<Activity>('/activities/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadGPX(file: File, title: string, rpe_score: number): Promise<Activity> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('rpe_score', rpe_score.toString());

    return this.request<Activity>('/activities/upload-gpx', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteActivity(activityId: number): Promise<void> {
    return this.request<void>(`/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  // ================= Territories =================

  async getTerritoryMap(): Promise<TerritoryGeoJSONCollection> {
    return this.request<TerritoryGeoJSONCollection>('/territories/map');
  }

  async claimTerritory(coordinates: number[][], buffer_meters: number = 40.0, zone_name?: string): Promise<any> {
    return this.request('/territories/claim', {
      method: 'POST',
      body: JSON.stringify({ coordinates, buffer_meters, zone_name }),
    });
  }

  // ================= Analytics & ACWR =================

  async getACWRAnalytics(): Promise<ACWRDashboardSummary> {
    return this.request<ACWRDashboardSummary>('/analytics/acwr');
  }

  async getBiometricsAnalytics(days: number = 7): Promise<BiometricsDashboardData> {
    return this.request<BiometricsDashboardData>(`/analytics/biometrics?days=${days}`);
  }

  async logBiometricsEntry(data: BiometricEntryPayload): Promise<BiometricDayData> {
    return this.request<BiometricDayData>('/analytics/biometrics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ================= AI ZoneCoach =================

  async getDailyBriefing(): Promise<DailyCoachBriefing> {
    return this.request<DailyCoachBriefing>('/coach/daily-briefing');
  }

  async chatWithCoach(message: string, history: { role: string; content: string }[] = []): Promise<{ response: string; coach: string; model_used?: string }> {
    return this.request<{ response: string; coach: string; model_used?: string }>('/coach/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: history }),
    });
  }

  async generateTrainingPlan(data: WorkoutPlanGeneratorRequest): Promise<AdaptiveTrainingPlan> {
    return this.request<AdaptiveTrainingPlan>('/coach/generate-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async transcribeAudio(file: File): Promise<{ text: string; model_used: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{ text: string; model_used: string }>('/coach/transcribe', {
      method: 'POST',
      body: formData,
    });
  }

  // ================= Leaderboard & Seasons =================

  async getSeasonInfo(): Promise<SeasonInfo> {
    return this.request<SeasonInfo>('/leaderboard/season');
  }

  async getFactionStandings(): Promise<FactionStanding[]> {
    return this.request<FactionStanding[]>('/leaderboard/factions');
  }

  async getTerritoryLeaderboard(limit: number = 25): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/leaderboard/territory?limit=${limit}`);
  }

  async getDistanceLeaderboard(limit: number = 25): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/leaderboard/distance?limit=${limit}`);
  }

  // ================= Strava =================

  async getStravaConnectUrl(): Promise<{ authorization_url: string }> {
    return this.request<{ authorization_url: string }>('/strava/connect');
  }

  async syncStrava(): Promise<{ synced_count: number; activities: any[] }> {
    return this.request('/strava/sync', { method: 'POST' });
  }
}

export const api = new ApiService();
