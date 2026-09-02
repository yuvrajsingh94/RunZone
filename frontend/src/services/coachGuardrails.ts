export interface GuardrailCheckResult {
  passed: boolean;
  blockedResponse?: string;
  isEmergency?: boolean;
}

export const OFF_TOPIC_REFUSAL_MESSAGE =
  "I'm ZoneCoach — I only cover running, training load, recovery, and supplements for your RunZone plan. " +
  "That one's outside my lane, but ask me anything about your pace, ACWR, or what to eat before a run.";

export function isOffTopic(userMessage: string): boolean {
  return CoachGuardrails.isOffTopic(userMessage);
}

export class CoachGuardrails {
  // 1. Immediate Medical Red Flags (Cardiac, Neurological, Acute Soft-Tissue Rupture)
  private static readonly MEDICAL_RED_FLAG_PATTERNS = [
    /\b(chest\s+pain|chest\s+tightness|chest\s+pressure|angina)\b/i,
    /\b(heart\s+palpitation|palpitations|irregular\s+heartbeat|arrhythmia\s+right\s+now)\b/i,
    /\b(faint|fainted|fainting|passed\s+out|syncope|blackout|blacked\s+out)\b/i,
    /\b(cannot\s+breathe|gasping\s+for\s+air|shortness\s+of\s+breath\s+at\s+rest)\b/i,
    /\b(severe\s+dizziness|vertigo|loss\s+of\s+vision)\b/i,
    /\b(heard\s+a\s+pop|felt\s+a\s+pop|snapped|torn\s+achilles|tore\s+my\s+acl|acute\s+rupture)\b/i,
    /\b(coughing\s+up\s+blood|blood\s+in\s+urine)\b/i,
    /\b(heat\s+stroke|stopped\s+sweating|chills\s+in\s+heat|heat\s+exhaustion)\b/i,
  ];

  // 2. Obvious Off-Topic & Code/Writing/Jailbreak Patterns
  private static readonly OFF_TOPIC_PATTERNS = [
    /\b(write|generate|debug|create|give\s+me)\s+(a\s+)?(python|javascript|typescript|js|ts|sql|html|css|c\+\+|java|rust|go|php|ruby|bash|shell|script|code|function|program|app|api|regex|class)\b/i,
    /\b(python\s+script|javascript\s+code|html\s+page|sql\s+query|write\s+code|code\s+in\s+python|code\s+in\s+javascript)\b/i,
    /\b(write|compose|generate)\s+(an?\s+)?(essay|poem|poetry|story|novel|song|lyrics|speech|joke)\b/i,
    /\b(homework|assignment|solve\s+this\s+math|translate\s+(this|to|into)|translation)\b/i,
    /\b(stocks?|stock\s+market|crypto|cryptocurrency|bitcoin|btc|ethereum|eth|doge|investing|finance|taxes?|accounting)\b/i,
    /\b(politics?|political|election|president|congress|democrat|republican|foreign\s+policy)\b/i,
    /\b(recipe\s+for\s+(cake|cookies|pizza|pasta|bread|dinner)|movie\s+recommendation|video\s+games?|gaming)\b/i,
    /\b(dating\s+advice|relationship\s+advice|horoscope|astrology)\b/i,
    /\b(ignore\s+(all\s+)?previous\s+instructions)\b/i,
    /\b(disregard\s+system\s+prompt)\b/i,
    /\b(you\s+are\s+now\s+dan|developer\s+mode|jailbreak)\b/i,
    /\b(act\s+as\s+an\s+unrestricted\s+ai)\b/i,
  ];

