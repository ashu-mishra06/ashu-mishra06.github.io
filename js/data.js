/*
 * data.js — ALL of your portfolio content lives here.
 * Edit this file to change what the site shows. No other file needs to change.
 * Source of truth: Ashutosh_Mishra_Resume_2.pdf (Oct 2026).
 *
 * Fields left as "" or [] are hidden automatically:
 *   projects: live, repo, status, role, highlights   experience: period, location, points, link
 *   education: institution, period, cgpa             links: resume, portfolio
 */
const PORTFOLIO = {
  name: "Ashutosh Mishra",
  handle: "ashutosh",              // shows up as guest@ashutosh in the prompt
  role: "Python Developer | App & Web Developer",
  now: "App Development Intern at Atavishaala",
  award: "Future Yi 6.0 national 1st runner-up (Team Secretos, team leader)",
  tagline: "I build things, break them, fix them, and learn along the way.",
  focus: ["Python & Data", "Applied AI", "App & Web"],
  loop: "Code → Debug → Improve → Repeat",
  location: "Bhopal, India",
  openToWork: true,                // drives the hire CTA in home and plain view

  links: {
    github: "https://github.com/ashu-mishra06",
    linkedin: "https://www.linkedin.com/in/ashutosh-mishra-7394ab32a",
    email: "mishrashu777@gmail.com",
    portfolio: "https://ashu-mishra06.github.io/",
    resume: "Ashutosh_Mishra_Resume_2.pdf"   // replace that PDF in the folder to update your résumé
  },

  about: [
    "B.Tech Computer Science pre-final year student with hands-on Python experience in data processing, REST APIs and applied machine learning.",
    "I built a FastAPI screening pipeline that combines statistical outlier detection with drift prediction, and a Streamlit dashboard for water-quality risk analysis.",
    "Comfortable with Pandas, NumPy, scikit-learn, debugging, JSON and Git; interested in practical AI and automation workflows.",
    "Where I work most:",
    "- Python & data (Pandas, NumPy, FastAPI, Pydantic, REST APIs)",
    "- App & web (React, React Native, TypeScript, Node.js, Jetpack Compose)",
    "- Applied AI (model integration, screening pipelines)",
    "Right now I'm an App Development Intern at Atavishaala, building React Native features in TypeScript for the Farm Market application.",
    "I led Team Secretos to national 1st runner-up at Future Yi 6.0 with RoadSOS, and I was team lead for DriftGuard at Smart India Hackathon 2026.",
    "Open to internship and part-time opportunities in full-stack, Android, or applied AI — reach out any time."
  ],

  // Kept low-key on purpose: shown in ~/education.txt, the About window and the bottom of the plain view.
  education: [
    {
      degree: "B.Tech, Computer Science Engineering",
      institution: "LNCT Group of Colleges (LNCTE)",
      period: "2024–2028",
      cgpa: "8.10"
    }
  ],

  skillLabels: { "python-data": "Python & Data", "ai-ml": "AI / ML", "tools": "Tools & Practices", "web-mobile": "Web & Mobile" },
  skills: [
    { id: "languages", label: "Languages", items: ["Python", "C++", "JavaScript", "TypeScript", "Kotlin", "SQL"] },
    { id: "python-data", label: "Python & Data",
      items: ["Pandas", "NumPy", "FastAPI", "Pydantic", "REST APIs", "JSON", "CSV processing", "data cleaning"] },
    { id: "ai-ml", label: "AI / ML", items: ["TensorFlow Lite", "scikit-learn", "model integration", "screening pipelines"] },
    { id: "tools", label: "Tools & Practices",
      items: ["Git", "GitHub", "PNPM", "Figma", "Jupyter Notebook", "VS Code", "SQLite", "debugging", "testing", "documentation"] },
    { id: "web-mobile", label: "Web & Mobile",
      items: ["React", "React Native", "Next.js", "Node.js", "TypeScript", "Expo", "Vite", "Jetpack Compose", "Firebase", "Netlify", "Streamlit"] }
  ],

  // Static GitHub stats — update by hand when things change
  githubStats: {
    repos: 12,
    stars: 8,
    followers: 15,
    contributions2026: 180
  },

  // Learning / career timeline
  roadmap: [
    { year: "2024",      item: "Started B.Tech CSE at LNCTE; first Python projects and open-source contributions" },
    { year: "2025 Q1",   item: "Cognifyz Python internship (remote) — data structures, clean code, Git workflow" },
    { year: "2025 Q2",   item: "Couple-connect launched on Netlify (React + Firebase, solo project)" },
    { year: "2025 Q3",   item: "Oracle Certified Foundations Associate; started RoadSOS (Android / Kotlin)" },
    { year: "2025 Q4",   item: "GFG Data Structures Bootcamp; Neel-Tarang water-quality dashboard (Streamlit)" },
    { year: "2026 Feb",  item: "Future Yi 6.0 Bhopal — 1st place, Yi Road Safety category (Team Secretos)" },
    { year: "2026 Apr",  item: "Future Yi 6.0 National Round — 1st Runner-Up (team leader, 400+ teams)" },
    { year: "2026 Aug",  item: "App Dev Intern at Atavishaala — React Native + TypeScript, Farm Market app" },
    { year: "2026 Oct",  item: "Smart India Hackathon 2026 — DriftGuard team lead (FastAPI + scikit-learn)" },
    { year: "2027 goal", item: "Ship ChatGraph, go deeper in LLM/ML engineering, land a full-time internship" }
  ],

  // Notes / blog — placeholders for future writing, also shown via `notes` command
  notes: [
    {
      id: "open-to-work",
      title: "Open to Work",
      date: "Nov 2026",
      body: "Actively seeking internship or part-time roles in full-stack development, Android, or applied AI/ML. Available for remote or Bhopal-based positions. Reach out at mishrashu777@gmail.com or connect on LinkedIn."
    },
    {
      id: "building-chatgraph",
      title: "Building ChatGraph",
      date: "Oct 2026",
      body: "ChatGraph turns long ChatGPT conversations into navigable node graphs. The browser extension extracts conversation data locally (no credentials needed) and feeds a React + Next.js frontend with search and graph-based navigation. Looking for contributors — DM me on GitHub."
    },
    {
      id: "roadsos-journey",
      title: "RoadSOS: from idea to national stage",
      date: "Apr 2026",
      body: "We built RoadSOS in under three weeks as an offline-first Android prototype. It listens for crash-like audio with a 1.1 MB TensorFlow Lite model, counts down a false-alarm window, then SMS/calls emergency contacts with location. Winning Bhopal and placing runner-up nationally was surreal — write-up coming soon."
    }
  ],

  projects: [
    {
      id: "driftguard",
      name: "DriftGuard",
      summary: "AI-driven component burn-in screening (Smart India Hackathon 2026).",
      description:
        "A web app that screens electronic components during burn-in and returns explainable PASS/REJECT verdicts from uploaded CSV data. Built for Smart India Hackathon 2026 (Problem Statement 26170) with Team Secretos; I led the team.",
      highlights: [
        "FastAPI endpoints that accept component measurement CSVs and return structured JSON screening verdicts",
        "Statistical outlier detection (median/MAD z-score) and a scikit-learn drift-prediction model combined into one screening pipeline",
        "API connected to a React + Vite dashboard; resolved CORS and verdict-consistency issues across dashboard views"
      ],
      stack: ["Python", "FastAPI", "Pandas", "NumPy", "scikit-learn", "React", "REST API"],
      role: "Team lead; FastAPI backend and dashboard integration",
      status: "",
      repo: "https://github.com/ashu-mishra06/Driftguard",
      live: "https://driftguard.app/"
    },
    {
      id: "neel-tarang",
      name: "Neel-Tarang",
      summary: "Water-quality risk analysis dashboard for the immersion ghats of Bhopal.",
      description:
        "A Streamlit dashboard that ranks Bhopal immersion ghats using 1,524 water-test readings across seven ghats from 2023–2025.",
      highlights: [
        "Baseline-versus-immersion risk scoring, confidence indicators, report-page evidence links and a test-planning view",
        "CSV upload and re-scoring, bilingual Hindi/English briefs",
        "Automated tests for scoring and evidence consistency"
      ],
      stack: ["Python", "Streamlit", "Pandas", "PyYAML", "pytest", "data analysis"],
      role: "Solo project, built end to end",
      status: "",
      repo: "https://github.com/ashu-mishra06/Neel-Tarang",
      live: "https://neel-tarang.streamlit.app/"
    },
    {
      id: "roadsos",
      name: "RoadSOS",
      summary: "Offline-first Android crash-emergency assistant.",
      description:
        "An offline-first Android prototype that monitors crash-like audio, starts a false-alarm countdown and supports SOS actions with location fallback. Built with Team Secretos; it won national 1st runner-up at Future Yi 6.0. Native Android prototype, no browser-based live demo.",
      highlights: [
        "On-device crash-like audio monitoring with a 1.1 MB TensorFlow Lite model and a Detect → Countdown → Alert → Locate → Assist → Record workflow",
        "False-alarm cancellation, emergency SMS/call actions and current/last-known location fallback",
        "Local emergency-service lookup (hospitals, police, vehicle repair, roadside assistance) from a 7.46 MB offline SQLite database",
        "App screens, foreground services, DataStore and emergency history integrated in an MVVM-style architecture"
      ],
      stack: ["Kotlin", "Jetpack Compose", "TensorFlow Lite", "SQLite", "Android"],
      role: "Team leader; SQLite database, Compose UI, app integration",
      status: "",
      repo: "https://github.com/ashu-mishra06/RoadSOS",
      live: ""
    },
    {
      id: "couple-connect",
      name: "Couple-connect",
      summary: "Retro-brutalist private app for couples: chat, snaps and opt-in location.",
      description:
        "A private communication platform with email/password sign-in, Couple ID creation and joining, shared couple access and profile management. Designed and built end to end.",
      highlights: [
        "Real-time messaging and photo sharing on Cloud Firestore, with a live snap feed and partner status",
        "Consent-based location sharing: opt-in, latest-location map and location history",
        "Firebase configuration and Firestore security rules for a cloud-backed workflow"
      ],
      stack: ["React", "Vite", "Firebase Authentication", "Cloud Firestore", "Netlify"],
      role: "Solo project, built end to end",
      status: "",
      repo: "https://github.com/ashu-mishra06/Couple-connect-",
      live: "https://coupascup.netlify.app/"
    },
    {
      id: "chatgraph",
      name: "ChatGraph",
      summary: "Visual navigation for long ChatGPT conversations.",
      description:
        "A platform that turns a long ChatGPT conversation into connected nodes, so you can find earlier context faster.",
      highlights: [
        "Browser extension that extracts conversation data locally, with no ChatGPT credentials needed",
        "Modular system: browser extension, frontend, backend and AI/search components",
        "Privacy-conscious data handling, searchable context and graph-based navigation"
      ],
      stack: ["React", "Next.js", "Browser Extension", "Graph Visualization", "AI/Search"],
      role: "",
      status: "In development",
      repo: "",
      live: ""
    },
    {
      id: "recurly",
      name: "Recurly",
      summary: "Subscription management mobile app.",
      description: "A subscription management app built with React Native and the Expo framework. Designed and built end to end.",
      highlights: [],
      stack: ["React Native", "Expo"],
      role: "Solo project, built end to end",
      status: "",
      repo: "https://github.com/ashu-mishra06/Recurly",
      live: ""
    },
    {
      id: "python-cognifyz",
      name: "Python Internship Tasks",
      summary: "Task solutions from the Cognifyz Python internship.",
      description: "Structured Python tasks across two project levels: programming logic, data structures and problem solving.",
      highlights: [],
      stack: ["Python", "Git"],
      role: "Solo, built end to end",
      status: "",
      repo: "https://github.com/ashu-mishra06/python_projects_cognifyz",
      live: ""
    }
  ],

  achievements: [
    {
      id: "future-yi-national-runner-up",
      title: "Future Yi 6.0 National Round: 1st Runner-Up (2026)",
      detail: "Led Team Secretos as Team Leader with the RoadSOS road-safety solution at the national round of Future Yi 6.0."
    },
    {
      id: "future-yi-bhopal-first",
      title: "Future Yi 6.0 Bhopal Chapter: 1st Place, Yi Road Safety category",
      detail: "Won the Yi Road Safety category at the Bhopal chapter on 24 Aug 2026, leading Team Secretos as Team Leader."
    },
    {
      id: "sih-2026",
      title: "Smart India Hackathon 2026: Team Lead",
      detail: "Led Team Secretos and contributed to DriftGuard, an AI component burn-in screening system (Problem Statement 26170)."
    }
  ],

  certifications: [
    { id: "oracle-foundations-associate", title: "Oracle Certified Foundations Associate", issuer: "Oracle", issued: "Oct 2025", expires: "Oct 2027" },
    { id: "python-oneroadmap", title: "Python Certification", issuer: "OneRoadmap", issued: "Oct 2025", expires: "" },
    { id: "data-structures-bootcamp", title: "Data Structure Bootcamp", issuer: "GeeksforGeeks", issued: "Nov 2025", expires: "" }
  ],

  experience: [
    {
      id: "atavishaala-app-development",
      role: "App Development Intern",
      org: "Atavishaala",
      period: "20 Aug 2026 – Present",
      location: "",
      summary: "React Native app development in TypeScript for the Farm Market application.",
      points: [
        "Develop and maintain React Native application features using TypeScript and PNPM, following the existing codebase and component patterns",
        "Implement UI features from Figma designs and contribute to API integration, validation, navigation and Git-based review/deployment workflows",
        "Contributed to a shipped project and continue feature development for the Farm Market application"
      ],
      link: ""
    },
    {
      id: "cognifyz-python-internship",
      role: "Python Development Intern",
      org: "Cognifyz Technologies",
      period: "Dec 2025 – Jan 2026",
      location: "Remote",
      summary: "Completed structured Python tasks across two project levels.",
      points: [
        "Completed structured Python tasks covering programming logic, data structures and problem solving",
        "Used modular programming, debugging and clean-code practices; maintained completed work in Git and incorporated mentor feedback"
      ],
      link: "https://github.com/ashu-mishra06/python_projects_cognifyz"
    }
  ]
};

if (typeof module === "object" && module.exports) module.exports = PORTFOLIO;
else window.PORTFOLIO = PORTFOLIO;
