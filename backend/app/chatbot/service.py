"""
Chatbot service: build a rich financial context from the user's DB data
and convert it to a readable text summary for the AI.
"""
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.transactions.models import Transaction
from app.insights.service import get_summary, get_trend, latest_month_with_data
from app.budgets.service import get_budgets_status
from app.debts.service import get_debts, get_debt_summary, get_payoff_plan


def get_financial_context(db: Session, user_id: int) -> dict:
    """
    Pull all relevant financial data for the user and return a structured dict.

    Uses the current month (based on most recent transaction).
    """
    year, month = latest_month_with_data(db, user_id)
    month_str = f"{year:04d}-{month:02d}"

    summary = get_summary(db, user_id, year, month)
    budgets = get_budgets_status(db, user_id, month_str)

    recent_txns = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(desc(Transaction.date), desc(Transaction.id))
        .limit(15)
        .all()
    )

    trend = get_trend(db, user_id)

    debts_list   = get_debts(db, user_id)
    debt_summary = get_debt_summary(db, user_id)
    payoff       = get_payoff_plan(db, user_id, "avalanche", Decimal("0")) if debts_list else None

    return {
        "current_month": month_str,
        "income": {
            "base_income":        float(summary.get("base_income") or 0),
            "side_income":        float(summary.get("side_income") or 0),
            "transaction_income": float(summary.get("transaction_income") or 0),
            "total_income": (
                float(summary["total_income"])
                if summary.get("total_income") is not None
                else None
            ),
            "is_estimated": summary.get("cash_flow_estimated", False),
        },
        "spending": {
            "total":             float(summary.get("total_spending") or 0),
            "cc_spending":       float(summary.get("cc_spending") or 0),
            "chequing_spending": float(summary.get("chequing_spending") or 0),
            "by_category": {
                k: float(v)
                for k, v in summary.get("spending_by_category", {}).items()
            },
        },
        "net_cash_flow": (
            float(summary["net_cash_flow"])
            if summary.get("net_cash_flow") is not None
            else None
        ),
        "pct_change": summary.get("previous_month_comparison"),
        "budgets": [
            {
                "category": b.category,
                "limit":    float(b.monthly_limit),
                "spent":    float(b.current_spending),
                "pct_used": b.percentage_used,
                "over":     b.over_budget,
            }
            for b in budgets
        ],
        "recent_transactions": [
            {
                "date":        str(t.date),
                "description": t.description,
                "amount":      float(t.amount),
                "category":    t.category,
                "source":      t.source,
                "type":        t.transaction_type,
            }
            for t in recent_txns
        ],
        "trend": [
            {"month": t["month"], "spending": float(t["spending"])}
            for t in trend
        ],
        "debts": {
            "count":                    len(debts_list),
            "total_debt":               float(debt_summary.total_debt),
            "total_minimum_payments":   float(debt_summary.total_minimum_payments),
            "weighted_average_rate": (
                float(debt_summary.weighted_average_interest_rate)
                if debt_summary.weighted_average_interest_rate is not None
                else None
            ),
            "debt_free_date":   debt_summary.debt_free_date_avalanche,
            "avalanche_months": debt_summary.avalanche_months,
            "total_interest_paid": float(payoff.total_interest_paid) if payoff else 0.0,
            "list": [
                {
                    "name":            d.name,
                    "debt_type":       d.debt_type,
                    "balance":         float(d.balance),
                    "interest_rate":   float(d.interest_rate),
                    "minimum_payment": float(d.minimum_payment),
                }
                for d in debts_list
            ],
            "payoff_order": [
                {
                    "order":            d.order,
                    "name":             d.name,
                    "payoff_date":      d.payoff_date,
                    "months_to_payoff": d.months_to_payoff,
                    "total_interest":   float(d.total_interest),
                }
                for d in payoff.payoff_order
            ] if payoff else [],
        },
    }


