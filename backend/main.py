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

def extract_metadata(text: str) -> Dict[str, str]:
    """Heuristic extraction of candidate details from resume text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    metadata = {
        "name": "Unknown Candidate",
        "email": "N/A",
        "phone": "N/A",
        "education": "N/A",
        "experienceYears": "N/A"
    }

    # 1. Candidate Name (Heuristic: First few lines, typical 2-3 proper capitalization words)
    name_found = False
    for line in lines[:5]:
        line_clean = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = line_clean.split()
        # Ignore common resume header words
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
            lower_words = [w.lower() for w in words]
            if not any(w in ["resume", "curriculum", "vitae", "profile", "contact", "email", "phone"] for w in lower_words):
                metadata["name"] = line_clean
                name_found = True
                break

    # 2. Email Address (Regex standard)
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    if email_match:
        metadata["email"] = email_match.group(0)

    # 3. Phone Number (Heuristic pattern)
    phone_match = re.search(r'\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', text)
    if phone_match:
        metadata["phone"] = phone_match.group(0)

    # 4. Education (Degree and Major scanner)
    edu_indicators = ["bachelor", "master", "ph.d", "doctor", "b.tech", "m.tech", "b.s.", "m.s.", "bba", "mba", "university", "college", "institute"]
    edu_lines = []
    for line in lines:
        line_lower = line.lower()
        if any(ind in line_lower for ind in edu_indicators):
            edu_lines.append(line)
            if len(edu_lines) >= 2:
                break
    if edu_lines:
        metadata["education"] = " / ".join(edu_lines[:2])

    # 5. Experience Years (Scanning digits + 'year' proximity)
    exp_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:year|yr)s?\s*(?:of)?\s*(?:experience|exp)', text, re.IGNORECASE)
    if exp_matches:
        # Take the maximum years detected
        try:
            years = max([float(x) for x in exp_matches])
            metadata["experienceYears"] = f"{int(years) if years.is_integer() else years} Years"
        except ValueError:
            pass
    else:
        # Fallback date ranges calculation (e.g. 2019 - 2023)
        year_ranges = re.findall(r'\b(20\d{2})\b\s*(?:-|to)\s*\b(20\d{2}|present|current)\b', text, re.IGNORECASE)
        if year_ranges:
            total_years = 0
            for start, end in year_ranges:
                start_yr = int(start)
                end_yr = 2026 if end.lower() in ["present", "current"] else int(end)
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