  // 3. In-Domain Keywords (Running, Physiology, Load, Nutrition, Supplements, RunZone)
  private static readonly IN_DOMAIN_PATTERNS = [
    /\b(run|runs|running|runner|runners|jog|jogging|jogger|sprint|sprints|sprinting|sprinter|stride|strides)\b/i,
    /\b(pace|paces|pacing|tempo|interval|intervals|fartlek|track|treadmill|marathon|half\s+marathon|5k|10k|ultra|ultramarathon|trail)\b/i,
    /\b(mileage|kilometer|kilometers|km|mile|miles|cadence|splits?|vo2|vo2max|aerobic|anaerobic|threshold|lactate)\b/i,
    /\b(warmup|warm-up|cooldown|cool-down|elevation|hills?|incline|ascent|descent)\b/i,
    /\b(training|workout|workouts|plan|plans|load|workload|acwr|acute|chronic|ratio|fatigue|overtraining|overreaching|fitness|trimp|strain|exercise)\b/i,
    /\b(heart\s+rate|bpm|hr|hrr|karvonen|zones?|zone\s+[1-5]|cardio|endurance|taper|tapering|periodization)\b/i,
    /\b(heart\s+problem|heart\s+condition|heart\s+disease|cardiac|cardiovascular|arrhythmia|blood\s+pressure|hypertension|asthma|diabetes|illness|disease|condition|doctor|cardiologist)\b/i,
    /\b(injury|injuries|pain|painful|sore|soreness|ache|aches|aching|shin\s+splints?|plantar|fasciitis|tendon|tendinitis|tendinopathy)\b/i,
    /\b(achilles|calves|calf|knees?|patellar|it\s+band|itb|hamstrings?|quads?|glutes?|hips?|ankles?|feet|foot|toes?|blisters?|cramps?|cramping|stiff|stiffness|rpe|effort)\b/i,
    /\b(recovery|recover|rest|rest\s+days?|sleep|sleeping|insomnia|naps?|foam\s+roll(ing)?|massage|massaging|stretch(ing|es)?|mobility|flexibility|ice\s+bath|sauna|cold\s+plunge|compression|cross-training|strength|weights|core|plyometrics)\b/i,
    /\b(nutrition|food|diet|eat(ing)?|meals?|snacks?|carbs?|carbohydrates?|protein|fats?|calories?)\b/i,
    /\b(hydration|hydrate|hydrating|water|drink(ing)?|electrolytes?|sodium|salt|potassium|magnesium|gels?|energy\s+chews?)\b/i,
    /\b(supplements?|creatine|caffeine|coffee|beta\s+alanine|beetroot|nitrates?|whey|bcaa|vitamins?|iron|fuel(ing)?|pre-run|post-run)\b/i,
    /\b(shoes?|sneakers?|super\s+shoes?|carbon\s+plate|cushion(ing)?|drop|socks?|watch|garmin|strava|coros|polar|whoop|app|vest|belt|shorts)\b/i,
    /\b(territory|territories|map|maps|routes?|corridors?|sectors?|capture|capturing|claim|claiming|conquest|defense|rivals?|leaderboard|zonecoach|runzone|gps|gpx|buffer|gist|speed)\b/i,
    /\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|who\s+are\s+you|what\s+do\s+you\s+do|what\s+are\s+you|how\s+are\s+you|help|thanks|thank\s+you|advice|tips|coach)\b/i,
  ];

  // 4. Health Condition Extraction Patterns
  private static readonly HEALTH_CONDITION_EXTRACTORS: Record<string, RegExp[]> = {
    'Cardiovascular / Heart Condition': [
      /\b(heart\s+problem|heart\s+condition|heart\s+disease|cardiac\s+problem|cardiac\s+condition|coronary|arrhythmia|atrial\s+fibrillation|pacemaker|bypass|heart\s+murmur|cardiomyopathy)\b/i,
    ],
    'Hypertension (High Blood Pressure)': [
      /\b(hypertension|high\s+blood\s+pressure|elevated\s+blood\s+pressure)\b/i,
    ],
    'Asthma / Exercise-Induced Bronchospasm': [
      /\b(asthma|exercise-induced\s+asthma|bronchospasm|inhaler|respiratory\s+condition)\b/i,
    ],
    "Chronic Knee / Patellar Issue": [
      /\b(knee\s+pain|runner's\s+knee|patellar\s+tendinopathy|knee\s+osteoarthritis|meniscus|torn\s+acl|knee\s+surgery)\b/i,
    ],
    'Achilles Tendinopathy': [
      /\b(achilles\s+tendinitis|achilles\s+tendinopathy|achilles\s+pain|past\s+achilles\s+tear)\b/i,
    ],
    'Plantar Fasciitis': [
      /\b(plantar\s+fasciitis|heel\s+spur|chronic\s+arch\s+pain)\b/i,
    ],
    'Diabetes (Metabolic Management)': [
      /\b(diabetes|type\s+1\s+diabetes|type\s+2\s+diabetes|hypoglycemia|insulin)\b/i,
    ],
  };

  /**
   * Extracts chronic health conditions or medical constraints mentioned by the athlete.
   */
  public static extractHealthConditions(message: string): string[] {
    const lowerMsg = message.toLowerCase();
    const detected: string[] = [];

    const possessionCues = [
      /\b(i\s+have|i\s+got|diagnosed\s+with|suffer\s+from|dealing\s+with|struggling\s+with|my\s+doctor\s+said\s+i\s+have|history\s+of)\b/i,
      /\b(my\s+heart\s+problem|my\s+heart\s+condition|my\s+asthma|my\s+knee\s+problem|my\s+achilles)\b/i,
    ];
    const hasPossession = possessionCues.some((cue) => cue.test(lowerMsg));

    for (const [conditionName, patterns] of Object.entries(this.HEALTH_CONDITION_EXTRACTORS)) {
      for (const p of patterns) {
        if (p.test(lowerMsg)) {
          if (hasPossession || p.source.includes('heart') || p.source.includes('asthma')) {
            detected.push(conditionName);
            break;
          }
        }
      }
    }

    return detected;
  }

  /**
   * Generates clinical safety rules tailored to the athlete's known medical conditions.
   */
  public static formatHealthSafetyRules(conditions: string[]): string {
    if (!conditions || conditions.length === 0) {
      return 'No special chronic medical constraints recorded.';
    }

    const rules = ['**Active Athlete Health Profile & Clinical Constraints:**'];
    const hasHeart = conditions.some((c) => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiovascular'));
    const hasHypertension = conditions.some((c) => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('blood pressure'));
    const hasAsthma = conditions.some((c) => c.toLowerCase().includes('asthma'));
    const hasJoint = conditions.some((c) => c.toLowerCase().includes('knee') || c.toLowerCase().includes('achilles') || c.toLowerCase().includes('plantar'));

    for (const c of conditions) {
      rules.push(`- Diagnosed / Monitored Condition: **${c}**`);
    }

    rules.push('\n**Mandatory Safety Directives to Enforce in Every Recommendation:**');

    if (hasHeart) {
      rules.push(
        '1. **Cardiovascular Safety Ceiling**: Strictly restrict all running workouts to **Zone 1 (Active Recovery) and low Zone 2 (Conversational Aerobic Base)**. NEVER prescribe Zone 4 threshold surges, VO2 Max 400m intervals, or maximal sprints.',
        '2. **Heart Rate Cap**: Enforce an explicit target heart rate ceiling (keep HR strictly under 65–70% HR max).',
        '3. **Mandatory Extended Transitions**: Prescribe minimum 10–15 min gradual aerobic walking/jogging warmups and cooldowns.',
        '4. **Emergency Stop Rule**: Emphasize that the runner must stop exercise immediately if they experience any chest tightness, shortness of breath, lightheadedness, or palpitations.',
        '5. **Physician Alignment**: Explicitly state that training must follow their cardiologist/physician\'s clearance and prescribed parameters.'
      );
    }

    if (hasHypertension) {
      rules.push(
        '- **Blood Pressure Protection**: Keep exertion smooth and rhythmic. Avoid isometric strain or sudden high-incline bursts.'
      );
    }

    if (hasAsthma) {
      rules.push(
        '- **Respiratory Protocol**: Prescribe extended warmups to humidify airways; advise carrying prescribed rescue inhaler.'
      );
    }

    if (hasJoint) {
      rules.push(
        '- **Impact Management**: Prioritize softer surfaces (trail/dirt), keep weekly volume ramp under 5%, and include eccentric calf/quad strengthening.'
      );
    }

    return rules.join('\n');
  }

  /**
   * Deterministic pre-check for off-topic messages.
   */
  public static isOffTopic(userMessage: string): boolean {
    const lowerMsg = userMessage.toLowerCase().trim();
    if (!lowerMsg) return true;

    // Match obvious off-topic patterns
    for (const pattern of this.OFF_TOPIC_PATTERNS) {
      if (pattern.test(lowerMsg)) {
        return true;
      }
    }

    // Short conversational messages (<= 6 words) like greetings or quick questions pass through
    const wordCount = lowerMsg.split(/\s+/).length;
    if (wordCount <= 6) {
      return false;
    }

    // Must contain at least one in-domain keyword for longer messages
    const hasInDomain = this.IN_DOMAIN_PATTERNS.some((p) => p.test(lowerMsg));
    if (!hasInDomain) {
      return true;
    }

    return false;
  }

  /**
   * Pre-execution input screener.
   */
  public static screenInput(prompt: string): GuardrailCheckResult {
    // 1. Check Medical Red Flags
    for (const pattern of this.MEDICAL_RED_FLAG_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          passed: false,
          isEmergency: true,
          blockedResponse:
            "### ⚠️ Immediate Health & Safety Alert\n\n" +
            "**Stop physical activity immediately.** The symptoms you mentioned (e.g., chest pain, breathing distress, sudden dizziness, or acute joint popping) require urgent in-person medical evaluation.\n\n" +
            "**Clinical Directive:**\n" +
            "- Do **not** attempt any running or physical exertion.\n" +
            "- Sit down in a safe, cool area and rest.\n" +
            "- If symptoms persist or include chest pressure, numbness, or fainting, contact emergency medical services (911 / local emergency number) immediately.\n\n" +
            "*ZoneCoach is an athletic workload optimization engine and cannot evaluate or treat acute medical conditions.*",
        };
      }
    }

    // 2. Check Layer 1 Off-Topic Deterministic Guard
    if (this.isOffTopic(prompt)) {
      return {
        passed: false,
        isEmergency: false,
        blockedResponse: OFF_TOPIC_REFUSAL_MESSAGE,
      };
    }

    return { passed: true };
  }

  /**
   * Calculates exact Karvonen Heart Rate Reserve (HRR) zones.
   */
  public static calculateKarvonenZones(restingHr: number = 52, maxHr: number = 194): Record<string, string> {
    const hrr = maxHr - restingHr;
    const z1Low = Math.round(restingHr + hrr * 0.50);
    const z1High = Math.round(restingHr + hrr * 0.60);
    const z2Low = z1High + 1;
    const z2High = Math.round(restingHr + hrr * 0.70);
    const z3Low = z2High + 1;
    const z3High = Math.round(restingHr + hrr * 0.80);
    const z4Low = z3High + 1;
    const z4High = Math.round(restingHr + hrr * 0.90);
    const z5Low = z4High + 1;
    const z5High = maxHr;

    return {
      'Zone 1 (Active Recovery)': `${z1Low}–${z1High} bpm (50–60% HRR)`,
      'Zone 2 (Aerobic Base)': `${z2Low}–${z2High} bpm (60–70% HRR)`,
      'Zone 3 (Aerobic Tempo)': `${z3Low}–${z3High} bpm (70–80% HRR)`,
      'Zone 4 (Lactate Threshold)': `${z4Low}–${z4High} bpm (80–90% HRR)`,
      'Zone 5 (VO2 Max / Speed)': `${z5Low}–${z5High} bpm (90–100% HRR)`,
    };
  }

  /**
   * Post-execution output validator.
   */
  public static validateOutput(responseText: string, acwr: number, healthConditions?: string[]): string {
    const hasHeartIssue = healthConditions && healthConditions.some((c) => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiovascular'));

    if (hasHeartIssue) {
      const intenseKeywords = ['interval', 'tempo', 'speedwork', 'sprint', 'threshold', 'vo2', 'all-out', 'hammer'];
      if (intenseKeywords.some((k) => responseText.toLowerCase().includes(k))) {
        responseText +=
          '\n\n> 🩺 **Cardiovascular Health Override**: Because your athlete profile records a cardiovascular/heart condition, ' +
          'all prescribed workouts must remain strictly within low Zone 2 conversational aerobic limits. ' +
          'Do not exceed your target heart rate ceiling and ensure physician clearance for all sessions.';
      }
    }

    if (acwr > 1.50) {
      const intenseKeywords = ['interval', 'tempo', 'speedwork', 'sprint', 'threshold', 'hard run', 'fast pace'];
      if (intenseKeywords.some((k) => responseText.toLowerCase().includes(k))) {
        return (
          "### 🚨 Workload Safety Override\n\n" +
          `Your current Acute:Chronic Workload Ratio is **${acwr.toFixed(2)}**, which is inside the **Injury Danger Zone (>1.50)**. ` +
          "Sports science research demonstrates that continuing high-intensity workouts at this load increases soft-tissue injury risk by 200–400%.\n\n" +
          "**Prescribed Safety Protocol:**\n" +
          "- **Zero high-intensity running** for the next 24–48 hours.\n" +
          "- **Mandatory Active Recovery:** 20–30 min low-cadence walking, foam rolling, and mobility work.\n" +
          "- Prioritize 8+ hours of sleep and high protein intake to restore muscle glycogen and repair microtrauma."
        );
      }
    }
    return responseText;
  }
}
