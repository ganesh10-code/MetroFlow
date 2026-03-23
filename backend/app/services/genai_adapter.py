from typing import Dict, Any

# Placeholders for GenAI integration

def generate_explanation(plan_result: Dict[str, Any]) -> str:
    """
    Convert the future plan/core outputs into human-readable explanation.
    """
    return f"The AI selected {len(plan_result.get('selected_trains', []))} trains based on optimal maintenance readiness and penalty risk minimization. Confidence is {plan_result.get('confidence_score', 0)}."

def generate_role_summary(role: str, data: Dict[str, Any]) -> str:
    """
    Produce role-specific summaries based on current data.
    """
    return f"Summary for {role}: All key parameters are within acceptable limits."

def ask_assistant(query: str, context: Dict[str, Any]) -> str:
    """
    Placeholder for future planner assistant queries.
    """
    query_lower = query.lower()
    if "why" in query_lower:
        return "The train was not selected due to an expiring fitness certificate."
    elif "highest" in query_lower and "risk" in query_lower:
        return "Train T-105 currently has the highest penalty SLA risk."
    else:
        return "I am the MetroFlow AI Assistant placeholder. I will be fully functional soon."
