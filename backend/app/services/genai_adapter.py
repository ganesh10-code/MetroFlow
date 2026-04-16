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
def generate_plan_explanation(
    rows,
    source_rows,
    targets
):

    d = get_counts(rows)

    prompt = f"""
You are an expert metro rail fleet planning AI.

Today's operational targets:
RUN={targets["run"]}
STANDBY={targets["standby"]}
MAINTENANCE={targets["maintenance"]}

Generated Plan Summary:
{json.dumps(get_counts(rows), indent=2, default=str)}

Daily Source Operational Data:
{json.dumps(source_rows[:10], indent=2, default=str)}

Analyze the generated plan deeply.

Explain clearly:

1. Why certain trains were chosen for RUN
2. Why some trains moved to MAINTENANCE
3. Safety risks detected (jobs, non-fit, cleaning)
4. How branding / business priorities influenced allocation
5. Whether OCR targets were achieved
6. Overall fleet readiness today
7. Key operational concerns planners should watch

Use professional tone.
Use bullet points.
Use specific examples.
Max 250 words.
"""

    return ask_llm(prompt) or fallback_plan(rows)


# ==========================================================
# WHAT IF
# ==========================================================
def generate_simulation_explanation(
    rows,
    scenario,
    context=None
):

    d = get_counts(rows)

    extra = json.dumps(context, indent=2, default=str) if context else "None"

    prompt = f"""
You are an expert metro operations scenario planning AI.

Scenario Tested:
{scenario}

Simulation Outcome:
RUN={d["run"]}
STANDBY={d["standby"]}
MAINTENANCE={d["maint"]}
Average Risk={d["avg_risk"]}

Operational Signals:
Open Jobs={d["open_jobs"]}
Cleaning Pending={d["clean_pending"]}
Compliance Failures={d["fit_failures"]}

Additional Context:
{extra}

Provide a professional scenario assessment.

Explain clearly:

1. What operational changes occurred because of this scenario
2. Why trains were reallocated
3. Capacity impact on passenger service
4. Safety / reliability impact
5. Whether standby reserve is sufficient
6. Immediate mitigation actions planners should take
7. Overall recommendation: acceptable / caution / critical

Use bullet points.
Use quantified insights.
Use executive tone.
Max 220 words.
"""

    return ask_llm(prompt) or fallback_simulation(rows, scenario)

# ==========================================================
# FINALIZE
# ==========================================================
def generate_override_explanation(
    rows,
    context=None
):

    changed_rows = [
        x for x in rows
        if x.get("override_flag")
    ]

    changed = len(changed_rows)

    changed_trains = [
        x.get("train_id")
        for x in changed_rows
    ]

    extra = json.dumps(context, indent=2, default=str) if context else "None"

    prompt = f"""
You are an expert metro operations approval AI.

Human planners finalized the AI plan with manual overrides.

Overrides Applied:
{changed}

Changed Trains:
{changed_trains}

Additional Context:
{extra}

Explain professionally:

1. Why human overrides are sometimes necessary
2. Likely operational reasons for these overrides
   (maintenance urgency, crowd demand, branding, reserve policy, field reality)
3. Whether overrides likely improved service or increased risk
4. Key safeguards required after overrides
5. Final readiness confidence level: High / Medium / Low

Use bullet points.
Use realistic railway operations language.
Use concise executive tone.
Max 220 words.
"""

    return ask_llm(prompt) or fallback_override(rows)

# ==========================================================
# COMPARE
# ==========================================================
def generate_comparison_explanation(result):

    prompt = f"""
You are an expert metro operations analyst.

Compare AI generated plan vs planner finalized plan.

Metrics:
{json.dumps(result, indent=2, default=str)}

Write a professional summary.

Explain:

1. Whether fleet risk increased or decreased
2. Risk percentage change
3. Run / standby / maintenance changes
4. Whether overrides improved safety or availability
5. Operational trade-offs
6. Mention changed trains if important
7. Final management recommendation

Use bullet points.
Use clear numbers.
Use attractive executive style.
Max 220 words.
"""

    return ask_llm(prompt) or "Comparison complete."