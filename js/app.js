// AI Resume Screener Application Logic

// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Prefilled Role Templates
const roleTemplates = {
  frontend: `Role: Senior Frontend Engineer
Core Responsibilities:
- Build modular, high-performance UI components using React, TypeScript, and modern CSS layout techniques (CSS Grid, Flexbox, Container Queries).
- Optimize client-side performance, targeting high metrics on Core Web Vitals (LCP, INP, CLS) and ensuring fluid rendering.
- Ensure strict web accessibility (WCAG 2.1 AA compliant) and utilize semantic HTML elements.
- Collaborate with UX designers and bridge visual specs with pixel-perfect responsive layouts.

Key Requirements:
- 4+ years of professional development experience with React and TypeScript.
- Strong proficiency in CSS/SCSS and browser execution models.
- Experience with testing tools (Jest, React Testing Library) and Git workflows.`,

  backend: `Role: Senior Backend Engineer
Core Responsibilities:
- Design, implement, and maintain highly scalable RESTful & GraphQL APIs in Go or Node.js.
- Optimize database structures (PostgreSQL, MongoDB) and integrate caching strategies (Redis).
- Develop microservice patterns, containerize environments using Docker, and configure orchestration (Kubernetes).
- Support secure auth policies (OAuth2, JWT, CORS) and data transmission encryptions.

Key Requirements:
- 5+ years of experience in backend development using Go, Node.js, or Java.
- Proven expertise in relational and non-relational database query optimization.
- Experience with cloud providers (AWS, GCP, or Azure) and CI/CD pipelines.`,

  fullstack: `Role: Fullstack Engineer (Next.js & Serverless)
Core Responsibilities:
- Own product features end-to-end, writing frontend code in Next.js/React and backend API handlers/serverless functions.
- Manage database schemas, query optimizations, and migrations using Prisma ORM with PostgreSQL.
- Integrate third-party vendor platforms, such as payment gateways (Stripe) and auth services.
- Style application views cleanly with CSS, Tailwind, or Styled Components.

Key Requirements:
- 3+ years of fullstack product engineering experience.
- Strong command of React, Next.js, Node.js, and relational database systems.
- Experience with modern hosting solutions (Vercel, Netlify, AWS).`,

  datascience: `Role: AI & Data Science Engineer
Core Responsibilities:
- Build and evaluate NLP models, deep learning models, and standard machine learning classifiers.
- Preprocess, clean, and analyze large-scale text databases and tabular datasets.
- Fine-tune Open Source LLMs (Llama, Mistral) and write clean inference pipelines using Python.
- Deploy models as REST endpoints and implement tracking metrics for model drift.

Key Requirements:
- MS or PhD in Computer Science, Statistics, or equivalent analytical field.
- 3+ years of programming in Python with PyTorch, TensorFlow, Pandas, and Scikit-Learn.
- Solid understanding of SQL, vector databases (Pinecone, Chroma), and prompt engineering.`,

  product: `Role: Technical Product Manager
Core Responsibilities:
- Define the product vision, roadmap, and core features for a cloud developer platform.
- Translate technical infrastructure capabilities into clear, user-friendly API patterns and product features.
- Lead scrum ceremonies, write detailed Jira stories, and coordinate technical rollouts across engineering teams.
- Meet with stakeholders to collect requirements and prioritize developer feedback.

Key Requirements:
- 4+ years of Product Management experience directing SaaS, APIs, or developer-facing products.
- Educational background in Computer Science or hands-on software development experience.
- Outstanding verbal and written communication skills; Agile methodology leadership.`
};

// Application State
const state = {
  apiMode: localStorage.getItem('screener_api_mode') || 'ml-backend',
  apiKey: localStorage.getItem('screener_api_key') || '',
  apiModel: localStorage.getItem('screener_api_model') || 'gemini-2.5-flash',

  parsedResumeText: '',
  parsedResumeFilename: '',
  parsedResumeFilesize: '',

  activeTab: 'upload-tab',
  history: JSON.parse(localStorage.getItem('screener_history') || '[]'),
  currentScreening: null,
  theme: localStorage.getItem('screener_theme') || 'dark'
};

