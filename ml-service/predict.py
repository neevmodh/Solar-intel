# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════
Solar Intel — ML Inference  (v5: SHAP Explanations)
═══════════════════════════════════════════════════════════════
Replicates the EXACT training preprocessing pipeline:
  1. Log1p transforms on skewed features
  2. Per-inverter z-score normalisation (using historical mean/std)
  3. Lag features (1, 4, 8 step)
  4. Rolling mean/std (4, 16 window)
  5. Diff features
  6. Engineered ratios

NEW in v5:
  - SHAP TreeExplainer for XGBoost model
  - Returns feature contributions per prediction
  - Human-readable SHAP explanation strings

Connects directly to MongoDB Atlas to pull telemetry history,
so the model sees the same data shape it was trained on.
═══════════════════════════════════════════════════════════════
"""

import os
import pickle
import warnings
from pathlib import Path
from typing import Optional, List, Dict

import numpy as np
import pandas as pd
from pymongo import MongoClient

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────
# Load model artifact
# ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "solar_inverter_xgboost_model.pkl"

with open(MODEL_PATH, "rb") as _f:
    _artifact = pickle.load(_f)

_model = _artifact["model"]             # CalibratedClassifierCV
_raw_model = _artifact["raw_model"]      # XGBClassifier (more stable)
_scaler = _artifact["scaler"]            # RobustScaler
_features = _artifact["feature_cols"]    # 29 features

LOG_TRANSFORM_COLS = _artifact.get("log_transform_cols", [
    "inverter_pv1_current", "inverter_pv2_power", "inverter_kwh_total"
])
NORMALIZE_COLS = _artifact.get("normalize_cols", [
    "inverter_power", "inverter_pv1_power", "inverter_pv1_voltage",
    "inverter_pv1_current", "inverter_pv2_power", "inverter_pv2_voltage",
    "inverter_kwh_today", "inverter_kwh_total", "inverter_temp",
    "meter_active_power",
])

print(f"[predict.py v5] Loaded model: {len(_features)} features, version={_artifact.get('version')}")

# ─────────────────────────────────────────────────────────────
# SHAP Explainer (lazy initialization)
# ─────────────────────────────────────────────────────────────
_shap_explainer = None

def _get_shap_explainer():
    """Lazy-load SHAP TreeExplainer for XGBoost model."""
    global _shap_explainer
    if _shap_explainer is None:
        try:
            import shap
            _shap_explainer = shap.TreeExplainer(_raw_model)
            print("[predict.py v5] SHAP TreeExplainer initialized")
        except Exception as e:
            print(f"[predict.py v5] SHAP init failed: {e}")
            _shap_explainer = "unavailable"
    return _shap_explainer if _shap_explainer != "unavailable" else None


def get_shap_explanation(X_scaled: np.ndarray, raw_values: dict, top_n: int = 5) -> List[Dict]:
    """
    Generate structured SHAP explanation for a single prediction.
    Returns top N contributing features with their impact.
    
    Returns list of dicts with:
      - feature: raw feature name
      - label: human-readable feature label
      - value: actual value (if available)
      - contribution: absolute SHAP contribution (0-1 normalized)
      - direction: "positive" (increases risk) or "negative" (decreases risk)
      - impact: "high", "medium", or "low" based on contribution magnitude
      - description: human-readable explanation
    """
    explainer = _get_shap_explainer()
    if explainer is None:
        return []

    try:
        shap_values = explainer.shap_values(X_scaled)
        # For binary classification, shap_values might be a list [neg_class, pos_class]
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Use positive class (failure)
        
        shap_vals = shap_values[0] if len(shap_values.shape) > 1 else shap_values
        
        # Normalize SHAP values to get relative contribution percentages
        abs_shap = np.abs(shap_vals)
        total_shap = abs_shap.sum() if abs_shap.sum() > 0 else 1.0
        normalized = abs_shap / total_shap
        
        # Get top N features by absolute SHAP value
        indices = np.argsort(abs_shap)[::-1][:top_n]
        
        explanations = []
        for idx in indices:
            feat_name = _features[idx]
            shap_val = shap_vals[idx]
            contribution = float(normalized[idx])
            direction = "positive" if shap_val > 0 else "negative"
            
            # Skip negligible contributions
            if contribution < 0.01:
                continue
            
            # Human-readable feature name
            label = FEATURE_LABELS.get(feat_name, feat_name.replace("_", " ").title())
            
            # Determine impact level
            if contribution >= 0.25:
                impact = "high"
            elif contribution >= 0.10:
                impact = "medium"
            else:
                impact = "low"
            
            # Get actual value and format description
            raw_val = raw_values.get(feat_name)
            value_str = None
            description = ""
            
            if "temp" in feat_name and "ratio" not in feat_name:
                if raw_val is not None and not np.isnan(raw_val):
                    value_str = f"{raw_val:.1f}°C"
                    if raw_val > 65:
                        description = f"{label} at {value_str} (critical) {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    elif raw_val > 50:
                        description = f"{label} at {value_str} (elevated) {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    else:
                        description = f"{label} at {value_str} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                else:
                    description = f"{label} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    
            elif "power" in feat_name and "ratio" not in feat_name:
                if raw_val is not None and not np.isnan(raw_val):
                    if raw_val >= 1000:
                        value_str = f"{raw_val/1000:.1f}kW"
                    else:
                        value_str = f"{raw_val:.0f}W"
                    if "std" in feat_name or "rstd" in feat_name:
                        description = f"Power volatility ({label}) {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    elif "diff" in feat_name:
                        description = f"Rapid power change {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    else:
                        description = f"{label} at {value_str} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                else:
                    description = f"{label} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    
            elif "voltage" in feat_name:
                if raw_val is not None and not np.isnan(raw_val):
                    value_str = f"{raw_val:.0f}V"
                    description = f"{label} at {value_str} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                else:
                    description = f"{label} {'increases' if direction == 'positive' else 'decreases'} failure risk"
                    
            elif feat_name == "pv_power_ratio":
                description = f"PV string balance {'increases' if direction == 'positive' else 'decreases'} failure risk"
                
            elif feat_name == "power_temp_ratio":
                description = f"Efficiency ratio {'increases' if direction == 'positive' else 'decreases'} failure risk"
                
            else:
                description = f"{label} {'increases' if direction == 'positive' else 'decreases'} failure risk"
            
            explanations.append({
                "feature": feat_name,
                "label": label,
                "value": value_str,
                "contribution": round(contribution * 100, 1),  # As percentage
                "direction": direction,
                "impact": impact,
                "description": description,
            })
        
        return explanations
        
    except Exception as e:
        print(f"[SHAP] Explanation failed: {e}")
        return []


# ─────────────────────────────────────────────────────────────
# MongoDB connection (lazy)
# ─────────────────────────────────────────────────────────────
_mongo_client: Optional[MongoClient] = None
_mongo_db = None

def _get_db():
    """Lazy-connect to MongoDB Atlas using the same URI as the Next.js app."""
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db

    uri = os.environ.get("MONGODB_URI", "")
    if not uri:
        env_path = BASE_DIR.parent / ".env.local"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("MONGODB_URI="):
                    uri = line.split("=", 1)[1].strip().strip('"')
                    break
    if not uri:
        raise RuntimeError("MONGODB_URI not set")

    _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    _mongo_db = _mongo_client.get_default_database()
    print(f"[predict.py v4] Connected to MongoDB: {_mongo_db.name}")
    return _mongo_db


# ─────────────────────────────────────────────────────────────
# Feature labels (for explainability)
# ─────────────────────────────────────────────────────────────
FEATURE_LABELS = {
    "inverter_power": "Inverter AC power output",
    "inverter_pv1_power": "PV string 1 power",
    "inverter_pv1_voltage": "PV string 1 voltage",
    "inverter_pv1_current": "PV string 1 current",
    "inverter_pv2_power": "PV string 2 power",
    "inverter_pv2_voltage": "PV string 2 voltage",
    "inverter_kwh_today": "Daily energy yield (kWh)",
    "inverter_kwh_total": "Lifetime energy yield",
    "inverter_temp": "Inverter temperature",
    "inverter_op_state": "Operating state code",
    "meter_active_power": "Grid meter active power",
    "inverter_power_lag1": "Power 15min ago",
    "inverter_power_lag4": "Power 1hr ago",
    "inverter_power_lag8": "Power 2hr ago",
    "inverter_power_rmean4": "Short-term power average (1hr)",
    "inverter_power_rstd4": "Short-term power volatility",
    "inverter_power_rmean16": "Long-term power average (4hr)",
    "inverter_power_rstd16": "Long-term power volatility",
    "inverter_power_diff": "Power rate of change",
    "inverter_temp_lag1": "Temperature 15min ago",
    "inverter_temp_lag4": "Temperature 1hr ago",
    "inverter_temp_lag8": "Temperature 2hr ago",
    "inverter_temp_rmean4": "Short-term temperature average",
    "inverter_temp_rstd4": "Short-term temperature volatility",
    "inverter_temp_rmean16": "Long-term temperature average",
    "inverter_temp_rstd16": "Long-term temperature volatility",
    "inverter_temp_diff": "Temperature rate of change",
    "pv_power_ratio": "PV1/PV2 power ratio (string balance)",
    "power_temp_ratio": "Power-to-temperature ratio (efficiency)",
}

RISK_THRESHOLDS = {"LOW": (0.0, 0.3), "MEDIUM": (0.3, 0.6), "HIGH": (0.6, 0.85), "CRITICAL": (0.85, 1.0)}
RECOMMENDED_ACTIONS = {
    "LOW": "No immediate action required. Continue routine monitoring.",
    "MEDIUM": "Schedule preventive inspection within 48 hours. Monitor temperature and PV string balance.",
    "HIGH": "Immediate inspection recommended. Check cooling, PV string integrity, and alarm logs.",
    "CRITICAL": "URGENT: Dispatch maintenance crew immediately. Inverter at risk of shutdown.",
}
STATUS_MESSAGES = {
    "LOW": "Inverter operating within normal parameters",
    "MEDIUM": "Possible inverter degradation detected",
    "HIGH": "Inverter anomaly detected - performance degradation likely",
    "CRITICAL": "Inverter failure imminent - immediate intervention required",
}


def _get_risk_level(score: float) -> str:
    for level, (lo, hi) in RISK_THRESHOLDS.items():
        if lo <= score < hi:
            return level
    return "CRITICAL"


# ─────────────────────────────────────────────────────────────
# Pull telemetry from MongoDB and preprocess EXACTLY like training
# ─────────────────────────────────────────────────────────────
MIN_ROWS = 8

def _fetch_telemetry_df(inverter_ids: list, n_records: int = 20) -> pd.DataFrame:
    """Fetch last n_records telemetry rows per inverter from MongoDB."""
    db = _get_db()
    collection = db["telemetryrecords"]

    rows = []
    for inv_id in inverter_ids:
        cursor = collection.find(
            {"inverterId": inv_id},
            {"_id": 0, "inverterId": 1, "plantId": 1, "timestamp": 1,
             "inverterPower": 1, "inverterPv1Power": 1, "inverterPv1Voltage": 1,
             "inverterPv1Current": 1, "inverterPv2Power": 1, "inverterPv2Voltage": 1,
             "inverterKwhToday": 1, "inverterKwhTotal": 1, "inverterTemp": 1,
             "inverterOpState": 1, "meterActivePower": 1}
        ).sort("timestamp", -1).limit(n_records)

        for doc in cursor:
            rows.append(doc)

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    rename_map = {
        "inverterId": "inverter_id",
        "plantId": "plant_id",
        "inverterPower": "inverter_power",
        "inverterPv1Power": "inverter_pv1_power",
        "inverterPv1Voltage": "inverter_pv1_voltage",
        "inverterPv1Current": "inverter_pv1_current",
        "inverterPv2Power": "inverter_pv2_power",
        "inverterPv2Voltage": "inverter_pv2_voltage",
        "inverterKwhToday": "inverter_kwh_today",
        "inverterKwhTotal": "inverter_kwh_total",
        "inverterTemp": "inverter_temp",
        "inverterOpState": "inverter_op_state",
        "meterActivePower": "meter_active_power",
    }
    df = df.rename(columns=rename_map)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Sort ascending (oldest first) for proper lag computation
    df = df.sort_values(["plant_id", "inverter_id", "timestamp"]).reset_index(drop=True)
    return df


def _preprocess_fleet(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the EXACT same preprocessing pipeline as train_model.py:
      1. Log1p on skewed columns
      2. Per-inverter z-score normalisation
      3. Lag/rolling/diff features
      4. Engineered ratios
    """
    num_cols = df.select_dtypes(include=[np.number]).columns
    df[num_cols] = df[num_cols].fillna(0)

    # Step 1: Log1p transforms (FIX 7 from training)
    for col in LOG_TRANSFORM_COLS:
        if col in df.columns:
            df[col] = np.sign(df[col]) * np.log1p(np.abs(df[col]))

    # Step 2: Per-inverter z-score normalisation (FIX 1 / FIX 10)
    for col in NORMALIZE_COLS:
        if col in df.columns:
            grp = df.groupby(["plant_id", "inverter_id"])[col]
            mu = grp.transform("mean")
            sig = grp.transform("std").replace(0, 1)
            df[col] = (df[col] - mu) / sig

    # Step 3: Lag / Rolling / Diff features
    for col in ["inverter_power", "inverter_temp"]:
        if col not in df.columns:
            continue
        grp = df.groupby(["plant_id", "inverter_id"])[col]

        for lag in [1, 4, 8]:
            df[f"{col}_lag{lag}"] = grp.shift(lag)

        for win in [4, 16]:
            df[f"{col}_rmean{win}"] = grp.transform(
                lambda x: x.rolling(win, min_periods=1).mean()
            )
            df[f"{col}_rstd{win}"] = grp.transform(
                lambda x: x.rolling(win, min_periods=1).std().fillna(0)
            )

        df[f"{col}_diff"] = grp.diff()

    # Step 4: Engineered ratios
    if "inverter_pv1_power" in df.columns and "inverter_pv2_power" in df.columns:
        df["pv_power_ratio"] = df["inverter_pv1_power"] / (df["inverter_pv2_power"].abs() + 0.01)

    if "inverter_power" in df.columns and "inverter_temp" in df.columns:
        df["power_temp_ratio"] = df["inverter_power"] / (df["inverter_temp"].abs() + 0.01)

    for c in _features:
        if c in df.columns:
            df[c] = df[c].fillna(0)

    df = df.replace([np.inf, -np.inf], 0)
    return df


