# ResumeAI Screener — Intelligent Candidate Evaluation System

An advanced, full-stack resume screening application that combines a high-performance, glassmorphic client-side frontend with a local Python FastAPI Machine Learning microservice.

The system features two operational modes:
1. **Google Gemini Live API Mode**: Calls Gemini models (`gemini-2.5-flash`) directly client-side for generative screening, tailored interview guides, and structured JSON scoring.
2. **Local Python ML Backend Mode**: Runs 100% locally and offline. It uses standard NLP libraries (**Sentence-Transformers** for Sentence-BERT semantic similarity and **spaCy** for custom NER skill extraction and gap analysis).

---

## System Architecture

```mermaid
graph TD
    subgraph Frontend [Client Browser (Port 8080)]
        UI[Glassmorphic HTML/CSS Interface]
        JS[app.js Logic Controller]
        PDF[PDF.js Text Extractor]
    end

    subgraph Cloud [LLM API]
        Gemini[Google Gemini API]
    end

    subgraph Backend [Local Python Microservice (Port 8000)]
        FastAPI[FastAPI Endpoints]
        SBERT[Sentence-Transformers all-MiniLM-L6-v2]
        SpaCy[spaCy NLP en_core_web_sm]
        Taxonomy[Skill Taxonomy & Regex Matcher]
    end

    UI -->|1. Upload PDF| PDF
    PDF -->|2. Extract Raw Text| JS
    JS -->|Mode A: Direct Cloud Call| Gemini
    JS -->|Mode B: REST API POST /analyze| FastAPI
    FastAPI -->|A. Embeddings & Cosine Sim| SBERT
    FastAPI -->|B. NER Entity Extraction| SpaCy
    FastAPI -->|C. Keyword Alignment| Taxonomy
    FastAPI -->|3. Structured Analysis JSON| JS
    JS -->|4. Render Results Dashboard| UI
```

---

## Machine Learning & NLP Architecture

### 1. Semantic Similarity via Sentence-BERT
*   **Model**: `sentence-transformers/all-MiniLM-L6-v2` (a light, CPU-friendly Sentence-BERT model mapping sentences & paragraphs to a 384-dimensional dense vector space).
*   **Concept**: Standard TF-IDF or token searches fail when resumes use synonyms or related terms (e.g. matching "Frontend" with "React, CSS, HTML"). SBERT encodes the entire Job Description and Resume independently and measures the angular distance between their vectors using **Cosine Similarity**.
*   **Normalization**: Cosine similarity values typically range from 0.15 to 0.85 for resumes vs JDs. We map and scale this metric linearly to a 0–100% SBERT score.

### 2. Hybrid Scoring Algorithm
To prevent SBERT from over-generalizing and missing critical hard requirements (e.g. a job requiring Java, but the candidate only knows Python, even if both write similar backend descriptions), we implement a hybrid scoring formula:
$$\text{Match Score} = 0.6 \times \text{SBERT Score} + 0.4 \times \text{Keyword Overlap Score}$$
*   **Keyword Overlap Score**: Calculated as the percentage of required job description skills matched in the candidate's resume based on our taxonomy.

### 3. Dynamic Skill Extraction via spaCy & Taxonomy Matcher
*   **spaCy Named Entity Recognition (NER)**: Evaluates the resume using the `en_core_web_sm` pipeline. It parses the document and extracts organizational tags (`ORG`) and product references (`PRODUCT`) to dynamically isolate candidates' historical tech exposure.
*   **Regex Phrase Matcher**: Employs regular expressions with word boundary parameters (`\bkeyword\b`) mapped against a technology dictionary. This prevents false positive matches for short acronyms or language names (such as the programming language **Go**).

---

## Setup & Running Instructions

### 1. Run the Frontend Server
We are already running a local HTTP server on port **8080**. You can view it by visiting:
[http://localhost:8080/](http://localhost:8080/)

### 2. Run the Python ML Backend
1. Open your project directory: `C:\Users\someshwar\.gemini\antigravity-ide\scratch\resume-project`
2. Double-click the **`start_backend.bat`** file.
3. This batch script will:
    *   Create a local python virtual environment (`.venv`) if not already present.
    *   Install all packages listed in `requirements.txt` (FastAPI, Sentence-Transformers, spaCy, sklearn).
    *   Download the spaCy model (`en_core_web_sm`) automatically.
    *   Start the FastAPI development server on [http://127.0.0.1:8000](http://127.0.0.1:8000).

### 3. Activate Local ML Mode
1. In the web interface navbar, click **API Configuration**.
2. Change the **API Operational Mode** dropdown to: **Local Python ML Backend (FastAPI)**.
3. Click **Save Settings**.
4. Try uploading a PDF resume or pasting text to run a 100% offline, local machine-learning screening evaluation!

---

## Resume Talking Points (For B.Tech CE AI/ML Interviews)

If you feature this project on your resume, be prepared to answer these questions:

*   **Q: Why use a local microservice in addition to Gemini/LLMs?**
    *   *Answer*: "Cloud LLMs are powerful but present latency, high token costs, and data privacy issues when processing sensitive PII (Personally Identifiable Information) in candidate resumes. Incorporating a local microservice allows us to perform fast, cost-effective, offline semantic screening and NER metadata extraction on local machines before deciding to escalate to expensive LLM prompt generations."
*   **Q: How does Sentence-Transformers differ from basic TF-IDF?**
    *   *Answer*: "TF-IDF maps keywords to a sparse vector space, representing only exact token overlaps. It ignores semantics (synonyms, conceptual similarity). Sentence-Transformers maps text into a dense vector space based on contextual word embeddings, capturing semantic relationships. For instance, it recognizes that 'container orchestration' is conceptually similar to 'Kubernetes' even if the exact words are different."
*   **Q: How do you handle false matches for short skills like 'Go' or 'R'?**
    *   *Answer*: "Using raw substring searching creates false positives (e.g. matching 'go' in 'good' or 'ongoing'). I implemented regular expression constraints with word boundaries (`\bgo\b`) to ensure we only capture matches when they represent distinct language identifiers in the resume text."