// DOM Cache
const dom = {
  // Sidebar & Config
  clearHistory: document.getElementById('clear-history'),
  historyList: document.getElementById('history-list'),
  btnSettingsTrigger: document.getElementById('btn-settings-trigger'),
  apiStatusBadge: document.getElementById('api-status-badge'),
  apiStatusText: document.getElementById('api-status-text'),

  // Job Description
  templateSelect: document.getElementById('template-select'),
  jobDescription: document.getElementById('job-description'),
  jdWordCount: document.getElementById('jd-word-count'),

  // Resume Inputs
  tabNavBtns: document.querySelectorAll('.tab-nav-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  dropZone: document.getElementById('drop-zone'),
  resumeFile: document.getElementById('resume-file'),
  removeFile: document.getElementById('remove-file'),
  resumeText: document.getElementById('resume-text'),
  resumeWordCount: document.getElementById('resume-word-count'),
  btnScreen: document.getElementById('btn-screen'),

  // Panels
  inputSection: document.getElementById('input-section'),
  loadingPanel: document.getElementById('loading-panel'),
  loaderStatus: document.getElementById('loader-status'),
  resultsPanel: document.getElementById('results-panel'),

  // Results Dashboard Header
  resultCandidateName: document.getElementById('result-candidate-name'),
  resultCandidateTitle: document.getElementById('result-candidate-title'),
  btnExportText: document.getElementById('btn-export-text'),
  btnReset: document.getElementById('btn-reset'),

  // Result Tabs
  resultTabBtns: document.querySelectorAll('.result-tab-btn'),
  resultTabPanes: document.querySelectorAll('.result-tab-pane'),

  // Result Panels
  listStrengths: document.getElementById('list-strengths'),
  listWeaknesses: document.getElementById('list-weaknesses'),
  evaluationSummary: document.getElementById('evaluation-summary'),
  skillsMatrixBody: document.getElementById('skills-matrix-body'),
  interviewQuestions: document.getElementById('interview-questions'),

  // Side Score & Contact Cards
  scoreProgressBar: document.getElementById('score-progress-bar'),
  scoreText: document.getElementById('score-text'),
  ratingBadge: document.getElementById('rating-badge'),
  scoreTagline: document.getElementById('score-tagline'),

  contactName: document.getElementById('contact-name'),
  contactEmail: document.getElementById('contact-email'),
  contactPhone: document.getElementById('contact-phone'),
  contactEducation: document.getElementById('contact-education'),
  contactExperience: document.getElementById('contact-experience'),

  // Settings Dialog Modal
  settingsDialog: document.getElementById('settings-dialog'),
  dialogClose: document.getElementById('dialog-close'),
  settingsForm: document.getElementById('settings-form'),
  apiModeSelect: document.getElementById('api-mode'),
  geminiKeyGroup: document.getElementById('gemini-key-group'),
  apiKeyInput: document.getElementById('api-key'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  geminiModelGroup: document.getElementById('gemini-model-group'),
  apiModelSelect: document.getElementById('api-model-select'),
  btnSettingsCancel: document.getElementById('btn-settings-cancel'),
  btnSettingsSave: document.getElementById('btn-settings-save'),
  themeToggle: document.getElementById('theme-toggle'),

  // Loading panel dynamic heading
  loaderHeading: document.getElementById('loader-heading'),

  // Mode info banners in settings
  modeInfoMl: document.getElementById('mode-info-ml'),
  modeInfoGemini: document.getElementById('mode-info-gemini'),
  modeInfoMock: document.getElementById('mode-info-mock'),

  // API key inline error
  apiKeyError: document.getElementById('api-key-error'),

  // Settings modal warning banner
  settingsWarning: document.getElementById('settings-warning'),
  settingsWarningText: document.getElementById('settings-warning-text')
};

// Initialize App
function init() {
  // Initialize theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon(state.theme);

  setupEventListeners();
  updateApiStatusUI();
  renderHistory();

  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Bind Actions
function setupEventListeners() {
  // Theme toggling
  if (dom.themeToggle) {
    dom.themeToggle.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      state.theme = newTheme;
      localStorage.setItem('screener_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  // Config Modal triggering
  const openSettings = (warningMsg = null) => {
    dom.apiModeSelect.value = state.apiMode;
    dom.apiKeyInput.value = state.apiKey;
    dom.apiModelSelect.value = state.apiModel;
    handleApiModeChange();
    // Show optional warning banner inside modal
    if (warningMsg && dom.settingsWarning) {
      dom.settingsWarningText.textContent = warningMsg;
      dom.settingsWarning.style.display = 'flex';
    } else if (dom.settingsWarning) {
      dom.settingsWarning.style.display = 'none';
    }
    dom.settingsDialog.showModal();
    // Auto-focus the key input if Gemini mode and key is missing
    if (state.apiMode === 'gemini' && !state.apiKey) {
      setTimeout(() => dom.apiKeyInput.focus(), 100);
    }
  };

  dom.btnSettingsTrigger.addEventListener('click', () => openSettings());

  // Make the status badge clickable to open settings
  dom.apiStatusBadge.style.cursor = 'pointer';
  dom.apiStatusBadge.title = 'Click to open API Configuration';
  dom.apiStatusBadge.addEventListener('click', () => openSettings());

  dom.dialogClose.addEventListener('click', () => dom.settingsDialog.close());
  dom.btnSettingsCancel.addEventListener('click', () => dom.settingsDialog.close());

  dom.apiModeSelect.addEventListener('change', handleApiModeChange);

  dom.toggleKeyVisibility.addEventListener('click', () => {
    const isPassword = dom.apiKeyInput.type === 'password';
    dom.apiKeyInput.type = isPassword ? 'text' : 'password';
    const icon = dom.toggleKeyVisibility.querySelector('i');
    if (icon && typeof lucide !== 'undefined') {
      icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
      lucide.createIcons();
    }
  });

  dom.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedMode = dom.apiModeSelect.value;
    const enteredKey = dom.apiKeyInput.value.trim();

    // Validate: Gemini mode requires an API key
    if (selectedMode === 'gemini' && !enteredKey) {
      // Show inline error on key field
      if (dom.apiKeyError) {
        dom.apiKeyError.style.display = 'flex';
      }
      dom.apiKeyInput.classList.add('input-error');
      dom.apiKeyInput.focus();
      // Shake animation
      dom.apiKeyInput.classList.add('shake');
      setTimeout(() => dom.apiKeyInput.classList.remove('shake'), 500);
      return; // Block save
    }

    // Clear any previous errors
    if (dom.apiKeyError) dom.apiKeyError.style.display = 'none';
    dom.apiKeyInput.classList.remove('input-error');

    state.apiMode = selectedMode;
    state.apiKey = enteredKey;
    state.apiModel = dom.apiModelSelect.value;

    localStorage.setItem('screener_api_mode', state.apiMode);
    localStorage.setItem('screener_api_key', state.apiKey);
    localStorage.setItem('screener_api_model', state.apiModel);

    updateApiStatusUI();
    dom.settingsDialog.close();
  });

  // Templates prefill
  dom.templateSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (roleTemplates[val]) {
      dom.jobDescription.value = roleTemplates[val];
      updateJDWordCount();
      validateInputs();
    }
  });

  // Text area inputs listening
  dom.jobDescription.addEventListener('input', () => {
    updateJDWordCount();
    validateInputs();
  });

  dom.resumeText.addEventListener('input', () => {
    updateResumeWordCount();
    validateInputs();
  });

  // Tab selectors
  dom.tabNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      state.activeTab = tabId;

      dom.tabNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      dom.tabPanes.forEach(pane => {
        if (pane.id === tabId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
      validateInputs();
    });
  });

  // Drag & drop file event handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dom.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dom.dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dom.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dom.dropZone.classList.remove('dragover');
    }, false);
  });

  dom.dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      handleFileSelection(files[0]);
    }
  });

  dom.resumeFile.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length) {
      handleFileSelection(files[0]);
    }
  });

  dom.removeFile.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileSelection();
  });

  // Results Tab handlers
  dom.resultTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPane = btn.getAttribute('data-result-tab');
      dom.resultTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      dom.resultTabPanes.forEach(pane => {
        if (pane.id === targetPane) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  // Main buttons
  dom.btnScreen.addEventListener('click', () => {
    // Gate: Gemini mode selected but no API key saved — redirect to settings
    if (state.apiMode === 'gemini' && !state.apiKey) {
      openSettings('⚠️ Gemini mode requires an API key. Please enter your key below to continue.');
      return;
    }
    startScreeningFlow();
  });
  dom.btnReset.addEventListener('click', () => {
    dom.resultsPanel.style.display = 'none';
    dom.inputSection.style.display = 'grid';
    // Clear active selection in history lists
    document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
  });

  dom.btnExportText.addEventListener('click', exportAssessmentPDF);

  dom.clearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your entire screening history?')) {
      state.history = [];
      localStorage.setItem('screener_history', JSON.stringify(state.history));
      renderHistory();
      dom.btnReset.click();
    }
  });
}