def _get_top_factors(raw_row: dict, risk_score: float, max_factors: int = 5) -> list:
    """Generate human-readable top contributing factors."""
    try:
        importances = _raw_model.feature_importances_
    except AttributeError:
        importances = np.ones(len(_features)) / len(_features)

    imp_pairs = sorted(zip(_features, importances), key=lambda x: x[1], reverse=True)
    factors = []

    temp = raw_row.get("inverter_temp", 35)
    power = raw_row.get("inverter_power", 0)
    pv1_power = raw_row.get("inverter_pv1_power", 0)
    pv2_power = raw_row.get("inverter_pv2_power", 0)

    for feat_name, imp in imp_pairs:
        if len(factors) >= max_factors or imp < 0.01:
            break
        label = FEATURE_LABELS.get(feat_name, feat_name)

        if "temp" in feat_name and "ratio" not in feat_name:
            if temp > 65:
                factors.append(f"{label}: {temp:.0f}C - critically elevated")
            elif temp > 50:
                factors.append(f"{label}: {temp:.0f}C - above normal range")
            else:
                factors.append(f"{label}: {temp:.0f}C")
        elif feat_name == "inverter_power" or (
            "power" in feat_name and "ratio" not in feat_name and "temp" not in feat_name
        ):
            if "std" in feat_name or "rstd" in feat_name:
                factors.append(f"{label}: power output unstable")
            elif "diff" in feat_name:
                factors.append(f"{label}: rapid output change detected")
            else:
                factors.append(f"{label}: {power:.0f}W")
        elif feat_name == "pv_power_ratio":
            if pv1_power > 0 and pv2_power > 0:
                ratio = pv1_power / (pv2_power + 0.01)
                if abs(ratio - 1.0) > 0.3:
                    factors.append(f"{label}: PV string imbalance ({ratio:.2f})")
                else:
                    factors.append(f"{label}: balanced ({ratio:.2f})")
            else:
                factors.append(f"{label}: PV string data unavailable")
        elif feat_name == "power_temp_ratio":
            factors.append(f"{label}: efficiency indicator")
        elif feat_name == "inverter_op_state":
            factors.append(f"{label}: {raw_row.get('inverter_op_state', 'N/A')}")
        else:
            factors.append(label)

    if not factors:
        factors = ["Model prediction based on combined telemetry patterns"]
    return factors


