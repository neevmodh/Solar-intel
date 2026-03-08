# Solar Intel — Technical Report

## 1. Model Selection & Rationale

### ML Model: HistGradientBoostingClassifier
**Task:** Binary classification — predict whether a solar inverter is *healthy* or *faulty* based on operational telemetry.

**Why HistGradientBoosting:**
- **Handles missing values natively** — real solar plant data has frequent sensor gaps; unlike Random Forest, HGBC doesn't require imputation.
- **Faster training on large datasets** — histogram-based binning reduces the O(n·features) cost to O(bins·features), critical for our 450MB+ CSV files with 51 features.
- **Strong performance** — achieved **95.3% accuracy** and **AUC-ROC 0.981** on 5-fold stratified cross-validation.
- **Monotone constraints** — allows encoding domain knowledge (e.g., higher temperature should increase fault probability).

**Feature Engineering (51 features):** DC/AC power, efficiency, temperature (ambient + module), irradiance, power factor, string-level voltages (smu data), daily/total yield, operating hours, maintenance count, derived ratios (power ratio, temp delta).

**Alternatives Considered:**
| Model | Accuracy | AUC-ROC | Reason Not Selected |
|-------|----------|---------|-------------------|
| Random Forest | 93.1% | 0.962 | Slower; can't handle NaN natively |
| XGBoost | 94.8% | 0.975 | Requires manual NaN handling; marginal gain |
| Neural Network | 91.2% | 0.948 | Overfit on small plants; not interpretable |

### Explainability: SHAP (SHapley Additive exPlanations)
We use **TreeExplainer** for SHAP values, producing:
- **Top-5 feature importance** per prediction (hackathon requirement)
- **Beeswarm plots** showing global feature contributions
- **Bar charts** for quick stakeholder consumption

The top-5 factors consistently identified: (1) DC-AC power ratio, (2) module temperature, (3) daily yield deviation, (4) string voltage imbalance, (5) operating hours since last maintenance.

---

## 2. GenAI Architecture & Choices

### LLM: Groq Llama 3.3 70B Versatile
**Why Groq + Llama 3.3:**
- **Speed** — Groq's LPU achieves ~800 tokens/sec, enabling real-time advisory in dashboard
- **Open-source model** — No vendor lock-in; Llama 3.3 70B matches GPT-4 on reasoning benchmarks
- **Cost** — Free tier sufficient for hackathon; production pricing 10x cheaper than GPT-4
- **Context window** — 128K tokens handles full fleet context in single call

### Three AI Capabilities

**1. GenAI Narrative (AI Advisor):**
Three-tier fallback: ML+LLM → ML-only → Rule-based. Generates plain-English operational reports from prediction data. Structured as Executive Summary → Key Findings → Action Items.

**2. RAG Pipeline (Chat):**
Custom implementation using MongoDB as the knowledge base (not vector DB). Entity extraction identifies PLANT-XXX / INV-XXX IDs and domain keywords, then retrieves targeted documents from plants, inverters, telemetry, and ML predictions collections. This grounded context is injected into the LLM prompt with strict hallucination guardrails. Supports multi-turn conversation with 6-message sliding window.

**3. Agentic AI (Autonomous Workflow):**
Four-tool autonomous pipeline: (1) Data Retrieval → (2) ML Risk Assessment → (3) Maintenance Ticket Drafting → (4) Executive Narrative. The agent runs all steps sequentially, generating actionable maintenance tickets for inverters with risk_score ≥ 0.5, then synthesizes findings into a stakeholder-ready summary.

---

## 3. Known Limitations & Future Work

### Current Limitations
1. **RAG uses keyword matching, not vector similarity** — works well for structured data (IDs, metrics) but less effective for semantic queries like "what does low efficiency mean?"
2. **ML model trained on 3 plants** — may not generalize to all solar panel technologies without retraining on new plant data.
3. **Single LLM provider** — Groq outages cause fallback to rule-based responses (functional but less insightful).
4. **No real-time streaming** — ML predictions are batch per request, not continuous WebSocket streams.
5. **Agent is sequential** — ticket drafting blocks on ML predictions; parallel tool execution would reduce latency.

### Future Improvements
- **Vector DB (Pinecone/Weaviate)** for true semantic search in RAG
- **Multi-model ensemble** (HGBC + LSTM for time-series anomaly detection)
- **Real-time SCADA integration** via MQTT/Modbus for live telemetry
- **CI/CD pipeline** with automated model retraining on new data
- **Multi-tenant architecture** with role-based access per plant operator

---

## 4. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TailwindCSS, Framer Motion, Tremor |
| Backend | Next.js API Routes, Mongoose ODM |
| Database | MongoDB Atlas |
| Auth | NextAuth.js v4 (Google OAuth + Credentials) |
| ML | scikit-learn HistGradientBoostingClassifier, SHAP |
| ML API | FastAPI, Uvicorn, Python 3.12 |
| LLM | Groq Cloud, Llama 3.3 70B Versatile |
| i18n | 15 languages (static + Google Translate API) |
| Import | papaparse (CSV), xlsx (Excel) |
| Deployment | Vercel (web) + Docker (containerized) |
| Testing | Jest, ts-jest (20 tests across 3 suites) |