// State changes API Modal UI toggle — shows/hides Gemini fields & mode info banners
function handleApiModeChange() {
  const mode = dom.apiModeSelect.value;

  // Clear any previous validation errors when switching modes
  if (dom.apiKeyError) dom.apiKeyError.style.display = 'none';
  if (dom.apiKeyInput) dom.apiKeyInput.classList.remove('input-error');

  // Show/hide Gemini-specific fields
  if (mode === 'gemini') {
    dom.geminiKeyGroup.style.display = 'flex';
    dom.geminiModelGroup.style.display = 'flex';
  } else {
    dom.geminiKeyGroup.style.display = 'none';
    dom.geminiModelGroup.style.display = 'none';
  }

  // Show the right mode info banner
  dom.modeInfoMl.style.display = mode === 'ml-backend' ? 'flex' : 'none';
  dom.modeInfoGemini.style.display = mode === 'gemini' ? 'flex' : 'none';
  dom.modeInfoMock.style.display = mode === 'mock' ? 'flex' : 'none';
}

// Update Top Navbar Badge
function updateApiStatusUI() {
  if (state.apiMode === 'gemini' && state.apiKey) {
    dom.apiStatusBadge.className = 'status-indicator mode-live';
    dom.apiStatusText.textContent = `✨ Gemini Live · ${state.apiModel}`;
  } else if (state.apiMode === 'gemini' && !state.apiKey) {
    dom.apiStatusBadge.className = 'status-indicator mode-mock';
    dom.apiStatusText.textContent = '✨ Gemini (No Key Set)';
  } else if (state.apiMode === 'ml-backend') {
    dom.apiStatusBadge.className = 'status-indicator mode-live';
    dom.apiStatusText.textContent = '⚡ Local ML Backend';
  } else {
    dom.apiStatusBadge.className = 'status-indicator mode-mock';
    dom.apiStatusText.textContent = '🔵 Demo Mode';
  }
}

// Word Count Handlers
function updateJDWordCount() {
  const words = dom.jobDescription.value.trim().split(/\s+/).filter(w => w.length).length;
  dom.jdWordCount.textContent = `${words} words`;
}

function updateResumeWordCount() {
  const words = dom.resumeText.value.trim().split(/\s+/).filter(w => w.length).length;
  dom.resumeWordCount.textContent = `${words} words`;
}

// Input Validator
function validateInputs() {
  const jdOk = dom.jobDescription.value.trim().length >= 20;
  let resumeOk = false;

  if (state.activeTab === 'upload-tab') {
    resumeOk = state.parsedResumeText.trim().length > 0;
  } else {
    resumeOk = dom.resumeText.value.trim().length > 20;
  }

  if (jdOk && resumeOk) {
    dom.btnScreen.removeAttribute('disabled');
    dom.btnScreen.classList.remove('disabled');
  } else {
    dom.btnScreen.setAttribute('disabled', 'true');
    dom.btnScreen.classList.add('disabled');
  }
}

// PDF Loader File Upload
async function handleFileSelection(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a PDF format resume.');
    return;
  }

  // Show parsing indicator inside drag-drop card
  const content = dom.dropZone.querySelector('.drop-zone-content');
  const preview = dom.dropZone.querySelector('.file-preview-card');
  const filenameEl = dom.dropZone.querySelector('.preview-filename');
  const filesizeEl = dom.dropZone.querySelector('.preview-filesize');

  content.style.display = 'none';
  preview.style.display = 'flex';
  filenameEl.textContent = file.name;
  filesizeEl.textContent = 'Extracting resume text...';

  state.parsedResumeFilename = file.name;
  state.parsedResumeFilesize = `${(file.size / 1024).toFixed(1)} KB`;

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const text = await extractTextFromPDF(arrayBuffer);

    if (!text.trim()) {
      throw new Error("No text content could be extracted. The PDF might be scanned or image-only.");
    }

    state.parsedResumeText = text;
    filesizeEl.textContent = `${state.parsedResumeFilesize} — Successfully Parsed`;
    validateInputs();
  } catch (err) {
    console.error(err);
    alert(`Error parsing PDF: ${err.message}. Please copy-paste the text instead in the "Paste Text" tab.`);
    resetFileSelection();
  }
}

