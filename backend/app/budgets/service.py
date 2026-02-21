from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.budgets.models import Budget
from app.budgets.schemas import BudgetCreate, BudgetUpdate, BudgetStatusResponse
from app.transactions.models import Transaction
from decimal import Decimal
from datetime import datetime

def create_budget(db: Session, user_id: int, budget_data: BudgetCreate) -> Budget | None:
    # Check if a budget already exists for this category and month
    existing = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == budget_data.category,
        Budget.month == budget_data.month
    ).first()
    
    if existing:
        return None  # Or raise an exception depending on preferred error handling in routers

    budget = Budget(
        user_id=user_id,
        category=budget_data.category,
        monthly_limit=budget_data.monthly_limit,
        month=budget_data.month
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

def get_budgets(db: Session, user_id: int, month: str | None = None) -> list[Budget]:
    query = db.query(Budget).filter(Budget.user_id == user_id)
    if month:
        query = query.filter(Budget.month == month)
    return query.all()

def get_budget_by_id(db: Session, budget_id: int) -> Budget | None:
    return db.query(Budget).filter(Budget.id == budget_id).first()

def update_budget(db: Session, budget: Budget, update_data: BudgetUpdate) -> Budget:
    budget.monthly_limit = update_data.monthly_limit
    db.commit()
    db.refresh(budget)
    return budget

def delete_budget(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.commit()

def get_budgets_status(db: Session, user_id: int, month: str | None = None) -> list[BudgetStatusResponse]:
    if month == "all":
        budgets = get_budgets(db, user_id, None)
        if not budgets:
            return []
            
        spending_query = db.query(
            Transaction.category,
            extract('year', Transaction.date).label('year'),
            extract('month', Transaction.date).label('month'),
            func.sum(Transaction.amount).label('total_spent')
        ).filter(
            Transaction.user_id == user_id,
            Transaction.amount < 0
        ).group_by(
            Transaction.category,
            extract('year', Transaction.date),
            extract('month', Transaction.date)
        ).all()
        
        category_month_spending = {}
        for row in spending_query:
            if row.year and row.month:
                ym_str = f"{int(row.year):04d}-{int(row.month):02d}"
                category_month_spending[(row.category, ym_str)] = abs(row.total_spent)
                
        status_list = []
        for budget in budgets:
            current_spending = Decimal(category_month_spending.get((budget.category, budget.month), 0))
            limit_float = float(budget.monthly_limit)
            spent_float = float(current_spending)
            
            percentage_used = 0.0
            if limit_float > 0:
                percentage_used = (spent_float / limit_float) * 100.0
                
            over_budget = current_spending > budget.monthly_limit
            
            status_list.append(
                BudgetStatusResponse(
                    id=budget.id,
                    user_id=budget.user_id,
                    category=budget.category,
                    monthly_limit=budget.monthly_limit,
                    month=budget.month,
                    current_spending=current_spending,
                    percentage_used=round(percentage_used, 2),
                    over_budget=over_budget
                )
            )
        return status_list

    if not month:
        # Default to current month YYYY-MM
        month = datetime.now().strftime("%Y-%m")
        
    try:
        year_int = int(month.split('-')[0])
        month_int = int(month.split('-')[1])
    except (ValueError, IndexError):
        raise ValueError("Invalid month format. Expected YYYY-MM.")

    # 1. Get all budgets for the user for the given month
    budgets = get_budgets(db, user_id, month)
    
    if not budgets:
        return []

    # 2. Get total spending per category for the user for the given month
    # Transactions are stored with a date object.
    spending_query = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total_spent')
    ).filter(
        Transaction.user_id == user_id,
        extract('year', Transaction.date) == year_int,
        extract('month', Transaction.date) == month_int,
        # Only negative amounts (withdrawals/spending) should count towards the budget limit
        Transaction.amount < 0
    ).group_by(Transaction.category).all()

    # Convert to a dictionary for easy lookup.
    # We take absolute value because spending amounts are typically negative in the DB,
    # but the budget limit is a positive number.
    category_spending = {s.category: abs(s.total_spent) for s in spending_query}

    # 3. Combine and calculate status
    status_list = []
    for budget in budgets:
        current_spending = Decimal(category_spending.get(budget.category, 0))
        # Handle Decimal conversion to float for calculation safely
        limit_float = float(budget.monthly_limit)
        spent_float = float(current_spending)
        
        percentage_used = 0.0
        if limit_float > 0:
            percentage_used = (spent_float / limit_float) * 100.0
            
        over_budget = current_spending > budget.monthly_limit
        
        status_list.append(
            BudgetStatusResponse(
                id=budget.id,
                user_id=budget.user_id,
                category=budget.category,
                monthly_limit=budget.monthly_limit,
                month=budget.month,
                current_spending=current_spending,
                percentage_used=round(percentage_used, 2),
                over_budget=over_budget
            )
        )

    return status_list