# ─────────────────────────────────────────────────────────────
# Main prediction function: fleet (MongoDB-backed)
# ─────────────────────────────────────────────────────────────

def predict_fleet(inverter_ids: list) -> list:
    """
    Predict failure risk for a fleet of inverters by:
      1. Pulling last 20 telemetry records per inverter from MongoDB
      2. Running full training-pipeline preprocessing
      3. Predicting with the XGBoost model on properly preprocessed data
    """
    if not inverter_ids:
        return []

    df = _fetch_telemetry_df(inverter_ids, n_records=96)

    if df.empty:
        print(f"[predict.py v4] No telemetry found for {len(inverter_ids)} inverters")
        return _fallback_predictions(inverter_ids)

    # Save raw values BEFORE preprocessing (for factor explanations)
    raw_vals = {}
    for inv_id in inverter_ids:
        inv_rows = df[df["inverter_id"] == inv_id]
        if not inv_rows.empty:
            last = inv_rows.iloc[-1]
            raw_vals[inv_id] = {
                "inverter_power": float(last.get("inverter_power", 0)),
                "inverter_temp": float(last.get("inverter_temp", 0)),
                "inverter_pv1_power": float(last.get("inverter_pv1_power", 0)),
                "inverter_pv2_power": float(last.get("inverter_pv2_power", 0)),
                "inverter_op_state": float(last.get("inverter_op_state", 0)),
            }

    # Full preprocessing
    df = _preprocess_fleet(df)

    results = []
    for inv_id in inverter_ids:
        inv_rows = df[df["inverter_id"] == inv_id]

        if inv_rows.empty:
            results.append(_single_fallback(inv_id))
            continue

        last_row = inv_rows.iloc[-1]
        plant_id = str(last_row.get("plant_id", "Unknown"))

        feature_vec = np.array([[last_row.get(f, 0.0) for f in _features]])
        feature_vec = np.nan_to_num(feature_vec, nan=0, posinf=0, neginf=0)

        X_scaled = _scaler.transform(feature_vec)
        risk_score = float(_raw_model.predict_proba(X_scaled)[0, 1])
        risk_level = _get_risk_level(risk_score)

        raw = raw_vals.get(inv_id, {})
        
        # Get SHAP explanations for this prediction
        shap_explanation = get_shap_explanation(X_scaled, raw, top_n=3)

        results.append({
            "inverter_id": inv_id,
            "plant_id": plant_id,
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level.lower(),
            "failure_predicted": risk_score >= 0.5,
            "status": STATUS_MESSAGES[risk_level],
            "top_factors": _get_top_factors(raw, risk_score),
            "shap_explanation": shap_explanation,  # NEW: SHAP-based explanation
            "recommended_action": RECOMMENDED_ACTIONS[risk_level],
        })

    if results:
        scores = [r["risk_score"] for r in results]
        print(f"[predict.py v5] Fleet prediction: {len(results)} inverters, "
              f"risk range {min(scores):.4f}-{max(scores):.4f}")

    return results


