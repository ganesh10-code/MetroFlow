from typing import Dict, Any, List

# ============================================================
# PLACEHOLDER — GenAI Application Layer Adapter
# These functions are integration-ready stubs.
# Final explanation/summarization intelligence TBD.
# ============================================================

def generate_explanation(plan_result: Dict[str, Any]) -> str:

    details = plan_result.get("details", [])

    high_risk = [d for d in details if d["risk_score"] > 0.7]
    maintenance = [d for d in details if d["decision"] == "MAINTENANCE"]

    return f"""
MetroFlow AI Planner Summary:

- Total trains evaluated: {len(details)}
- Maintenance assigned: {len(maintenance)}
- High-risk trains detected: {len(high_risk)}

Key Insights:
- Trains with high risk scores were prioritized for maintenance
- Cleaning delays and open jobs significantly impacted decisions
- Optimization ensured maintenance capacity constraints were respected

System used:
- ML-based risk prediction
- Constraint optimization (OR-tools)
- Rule-based overrides for safety

Recommendation:
- Review high-risk trains immediately
- Consider increasing maintenance capacity if backlog grows
"""


def explain_plan(plan_data: Dict[str, Any]) -> str:
    """
    PLACEHOLDER: Generate a rich explanation for a persisted plan.
    Integration point for GenAI/LLM layer.
    """
    details = plan_data.get("details", [])
    inducted = [d for d in details if d.get("decision") == "INDUCT"]
    held = [d for d in details if d.get("decision") == "HOLD"]
    overrides = [d for d in details if d.get("override_flag")]
    return (
        f"[PLACEHOLDER] Plan summary: {len(inducted)} trains inducted, {len(held)} held. "
        f"{len(overrides)} manual override(s) applied. "
        f"Full AI-driven explanation will be available once the GenAI integration layer is connected."
    )


def summarize_plan(plan_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    PLACEHOLDER: Produce a structured summary dict for a persisted plan.
    Integration point for GenAI layer.
    """
    details = plan_data.get("details", [])
    inducted = [d for d in details if d.get("decision") == "INDUCT"]
    held = [d for d in details if d.get("decision") == "HOLD"]
    overrides = [d for d in details if d.get("override_flag")]
    return {
        "total": len(details),
        "inducted": len(inducted),
        "held": len(held),
        "overrides": len(overrides),
        "note": "PLACEHOLDER — final GenAI summary pending integration",
    }


def generate_role_summary(role: str, data: Dict[str, Any]) -> str:
    """
    PLACEHOLDER: Role-specific GenAI summary.
    """
    return f"[PLACEHOLDER] {role} summary: All key parameters are within acceptable limits. GenAI layer pending."


def ask_assistant(query: str, context: Dict[str, Any]) -> str:
    """
    PLACEHOLDER: Planner assistant query handler.
    Integration point for a RAG/LLM assistant.
    """
    query_lower = query.lower()
    if "why" in query_lower and "not selected" in query_lower:
        return "[PLACEHOLDER] The train was not selected due to failing maintenance or fitness criteria. Full reasoning will be provided by the AI assistant once integrated."
    elif "highest" in query_lower and "risk" in query_lower:
        return "[PLACEHOLDER] Branding SLA risk is highest for trains with low accumulated exposure hours. Exact ranking will come from the optimizer."
    elif "lock" in query_lower:
        return "[PLACEHOLDER] Locking a plan freezes all decisions. Overrides must be applied before locking."
    else:
        return "[PLACEHOLDER] I am the MetroFlow GenAI Assistant. I will provide intelligent operational explanations once the core AI layer is integrated. Your query: \"" + query + "\""
