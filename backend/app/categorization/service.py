from sqlalchemy.orm import Session
from app.categorization.models import CategoryOverride
from app.categorization.rules import categorize_transaction


def get_user_overrides(db: Session, user_id: int) -> list[CategoryOverride]:
    return db.query(CategoryOverride).filter_by(user_id=user_id).all()


def categorize_with_overrides(
    db: Session, user_id: int, description: str
) -> tuple[str, str, float]:
    """
    Returns (category, category_source, confidence).

    Priority:
      1. User's manual category_overrides (category_source='manual', confidence=1.0)
      2. Rule-based categorization (category_source='rule')
    """
    upper = description.upper()
    overrides = get_user_overrides(db, user_id)
    for override in overrides:
        if override.description_pattern.upper() in upper:
            return override.category, "manual", 1.0

    category, confidence = categorize_transaction(description)
    return category, "rule", confidence


def store_category_override(
    db: Session, user_id: int, description_pattern: str, category: str
) -> CategoryOverride:
    """
    Upsert a category override for the given user and description_pattern.
    If a record already exists for the same pattern, update its category.
    """
    existing = (
        db.query(CategoryOverride)
        .filter_by(user_id=user_id, description_pattern=description_pattern)
        .first()
    )
    if existing:
        existing.category = category
        db.commit()
        db.refresh(existing)
        return existing

    override = CategoryOverride(
        user_id=user_id,
        description_pattern=description_pattern,
        category=category,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override
