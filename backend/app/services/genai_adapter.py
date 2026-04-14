# backend/app/services/genai_adapter.py

import os
import json
import traceback
from dotenv import load_dotenv

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")


# ==========================================================
# PROVIDER STATUS
# ==========================================================
def provider_status():

    return {
        "gemini_enabled": bool(GEMINI_KEY),
        "groq_enabled": bool(GROQ_KEY)
    }


# ==========================================================
# GEMINI
# ==========================================================
def ask_gemini(prompt):

    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_KEY)

        model = genai.GenerativeModel(
            "gemini-2.0-flash"
        )

        res = model.generate_content(prompt)

        txt = getattr(res, "text", "")

        if txt and txt.strip():
            return txt.strip()

        return None

    except Exception as e:
        print("GEMINI ERROR:", str(e))
        traceback.print_exc()
        return None


# ==========================================================
# GROQ
# ==========================================================
def ask_groq(prompt):

    try:
        from groq import Groq

        client = Groq(api_key=GROQ_KEY)

        res = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=400
        )

        txt = (
            res.choices[0]
            .message.content
            .strip()
        )

        if txt:
            return txt

        return None

    except Exception as e:
        print("GROQ ERROR:", str(e))
        traceback.print_exc()
        return None


# ==========================================================
# MAIN ROUTER
# ==========================================================
def ask_llm(prompt):

    if GEMINI_KEY:
        ans = ask_gemini(prompt)
        if ans:
            return ans

    if GROQ_KEY:
        ans = ask_groq(prompt)
        if ans:
            return ans

    return None


# ==========================================================
# SUMMARY HELPERS
# ==========================================================
def get_counts(rows):

    run = len([
        x for x in rows
        if x["decision"] == "RUN"
    ])

    standby = len([
        x for x in rows
        if x["decision"] == "STANDBY"
    ])

    maint = len([
        x for x in rows
        if x["decision"] == "MAINTENANCE"
    ])

    avg_risk = round(
        sum(
            float(x["risk_score"])
            for x in rows
        ) / max(len(rows), 1),
        2
    )

    avg_priority = round(
        sum(
            float(x["priority_score"])
            for x in rows
        ) / max(len(rows), 1),
        2
    )

    open_jobs = sum(
        int(x.get("open_jobs", 0))
        for x in rows
    )

    clean_pending = sum(
        int(x.get("cleaning_required", 0))
        for x in rows
    )

    fit_failures = sum(
        1 for x in rows
        if x.get("compliance_status") != "FIT"
    )

    branding_high = sum(
        1 for x in rows
        if int(
            x.get(
                "branding_priority",
                0
            )
        ) >= 2
    )

    return {
        "run": run,
        "standby": standby,
        "maint": maint,
        "avg_risk": avg_risk,
        "avg_priority": avg_priority,
        "open_jobs": open_jobs,
        "clean_pending": clean_pending,
        "fit_failures": fit_failures,
        "branding_high": branding_high
    }


# ==========================================================
# FALLBACKS
# ==========================================================
def fallback_plan(rows):

    d = get_counts(rows)

    return (
        f"The planner allocated {d['run']} trains to RUN service, "
        f"{d['standby']} to STANDBY reserve and "
        f"{d['maint']} to MAINTENANCE. "
        f"Allocation considered {d['open_jobs']} open maintenance jobs, "
        f"{d['clean_pending']} cleaning-pending trains, "
        f"{d['fit_failures']} compliance issues and branding priorities. "
        f"Average predicted risk is {d['avg_risk']}."
    )


def fallback_simulation(rows, scenario):

    d = get_counts(rows)

    return (
        f"Scenario {scenario} was simulated. "
        f"Updated plan contains {d['run']} RUN, "
        f"{d['standby']} STANDBY and "
        f"{d['maint']} MAINTENANCE trains. "
        f"The optimizer rebalanced fleet readiness "
        f"using daily operational data."
    )


def fallback_override(rows):

    changed = len([
        x for x in rows
        if x.get("override_flag")
    ])

    return (
        f"{changed} planner overrides were applied. "
        f"The final plan blends operational human judgement "
        f"with AI recommendations."
    )


def fallback_compare(data):

    return (
        f"Generated plan had {data.get('generated_run',0)} RUN trains. "
        f"Final plan has {data.get('final_run',0)} RUN trains with "
        f"{data.get('override_changes',0)} decision changes."
    )


# ==========================================================
# PLAN EXPLANATION
# ==========================================================
def generate_plan_explanation(rows):

    d = get_counts(rows)

    prompt = f"""
You are an expert metro operations planner AI.

Daily planning data summary:

RUN trains: {d["run"]}
STANDBY trains: {d["standby"]}
MAINTENANCE trains: {d["maint"]}

Average risk: {d["avg_risk"]}
Average priority: {d["avg_priority"]}

Total open jobs: {d["open_jobs"]}
Cleaning pending trains: {d["clean_pending"]}
Compliance failures: {d["fit_failures"]}
High branding priority trains: {d["branding_high"]}

Explain clearly:

1. Why RUN trains were chosen
2. Why standby reserve count was kept
3. Why trains were sent to maintenance
4. How open jobs / cleaning / compliance impacted decisions
5. How reliability was balanced

Professional tone.
Max 180 words.
"""

    return ask_llm(prompt) or fallback_plan(rows)


# ==========================================================
# WHAT IF
# ==========================================================
def generate_simulation_explanation(
    rows,
    scenario
):

    d = get_counts(rows)

    prompt = f"""
You are metro scenario planning AI.

Scenario simulated: {scenario}

Results:

RUN={d["run"]}
STANDBY={d["standby"]}
MAINTENANCE={d["maint"]}
Average risk={d["avg_risk"]}

Operational data:
Open jobs={d["open_jobs"]}
Cleaning pending={d["clean_pending"]}
Compliance failures={d["fit_failures"]}

Explain:

1. What changed due to this scenario
2. Why train allocation shifted
3. Operational impact
4. Risk mitigation logic

Max 180 words.
"""

    return ask_llm(prompt) or fallback_simulation(
        rows,
        scenario
    )


# ==========================================================
# FINALIZE
# ==========================================================
def generate_override_explanation(rows):

    changed = len([
        x for x in rows
        if x.get("override_flag")
    ])

    prompt = f"""
Human planners changed {changed} train decisions.

Explain:

1. Why overrides may be required
2. Human judgement benefits
3. Risks after overrides
4. Operational safeguards

Max 170 words.
"""

    return ask_llm(prompt) or fallback_override(rows)


# ==========================================================
# COMPARE
# ==========================================================
def generate_comparison_explanation(data):

    prompt = f"""
Compare generated plan and finalized plan.

Metrics:
{json.dumps(data, indent=2)}

Explain:

1. Main changes
2. Improvement or tradeoff
3. Human planner impact
4. Fleet readiness impact

Max 170 words.
"""

    return ask_llm(prompt) or fallback_compare(data)