function resetFileSelection() {
  state.parsedResumeText = '';
  state.parsedResumeFilename = '';
  state.parsedResumeFilesize = '';

  const content = dom.dropZone.querySelector('.drop-zone-content');
  const preview = dom.dropZone.querySelector('.file-preview-card');
  dom.resumeFile.value = '';

  content.style.display = 'flex';
  preview.style.display = 'none';
  validateInputs();
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromPDF(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Core Screening Flow Launcher
async function startScreeningFlow() {
  const jd = dom.jobDescription.value.trim();
  const resume = state.activeTab === 'upload-tab' ? state.parsedResumeText : dom.resumeText.value.trim();
  const originFilename = state.activeTab === 'upload-tab' ? state.parsedResumeFilename : 'Pasted Text Resume';

  dom.inputSection.style.display = 'none';
  dom.loadingPanel.style.display = 'flex';
  dom.loaderStatus.textContent = 'Parsing candidate resume parameters...';

  try {
    let responseData = null;

    if (state.apiMode === 'gemini' && state.apiKey) {
      if (dom.loaderHeading) dom.loaderHeading.textContent = '✨ Consulting Gemini AI...';
      dom.loaderStatus.textContent = 'Sending resume to Google Gemini for deep semantic analysis...';
      responseData = await screenWithGeminiAPI(jd, resume);
    } else if (state.apiMode === 'ml-backend') {
      if (dom.loaderHeading) dom.loaderHeading.textContent = '⚡ Running Local ML Analysis...';
      dom.loaderStatus.textContent = 'Computing Sentence-BERT embeddings and spaCy skill extraction...';
      responseData = await screenWithMLBackend(jd, resume);
    } else {
      if (dom.loaderHeading) dom.loaderHeading.textContent = '🔵 Generating Demo Analysis...';
      dom.loaderStatus.textContent = 'Synthesizing keyword-based screening results...';
      await delay(2000);
      responseData = generateMockAnalysis(jd, resume, originFilename);
    }

    // Save to history list
    const newRecord = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      candidateName: responseData.candidateName || 'Unknown Candidate',
      candidateRole: getJobRoleTitle(jd),
      score: responseData.matchScore || 0,
      evaluationData: responseData,
      jobDescription: jd,
      resumeFilename: originFilename
    };

    state.history.unshift(newRecord);
    // Limit to 20 items in list cache
    if (state.history.length > 20) {
      state.history.pop();
    }
    localStorage.setItem('screener_history', JSON.stringify(state.history));

    renderHistory();
    displayScreeningDashboard(newRecord);
  } catch (err) {
    console.error(err);
    alert(`Screening Failed: ${err.message}`);
    dom.loadingPanel.style.display = 'none';
    dom.inputSection.style.display = 'grid';
  }
}

async function screenWithMLBackend(jobDesc, resumeText) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // When deployed, replace the placeholder domain with your actual deployed Hugging Face API address
  const url = isLocalhost 
    ? 'http://127.0.0.1:8000/analyze' 
    : 'https://somurex-ai-resume-screener-api.hf.space/analyze';
  const requestBody = {
    resume_text: resumeText,
    job_desc: jobDesc
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`FastAPI Error: ${response.status}. ${errText}`);
    }

    return await response.json();
  } catch (err) {
    console.error("FastAPI connection failed:", err);
    throw new Error(
      "Could not connect to the local ML Backend. " +
      "Make sure you run the backend server first (double-click 'start_backend.bat' in the project directory) " +
      "and that it is listening on http://127.0.0.1:8000. \n\n" +
      "Error Details: " + err.message
    );
  }
}

// Call Google Gemini REST Endpoints Directly
async function screenWithGeminiAPI(jobDesc, resumeText) {
  const model = state.apiModel;
  const apiKey = state.apiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are a high-caliber technical recruiter and ATS assistant.
Conduct a detailed screening of the candidate resume against the provided Job Description.

Analyze structural alignment, identify core credentials, flag missing requirements, evaluate experience levels, and prepare custom technical validation questions.

### Job Description:
${jobDesc}

### Candidate Resume:
${resumeText}

---

You must respond with a raw JSON object only. Do NOT wrap the JSON inside markdown format blocks like \`\`\`json or \`\`\`. Your output must parse correctly as strict JSON.

Return this exact JSON shape:
{
  "candidateName": "First and last name extracted, or 'Unknown Candidate' if missing",
  "email": "Email address extracted, or 'N/A' if missing",
  "phone": "Phone number extracted, or 'N/A' if missing",
  "education": "Highest degree and institution, or 'N/A' if missing",
  "experienceYears": "Estimated years of experience (e.g. '4.5 Years')",
  "matchScore": 0-100 integer representing the overall percentage fit,
  "scoreTagline": "Brief 1-sentence explanation of the score, e.g. 'Strong match on frontend frameworks but lacks production Cloud deployment.'",
  "strengths": ["Key Strength 1", "Key Strength 2", "Key Strength 3 (Maximum 4 items)"],
  "weaknesses": ["Key weakness/gap 1", "Key weakness/gap 2", "Key weakness/gap 3 (Maximum 4 items)"],
  "summary": "2-3 sentence overview summarizing the recommendation.",
  "skillsMatrix": [
    {
      "skill": "Name of key skill/requirement from Job Description",
      "required": true, // true if critical requirement, false if nice-to-have
      "match": "yes", // 'yes', 'no', or 'partial'
      "status": "Brief explanation of skill level (e.g. '3 years in resume', 'Not mentioned', 'Only basic concepts')"
    }
  ],
  "interviewQuestions": [
    {
      "question": "A technical screening question tailored specifically to test one of the candidate's weakness or missing skill areas",
      "rubric": "Expected answer points and evaluation criteria for interviewer"
    }
  ]
}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Gemini API Error: Status ${response.status}. Details: ${errorDetails}`);
  }

  const result = await response.json();
  try {
    const textOutput = result.candidates[0].content.parts[0].text;
    return parseGeminiResponse(textOutput);
  } catch (err) {
    console.error("Raw response parsing failed:", result);
    throw new Error("Failed to parse the Gemini response format. Ensure API key is active and model supports JSON schemas.");
  }
}

// Resilient parsing for JSON structures returned
function parseGeminiResponse(text) {
  let cleanText = text.trim();

  // Remove markdown code fence decorators if model added them despite instructions
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }

  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }

  return JSON.parse(cleanText.trim());
}

