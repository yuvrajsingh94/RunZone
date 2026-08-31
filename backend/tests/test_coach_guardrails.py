import pytest
from app.services.coach_guardrails import CoachGuardrails, OFF_TOPIC_REFUSAL_MESSAGE, is_off_topic
from app.services.llm_coach_service import LLMCoachService
from app.schemas.analytics import ACWRDashboardSummary


def test_is_off_topic_blocks_coding_requests():
    coding_prompts = [
        "write me a python script to download files",
        "can you write code in javascript for a calculator",
        "debug this sql query for me",
        "give me a function in html and css",
    ]
    for prompt in coding_prompts:
        assert is_off_topic(prompt) is True, f"Expected '{prompt}' to be off-topic"


def test_is_off_topic_blocks_finance_and_crypto():
    finance_prompts = [
        "what is the stock market doing today",
        "should I buy bitcoin or ethereum",
        "give me tax advice for my business",
        "how to invest in crypto",
    ]
    for prompt in finance_prompts:
        assert is_off_topic(prompt) is True, f"Expected '{prompt}' to be off-topic"


def test_is_off_topic_blocks_creative_and_homework():
    off_topic_prompts = [
        "write an essay on the industrial revolution",
        "help me with my calculus homework",
        "write a poem about flowers",
        "translate this english text to french",
    ]
    for prompt in off_topic_prompts:
        assert is_off_topic(prompt) is True, f"Expected '{prompt}' to be off-topic"


def test_is_off_topic_allows_running_and_training():
    running_prompts = [
        "how do I pace my 10k race this weekend?",
        "what is my current ACWR score and acute workload?",
        "how can I plan a route to capture territory on the map?",
        "should I do strides during my warmup?",
    ]
    for prompt in running_prompts:
        assert is_off_topic(prompt) is False, f"Expected '{prompt}' to be in-domain"


def test_is_off_topic_allows_injury_and_recovery():
    recovery_prompts = [
        "my knee and achilles tendon feel sore after yesterday's run",
        "how much sleep do I need to recover from a 20km long run?",
        "should I foam roll or take an ice bath for sore calves?",
        "what is a safe heart rate zone for an easy recovery day?",
    ]
    for prompt in recovery_prompts:
        assert is_off_topic(prompt) is False, f"Expected '{prompt}' to be in-domain"


def test_is_off_topic_allows_nutrition_and_supplements():
    nutrition_prompts = [
        "what should I eat before a morning marathon?",
        "should endurance runners take creatine or beta alanine?",
        "how many electrolyte gels should I take during a half marathon?",
        "is caffeine effective for 5k pacing?",
    ]
    for prompt in nutrition_prompts:
        assert is_off_topic(prompt) is False, f"Expected '{prompt}' to be in-domain"


def test_extract_health_conditions_detects_heart_disease():
    message = "I have a heart problem and coronary issues, how fast can I run?"
    conditions = CoachGuardrails.extract_health_conditions(message)
    assert len(conditions) > 0
    assert any("Heart" in c for c in conditions)


def test_extract_health_conditions_detects_asthma():
    message = "my doctor said I have asthma and I need to carry an inhaler"
    conditions = CoachGuardrails.extract_health_conditions(message)
    assert len(conditions) > 0
    assert any("Asthma" in c for c in conditions)


def test_format_health_safety_rules_includes_cardiovascular_ceiling():
    rules = CoachGuardrails.format_health_safety_rules(["Cardiovascular / Heart Condition"])
    assert "Cardiovascular Safety Ceiling" in rules
    assert "Zone 1" in rules or "Zone 2" in rules


@pytest.mark.asyncio
async def test_chat_with_coach_remembers_heart_condition():
    mock_acwr = ACWRDashboardSummary(
        current_acwr=1.18,
        current_risk_category="Optimal",
        acute_workload_7d=340.0,
        chronic_workload_28d=290.0,
        total_distance_7d_km=28.0,
        total_distance_28d_km=112.0,
        injury_risk_percentage=11,
        recommendation_badge="Sweet spot",
        weekly_history=[],
    )

    response, model = await LLMCoachService.chat_with_coach(
        username="Alex",
        user_message="I have a heart condition, what workout should I do?",
        acwr_data=mock_acwr,
        history=[],
        health_conditions=["Cardiovascular / Heart Condition"],
    )

    # Response should acknowledge the health constraint and recommend safe low-intensity Zone 2
    assert "heart" in response.lower() or "cardiovascular" in response.lower() or "zone 2" in response.lower()


@pytest.mark.asyncio
async def test_chat_with_coach_returns_refusal_for_off_topic():
    mock_acwr = ACWRDashboardSummary(
        current_acwr=1.18,
        current_risk_category="Optimal",
        acute_workload_7d=340.0,
        chronic_workload_28d=290.0,
        total_distance_7d_km=28.0,
        total_distance_28d_km=112.0,
        injury_risk_percentage=11,
        recommendation_badge="Sweet spot",
        weekly_history=[],
    )

    response, model = await LLMCoachService.chat_with_coach(
        username="Alex",
        user_message="write me a python script to scrape stock prices",
        acwr_data=mock_acwr,
        history=[],
    )

    assert response == OFF_TOPIC_REFUSAL_MESSAGE
    assert "Guardrail" in model
