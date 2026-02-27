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
      2. ML model prediction             (category_source='ml',     if confidence >= 0.7)
      3. Rule-based categorization       (category_source='rule')
    """
    upper = description.upper()
    overrides = get_user_overrides(db, user_id)
    for override in overrides:
        if override.description_pattern.upper() in upper:
            return override.category, "manual", 1.0

    # ── ML prediction ─────────────────────────────────────────────────────────
    try:
        from app.ml.categorizer import predict as ml_predict
        ml_result = ml_predict(db, user_id, description)
        if ml_result is not None:
            ml_category, ml_confidence = ml_result
            if ml_confidence >= 0.7:
                return ml_category, "ml", ml_confidence
    except Exception:
        pass  # never let ML errors block the upload flow

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


def get_type_override(db: Session, user_id: int, description: str) -> str | None:
    """
    Return the user's stored transaction_type override for a description, or None.
    Uses the same case-insensitive substring match as category overrides.
    """
    upper = description.upper()
    overrides = get_user_overrides(db, user_id)
    for override in overrides:
        if override.transaction_type and override.description_pattern.upper() in upper:
            return override.transaction_type
    return None


def store_type_override(
    db: Session, user_id: int, description_pattern: str, transaction_type: str
) -> CategoryOverride:
    """
    Upsert the transaction_type on a CategoryOverride row.
    Creates the row if it doesn't exist yet (category defaults to empty string
    so it doesn't interfere with the category lookup).
    """
    existing = (
        db.query(CategoryOverride)
        .filter_by(user_id=user_id, description_pattern=description_pattern)
        .first()
    )
    if existing:
        existing.transaction_type = transaction_type
        db.commit()
        db.refresh(existing)
        return existing

    override = CategoryOverride(
        user_id=user_id,
        description_pattern=description_pattern,
        category="",
        transaction_type=transaction_type,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override