// Generate high-fidelity dynamic Mock Assessment Data
function generateMockAnalysis(jobDesc, resumeText, filename) {
  // Extract name/info from resume text if possible
  let candidateName = 'David Chen';
  let email = 'david.chen.dev@gmail.com';
  let phone = '+1 (555) 342-8921';
  let education = 'B.S. in Computer Science - University of Washington';
  let experienceYears = '4.5 Years';

  // Extract email regex match
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0];

  // Extract name (simple heuristic: first capitalized words on first non-empty lines)
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length);
  if (lines.length && lines[0].split(' ').length <= 4) {
    // If first line has 2-4 words, assume it could be candidate name
    const nameCandidate = lines[0].replace(/[^a-zA-Z\s]/g, '');
    if (nameCandidate.length > 3 && nameCandidate.length < 30) {
      candidateName = nameCandidate;
    }
  }

  // Basic Keyword check to evaluate skills and match rate
  const keywords = {
    react: ['react', 'next.js', 'nextjs', 'typescript', 'css', 'html', 'sass', 'redux'],
    backend: ['go', 'golang', 'node', 'nodejs', 'express', 'postgres', 'sql', 'docker', 'graphql', 'rest'],
    datascience: ['python', 'pytorch', 'tensorflow', 'pandas', 'scikit', 'ml', 'nlp', 'llm', 'vector'],
    product: ['agile', 'scrum', 'jira', 'roadmap', 'product management', 'backlog', 'metrics']
  };

  let matchCount = 0;
  let totalKeywordsTested = 0;

  const textLower = resumeText.toLowerCase();
  const jdLower = jobDesc.toLowerCase();

  // Skills matrix dynamically created based on JD contents
  const skillsMatrix = [];

  // Check for React/Frontend
  if (jdLower.includes('react') || jdLower.includes('frontend') || jdLower.includes('ui') || jdLower.includes('css')) {
    const list = [['React', true], ['TypeScript', true], ['CSS Grid / Layouts', false], ['State Management (Redux/Zustand)', false], ['Core Web Vitals Performance', true]];
    list.forEach(([skill, req]) => {
      totalKeywordsTested++;
      const inResume = textLower.includes(skill.toLowerCase().split(' ')[0]);
      if (inResume) matchCount++;
      skillsMatrix.push({
        skill: skill,
        required: req,
        match: inResume ? 'yes' : 'no',
        status: inResume ? 'Found extensively in experience history' : 'Not mentioned in resume qualifications'
      });
    });
  }

  // Check for Backend
  if (jdLower.includes('node') || jdLower.includes('backend') || jdLower.includes('database') || jdLower.includes('sql') || jdLower.includes('api')) {
    const list = [['APIs (REST/GraphQL)', true], ['Node.js / Express', true], ['Relational Databases (PostgreSQL)', true], ['Docker Containerization', false], ['Go (Golang)', false]];
    list.forEach(([skill, req]) => {
      totalKeywordsTested++;
      const inResume = textLower.includes(skill.toLowerCase().split(' ')[0]);
      if (inResume) matchCount++;
      skillsMatrix.push({
        skill: skill,
        required: req,
        match: inResume ? 'yes' : 'no',
        status: inResume ? 'Strong credentials showing production scale' : 'Lacks concrete backing'
      });
    });
  }

  // Fallback if no specific matrix added
  if (skillsMatrix.length === 0) {
    const list = [['Software Engineering Principles', true], ['Git / Version Control', true], ['System Design & Architecture', true], ['CI/CD Automations', false], ['Cloud Deployments', false]];
    list.forEach(([skill, req]) => {
      totalKeywordsTested++;
      const inResume = textLower.includes(skill.toLowerCase().split(' ')[0]);
      if (inResume) matchCount++;
      skillsMatrix.push({
        skill: skill,
        required: req,
        match: inResume ? 'yes' : 'no',
        status: inResume ? 'Demonstrated proficiency' : 'Missing keyword footprint'
      });
    });
  }

  // Score formula: Base (50) + dynamic count matches
  const matchRatio = totalKeywordsTested > 0 ? (matchCount / totalKeywordsTested) : 0.6;
  const matchScore = Math.min(Math.round(52 + (matchRatio * 40) + (Math.random() * 8)), 100);

  let ratingBadgeText = 'Good Fit';
  let scoreTagline = 'Demonstrates solid engineering foundations with some minor alignment gaps.';
  let strengths = [
    'Shows practical background working in collaborative engineering teams.',
    'Clear descriptions of project deliverables and individual contributions.',
    'Possesses core foundational language and syntax skills required for the role.'
  ];
  let weaknesses = [
    'Requires onboarding supervision to cover advanced tooling gaps.',
    'Resume does not explicitly detail concrete performance optimization cases or scale metrics.'
  ];

  if (matchScore >= 85) {
    ratingBadgeText = 'Excellent Match';
    scoreTagline = 'Strong background matching primary stack requirements with excellent relevant tenure.';
    strengths.unshift('Direct alignment with the core programming framework requested.');
  } else if (matchScore < 70) {
    ratingBadgeText = 'Development Needed';
    scoreTagline = 'Significant skill gaps identified in mandatory requirements.';
    weaknesses.unshift('Lacks mentioned production project work with the primary technologies listed.');
  }

  const roleTitle = getJobRoleTitle(jobDesc);
  const summary = `Candidate ${candidateName} demonstrates a ${matchScore}% alignment with the ${roleTitle} specification. They exhibit solid background context, but attention should be focused on evaluating their depth of knowledge in missing technologies during technical screening.`;

  const interviewQuestions = [
    {
      question: `Looking at your experience, could you detail a complex problem you solved using technologies related to ${skillsMatrix[0].skill}?`,
      rubric: "Candidate should explain the context, the core constraint, technical decisions made, and the performance outcome metrics."
    },
    {
      question: `How do you handle codebase performance auditing and code quality optimization in team projects?`,
      rubric: "Look for mentions of monitoring dashboards, profiling tools, clean review patterns, and refactoring guidelines."
    }
  ];

  return {
    candidateName,
    email,
    phone,
    education,
    experienceYears,
    matchScore,
    scoreTagline,
    strengths,
    weaknesses,
    summary,
    skillsMatrix,
    interviewQuestions
  };
}

