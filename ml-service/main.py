"""
═══════════════════════════════════════════════════════════════
Solar Intel — ML Prediction Microservice (FastAPI)
═══════════════════════════════════════════════════════════════
Wraps the trained XGBoost/HistGradientBoosting model as a REST API.

Endpoints:
  POST /predict        — Single inverter prediction
  POST /predict/batch  — Batch predictions for entire fleet
  GET  /health         — Health check
═══════════════════════════════════════════════════════════════
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import time

from predict import predict_failure, predict_batch, predict_fleet

app = FastAPI(
    title="Solar Intel ML Service",
    version="1.0.0",
    description="Predictive maintenance model for solar inverters",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────

class InverterInput(BaseModel):
    """Input fields matching predict.py's expected keys."""
    plant_id: Optional[str] = "Plant_1"
    inverter_id: Optional[str] = "Unknown"
    mean_power: float = Field(0, description="Avg AC power output in Watts")
    std_power: float = Field(0, description="Std deviation of recent power readings")
    max_power: Optional[float] = None
    min_power: Optional[float] = None
    mean_temp: float = Field(35, description="Avg inverter temperature °C")
    max_temp: Optional[float] = None
    mean_voltage: float = Field(600, description="Avg PV string voltage V")
    mean_current: float = Field(10, description="Avg PV string current A")
    ambient_temp: float = Field(30, description="Ambient temperature °C")
    alarm_count: int = Field(0, description="Alarms in past hour")
    hour: int = Field(12, description="Hour of day 0-23")
    grid_freq: float = Field(50.0, description="Grid frequency Hz")
    power_factor: float = Field(0.98, description="Power factor")
    kwh_today: float = Field(0, description="Energy today kWh")
    kwh_total: float = Field(500000, description="Lifetime energy kWh")
    op_state: float = Field(5120, description="Operating state code")
    n_strings: int = Field(9, description="Active PV strings")
    current_imbalance: Optional[float] = 0.05
    voltage_imbalance: Optional[float] = 0.01
    power_ramp: Optional[float] = 0


class PredictionOutput(BaseModel):
    inverter_id: str
    plant_id: str
    risk_score: float
    risk_level: str
    failure_predicted: bool
    status: str
    top_factors: List[str]
    recommended_action: str


class BatchRequest(BaseModel):
    inverters: List[InverterInput]


class BatchResponse(BaseModel):
    predictions: List[PredictionOutput]
    timestamp: str
    model_version: str = "1.0.0"


class FleetRequest(BaseModel):
    """Request for fleet prediction — just pass inverter IDs, Python pulls telemetry from MongoDB."""
    inverter_ids: List[str]


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "solar_predictive_maintenance", "version": "1.0.0"}


@app.post("/predict", response_model=PredictionOutput)
def single_predict(inp: InverterInput):
    """Predict failure risk for a single inverter."""
    try:
        user_dict = inp.model_dump(exclude_none=True)
        result = predict_failure(user_dict)
        out = result["output"]
        return PredictionOutput(
            inverter_id=inp.inverter_id or "Unknown",
            plant_id=inp.plant_id or "Plant_1",
            risk_score=out["risk_score"],
            risk_level=out["prediction"].replace(" RISK", "").lower(),
            failure_predicted=out["failure_predicted"],
            status=out["status"],
            top_factors=out["top_factors"],
            recommended_action=out["recommended_action"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=BatchResponse)
def batch_predict(req: BatchRequest):
    """Predict failure risk for a fleet of inverters."""
    try:
        predictions = []
        for inv in req.inverters:
            user_dict = inv.model_dump(exclude_none=True)
            result = predict_failure(user_dict)
            out = result["output"]
            predictions.append(PredictionOutput(
                inverter_id=inv.inverter_id or "Unknown",
                plant_id=inv.plant_id or "Plant_1",
                risk_score=out["risk_score"],
                risk_level=out["prediction"].replace(" RISK", "").lower(),
                failure_predicted=out["failure_predicted"],
                status=out["status"],
                top_factors=out["top_factors"],
                recommended_action=out["recommended_action"],
            ))
        return BatchResponse(
            predictions=predictions,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/fleet", response_model=BatchResponse)
def fleet_predict(req: FleetRequest):
    """
    Predict failure risk for a fleet of inverters using FULL training pipeline.
    Pulls telemetry history from MongoDB, computes proper lag/rolling features,
    per-inverter z-score normalisation — exactly like the model was trained.
    """
    try:
        results = predict_fleet(req.inverter_ids)
        predictions = [
            PredictionOutput(
                inverter_id=r["inverter_id"],
                plant_id=r["plant_id"],
                risk_score=r["risk_score"],
                risk_level=r["risk_level"],
                failure_predicted=r["failure_predicted"],
                status=r["status"],
                top_factors=r["top_factors"],
                recommended_action=r["recommended_action"],
            )
            for r in results
        ]
        return BatchResponse(
            predictions=predictions,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            model_version="4.0.0",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))