def build_context_text(ctx: dict) -> str:
    """
    Convert the financial context dict into a human-readable text block
    suitable for including in an AI prompt.
    """
    def fmt(n):
        if n is None:
            return "N/A"
        return f"${n:,.2f}"

    lines = [
        f"FINANCIAL SNAPSHOT — {ctx['current_month']}",
        "=" * 42,
    ]

    # ── Income ────────────────────────────────────────────────────────────────
    inc = ctx["income"]
    lines.append("\nINCOME:")
    if inc["base_income"] > 0:
        lines.append(f"  Base salary:        {fmt(inc['base_income'])}/month")
    if inc["side_income"] > 0:
        lines.append(f"  Side income:        {fmt(inc['side_income'])}/month")
    if inc["transaction_income"] > 0:
        lines.append(f"  Chequing deposits:  {fmt(inc['transaction_income'])}")
    if inc["total_income"] is not None:
        est = " (manual income included)" if inc["is_estimated"] else ""
        lines.append(f"  Total income:       {fmt(inc['total_income'])}{est}")
    else:
        lines.append("  Total income:       N/A — no income data set")

    # ── Spending ──────────────────────────────────────────────────────────────
    sp = ctx["spending"]
    lines.append("\nSPENDING:")
    lines.append(f"  Total:              {fmt(sp['total'])}")
    lines.append(f"  Credit card:        {fmt(sp['cc_spending'])}")
    lines.append(f"  Chequing:           {fmt(sp['chequing_spending'])}")
    if ctx.get("pct_change") is not None:
        direction = "↑" if ctx["pct_change"] > 0 else "↓"
        lines.append(f"  vs last month:      {direction} {abs(ctx['pct_change']):.1f}%")

    # Top categories
    if sp["by_category"]:
        sorted_cats = sorted(sp["by_category"].items(), key=lambda x: x[1], reverse=True)[:5]
        lines.append("\nTOP SPENDING CATEGORIES:")
        for i, (cat, amt) in enumerate(sorted_cats, 1):
            lines.append(f"  {i}. {cat}: {fmt(amt)}")

    # Net cash flow
    ncf = ctx.get("net_cash_flow")
    lines.append(f"\nNET CASH FLOW: {fmt(ncf) if ncf is not None else 'N/A (no income data)'}")

    # ── Budgets ───────────────────────────────────────────────────────────────
    if ctx["budgets"]:
        lines.append("\nBUDGET STATUS:")
        for b in ctx["budgets"]:
            status = "OVER BUDGET ⚠" if b["over"] else "on track ✓"
            lines.append(
                f"  {b['category']}: {fmt(b['spent'])} / {fmt(b['limit'])} "
                f"({b['pct_used']:.0f}%) — {status}"
            )
    else:
        lines.append("\nBUDGETS: None configured")

    # ── Recent transactions ───────────────────────────────────────────────────
    recent = ctx["recent_transactions"]
    if recent:
        lines.append("\nRECENT TRANSACTIONS (last 5):")
        for t in recent[:5]:
            src = t["source"] or "unknown"
            sign = "-" if t["amount"] < 0 else "+"
            lines.append(
                f"  {t['date']}: {t['description']} "
                f"— {sign}{fmt(abs(t['amount']))} ({t['category']}, {src})"
            )

    # ── Spending trend ────────────────────────────────────────────────────────
    if ctx["trend"]:
        lines.append("\nSPENDING TREND (recent months):")
        for entry in ctx["trend"]:
            lines.append(f"  {entry['month']}: {fmt(entry['spending'])}")

    # ── Debts ─────────────────────────────────────────────────────────────────
    debts = ctx.get("debts", {})
    if debts.get("count", 0) > 0:
        lines.append("\nDEBTS:")
        lines.append(f"  Count:               {debts['count']} debt(s)")
        lines.append(f"  Total debt:          {fmt(debts['total_debt'])}")
        lines.append(f"  Monthly minimums:    {fmt(debts['total_minimum_payments'])}")
        if debts.get("weighted_average_rate") is not None:
            lines.append(f"  Avg interest rate:   {debts['weighted_average_rate']:.2f}%")
        if debts.get("debt_free_date"):
            lines.append(
                f"  Debt-free date (av.): {debts['debt_free_date']} "
                f"({debts['avalanche_months']} months)"
            )
        if debts.get("total_interest_paid", 0) > 0:
            lines.append(f"  Total interest (av.): {fmt(debts['total_interest_paid'])}")
        lines.append("\n  Individual debts:")
        for d in debts["list"]:
            lines.append(
                f"    • {d['name']} ({d['debt_type']}): "
                f"{fmt(d['balance'])} @ {d['interest_rate']:.2f}% APR, "
                f"min {fmt(d['minimum_payment'])}/mo"
            )
        if debts.get("payoff_order"):
            lines.append("\n  Avalanche payoff order:")
            for d in debts["payoff_order"]:
                entry = f"    #{d['order']}: {d['name']}"
                if d.get("payoff_date"):
                    entry += (
                        f" — {d['payoff_date']} "
                        f"({d['months_to_payoff']} mo, {fmt(d['total_interest'])} interest)"
                    )
                lines.append(entry)
    else:
        lines.append("\nDEBTS: None tracked")

    return "\n".join(lines)