// Display results details
function displayScreeningDashboard(screeningRecord) {
  state.currentScreening = screeningRecord;
  const data = screeningRecord.evaluationData;

  // Fill text contents
  dom.resultCandidateName.textContent = data.candidateName;
  dom.resultCandidateTitle.textContent = `Screened against: ${screeningRecord.candidateRole}`;

  // Set score metrics
  animateScoreRing(data.matchScore);

  // Strengths
  dom.listStrengths.innerHTML = '';
  if (data.strengths && data.strengths.length) {
    data.strengths.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      dom.listStrengths.appendChild(li);
    });
  } else {
    dom.listStrengths.innerHTML = '<li>No significant strengths flagged.</li>';
  }

  // Weaknesses
  dom.listWeaknesses.innerHTML = '';
  if (data.weaknesses && data.weaknesses.length) {
    data.weaknesses.forEach(w => {
      const li = document.createElement('li');
      li.textContent = w;
      dom.listWeaknesses.appendChild(li);
    });
  } else {
    dom.listWeaknesses.innerHTML = '<li>No critical weaknesses or gaps identified.</li>';
  }

  // Summary recommendation
  dom.evaluationSummary.textContent = data.summary || 'No detailed summary provided.';

  // Contact Metadata Card
  dom.contactName.textContent = data.candidateName || 'N/A';
  dom.contactEmail.textContent = data.email || 'N/A';
  dom.contactPhone.textContent = data.phone || 'N/A';
  dom.contactEducation.textContent = data.education || 'N/A';
  dom.contactExperience.textContent = data.experienceYears || 'N/A';

  // Skills Matrix rendering
  dom.skillsMatrixBody.innerHTML = '';
  if (data.skillsMatrix && data.skillsMatrix.length) {
    data.skillsMatrix.forEach(item => {
      const row = document.createElement('div');
      row.className = 'skills-matrix-row';

      const skillName = document.createElement('span');
      skillName.style.fontWeight = '500';
      skillName.textContent = item.skill;

      const reqBadge = document.createElement('div');
      reqBadge.className = 'text-center';
      const rSpan = document.createElement('span');
      rSpan.className = 'badge skill-matrix-badge-req';
      rSpan.textContent = item.required ? 'Required' : 'Optional';
      reqBadge.appendChild(rSpan);

      const matchBadge = document.createElement('div');
      matchBadge.className = 'text-center';
      const mSpan = document.createElement('span');
      mSpan.className = `skill-match-tag match-${item.match || 'no'}`;
      mSpan.textContent = getMatchText(item.match);
      matchBadge.appendChild(mSpan);

      const descText = document.createElement('span');
      descText.className = 'text-secondary';
      descText.style.fontSize = '0.85rem';
      descText.textContent = item.status || 'No status info';

      row.appendChild(skillName);
      row.appendChild(reqBadge);
      row.appendChild(matchBadge);
      row.appendChild(descText);

      dom.skillsMatrixBody.appendChild(row);
    });
  } else {
    dom.skillsMatrixBody.innerHTML = '<p class="text-secondary padding-y">No parsed skills available to display.</p>';
  }

  // Interview Questions rendering
  dom.interviewQuestions.innerHTML = '';
  if (data.interviewQuestions && data.interviewQuestions.length) {
    data.interviewQuestions.forEach((iq, index) => {
      const qBlock = document.createElement('div');
      qBlock.className = 'question-block';

      const qHead = document.createElement('div');
      qHead.className = 'question-header';
      qHead.innerHTML = `<i data-lucide="help-circle"></i> <span>Question ${index + 1}: ${iq.question}</span>`;

      const ansKey = document.createElement('div');
      ansKey.className = 'answer-key';
      ansKey.innerHTML = `<strong>Evaluation Rubric / Ideal Answer:</strong><p>${iq.rubric || iq.expectedAnswer || 'Look for details checking depth of concepts and project implementation.'}</p>`;

      qBlock.appendChild(qHead);
      qBlock.appendChild(ansKey);
      dom.interviewQuestions.appendChild(qBlock);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({
        attrs: { class: 'lucide-icon' },
        nameAttr: 'data-lucide',
        node: dom.interviewQuestions
      });
    }
  } else {
    dom.interviewQuestions.innerHTML = '<p class="text-secondary">No tailored questions generated for this profile.</p>';
  }

  // View states toggle
  dom.loadingPanel.style.display = 'none';
  dom.resultsPanel.style.display = 'block';

  // Default to first result tab
  dom.resultTabBtns[0].click();
}

// Animate Circular Score Progress SVG & Counter text
function animateScoreRing(targetScore) {
  // SVG Ring calculation: Radius is 70. Circumference is 2 * PI * 70 = 439.82
  const circumference = 439.82;
  dom.scoreProgressBar.style.strokeDasharray = circumference;

  // Reset
  dom.scoreProgressBar.style.strokeDashoffset = circumference;
  dom.scoreText.textContent = '0';

  // Delay slightly to trigger visual transitions smoothly
  setTimeout(() => {
    const offset = circumference - (circumference * targetScore) / 100;
    dom.scoreProgressBar.style.strokeDashoffset = offset;

    // Animate text digits counter
    let current = 0;
    const interval = setInterval(() => {
      if (current >= targetScore) {
        dom.scoreText.textContent = targetScore;
        clearInterval(interval);
      } else {
        current += Math.ceil((targetScore - current) / 6) || 1;
        dom.scoreText.textContent = current;
      }
    }, 30);
  }, 100);

  // Set Rating visual Badge colors
  let ratingText = 'Low Fit';
  let badgeClass = 'score-low';
  let tagline = 'Review needed: structural differences present.';

  if (targetScore >= 85) {
    ratingText = 'Strong Match';
    badgeClass = 'score-high';
    tagline = 'Optimal candidate alignment. Highly recommended to interview.';
  } else if (targetScore >= 70) {
    ratingText = 'Moderate Fit';
    badgeClass = 'score-mid';
    tagline = 'Good core background with minor technology gaps.';
  }

  dom.ratingBadge.textContent = ratingText;
  dom.ratingBadge.className = `badge ${badgeClass}`;
  dom.scoreTagline.textContent = tagline;
}

