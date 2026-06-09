<div align="center">

# 🤖 ResumeAI Screener

### Intelligent Candidate Evaluation System — Powered by Sentence-BERT & spaCy NLP

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Sentence Transformers](https://img.shields.io/badge/Sentence--BERT-all--MiniLM--L6--v2-FF6B35?style=for-the-badge)](https://www.sbert.net/)
[![spaCy](https://img.shields.io/badge/spaCy-en__core__web__sm-09A3D5?style=for-the-badge&logo=spacy&logoColor=white)](https://spacy.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A full-stack AI resume screening application that evaluates candidate PDFs against job descriptions using real **machine learning** — not just keyword matching.

[🚀 Live Demo]() · [📖 Read the Docs](#setup--running-locally) · [🧠 ML Architecture](#machine-learning-architecture)

</div>

---

## ✨ What It Does

Upload a PDF resume + paste a Job Description → get a full screening report in seconds:

| Feature | Details |
|---|---|
| 📊 **Match Score** | Hybrid 60% semantic + 40% keyword overlap score (0–100%) |
| 🧠 **Skill Gap Matrix** | 50+ skill taxonomy — detects matched vs missing tech skills |
| 👤 **Candidate Metadata** | Auto-extracts name, email, phone, education, years of experience from PDF |
| 💬 **Interview Questions** | Gap-driven questions tailored to the candidate's missing skills |
| ✅ **Strengths & Weaknesses** | Dynamic evaluation based on actual resume content |
| 📄 **PDF Export** | Download a full screening report as a formatted PDF |
| 🌐 **Dual Engine** | Switch between Local ML Backend or Google Gemini Live API |
| 🌙 **Dark/Light Mode** | Full theme support |
| 🕓 **Screening History** | Persisted locally, with one-click revisit |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────┐
│           Browser Client (Port 8080)              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ index.html│  │   app.js     │  │  PDF.js    │  │
│  │ Dark UI  │  │ Logic/State  │  │ PDF Parser │  │
│  └──────────┘  └──────────────┘  └────────────┘  │
└────────────────────┬─────────────────────────────┘
                     │  POST /analyze
          ┌──────────▼──────────────┐      ┌──────────────────┐
          │  FastAPI Backend         │  OR  │  Google Gemini   │
          │  (Port 8000 — Local)     │      │  REST API (Cloud)│
          │                          │      └──────────────────┘
          │  ┌────────────────────┐  │
          │  │ Sentence-BERT SBERT│  │  ← Semantic similarity
          │  │ all-MiniLM-L6-v2  │  │    (384-dim embeddings)
          │  └────────────────────┘  │
          │  ┌────────────────────┐  │
          │  │ spaCy NLP Pipeline │  │  ← PERSON NER, ORG/PRODUCT
          │  │ en_core_web_sm     │  │    entity extraction
          │  └────────────────────┘  │
          │  ┌────────────────────┐  │
          │  │ 50+ Skill Taxonomy │  │  ← Regex word-boundary
          │  │ Regex Matcher      │  │    matching
          │  └────────────────────┘  │
          └──────────────────────────┘
```

---

## 🧠 Machine Learning Architecture

### 1. Semantic Similarity — Sentence-BERT

Standard keyword search completely misses semantic relationships. This project uses **Sentence-BERT** (`all-MiniLM-L6-v2`) to map both the resume and job description into a **384-dimensional dense vector space** and measures their angular distance.

```python
# Encode both texts into embedding vectors
emb_resume = model.encode(resume_text)
emb_jd     = model.encode(job_desc)

# Cosine similarity: 1.0 = identical context, 0.0 = unrelated
cosine_sim  = cosine_similarity(emb_resume, emb_jd)

# Normalize to 0–100% range (typical resume-JD scores: 0.15–0.85)
sbert_score = int((cosine_sim - 0.15) / 0.70 * 100)
```

> **Why this matters:** SBERT recognizes that *"container orchestration with Kubernetes"* and *"Docker/K8s deployment"* are semantically related — even with zero keyword overlap.

---

### 2. Hybrid Scoring Formula

To prevent over-generalization (a Python developer scoring high against a Java JD just because both describe "backend work"), we combine semantic + keyword signals:

$$\text{Match Score} = 0.6 \times \text{SBERT\_Score} + 0.4 \times \text{Keyword\_Overlap\_Score}$$

| Component | Weight | Method |
|---|---|---|
| SBERT Semantic Similarity | 60% | Cosine similarity of transformer embeddings |
| Keyword Overlap Score | 40% | Matched skills ÷ total required skills × 100 |

---

### 3. Skill Extraction — 50+ Skill Taxonomy + spaCy NER

Skills are detected using two complementary methods:

**A. Taxonomy Matching** — A curated dictionary of 50+ technology skills with aliases:
```python
SKILL_TAXONOMY = {
    "Python":       ["python", "py"],
    "React":        ["react", "react.js", "react native"],
    "Kubernetes":   ["kubernetes", "k8s"],
    "Machine Learning": ["ml", "classification", "random forest", "xgboost"],
    "NLP":          ["nlp", "spacy", "nltk", "transformers"],
    # ... 50+ more
}
```

**B. Word Boundary Regex** — Prevents false positives on short names:
```python
# Without word boundary: "go" matches "golang", "good", "ongoing" ❌
# With word boundary: \bgo\b only matches standalone "go" ✅
pattern = r'\b' + re.escape(skill_alias) + r'\b'
```

**C. spaCy PERSON NER** — Multi-strategy name extraction from PDFs:
```
Strategy 1: spaCy PERSON entity on first 15 lines  →  "Someshwar Kumar"
Strategy 2: Title Case / ALL CAPS pattern matching  →  "JOHN SMITH" → "John Smith"
Strategy 3: Email prefix fallback                   →  "first.last@email.com" → "First Last"
```

---

## 📁 Project Structure

```
resume-project/
│
├── index.html              # Main UI — glassmorphic dark theme
├── start_backend.bat       # One-click backend setup & launch (Windows)
├── README.md
├── DEPLOYMENT.md           # GitHub Pages + Hugging Face deploy guide
│
├── css/
│   └── styles.css          # Full design system (dark/light, oklch colors)
│
├── js/
│   └── app.js              # Frontend logic: PDF parsing, API calls, UI state
│
└── backend/
    ├── main.py             # FastAPI server — ML inference endpoints
    └── requirements.txt    # Python dependencies
```

---

## ⚙️ Setup & Running Locally

### Prerequisites
- [Python 3.8+](https://python.org/downloads/) installed and added to PATH
- A modern browser (Chrome/Edge recommended)

### Step 1 — Start the ML Backend

Double-click **`start_backend.bat`** in the project folder.

This script automatically:
1. ✅ Creates a Python virtual environment (`.venv`)
2. ✅ Installs all packages: `fastapi`, `uvicorn`, `sentence-transformers`, `spacy`, `scikit-learn`
3. ✅ Downloads spaCy model (`en_core_web_sm`, ~12MB)
4. ✅ Downloads Sentence-BERT model (`all-MiniLM-L6-v2`, ~90MB) on first run
5. ✅ Starts the API server at `http://127.0.0.1:8000`

> **Note:** First run takes 2–3 minutes for model downloads. Subsequent starts take ~10 seconds.

### Step 2 — Serve the Frontend

Open a new terminal in the project folder and run:
```bash
python -m http.server 8080
```

### Step 3 — Open the App

Visit **[http://localhost:8080](http://localhost:8080)** in your browser.

The default mode is **⚡ Local ML Backend** — no API key needed!

---

### Optional: Use Google Gemini Mode

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Click **API Configuration** in the sidebar
3. Select **✨ Google Gemini Live API**
4. Paste your key → **Save & Apply**

---

## 🔌 API Reference

The FastAPI backend exposes:

### `GET /`
Health check endpoint.
```json
{ "status": "healthy", "service": "ResumeAI ML Backend" }
```

### `POST /analyze`
Main analysis endpoint.

**Request:**
```json
{
  "resume_text": "John Smith\njohn@email.com\n...",
  "job_desc": "Role: Senior Frontend Engineer\nRequirements: React, TypeScript..."
}
```

**Response:**
```json
{
  "candidateName": "John Smith",
  "email": "john@email.com",
  "phone": "+91 98765 43210",
  "education": "B.Tech Computer Science - XYZ University",
  "experienceYears": "3 Years",
  "matchScore": 74,
  "scoreTagline": "Strong background in frontend frameworks but gaps in Cloud deployment.",
  "strengths": ["Strong background matching in React, TypeScript"],
  "weaknesses": ["Missing core competency: Kubernetes"],
  "summary": "Candidate John Smith displays a hybrid NLP score of 74%...",
  "skillsMatrix": [
    { "skill": "React", "required": true, "match": "yes", "status": "Identified in candidate credentials" },
    { "skill": "Kubernetes", "required": true, "match": "no", "status": "Missing key keyword alignment" }
  ],
  "interviewQuestions": [
    {
      "question": "Your resume doesn't focus heavily on Kubernetes. Can you describe a project where you worked with container orchestration?",
      "rubric": "Evaluate understanding of K8s architecture and capacity to learn quickly."
    }
  ]
}
```

---

## 🧪 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS | UI, state management |
| **PDF Parsing** | PDF.js (CDN) | Client-side text extraction from PDFs |
| **PDF Export** | html2pdf.js (CDN) | Download screening report as PDF |
| **Icons** | Lucide Icons | Premium icon set |
| **Backend** | Python 3.8+, FastAPI | REST API server |
| **ML — Semantic** | sentence-transformers | SBERT embedding + cosine similarity |
| **ML — NLP** | spaCy en_core_web_sm | NER, PERSON detection, tokenization |
| **ML — Scoring** | scikit-learn | Cosine similarity computation |
| **Cloud AI** | Google Gemini 2.5 Flash | Optional LLM analysis mode |

---

## 💡 Interview Talking Points

> Built this for my B.Tech CE (AI/ML) portfolio. Here are the technical decisions I can defend:

**Q: Why a local ML microservice instead of just using Gemini?**
> Cloud LLMs are powerful but introduce latency, per-token costs, and **PII privacy risks** when processing sensitive candidate data. The local SBERT + spaCy pipeline gives fast, cost-free, offline screening while preserving data privacy — Gemini is available as an optional upgrade for deeper analysis.

**Q: Why Sentence-BERT over TF-IDF?**
> TF-IDF builds sparse vectors based on token frequency — it fails when resumes use different words for the same concept (e.g., *"container orchestration"* vs *"Kubernetes"*). SBERT encodes text into dense 384-dimensional vectors that capture **semantic meaning**, so contextually similar sentences score high regardless of vocabulary differences.

**Q: How do you prevent false positives for short skill names like "Go" or "R"?**
> Raw substring matching causes false positives — *"go"* would match *"golang"*, *"good"*, *"ongoing"*. I implemented **word boundary regex** (`\bgo\b`) that only matches when the token appears as a standalone word, preventing these collisions.

**Q: How does the hybrid scoring prevent SBERT from over-generalizing?**
> A Python developer's resume can score high semantic similarity against a Java JD since both describe "scalable backend services". The 40% keyword overlap component acts as a **precision anchor** — if critical hard skills from the JD are absent in the resume, the overlap score penalizes the final match score regardless of semantic similarity.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">
  Built with ❤️ using Sentence-BERT, spaCy, FastAPI & Google Gemini
  <br/>
  ⭐ Star this repo if you found it useful!
</div>
