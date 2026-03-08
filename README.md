<div align="center">

# ☀️ Solar Intel

### AI-Powered Solar Plant Monitoring & Predictive Maintenance Platform

**Built for HACKaMINeD 2026**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.12-yellow?logo=python)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-ML_Service-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-f55036)](https://groq.com)
[![Tests](https://img.shields.io/badge/Tests-20_passing-brightgreen)](.)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](.)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**[🚀 Live Demo →](https://solar-intel-six.vercel.app)**

</div>

---

## 🌟 What is Solar Intel?

Solar Intel is a **full-stack intelligent solar plant management platform** that combines:

- 🤖 **ML Predictive Maintenance** — 95.3% accuracy, AUC-ROC 0.981 (XGBoost)
- 💬 **RAG Conversational AI** — entity-aware Q&A grounded in live MongoDB fleet data
- 🧠 **Agentic AI Workflows** — 4-step autonomous pipeline: Data → Risk → Tickets → Summary
- 📊 **GenAI Narratives** — Groq Llama 3.3 70B generates plain-English operational reports
- 🌐 **15-Language i18n** — full real-time translation across every page
- 🐳 **Production Ready** — Docker multi-container, 20 unit tests, Vercel deployed

> _It doesn't just show data — it predicts failures before they happen, explains why in plain English, and auto-generates maintenance tickets._

---

## 🏆 Hackathon Pillars

| Pillar                  | Implementation                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| 🔍 **Data Mining**      | Real solar telemetry ingested from CSV/Excel, 51-feature ML pipeline                      |
| 🤖 **GenAI**            | Groq Llama 3.3 70B generates operational narratives from ML predictions                   |
| 🧠 **RAG**              | Entity extraction → MongoDB context retrieval → grounded LLM Q&A with source citations    |
| 🤖 **Agentic AI**       | 4-step autonomous: Data Retrieval → Risk Assessment → Ticket Drafting → Executive Summary |
| 📊 **ML Model**         | HistGradientBoosting classifier, SHAP explainability, FastAPI microservice                |
| 🌍 **Accessibility**    | 15-language real-time translation across every page                                       |
| 🐳 **Production Ready** | Docker multi-container, 20 unit tests, Vercel + Docker deploy                             |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 14 (App Router · React 18 · TailwindCSS)    │
│  Dashboard · Plants · Inverters · Chat · AI Insights · +7 more  │
├─────────────────────────────────────────────────────────────────┤
│  API Layer — 17 Next.js Route Handlers                          │
│  /api/dashboard  /api/plants  /api/chat  /api/predict  +13 more │
├─────────────────────────────────────────────────────────────────┤
│  Backend Services (TypeScript)                                   │
│  Dashboard · Plant · Inverter · RAG · Agent · AI Advisor · ML   │
├──────────────┬──────────────────┬───────────────┬──────────────┤
│  FastAPI ML  │  MongoDB Atlas   │  Groq Llama   │  Open-Meteo  │
│  :8000       │  (4 collections) │  3.3 70B      │  Weather API │
└──────────────┴──────────────────┴───────────────┴──────────────┘
```

---

## ✨ Features

### 🏭 Multi-Plant Management

- 3 solar plants, each with dedicated inverter fleets
- Plant-level aggregated metrics (total power, health score, risk level)
- Drill-down from plant → individual inverter telemetry

### 📥 CSV / Excel Data Import

- Drag-and-drop file upload
- Auto-detects whether file contains plant or inverter data
- Column normalization handles camelCase, spaces, special characters
- Bulk upsert directly to MongoDB

### 🤖 ML Predictive Maintenance

- **Model:** XGBoost / HistGradientBoosting (95.3% accuracy · AUC-ROC 0.981)
- **29 features:** raw telemetry + lag (1/4/8 step) + rolling stats + engineered ratios
- **SHAP explanations** — top-5 contributing factors per prediction
- **FastAPI microservice** — `/predict`, `/predict/batch`, `/predict/fleet`

### 💬 RAG + Agentic Chat

- **RAG Mode:** entity extraction → MongoDB context → grounded LLM response with source citations
- **Agent Mode:** autonomous 4-step workflow
  1. 📊 Data Retrieval — pulls live plant/inverter/telemetry context
  2. ⚠️ Risk Assessment — ML-powered risk evaluation for all inverters
  3. 🎫 Ticket Drafting — auto-generates prioritized maintenance tickets
  4. 📋 Executive Summary — synthesized stakeholder-ready report

### 📊 GenAI Narrative Intelligence

- Groq Llama 3.3 70B generates plain-English operational reports
- **3-tier fallback:** ML + Groq → ML-only → rule-based (never fails)

### 🌐 Analytics, Forecast & Carbon

- Real-time fleet KPIs with animated dashboards
- 48-hour solar generation forecast (weather-aware via Open-Meteo)
- Daily CO₂ avoidance tracking with real-world equivalents

### 🌍 15-Language Support

`en` `hi` `es` `fr` `de` `ja` `zh` `ar` `pt` `ru` `ko` `it` `nl` `tr` `pl`

---

## 🛠️ Tech Stack

| Layer          | Technology                                                            |
| -------------- | --------------------------------------------------------------------- |
| **Frontend**   | Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion, Tremor |
| **Backend**    | Next.js API Routes, Mongoose 9                                        |
| **Database**   | MongoDB Atlas                                                         |
| **ML Model**   | XGBoost + SHAP                                                        |
| **ML API**     | FastAPI + Uvicorn (Python 3.12)                                       |
| **LLM**        | Groq — Llama 3.3 70B Versatile                                        |
| **Auth**       | NextAuth.js v4 (Google OAuth + Credentials)                           |
| **i18n**       | 15 languages (static + Google Translate)                              |
| **Import**     | PapaParse (CSV) + SheetJS (Excel)                                     |
| **Testing**    | Jest + ts-jest (20 tests, 3 suites)                                   |
| **Deployment** | Vercel (web) · Docker multi-stage (containers)                        |

---

## 📁 Project Structure

```
solar-intel/
├── src/
│   ├── app/                        # Next.js pages (12 routes)
│   │   ├── page.tsx                # Dashboard
│   │   ├── plants/                 # Plant overview + CSV import
│   │   ├── chat/                   # RAG + Agent chat UI
│   │   ├── ai-insights/            # GenAI health narratives
│   │   ├── analytics/              # Energy analytics
│   │   ├── anomalies/              # Anomaly detection
│   │   ├── forecast/               # 48-hr solar forecast
│   │   ├── carbon/                 # CO₂ tracking
│   │   ├── maintenance/            # AI-prioritized task queue
│   │   ├── security/               # Grid sync quality
│   │   ├── settings/               # User settings
│   │   └── api/                    # 17 Route Handlers
│   │       ├── chat/               # RAG + Agent endpoint
│   │       ├── predict/            # ML prediction proxy
│   │       ├── ai-advisor/         # GenAI narrative
│   │       ├── import/             # CSV/Excel import
│   │       ├── plants/             # Plant CRUD
│   │       └── ...                 # + 12 more
│   │
│   ├── backend/
│   │   ├── models/                 # Mongoose schemas
│   │   │   ├── Plant.ts
│   │   │   ├── Inverter.ts
│   │   │   ├── Telemetry.ts
│   │   │   └── User.ts
│   │   └── services/               # Business logic (18 services)
│   │       ├── rag.service.ts      # RAG pipeline
│   │       ├── agent.service.ts    # Agentic 4-step workflow
│   │       ├── ml-prediction.service.ts
│   │       ├── ai-advisor.service.ts
│   │       └── ...
│   │
│   ├── components/                 # React UI components
│   ├── lib/                        # API client, auth, i18n utils
│   ├── types/                      # TypeScript interfaces
│   └── __tests__/                  # Jest unit tests (3 suites · 20 tests)
│
├── ml-service/                     # FastAPI ML microservice
│   ├── main.py                     # /predict /predict/batch /predict/fleet
│   ├── predict.py                  # Full preprocessing + XGBoost inference
│   ├── solar_inverter_xgboost_model.pkl
│   └── requirements.txt
│
├── docs/
│   ├── ARCHITECTURE.md             # Mermaid system diagrams + data flows
│   ├── MANUAL.md                   # Installation & execution manual
│   ├── PROMPT_DESIGN.md            # Prompt iteration history
│   └── REPORT.md                   # Technical report (model rationale, GenAI choices)
│
├── scripts/seed-db.ts              # Seeds 3 plants + 8 inverters + 3120 telemetry
├── Dockerfile                      # Multi-stage Next.js build
├── docker-compose.yml              # Web + ML service
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ · **npm** 9+
- **Python** 3.11+
- **MongoDB Atlas** account ([free](https://mongodb.com/atlas))
- **Groq** API key ([free at console.groq.com](https://console.groq.com/keys))

### 1. Clone & Install

```bash
git clone https://github.com/Jaimin2687/Solar-Intel.git
cd Solar-Intel
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/solar-intel
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ML_SERVICE_URL=http://localhost:8000/predict
ML_TIMEOUT_MS=10000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
EMAIL_FROM=your@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

### 3. Seed the Database

```bash
npm run seed
# → Seeds 3 plants + 8 inverters + 3,120 telemetry records
```

### 4. Start ML Service

```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Start Web App

```bash
npm run dev
# → http://localhost:3000
```

### 6. Run Tests

```bash
npm test
# → 3 suites · 20 tests · all passing ✅
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
# Web App  → http://localhost:3000
# ML API   → http://localhost:8000
```

---

## 🔑 API Routes

| Route                     | Method              | Description                           |
| ------------------------- | ------------------- | ------------------------------------- |
| `/api/dashboard`          | GET                 | Fleet KPIs, risk matrix, trend charts |
| `/api/plants`             | GET                 | All plants with aggregated metrics    |
| `/api/inverters`          | GET/POST/PUT/DELETE | Inverter CRUD                         |
| `/api/telemetry`          | GET/POST            | Telemetry data                        |
| `/api/chat`               | POST                | RAG + Agent chat                      |
| `/api/predict`            | POST                | ML prediction proxy → FastAPI         |
| `/api/ai-advisor`         | GET                 | GenAI narrative (3-tier fallback)     |
| `/api/import`             | POST                | CSV/Excel → MongoDB                   |
| `/api/analytics`          | GET                 | Energy production analytics           |
| `/api/anomalies`          | GET                 | Deviation alerts                      |
| `/api/live-energy`        | GET                 | Real-time energy feed                 |
| `/api/weather`            | GET                 | 48-hr Open-Meteo forecast             |
| `/api/grid`               | GET                 | Grid sync metrics                     |
| `/api/translate`          | POST                | Batch i18n translation                |
| `/api/email`              | POST                | Email notifications                   |
| `/api/health`             | GET                 | System health check                   |
| `/api/auth/[...nextauth]` | \*                  | Authentication                        |

---

## 🧪 Testing

| Suite                 | Tests  | Coverage                                                     |
| --------------------- | ------ | ------------------------------------------------------------ |
| ML Prediction         | 4      | Feature mapping, defaults, normalization, 51-feature output  |
| RAG Entity Extraction | 7      | Plant/inverter ID, keywords, case-insensitive, deduplication |
| Import Normalization  | 9      | camelCase→snake_case, column detection, type inference       |
| **Total**             | **20** | **All passing ✅**                                           |

---

## 🤖 ML Model Details

**Task:** Binary classification — `healthy` vs `faulty` inverter

**Model:** XGBoost classifier — 95.3% accuracy, AUC-ROC 0.981

**Preprocessing Pipeline (inference replicates training exactly):**

1. **Log1p transform** on skewed features (PV1 current, PV2 power, lifetime kWh)
2. **Per-inverter z-score normalization** — prevents inter-inverter bias
3. **Lag features** — power & temp at 15min, 1hr, 2hr ago
4. **Rolling stats** — 1hr & 4hr window mean + std
5. **Diff features** — rate of change for power & temperature
6. **Engineered ratios** — PV1/PV2 string balance, power/temp efficiency

**Risk thresholds:** `LOW (0–0.3)` · `MEDIUM (0.3–0.6)` · `HIGH (0.6–0.85)` · `CRITICAL (0.85–1.0)`

---

## 🧠 RAG & Agentic AI

### RAG Pipeline

```
User Query → Entity Extraction (PLANT-xxx / INV-xxx / keywords)
           → MongoDB Context Retrieval (plants + inverters + telemetry + ML predictions)
           → Grounded Prompt Construction (with hallucination guardrails)
           → Groq Llama 3.3 70B → Response with source citations
```

### Agentic Workflow (4 tools, sequential)

```
Step 1: toolRetrieveData()     → Pulls full fleet context from MongoDB
Step 2: toolRunRiskAssessment() → ML predictions for all inverters
Step 3: toolDraftTickets()      → Creates maintenance tickets (risk ≥ 0.5)
Step 4: generateNarrative()     → Groq synthesizes executive summary
```

### GenAI Narrative — 3-Tier Fallback

```
Tier 1: ML predictions + Groq Llama 3.3 70B → Rich narrative
Tier 2: ML predictions only → Structured rule-based report
Tier 3: No ML data → Basic rule-based summary
```

---

## 📜 Scripts

```bash
npm run dev        # Development server (HMR)
npm run build      # Production build
npm start          # Production server
npm run lint       # ESLint
npm test           # Jest (20 tests)
npm run seed       # Seed database
```

---

## 📚 Documentation

| Document                                    | Description                                     |
| ------------------------------------------- | ----------------------------------------------- |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md)   | Mermaid diagrams, data flows, component table   |
| [MANUAL.md](./docs/MANUAL.md)               | Full installation, dependency & execution guide |
| [PROMPT_DESIGN.md](./docs/PROMPT_DESIGN.md) | Prompt iteration history (before/after)         |
| [REPORT.md](./docs/REPORT.md)               | Model rationale, GenAI choices, limitations     |

---

## 📸 Pages

| Page        | Route          | Description                           |
| ----------- | -------------- | ------------------------------------- |
| Dashboard   | `/`            | Fleet KPIs, risk matrix, trend charts |
| Plants      | `/plants`      | Plant overview + CSV/Excel import     |
| Chat        | `/chat`        | RAG + Agent conversational AI         |
| Inverters   | `/inverters`   | Inverter fleet monitoring             |
| AI Insights | `/ai-insights` | GenAI health narratives               |
| Analytics   | `/analytics`   | Energy production analytics           |
| Anomalies   | `/anomalies`   | Deviation alerts & log                |
| Forecast    | `/forecast`    | 48-hour solar forecast                |
| Carbon      | `/carbon`      | CO₂ avoidance tracking                |
| Maintenance | `/maintenance` | AI-prioritized task queue             |
| Security    | `/security`    | Grid sync quality                     |
| Settings    | `/settings`    | Profile and preferences               |

---

## ⚠️ Known Limitations & Future Work

**Current Limitations:**

- RAG uses keyword matching (not vector similarity) — works well for structured IDs/metrics
- ML model trained on 3 plants — may need retraining for different solar technologies
- Agent steps are sequential — parallel tool execution would reduce latency
- No real-time SCADA streaming (batch per request, not WebSocket)

**Future Improvements:**

- Vector DB (Pinecone/Weaviate) for semantic RAG search
- Multi-model ensemble (HGBC + LSTM for time-series anomaly detection)
- Real-time SCADA integration via MQTT/Modbus
- CI/CD with automated model retraining on new data
- Multi-tenant architecture with role-based access per plant operator

---

## 👨‍💻 Author

**Neev Modh** — Built with ❤️ for **HACKaMINeD 2026** 🏆

---

<div align="center">
  <strong>☀️ Solar Intel — Predict failures before they happen. One watt at a time.</strong>
</div>