// Sidebar History Renderer
function renderHistory() {
  dom.historyList.innerHTML = '';

  if (state.history.length === 0) {
    dom.historyList.innerHTML = `
      <div class="empty-history">
        <i data-lucide="history"></i>
        <p>No screening history yet</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ node: dom.historyList });
    }
    return;
  }

  state.history.forEach((record, index) => {
    const item = document.createElement('div');
    item.className = `history-item ${state.currentScreening && state.currentScreening.id === record.id ? 'active' : ''}`;

    // Choose score color tag
    let scoreClass = 'score-low';
    if (record.score >= 85) scoreClass = 'score-high';
    else if (record.score >= 70) scoreClass = 'score-mid';

    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-name">${escapeHtml(record.candidateName)}</span>
        <span class="history-score ${scoreClass}">${record.score}%</span>
      </div>
      <div class="history-role">${escapeHtml(record.candidateRole)}</div>
      <div class="history-time">${record.timestamp}</div>
    `;

    item.addEventListener('click', () => {
      // Toggle active design styles
      document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      // Update Inputs form parameters implicitly
      dom.jobDescription.value = record.jobDescription;
      updateJDWordCount();

      if (record.resumeFilename && record.resumeFilename !== 'Pasted Text Resume') {
        state.activeTab = 'upload-tab';
        state.parsedResumeText = record.evaluationData.summary; // approximate placeholder inside text if files are lost
        state.parsedResumeFilename = record.resumeFilename;
        state.parsedResumeFilesize = 'Cached in history';

        const content = dom.dropZone.querySelector('.drop-zone-content');
        const preview = dom.dropZone.querySelector('.file-preview-card');
        content.style.display = 'none';
        preview.style.display = 'flex';
        dom.dropZone.querySelector('.preview-filename').textContent = record.resumeFilename;
        dom.dropZone.querySelector('.preview-filesize').textContent = 'Cached assessment details';
      } else {
        state.activeTab = 'paste-tab';
        dom.resumeText.value = "See evaluation cached summary in dashboard view.";
        updateResumeWordCount();
      }

      validateInputs();
      displayScreeningDashboard(record);
    });

    dom.historyList.appendChild(item);
  });
}

