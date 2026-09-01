import re
from typing import Optional, Dict, Tuple, List

# Shared refusal constant across all layers
OFF_TOPIC_REFUSAL_MESSAGE = (
    "I'm ZoneCoach — I only cover running, training load, recovery, and supplements for your RunZone plan. "
    "That one's outside my lane, but ask me anything about your pace, ACWR, or what to eat before a run."
)


def is_off_topic(user_message: str) -> bool:
    """
    Deterministic pre-check that returns True if the message is off-topic.
    Runs before calling the LLM at all.
    """
    return CoachGuardrails.is_off_topic(user_message)


class CoachGuardrails:
    """
    Industry-standard AI Guardrails for Endurance Running, Clinical Safety,
    and Persistent Athlete Health Condition Memory.
    Modeled after clinical sports cardiology, WHOOP Coach, and Garmin Health guidelines.
    """

    # 1. Immediate Medical Red Flags (Cardiac, Neurological, Acute Soft-Tissue Rupture)
    MEDICAL_RED_FLAG_PATTERNS = [
        r"\b(chest\s+pain|chest\s+tightness|chest\s+pressure|angina)\b",
        r"\b(heart\s+palpitation|palpitations|irregular\s+heartbeat|arrhythmia)\b",
        r"\b(faint|fainted|fainting|passed\s+out|syncope|blackout|blacked\s+out)\b",
        r"\b(shortness\s+of\s+breath\s+at\s+rest|cannot\s+breathe|gasping\s+for\s+air|dyspnea)\b",
        r"\b(severe\s+dizziness|dizzy\s+and\s+confused|vertigo|loss\s+of\s+vision)\b",
        r"\b(heard\s+a\s+pop|felt\s+a\s+pop|snapped|torn\s+achilles|tore\s+my\s+acl|acute\s+rupture)\b",
        r"\b(coughing\s+up\s+blood|blood\s+in\s+urine)\b",
        r"\b(heat\s+stroke|stopped\s+sweating|chills\s+in\s+heat|heat\s+exhaustion)\b",
    ]

    # 2. Obvious Off-Topic & Code/Writing/Jailbreak Patterns
    OFF_TOPIC_PATTERNS = [
        # Code requests
        r"\b(write|generate|debug|create|give\s+me)\s+(a\s+)?(python|javascript|typescript|js|ts|sql|html|css|c\+\+|java|rust|go|php|ruby|bash|shell|script|code|function|program|app|api|regex|class)\b",
        r"\b(python\s+script|javascript\s+code|html\s+page|sql\s+query|write\s+code|code\s+in\s+python|code\s+in\s+javascript)\b",
        # Essays, homework, creative writing, translation
        r"\b(write|compose|generate)\s+(an?\s+)?(essay|poem|poetry|story|novel|song|lyrics|speech|joke)\b",
        r"\b(homework|assignment|solve\s+this\s+math|translate\s+(this|to|into)|translation)\b",
        # Finance, crypto, taxes, politics
        r"\b(stocks?|stock\s+market|crypto|cryptocurrency|bitcoin|btc|ethereum|eth|doge|investing|finance|taxes?|accounting)\b",
        r"\b(politics?|political|election|president|congress|democrat|republican|foreign\s+policy)\b",
        # Unrelated general lifestyle / entertainment
        r"\b(recipe\s+for\s+(cake|cookies|pizza|pasta|bread|dinner)|movie\s+recommendation|video\s+games?|gaming)\b",
        r"\b(dating\s+advice|relationship\s+advice|horoscope|astrology)\b",
        # Prompt injection & jailbreak patterns
        r"\b(ignore\s+(all\s+)?previous\s+instructions)\b",
        r"\b(disregard\s+system\s+prompt)\b",
        r"\b(you\s+are\s+now\s+dan|developer\s+mode|jailbreak)\b",
        r"\b(act\s+as\s+an\s+unrestricted\s+ai)\b",
    ]

    # 3. In-Domain Keywords (Running, Physiology, Load, Nutrition, Supplements, RunZone)
    IN_DOMAIN_PATTERNS = [
        # Running, pacing, workouts, racing
        r"\b(run|runs|running|runner|runners|jog|jogging|jogger|sprint|sprints|sprinting|sprinter|stride|strides)\b",
        r"\b(pace|paces|pacing|tempo|interval|intervals|fartlek|track|treadmill|marathon|half\s+marathon|5k|10k|ultra|ultramarathon|trail)\b",
        r"\b(mileage|kilometer|kilometers|km|mile|miles|cadence|splits?|vo2|vo2max|aerobic|anaerobic|threshold|lactate)\b",
        r"\b(warmup|warm-up|cooldown|cool-down|elevation|hills?|incline|ascent|descent)\b",
        # Training load, ACWR, heart rate zones
        r"\b(training|workout|workouts|plan|plans|load|workload|acwr|acute|chronic|ratio|fatigue|overtraining|overreaching|fitness|trimp|strain|exercise)\b",
        r"\b(heart\s+rate|bpm|hr|hrr|karvonen|zones?|zone\s+[1-5]|cardio|endurance|taper|tapering|periodization)\b",
        # Health conditions, medical history, disease, cardiology
        r"\b(heart\s+problem|heart\s+condition|heart\s+disease|cardiac|cardiovascular|arrhythmia|blood\s+pressure|hypertension|asthma|diabetes|illness|disease|condition|doctor|cardiologist)\b",
        # Injury, health, physiology, muscle groups
        r"\b(injury|injuries|pain|painful|sore|soreness|ache|aches|aching|shin\s+splints?|plantar|fasciitis|tendon|tendinitis|tendinopathy)\b",
        r"\b(achilles|calves|calf|knees?|patellar|it\s+band|itb|hamstrings?|quads?|glutes?|hips?|ankles?|feet|foot|toes?|blisters?|cramps?|cramping|stiff|stiffness|rpe|effort)\b",
        # Recovery, sleep, mobility
        r"\b(recovery|recover|rest|rest\s+days?|sleep|sleeping|insomnia|naps?|foam\s+roll(ing)?|massage|massaging|stretch(ing|es)?|mobility|flexibility|ice\s+bath|sauna|cold\s+plunge|compression|cross-training|strength|weights|core|plyometrics)\b",
        # Nutrition, hydration, supplements
        r"\b(nutrition|food|diet|eat(ing)?|meals?|snacks?|carbs?|carbohydrates?|protein|fats?|calories?)\b",
        r"\b(hydration|hydrate|hydrating|water|drink(ing)?|electrolytes?|sodium|salt|potassium|magnesium|gels?|energy\s+chews?)\b",
        r"\b(supplements?|creatine|caffeine|coffee|beta\s+alanine|beetroot|nitrates?|whey|bcaa|vitamins?|iron|fuel(ing)?|pre-run|post-run)\b",
        # Gear, tech, shoes
        r"\b(shoes?|sneakers?|super\s+shoes?|carbon\s+plate|cushion(ing)?|drop|socks?|watch|garmin|strava|coros|polar|whoop|app|vest|belt|shorts)\b",
        # RunZone territory, map, game mechanics
        r"\b(territory|territories|map|maps|routes?|corridors?|sectors?|capture|capturing|claim|claiming|conquest|defense|rivals?|leaderboard|zonecoach|runzone|gps|gpx|buffer|gist|speed)\b",
        # Respiration, Breathing, Lungs, and Oxygen intake
        r"\b(breath|breathing|breathless|out\s+of\s+breath|shortness\s+of\s+breath|heavy\s+breathing|dyspnea|gasping|inhaler|lungs?|airway|hyperventilate|hyperventilation|oxygen|diaphragm)\b",
        # Conversational / Greetings / Coach identity
        r"\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|good\s+noon|good\s+day|yo|sup|hiya|howdy|greetings|who\s+are\s+you|what\s+do\s+you\s+do|what\s+are\s+you|how\s+are\s+you|help|thanks|thank\s+you|love\s+you|you\s+are\s+great|you're\s+great|advice|tips|coach)\b",
    ]

    # 4. Health Condition Extraction Patterns
    HEALTH_CONDITION_EXTRACTORS = {
        "Cardiovascular / Heart Condition": [
            r"\b(heart\s+problem|heart\s+condition|heart\s+disease|cardiac\s+problem|cardiac\s+condition|coronary|arrhythmia|atrial\s+fibrillation|pacemaker|bypass|heart\s+murmur|cardiomyopathy)\b",
        ],
        "Hypertension (High Blood Pressure)": [
            r"\b(hypertension|high\s+blood\s+pressure|elevated\s+blood\s+pressure)\b",
        ],
        "Asthma / Exercise-Induced Bronchospasm": [
            r"\b(asthma|exercise-induced\s+asthma|bronchospasm|inhaler|respiratory\s+condition)\b",
        ],
        "Chronic Knee / Patellar Issue": [
            r"\b(knee\s+pain|runner's\s+knee|patellar\s+tendinopathy|knee\s+osteoarthritis|meniscus|torn\s+acl|knee\s+surgery)\b",
        ],
        "Achilles Tendinopathy": [
            r"\b(achilles\s+tendinitis|achilles\s+tendinopathy|achilles\s+pain|past\s+achilles\s+tear)\b",
        ],
        "Plantar Fasciitis": [
            r"\b(plantar\s+fasciitis|heel\s+spur|chronic\s+arch\s+pain)\b",
        ],
        "Diabetes (Metabolic Management)": [
            r"\b(diabetes|type\s+1\s+diabetes|type\s+2\s+diabetes|hypoglycemia|insulin)\b",
        ],
    }

    @classmethod
    def extract_health_conditions(cls, message: str) -> List[str]:
        """
        Extracts chronic health conditions or medical constraints mentioned by the athlete.
        """
        lower_msg = message.lower()
        detected = []

        # Only extract if user states they have/suffer from it
        possession_cues = [
            r"\b(i\s+have|i\s+got|diagnosed\s+with|suffer\s+from|dealing\s+with|struggling\s+with|my\s+doctor\s+said\s+i\s+have|history\s+of)\b",
            r"\b(my\s+heart\s+problem|my\s+heart\s+condition|my\s+asthma|my\s+knee\s+problem|my\s+achilles)\b",
        ]
        has_possession = any(re.search(cue, lower_msg) for cue in possession_cues)

        for condition_name, patterns in cls.HEALTH_CONDITION_EXTRACTORS.items():
            for p in patterns:
                if re.search(p, lower_msg):
                    if has_possession or "heart" in p or "asthma" in p:
                        detected.append(condition_name)
                        break

        return detected

    @classmethod
    def format_health_safety_rules(cls, conditions: List[str]) -> str:
        """
        Generates clinical safety rules tailored to the athlete's known medical conditions.
        """
        if not conditions:
            return "No special chronic medical constraints recorded."

        rules = ["**Active Athlete Health Profile & Clinical Constraints:**"]
        has_heart = any("heart" in c.lower() or "cardiovascular" in c.lower() for c in conditions)
        has_hypertension = any("hypertension" in c.lower() or "blood pressure" in c.lower() for c in conditions)
        has_asthma = any("asthma" in c.lower() for c in conditions)
        has_joint = any("knee" in c.lower() or "achilles" in c.lower() or "plantar" in c.lower() for c in conditions)

        for c in conditions:
            rules.append(f"- Diagnosed / Monitored Condition: **{c}**")

        rules.append("\n**Mandatory Safety Directives to Enforce in Every Recommendation:**")

        if has_heart:
            rules.extend([
                "1. **Cardiovascular Safety Ceiling**: Strictly restrict all running workouts to **Zone 1 (Active Recovery) and low Zone 2 (Conversational Aerobic Base)**. NEVER prescribe Zone 4 threshold surges, VO2 Max 400m intervals, or maximal sprints.",
                "2. **Heart Rate Cap**: Enforce an explicit target heart rate ceiling (keep HR strictly under 65–70% HR max).",
                "3. **Mandatory Extended Transitions**: Prescribe minimum 10–15 min gradual aerobic walking/jogging warmups and cooldowns.",
                "4. **Emergency Stop Rule**: Emphasize that the runner must stop exercise immediately if they experience any chest tightness, shortness of breath, lightheadedness, or palpitations.",
                "5. **Physician Alignment**: Explicitly state that training must follow their cardiologist/physician's clearance and prescribed parameters.",
            ])

        if has_hypertension:
            rules.extend([
                "- **Blood Pressure Protection**: Keep exertion smooth and rhythmic. Avoid isometric strain or sudden high-incline bursts.",
            ])

        if has_asthma:
            rules.extend([
                "- **Respiratory Protocol**: Prescribe extended warmups to humidify airways; advise carrying prescribed rescue inhaler.",
            ])

        if has_joint:
            rules.extend([
                "- **Impact Management**: Prioritize softer surfaces (trail/dirt), keep weekly volume ramp under 5%, and include eccentric calf/quad strengthening.",
            ])

        return "\n".join(rules)

    @classmethod
    def check_medical_red_flags(cls, prompt: str) -> Optional[str]:
        """
        Screens for acute critical symptoms and returns an emergency triage referral if triggered.
        """
        lower_prompt = prompt.lower()
        # Ensure we don't treat "I have a heart problem" as an acute emergency unless accompanied by acute pain/fainting
        acute_triggers = [
            r"\b(chest\s+pain|chest\s+tightness|chest\s+pressure|angina)\b",
            r"\b(heart\s+palpitation|palpitations|irregular\s+heartbeat|arrhythmia\s+right\s+now)\b",
            r"\b(faint|fainted|fainting|passed\s+out|syncope|blackout|blacked\s+out)\b",
            r"\b(cannot\s+breathe|gasping\s+for\s+air|shortness\s+of\s+breath\s+at\s+rest)\b",
            r"\b(severe\s+dizziness|vertigo|loss\s+of\s+vision)\b",
            r"\b(heard\s+a\s+pop|felt\s+a\s+pop|snapped|torn\s+achilles|tore\s+my\s+acl|acute\s+rupture)\b",
        ]
        for pattern in acute_triggers:
            if re.search(pattern, lower_prompt):
                return (
                    "### ⚠️ Immediate Health & Safety Alert\n\n"
                    "**Stop physical activity immediately.** The symptoms you mentioned (e.g., chest pain, breathing distress, sudden dizziness, or acute joint popping) require urgent in-person medical evaluation.\n\n"
                    "**Clinical Directive:**\n"
                    "- Do **not** attempt any running or physical exertion.\n"
                    "- Sit down in a safe, cool area and rest.\n"
                    "- If symptoms persist or include chest pressure, numbness, or fainting, contact emergency medical services (911 / local emergency number) immediately.\n\n"
                    "*ZoneCoach is an athletic workload optimization engine and cannot evaluate or treat acute medical conditions.*"
                )
        return None

    @classmethod
    def is_off_topic(cls, user_message: str) -> bool:
        """
        Layer 1 deterministic pre-check:
        Returns True if message matches obvious off-topic patterns or lacks in-domain keywords.
        """
        lower_msg = user_message.lower().strip()
        if not lower_msg:
            return True

        # Match obvious off-topic patterns (code, essays, stocks, crypto, taxes, jailbreaks)
        for pattern in cls.OFF_TOPIC_PATTERNS:
            if re.search(pattern, lower_msg):
                return True

        # Check if message contains at least one in-domain keyword
        has_in_domain_keyword = any(re.search(p, lower_msg) for p in cls.IN_DOMAIN_PATTERNS)
        if not has_in_domain_keyword:
            return True

        return False

    @classmethod
    def calculate_karvonen_zones(cls, resting_hr: int, max_hr: int) -> Dict[str, str]:
        """
        Calculates exact Karvonen Heart Rate Reserve (HRR) zones for the athlete:
        Target HR = HRrest + (HRmax - HRrest) * Intensity%
        """
        hrr = max_hr - resting_hr
        z1_low = int(resting_hr + hrr * 0.50)
        z1_high = int(resting_hr + hrr * 0.60)
        z2_low = z1_high + 1
        z2_high = int(resting_hr + hrr * 0.70)
        z3_low = z2_high + 1
        z3_high = int(resting_hr + hrr * 0.80)
        z4_low = z3_high + 1
        z4_high = int(resting_hr + hrr * 0.90)
        z5_low = z4_high + 1
        z5_high = max_hr

        return {
            "Zone 1 (Active Recovery)": f"{z1_low}–{z1_high} bpm (50–60% HRR)",
            "Zone 2 (Aerobic Base)": f"{z2_low}–{z2_high} bpm (60–70% HRR)",
            "Zone 3 (Aerobic Tempo)": f"{z3_low}–{z3_high} bpm (70–80% HRR)",
            "Zone 4 (Lactate Threshold)": f"{z4_low}–{z4_high} bpm (80–90% HRR)",
            "Zone 5 (VO2 Max / Speed)": f"{z5_low}–{z5_high} bpm (90–100% HRR)",
        }

    @classmethod
    def validate_coach_output(cls, response_text: str, acwr: float, health_conditions: Optional[List[str]] = None) -> str:
        """
        Post-execution validator that guarantees high-fatigue athletes (ACWR > 1.50)
        or athletes with heart conditions are not prescribed dangerous threshold/sprint workouts.
        """
        has_heart_issue = health_conditions and any("heart" in c.lower() or "cardiovascular" in c.lower() for c in health_conditions)

        if has_heart_issue:
            intense_keywords = ["interval", "tempo", "speedwork", "sprint", "threshold", "vo2", "all-out", "hammer"]
            if any(k in response_text.lower() for k in intense_keywords):
                response_text += (
                    "\n\n> 🩺 **Cardiovascular Health Override**: Because your athlete profile records a cardiovascular/heart condition, "
                    "all prescribed workouts must remain strictly within low Zone 2 conversational aerobic limits. "
                    "Do not exceed your target heart rate ceiling and ensure physician clearance for all sessions."
                )

        if acwr > 1.50:
            intense_keywords = ["interval", "tempo", "speedwork", "sprint", "threshold", "hard run", "fast pace"]
            if any(k in response_text.lower() for k in intense_keywords):
                response_text = (
                    "### 🚨 Workload Safety Override\n\n"
                    f"Your current Acute:Chronic Workload Ratio is **{acwr:.2f}**, which is inside the **Injury Danger Zone (>1.50)**. "
                    "Sports science research demonstrates that continuing high-intensity workouts at this load increases soft-tissue injury risk by 200–400%.\n\n"
                    "**Prescribed Safety Protocol:**\n"
                    "- **Zero high-intensity running** for the next 24–48 hours.\n"
                    "- **Mandatory Active Recovery:** 20–30 min low-cadence walking, foam rolling, and mobility work.\n"
                    "- Prioritize 8+ hours of sleep and high protein intake to restore muscle glycogen and repair microtrauma."
                )

        return response_text