def _fallback_predictions(inverter_ids: list) -> list:
    return [_single_fallback(inv_id) for inv_id in inverter_ids]


def _single_fallback(inv_id: str) -> dict:
    return {
        "inverter_id": inv_id,
        "plant_id": "Unknown",
        "risk_score": 0.25,  # Default to low-medium, not 0.5 which triggers failure_predicted
        "risk_level": "low",
        "failure_predicted": False,
        "status": "Insufficient telemetry data for ML prediction",
        "top_factors": ["Insufficient telemetry history - using default risk"],
        "shap_explanation": [],
        "recommended_action": "Ensure telemetry data is being collected. Schedule routine inspection.",
    }


# ─────────────────────────────────────────────────────────────
# Legacy single-inverter prediction (kept for backward compat)
# ─────────────────────────────────────────────────────────────

def predict_failure(user_input: dict) -> dict:
    """Single snapshot prediction (less accurate, no time-series context)."""
    row = dict(user_input)

    for col in LOG_TRANSFORM_COLS:
        if col in row:
            row[col] = float(np.sign(row[col]) * np.log1p(abs(row[col])))

    pv1 = row.get("inverter_pv1_power", 0)
    pv2 = row.get("inverter_pv2_power", 0)
    row["pv_power_ratio"] = pv1 / (abs(pv2) + 0.01)
    pwr = row.get("inverter_power", 0)
    tmp = row.get("inverter_temp", 0)
    row["power_temp_ratio"] = pwr / (abs(tmp) + 0.01)

    features = np.array([[row.get(col, 0) for col in _features]])
    features = np.nan_to_num(features, nan=0, posinf=0, neginf=0)
    X_scaled = _scaler.transform(features)
    risk_score = float(_raw_model.predict_proba(X_scaled)[0, 1])
    risk_level = _get_risk_level(risk_score)

    return {
        "input": {
            "plant_id": user_input.get("plant_id", "Unknown"),
            "inverter_id": user_input.get("inverter_id", "Unknown"),
        },
        "output": {
            "prediction": risk_level + " RISK",
            "risk_score": round(risk_score, 4),
            "failure_predicted": risk_score >= 0.5,
            "status": STATUS_MESSAGES[risk_level],
            "top_factors": _get_top_factors(user_input, risk_score),
            "recommended_action": RECOMMENDED_ACTIONS[risk_level],
        },
    }


def predict_batch(inputs: list) -> list:
    return [predict_failure(inp) for inp in inputs]


if __name__ == "__main__":
    import json, sys, argparse

    parser = argparse.ArgumentParser(description="Solar Predictive Maintenance v4")
    parser.add_argument("--fleet", nargs="+", help="Inverter IDs for fleet prediction")
    parser.add_argument("--demo", action="store_true", help="Demo fleet prediction")
    args = parser.parse_args()

    if args.fleet:
        results = predict_fleet(args.fleet)
        print(json.dumps(results, indent=2))
    elif args.demo:
        db = _get_db()
        inv_ids = db["inverters"].distinct("inverterId")
        print(f"Found {len(inv_ids)} inverters in DB")
        results = predict_fleet(inv_ids)
        for r in results:
            print(f"  {r['inverter_id']}: risk={r['risk_score']:.4f} ({r['risk_level']}) - {r['status']}")
    else:
        print("Usage: python predict.py --fleet INV-001 INV-002 ...")
        print("       python predict.py --demo")
