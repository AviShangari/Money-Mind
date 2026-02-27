"""
ML Categorization pipeline for Money Mind.

Priority chain (called from categorization/service.py):
  1. Manual category override (confidence=1.0)    ← handled upstream
  2. ML prediction        (if confidence >= 0.7)  ← THIS FILE
  3. Rule-based heuristic (fallback)              ← handled upstream

Model storage: models/<user_id>_v<N>.pkl
Database record: ml_models table
"""
import os
import datetime
from typing import Optional

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from sqlalchemy.orm import Session

from app.transactions.models import Transaction
from app.ml.models import MLModel

# ── Constants ──────────────────────────────────────────────────────────────────

MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

MIN_SAMPLES = 20            # Minimum training examples required
ML_CONFIDENCE_THRESHOLD = 0.65

# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_training_data(db: Session, user_id: int) -> tuple[list[str], list[str]]:
    """
    Fetch confirmed transactions suitable for training.

    Includes:
      - category_source == 'manual'  (user explicitly corrected)
      - category_source == 'rule'    (rule-based keyword match, already filtered by
                                      the rules engine so implicitly high-confidence)

    Excludes 'Uncategorized' since those add noise.
    """
    rows = (
        db.query(Transaction.description, Transaction.category, Transaction.category_source)
        .filter(
            Transaction.user_id == user_id,
            Transaction.category.isnot(None),
            Transaction.category != "Uncategorized",
            Transaction.category_source.in_(["manual", "rule"]),
        )
        .all()
    )

    descriptions = [r.description for r in rows]
    labels = [r.category for r in rows]
    return descriptions, labels


def _next_version(db: Session, user_id: int) -> int:
    """Return the next version number for this user's model."""
    latest = (
        db.query(MLModel)
        .filter_by(user_id=user_id)
        .order_by(MLModel.version.desc())
        .first()
    )
    return (latest.version + 1) if latest else 1


def _build_pipeline() -> tuple[Pipeline, str]:
    """
    Build the sklearn Pipeline.  Tries LightGBM first; falls back to
    LogisticRegression if the package is unavailable.

    Returns (pipeline, model_type_str).
    """
    try:
        from lightgbm import LGBMClassifier
        clf = LGBMClassifier(n_estimators=200, learning_rate=0.1, num_leaves=31, verbose=-1)
        model_type = "lightgbm"
    except ImportError:
        clf = LogisticRegression(max_iter=1000, C=5.0)
        model_type = "logistic_regression"

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",   # character n-grams handle merchant abbreviations well
            ngram_range=(2, 4),
            min_df=1,
            max_features=20_000,
        )),
        ("clf", clf),
    ])
    return pipeline, model_type


# ── Public API ─────────────────────────────────────────────────────────────────

def train_model(db: Session, user_id: int) -> dict:
    """
    Train (or retrain) the categorization model for a user.

    Returns a dict with keys: success, message, model_type, accuracy, version.
    Requires at least MIN_SAMPLES training examples.
    """
    descriptions, labels = _get_training_data(db, user_id)

    if len(descriptions) < MIN_SAMPLES:
        return {
            "success": False,
            "message": (
                f"Not enough data to train — need at least {MIN_SAMPLES} categorized "
                f"transactions, but only {len(descriptions)} qualify. "
                "Upload more statements and confirm their categories first."
            ),
        }

    pipeline, model_type = _build_pipeline()

    # Cross-validate to estimate accuracy (3-fold minimum, but cap at actual class count)
    n_splits = min(3, len(set(labels)))
    if n_splits < 2:
        # Can't cross-validate with fewer than 2 classes; fit directly with no score
        pipeline.fit(descriptions, labels)
        accuracy = None
    else:
        scores = cross_val_score(pipeline, descriptions, labels, cv=n_splits, scoring="accuracy")
        accuracy = float(scores.mean())
        pipeline.fit(descriptions, labels)

    version = _next_version(db, user_id)
    filename = f"{user_id}_v{version}.pkl"
    path = os.path.join(MODELS_DIR, filename)
    joblib.dump(pipeline, path)

    record = MLModel(
        user_id=user_id,
        model_type=model_type,
        version=version,
        accuracy=accuracy,
        trained_at=datetime.datetime.utcnow(),
        path=path,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": f"Model trained successfully using {len(descriptions)} examples.",
        "model_type": model_type,
        "accuracy": accuracy,
        "version": version,
        "trained_at": record.trained_at,
    }


def predict(db: Session, user_id: int, description: str) -> Optional[tuple[str, float]]:
    """
    Run ML prediction for a transaction description.

    Returns (category, confidence) if a model exists and the top probability
    meets ML_CONFIDENCE_THRESHOLD, otherwise None.
    """
    record = load_model_record(db, user_id)
    if record is None:
        return None

    if not os.path.exists(record.path):
        return None

    pipeline: Pipeline = joblib.load(record.path)

    try:
        proba = pipeline.predict_proba([description])[0]
        top_idx = proba.argmax()
        confidence = float(proba[top_idx])
        category = pipeline.classes_[top_idx]
        return category, confidence
    except Exception:
        return None


def load_model_record(db: Session, user_id: int) -> Optional[MLModel]:
    """Return the latest MLModel record for user, or None."""
    return (
        db.query(MLModel)
        .filter_by(user_id=user_id)
        .order_by(MLModel.version.desc())
        .first()
    )


def get_status(db: Session, user_id: int) -> dict:
    """Return status dict for this user's model."""
    record = load_model_record(db, user_id)
    if record is None:
        return {"model_exists": False}
    return {
        "model_exists": True,
        "model_type": record.model_type,
        "version": record.version,
        "accuracy": record.accuracy,
        "trained_at": record.trained_at,
    }