// Generate styled PDF report download
function exportAssessmentPDF() {
  if (!state.currentScreening) return;
  const data = state.currentScreening.evaluationData;
  const role = state.currentScreening.candidateRole;
  const timestamp = state.currentScreening.timestamp;

  // Create temporary container for report styling
  const container = document.createElement('div');
  container.style.padding = '40px';
  container.style.color = '#111827';
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.backgroundColor = '#ffffff';

  const strengthsList = (data.strengths && data.strengths.length)
    ? data.strengths.map(s => `<li style="margin-bottom: 6px;">${s}</li>`).join('')
    : '<li style="margin-bottom: 6px;">No significant strengths flagged.</li>';

  const weaknessesList = (data.weaknesses && data.weaknesses.length)
    ? data.weaknesses.map(w => `<li style="margin-bottom: 6px;">${w}</li>`).join('')
    : '<li style="margin-bottom: 6px;">No critical weaknesses or gaps identified.</li>';

  const skillsRows = (data.skillsMatrix && data.skillsMatrix.length)
    ? data.skillsMatrix.map(sm => `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 10px; font-weight: 500; color: #111827;">${sm.skill}</td>
          <td style="padding: 10px; text-align: center;">${sm.required ? 'Yes' : 'No'}</td>
          <td style="padding: 10px; text-align: center;">
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background-color: ${sm.match === 'yes' ? '#d1fae5' : sm.match === 'partial' ? '#fef3c7' : '#fee2e2'}; color: ${sm.match === 'yes' ? '#065f46' : sm.match === 'partial' ? '#92400e' : '#991b1b'};">
              ${sm.match === 'yes' ? 'Matched' : sm.match === 'partial' ? 'Partial' : 'Gap'}
            </span>
          </td>
          <td style="padding: 10px; color: #4b5563;">${sm.status}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #6b7280;">No skills checked.</td></tr>';

  const questionsBlocks = (data.interviewQuestions && data.interviewQuestions.length)
    ? data.interviewQuestions.map((iq, idx) => `
        <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid;">
          <h4 style="font-size: 14px; margin: 0 0 8px 0; color: #6b21a8;">Question ${idx + 1}: ${iq.question}</h4>
          <div style="border-left: 2px solid #a855f7; padding-left: 12px; margin-top: 8px; font-size: 12px; color: #581c87; line-height: 1.5;">
            <strong>Evaluation Rubric / Ideal Answer:</strong>
            <p style="margin: 4px 0 0 0;">${iq.rubric || iq.expectedAnswer || 'Look for details checking depth of concepts and project implementation.'}</p>
          </div>
        </div>
      `).join('')
    : '<p style="color: #6b7280;">No custom questions generated.</p>';

  // Build printable layout markup
  let html = `
    <div style="border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 25px;">
      <h1 style="font-size: 24px; color: #1e1b4b; margin: 0; font-family: system-ui, sans-serif; font-weight: 800;">ResumeAI Screener — Candidate Assessment</h1>
      <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Report Generated: ${timestamp} | Powered by Local ML Backend</p>
    </div>

    <!-- Candidate Profile Header -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: table; width: 100%; box-sizing: border-box; border-left: 5px solid #8b5cf6;">
      <div style="display: table-cell; width: 65%; vertical-align: top; padding-right: 20px;">
        <h2 style="font-size: 20px; margin: 0 0 4px 0; color: #111827; font-weight: 700;">${data.candidateName || 'Unknown Candidate'}</h2>
        <p style="font-size: 14px; color: #4b5563; margin: 0 0 15px 0;">Target Role: <strong>${role}</strong></p>
        
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; width: 90px; font-weight: 600;">Email:</td>
            <td style="padding: 4px 0; font-weight: 500; color: #1f2937;">${data.email || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-weight: 600;">Phone:</td>
            <td style="padding: 4px 0; font-weight: 500; color: #1f2937;">${data.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-weight: 600;">Education:</td>
            <td style="padding: 4px 0; font-weight: 500; color: #1f2937;">${data.education || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-weight: 600;">Experience:</td>
            <td style="padding: 4px 0; font-weight: 500; color: #1f2937;">${data.experienceYears || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <div style="display: table-cell; width: 35%; text-align: center; vertical-align: middle; border-left: 1px solid #e5e7eb; padding-left: 20px;">
        <span style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px;">Match Score</span>
        <div style="font-size: 46px; font-weight: 800; color: #8b5cf6; margin: 4px 0; line-height: 1;">${data.matchScore}%</div>
        <span style="font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 12px; display: inline-block; background-color: ${data.matchScore >= 85 ? '#d1fae5' : data.matchScore >= 70 ? '#fef3c7' : '#fee2e2'}; color: ${data.matchScore >= 85 ? '#065f46' : data.matchScore >= 70 ? '#92400e' : '#991b1b'};">
          ${data.matchScore >= 85 ? 'Strong Match' : data.matchScore >= 70 ? 'Moderate Fit' : 'Low Fit'}
        </span>
      </div>
    </div>

    <!-- Recommendation Summary -->
    <div style="margin-bottom: 25px; box-sizing: border-box;">
      <h3 style="font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; color: #1e1b4b; margin: 0 0 10px 0; font-weight: 700;">Fit Recommendation Summary</h3>
      <p style="font-size: 13.5px; line-height: 1.6; color: #374151; margin: 0 0 6px 0;">${data.summary}</p>
      <p style="font-size: 12.5px; font-style: italic; color: #6b7280; margin: 0;">" ${data.scoreTagline} "</p>
    </div>

    <!-- Strengths & Gaps -->
    <div style="display: table; width: 100%; margin-bottom: 30px; box-sizing: border-box;">
      <div style="display: table-cell; width: 50%; padding-right: 10px; vertical-align: top;">
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; min-height: 140px; box-sizing: border-box;">
          <h4 style="font-size: 13.5px; margin: 0 0 10px 0; color: #166534; font-weight: 700;">✓ Candidate Strengths</h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #14532d; line-height: 1.5;">
            ${strengthsList}
          </ul>
        </div>
      </div>
      <div style="display: table-cell; width: 50%; padding-left: 10px; vertical-align: top;">
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; min-height: 140px; box-sizing: border-box;">
          <h4 style="font-size: 13.5px; margin: 0 0 10px 0; color: #991b1b; font-weight: 700;">⚠ Development Gaps</h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #7f1d1d; line-height: 1.5;">
            ${weaknessesList}
          </ul>
        </div>
      </div>
    </div>

    <!-- Skills Matrix Table -->
    <div style="margin-bottom: 30px; page-break-inside: avoid; box-sizing: border-box;">
      <h3 style="font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; color: #1e1b4b; margin: 0 0 12px 0; font-weight: 700;">Skills & Requirement Alignment</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
        <thead>
          <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px 10px; font-weight: 600; color: #374151;">Required Skill / Stack</th>
            <th style="padding: 8px 10px; font-weight: 600; color: #374151; text-align: center; width: 80px;">Required</th>
            <th style="padding: 8px 10px; font-weight: 600; color: #374151; text-align: center; width: 100px;">Match</th>
            <th style="padding: 8px 10px; font-weight: 600; color: #374151;">Level / Gap Details</th>
          </tr>
        </thead>
        <tbody>
          ${skillsRows}
        </tbody>
      </table>
    </div>

    <!-- Custom Interview Questions -->
    <div style="page-break-before: always; padding-top: 10px; box-sizing: border-box;">
      <h3 style="font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; color: #1e1b4b; margin: 0 0 10px 0; font-weight: 700;">Tailored Technical Interview Guide</h3>
      <p style="font-size: 12.5px; color: #6b7280; margin: 0 0 15px 0;">Auditing questions generated specifically to evaluate critical gaps and clarify candidate depth.</p>
      
      ${questionsBlocks}
    </div>
  `;

  container.innerHTML = html;

  // Configuration settings for html2pdf bundle
  const opt = {
    margin: [15, 15, 15, 15],
    filename: `ResumeAI_Assessment_${data.candidateName.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Execute pdf download
  if (typeof html2pdf !== 'undefined') {
    html2pdf().from(container).set(opt).save().catch(err => {
      console.error("html2pdf processing failed:", err);
      alert("Failed to render PDF: " + err.message);
    });
  } else {
    alert("Error: html2pdf library was not loaded properly from CDN. Check your internet connectivity.");
  }
}

// Utility Helpers
function getJobRoleTitle(jd) {
  const firstLine = jd.split('\n')[0].trim().replace(/^(Role|Position|Job Title|Title):\s*/i, '');
  if (firstLine.length > 5 && firstLine.length < 50) {
    return firstLine;
  }

  // Look for title-like words
  if (jd.toLowerCase().includes('frontend')) return 'Frontend Engineer';
  if (jd.toLowerCase().includes('backend')) return 'Backend Engineer';
  if (jd.toLowerCase().includes('data scientist') || jd.toLowerCase().includes('data science')) return 'Data Scientist';
  if (jd.toLowerCase().includes('product manager') || jd.toLowerCase().includes('pm')) return 'Product Manager';

  return 'Technical Candidate';
}

function getMatchText(match) {
  if (match === 'yes') return 'Match';
  if (match === 'partial') return 'Partial';
  return 'Gap';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-toggle i');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);
