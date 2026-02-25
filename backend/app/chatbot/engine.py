"""
Chatbot engine: intent-based calculation functions.

Each function receives the full financial context dict and the user's raw
message, and returns a structured dict with the computed figures.  The
results are later passed to the AI to format a natural-language response.
"""

INTENTS = {
    "savings_projection",
    "spending_analysis",
    "budget_check",
    "comparison",
    "what_if",
    "debt_question",
    "general_tips",
}


def run_calculation(intent: str, ctx: dict, user_message: str) -> dict:
    """Dispatch to the appropriate calculation function."""
    _handlers = {
        "savings_projection": _savings_projection,
        "spending_analysis":  _spending_analysis,
        "budget_check":       _budget_check,
        "comparison":         _comparison,
        "what_if":            _what_if,
        "debt_question":      _debt_question,
        "general_tips":       _general_tips,
    }
    handler = _handlers.get(intent, _general_tips)
    return handler(ctx, user_message)


# ── Individual handlers ──────────────────────────────────────────────────────

def _savings_projection(ctx: dict, msg: str) -> dict:
    """Compute monthly savings rate and annual projection."""
    income   = ctx["income"]["total_income"]
    spending = ctx["spending"]["total"]

    if income is None:
        return {
            "error": "No income data. Set your income in Settings or upload a chequing statement.",
            "monthly_spending": spending,
        }

    monthly_savings = income - spending
    rate_pct = (monthly_savings / income * 100) if income > 0 else 0.0

    return {
        "monthly_income":          income,
        "monthly_spending":        spending,
        "monthly_savings":         monthly_savings,
        "savings_rate_pct":        round(rate_pct, 1),
        "annual_savings_estimate": round(monthly_savings * 12, 2),
        "income_is_estimated":     ctx["income"]["is_estimated"],
    }


def _spending_analysis(ctx: dict, msg: str) -> dict:
    """Break down spending by category and source."""
    sp = ctx["spending"]
    by_cat = sorted(sp["by_category"].items(), key=lambda x: x[1], reverse=True)
    top = by_cat[0] if by_cat else None

    return {
        "total_spending":          sp["total"],
        "credit_card_spending":    sp["cc_spending"],
        "chequing_spending":       sp["chequing_spending"],
        "by_category_ranked":      dict(by_cat),
        "top_category":            {"name": top[0], "amount": top[1]} if top else None,
        "pct_change_vs_last_month": ctx.get("pct_change"),
        "trend":                   ctx["trend"],
    }


def _budget_check(ctx: dict, msg: str) -> dict:
    """Compare current spending to budget limits."""
    over     = [b for b in ctx["budgets"] if b["over"]]
    on_track = [b for b in ctx["budgets"] if not b["over"]]

    return {
        "total_budgets":         len(ctx["budgets"]),
        "on_track_count":        len(on_track),
        "over_budget_count":     len(over),
        "over_budget_items":     over,
        "on_track_items":        on_track,
        "no_budgets_configured": len(ctx["budgets"]) == 0,
    }


def _comparison(ctx: dict, msg: str) -> dict:
    """Month-over-month spending comparison."""
    return {
        "current_month":             ctx["current_month"],
        "current_spending":          ctx["spending"]["total"],
        "pct_change_vs_last_month":  ctx.get("pct_change"),
        "trend":                     ctx["trend"],
    }


def _what_if(ctx: dict, msg: str) -> dict:
    """Return baseline figures for modelling what-if scenarios."""
    income   = ctx["income"]["total_income"]
    spending = ctx["spending"]["total"]

    return {
        "current_income":         income,
        "current_spending":       spending,
        "current_monthly_savings": (income - spending) if income is not None else None,
        "spending_by_category":   ctx["spending"]["by_category"],
        "note": (
            "These are the user's current figures. "
            "Model the what-if change they described to answer their question."
        ),
    }


def _debt_question(ctx: dict, msg: str) -> dict:
    """Return structured debt data for the AI to answer debt-related questions."""
    debts = ctx.get("debts", {})

    if not debts.get("count"):
        return {
            "has_debts": False,
            "message": (
                "No debts are currently tracked. "
                "Add debts on the Debt page to get payoff projections and strategies."
            ),
        }

    return {
        "has_debts":               True,
        "count":                   debts["count"],
        "total_debt":              debts["total_debt"],
        "total_minimum_payments":  debts["total_minimum_payments"],
        "weighted_average_rate":   debts.get("weighted_average_rate"),
        "debt_free_date":          debts.get("debt_free_date"),
        "avalanche_months":        debts.get("avalanche_months"),
        "total_interest_paid":     debts.get("total_interest_paid", 0),
        "debts_list":              debts["list"],
        "payoff_order":            debts.get("payoff_order", []),
        "note": (
            "Use this data to answer debt questions: payoff timeline, interest cost, "
            "avalanche vs snowball comparison, which debt to prioritise, "
            "impact of extra payments, or any other debt-related analysis."
        ),
    }


def _general_tips(ctx: dict, msg: str) -> dict:
    """Surface top spending categories and budget pressure for advice."""
    sp = ctx["spending"]
    top3 = dict(
        sorted(sp["by_category"].items(), key=lambda x: x[1], reverse=True)[:3]
    )
    over_budget = [b for b in ctx["budgets"] if b["over"]]
    ncf = ctx.get("net_cash_flow")

    return {
        "top_3_spending_categories": top3,
        "total_spending":            sp["total"],
        "net_cash_flow":             ncf,
        "over_budget_categories":    over_budget,
        "income_estimated":          ctx["income"]["is_estimated"],
        "income_available":          ctx["income"]["total_income"] is not None,
    }
