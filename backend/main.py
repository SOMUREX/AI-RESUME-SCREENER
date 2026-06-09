import re
import os
import spacy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Ensure spaCy model is downloaded programmatically
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("spaCy model 'en_core_web_sm' not found. Downloading...")
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Load sentence-transformers for semantic similarity
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

print("Loading Sentence-BERT model (all-MiniLM-L6-v2)...")
similarity_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Sentence-BERT model loaded successfully.")

app = FastAPI(
    title="ResumeAI ML Backend",
    description="FastAPI service for semantic resume scoring & NLP skill extraction",
    version="1.0.0"
)

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits localhost:8080 and other client hosts
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schema for analysis requests
class ScreeningRequest(BaseModel):
    resume_text: str
    job_desc: str

# Comprehensive taxonomy of technology skills for mapping and verification
SKILL_TAXONOMY = {
    # Programming Languages
    "Python": ["python", "py"],
    "Go (Golang)": ["go", "golang"],
    "TypeScript": ["typescript", "ts"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "Java": ["java"],
    "C++": ["c++", "cpp"],
    "Rust": ["rust", "rs"],
    "Ruby": ["ruby", "rails"],
    "SQL": ["sql", "mysql", "sqlite", "mssql", "oracle", "plsql"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3", "sass", "scss", "flexbox", "css grid"],

    # Frameworks & UI Libraries
    "React": ["react", "react.js", "reactjs", "react native"],
    "Angular": ["angular", "angularjs"],
    "Vue.js": ["vue", "vue.js", "vuejs"],
    "Next.js": ["next.js", "nextjs"],
    "Node.js": ["node.js", "nodejs", "node"],
    "Express.js": ["express", "expressjs"],
    "FastAPI": ["fastapi"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Spring Boot": ["spring boot", "spring"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],

    # Databases & Caching
    "PostgreSQL": ["postgresql", "postgres"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "SQLite": ["sqlite"],
    "DynamoDB": ["dynamodb"],

    # DevOps & Infrastructure
    "Docker": ["docker", "containerization"],
    "Kubernetes": ["kubernetes", "k8s"],
    "AWS": ["aws", "amazon web services", "s3", "ec2", "rds", "lambda"],
    "GCP": ["gcp", "google cloud", "google cloud platform"],
    "Azure": ["azure", "microsoft azure"],
    "Terraform": ["terraform"],
    "CI/CD": ["ci/cd", "ci-cd", "jenkins", "github actions", "gitlab ci", "continuous integration"],

    # Machine Learning & AI
    "PyTorch": ["pytorch", "torch"],
    "TensorFlow": ["tensorflow", "tf"],
    "Scikit-Learn": ["scikit-learn", "sklearn", "scikit learn"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "NLP": ["nlp", "natural language processing", "spacy", "nltk", "transformers"],
    "LLMs": ["llm", "llms", "large language model", "large language models", "gpt", "llama", "gemini", "prompt engineering"],
    "Machine Learning": ["machine learning", "ml", "classification", "regression", "random forest", "svm", "xgboost"],
    "Deep Learning": ["deep learning", "neural networks", "cnn", "rnn", "lstm"],
    "Vector Databases": ["vector database", "vector databases", "pinecone", "chroma", "weaviate"],

    # Management & Methodology
    "Agile": ["agile", "scrum", "kanban", "sprint"],
    "Git": ["git", "github", "gitlab", "version control"],
    "REST APIs": ["rest", "restful", "rest api", "apis"],
    "GraphQL": ["graphql"],
    "Microservices": ["microservice", "microservices"],
    "Product Management": ["product management", "pm", "roadmap", "backlog", "jira"]
}

def clean_and_normalize(text: str) -> str:
    """Normalizes string tokens for robust matching."""
    return " ".join(text.lower().split())

def check_skill_in_text(skill_variations: List[str], text_lower: str) -> bool:
    """Uses regex word boundary rules for short names to avoid false matches."""
    for var in skill_variations:
        var_clean = var.lower()
        # Word boundaries are critical for short tokens like 'go', 'ts', 'r', 'ml'
        if len(var_clean) <= 3 or var_clean.isalpha():
            pattern = r'\b' + re.escape(var_clean) + r'\b'
            if re.search(pattern, text_lower):
                return True
        else:
            if var_clean in text_lower:
                return True
    return False

def title_case_name(name: str) -> str:
    """Convert ALL CAPS or all-lower names to proper Title Case."""
    # Handle ALL CAPS like "JOHN SMITH" -> "John Smith"
    if name.isupper() or name.islower():
        return name.title()
    return name

def extract_name_from_text(text: str, lines: list) -> str:
    """
    Multi-strategy name extraction from resume text.
    Tries 4 approaches in order of confidence.
    """
    # --- Strategy 1: spaCy PERSON NER on the first ~500 characters ---
    # spaCy is very good at detecting human names as PERSON entities
    try:
        head_text = " ".join(lines[:15])[:600]
        doc = nlp(head_text)
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                candidate = ent.text.strip()
                # Must have at least 2 words, no numbers, reasonable length
                words = candidate.split()
                if 2 <= len(words) <= 5 and all(re.match(r"[a-zA-Z\-'\.]+$", w) for w in words):
                    return title_case_name(candidate)
    except Exception:
        pass

    # --- Strategy 2: Line-by-line pattern matching (first 12 lines) ---
    SKIP_WORDS = {
        "resume", "curriculum", "vitae", "profile", "contact", "email",
        "phone", "address", "linkedin", "github", "portfolio", "objective",
        "summary", "skills", "experience", "education", "projects",
        "certifications", "achievements", "references", "page", "cv"
    }

    for line in lines[:12]:
        # Strip everything except letters, spaces, hyphens, apostrophes, dots
        line_clean = re.sub(r"[^a-zA-Z\s\-'\.]", "", line).strip()
        words = line_clean.split()

        if not words or len(words) < 2 or len(words) > 5:
            continue

        # Skip if any word is a resume-header keyword
        lower_words = [w.lower() for w in words]
        if any(w in SKIP_WORDS for w in lower_words):
            continue

        # Skip if any word is too short (single letters like "A" unless it's initial like "A.")
        if any(len(w) < 2 for w in words):
            continue

        # Skip long lines (likely a job title or address)
        if len(line_clean) > 50:
            continue

        # Accept if: ALL CAPS name like "JOHN SMITH", or Title Case like "John Smith"
        all_alpha = all(re.match(r"[a-zA-Z\-'\.]+$", w) for w in words)
        is_caps_pattern = all(w.isupper() or w.istitle() or (len(w) == 1) for w in words)

        if all_alpha and is_caps_pattern:
            return title_case_name(line_clean)

    # --- Strategy 3: Extract name from email prefix as last resort ---
    email_match = re.search(r"([a-zA-Z]+)[._]([a-zA-Z]+)@", text)
    if email_match:
        first = email_match.group(1).capitalize()
        last = email_match.group(2).capitalize()
        # Ignore generic prefixes like "info", "contact", "hr", "admin"
        generic = {"info", "contact", "hr", "admin", "hello", "support", "careers"}
        if first.lower() not in generic and last.lower() not in generic:
            return f"{first} {last}"

    return "Unknown Candidate"

def extract_metadata(text: str) -> Dict[str, str]:
    """Robust extraction of candidate details from resume text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    metadata = {
        "name": "Unknown Candidate",
        "email": "N/A",
        "phone": "N/A",
        "education": "N/A",
        "experienceYears": "N/A"
    }

    # 1. Candidate Name — multi-strategy extractor
    metadata["name"] = extract_name_from_text(text, lines)

    # 2. Email Address
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        metadata["email"] = email_match.group(0)

    # 3. Phone Number — handles Indian (+91), US, and international formats
    phone_match = re.search(
        r"(\+?\d{1,3}[\s\-\.]?)?"          # country code optional: +91, +1
        r"(\(?\d{3,5}\)?[\s\-\.]?)"        # area code
        r"(\d{3,4}[\s\-\.]?)"              # exchange
        r"(\d{3,4})",                       # subscriber
        text
    )
    if phone_match:
        raw_phone = phone_match.group(0).strip()
        # Discard if it looks like a year (e.g., "2020")
        if len(re.sub(r"\D", "", raw_phone)) >= 8:
            metadata["phone"] = raw_phone

    # 4. Education — scan for degree keywords
    edu_indicators = [
        "bachelor", "master", "ph.d", "phd", "doctor",
        "b.tech", "m.tech", "b.e.", "m.e.", "b.sc", "m.sc",
        "b.s.", "m.s.", "bba", "mba", "be ", "me ",
        "university", "college", "institute", "school of"
    ]
    edu_lines = []
    for line in lines:
        line_lower = line.lower()
        if any(ind in line_lower for ind in edu_indicators):
            edu_lines.append(line.strip())
            if len(edu_lines) >= 2:
                break
    if edu_lines:
        metadata["education"] = " / ".join(edu_lines[:2])

    # 5. Experience Years — direct mention or date range inference
    exp_matches = re.findall(
        r"(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:year|yr)s?\s*(?:of)?\s*(?:experience|exp)",
        text, re.IGNORECASE
    )
    if exp_matches:
        try:
            years = max([float(x) for x in exp_matches])
            metadata["experienceYears"] = f"{int(years) if years.is_integer() else years} Years"
        except ValueError:
            pass
    else:
        # Fallback: infer from date ranges like "2019 – 2023" or "Jan 2020 - Present"
        year_ranges = re.findall(
            r"\b(20\d{2})\b\s*(?:–|-|to)\s*\b(20\d{2}|present|current|now)\b",
            text, re.IGNORECASE
        )
        if year_ranges:
            total_years = 0
            for start, end in year_ranges:
                start_yr = int(start)
                end_yr = 2026 if end.lower() in ["present", "current", "now"] else int(end)
                if end_yr >= start_yr:
                    total_years += (end_yr - start_yr)
            if total_years > 0:
                metadata["experienceYears"] = f"{total_years} Years"

    return metadata


@app.get("/")
def read_root():
    return {"status": "healthy", "service": "ResumeAI ML Backend"}

@app.post("/analyze")
def analyze_resume(payload: ScreeningRequest):
    resume_text = payload.resume_text
    job_desc = payload.job_desc

    if not resume_text.strip() or not job_desc.strip():
        raise HTTPException(status_code=400, detail="Both resume text and job description must be provided.")

    resume_lower = resume_text.lower()
    jd_lower = job_desc.lower()

    # 1. Compute SBERT Embedding Cosine Similarity
    try:
        emb_resume = similarity_model.encode(resume_text, convert_to_tensor=True)
        emb_jd = similarity_model.encode(job_desc, convert_to_tensor=True)
        
        # Calculate Cosine Similarity
        cosine_sim = cosine_similarity(
            emb_resume.cpu().numpy().reshape(1, -1),
            emb_jd.cpu().numpy().reshape(1, -1)
        )[0][0]
        
        # SBERT cosine scores usually stay between 0.15 and 0.85 for resumes vs JDs
        # Normalize/Scale score between 0 and 100 for user visualization
        sbert_score = int(min(max((cosine_sim - 0.15) / 0.70 * 100, 0), 100))
    except Exception as e:
        print(f"Embedding error: {e}")
        sbert_score = 50  # Fallback

    # 2. Extract Skill taxonomy tags
    jd_skills = []
    resume_skills = []
    
    for skill_name, variations in SKILL_TAXONOMY.items():
        in_jd = check_skill_in_text(variations, jd_lower)
        in_resume = check_skill_in_text(variations, resume_lower)
        
        if in_jd:
            jd_skills.append(skill_name)
        if in_resume:
            resume_skills.append(skill_name)

    # If Job description is very custom or doesn't mention standard keywords,
    # extract fallback nouns with spaCy
    if len(jd_skills) < 3:
        doc_jd = nlp(job_desc)
        # Add proper nouns and nouns of reasonable length as skills
        additional_jd = [token.text for token in doc_jd if token.pos_ in ["PROPN"] and len(token.text) > 2]
        for adj in list(set(additional_jd))[:8]:
            if adj not in jd_skills and adj.lower() not in ["role", "responsibility", "requirements", "experience", "candidate"]:
                jd_skills.append(adj)
                # Check match in resume
                if adj.lower() in resume_lower:
                    resume_skills.append(adj)

    # 3. Calculate Keyword Overlap Score
    matched_jd_skills = [s for s in jd_skills if s in resume_skills]
    missing_jd_skills = [s for s in jd_skills if s not in resume_skills]
    
    overlap_score = (len(matched_jd_skills) / len(jd_skills) * 100) if jd_skills else 60.0

    # 4. Compute Hybrid Match Score (60% SBERT Semantic, 40% Keyword Overlap)
    match_score = int(round(0.6 * sbert_score + 0.4 * overlap_score))
    match_score = min(max(match_score, 0), 100)

    # 5. Extract Dynamic spaCy NER entities as secondary validation
    doc_resume = nlp(resume_text)
    spacy_extracted_orgs = set()
    for ent in doc_resume.ents:
        if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text) > 1:
            clean_ent = ent.text.strip().replace("\n", " ")
            if clean_ent.lower() not in ["university", "college", "experience", "resume", "curriculum vitae", "details", "contact"]:
                spacy_extracted_orgs.add(clean_ent)
    
    # 6. Construct Skills Matrix Object
    skills_matrix = []
    for skill in jd_skills:
        # Determine if required (heuristically, first few items or matching text hints)
        # If the skill appears early in the job description or is marked 'required'
        is_required = True
        idx = job_desc.lower().find(skill.lower())
        if idx != -1:
            # Check context around the skill keyword for optional flags
            context = job_desc.lower()[max(0, idx-40):min(len(job_desc), idx+40)]
            if any(opt in context for opt in ["optional", "nice to have", "preferred", "plus", "desirable"]):
                is_required = False
        
        has_match = skill in resume_skills
        
        # Estimate skill status details
        if has_match:
            status = "Identified in candidate credentials"
            match_status = "yes"
        else:
            status = "Missing key keyword alignment"
            match_status = "no"
            
        skills_matrix.append({
            "skill": skill,
            "required": is_required,
            "match": match_status,
            "status": status
        })

    # Sort matrix to put gaps first (to highlight what to verify)
    skills_matrix.sort(key=lambda x: (x["match"] == "yes", not x["required"]))

    # 7. Metadata extraction
    metadata = extract_metadata(resume_text)

    # 8. Generate Strengths & Weaknesses lists
    strengths = []
    if len(matched_jd_skills) > 0:
        strengths = [f"Strong background matching requirements in: {', '.join(matched_jd_skills[:3])}."]
    else:
        strengths = ["Possesses foundational technical education and communication capabilities."]
        
    if "experienceYears" in metadata and metadata["experienceYears"] != "N/A":
        strengths.append(f"Demonstrated professional history of {metadata['experienceYears']}.")
    
    # Add any extra dynamic strengths based on spaCy extraction
    spacy_list = list(spacy_extracted_orgs)
    if spacy_list:
        strengths.append(f"Showcases active involvement with technologies: {', '.join(spacy_list[:2])}.")

    weaknesses = []
    if len(missing_jd_skills) > 0:
        weaknesses.append(f"Missing core technology competencies: {', '.join(missing_jd_skills[:3])}.")
    else:
        weaknesses.append("No major technology gaps detected in primary requirements.")
        
    weaknesses.append("Recommendation to verify actual hand-on depth through technical validation tests.")

    # 9. Recommendation Summary
    role_title = metadata["name"]
    summary = (
        f"Candidate {metadata['name']} displays a hybrid NLP evaluation score of {match_score}% alignment. "
        f"They demonstrate solid qualifications in {', '.join(matched_jd_skills[:2]) if matched_jd_skills else 'general engineering concepts'}, "
        f"but show gaps in {', '.join(missing_jd_skills[:2]) if missing_jd_skills else 'advanced tooling'}. "
        f"Sentence-BERT semantic similarity validates a contextual mapping similarity of {int(sbert_score)}%."
    )

    score_tagline = (
        f"Decent match on core skills but lacks exact credentials in {', '.join(missing_jd_skills[:2])}."
        if missing_jd_skills else "Strong overall semantic match with high tech stack coverage."
    )
    if match_score >= 85:
        score_tagline = "Excellent matching candidate profile with high skill stack coverage."
    elif match_score < 70:
        score_tagline = f"Development areas identified. Missing key technologies like {', '.join(missing_jd_skills[:2]) if missing_jd_skills else 'required stack'}."

    # 10. Customized Interview Questions
    interview_questions = []
    for i, gap in enumerate(missing_jd_skills[:2]):
        interview_questions.append({
            "question": f"Your resume doesn't focus heavily on {gap}. Can you describe a project where you had to work with or implement {gap} or related frameworks, and how you managed the learning curve?",
            "rubric": f"Evaluate the candidate's understanding of {gap} architecture, core challenges (e.g. state, performance, scale), and capacity to acquire new tooling quickly."
        })
        
    # Standard general question if no gaps
    if not interview_questions:
        interview_questions.append({
            "question": "Can you walk us through the system architecture of a complex project you recently designed and how you chose the tech stack?",
            "rubric": "Look for database schemas, caching, modular code separations, scalability trade-offs, and deployment environments."
        })
    # Add a behavioral question
    interview_questions.append({
        "question": "How do you handle disagreement in technical designs or code reviews with team members?",
        "rubric": "Look for communication skills, collaborative problem-solving, compromising, and objective testing/benchmarking to resolve debates."
    })

    return {
        "candidateName": metadata["name"],
        "email": metadata["email"],
        "phone": metadata["phone"],
        "education": metadata["education"],
        "experienceYears": metadata["experienceYears"],
        "matchScore": match_score,
        "scoreTagline": score_tagline,
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:4],
        "summary": summary,
        "skillsMatrix": skills_matrix,
        "interviewQuestions": interview_questions
    }
