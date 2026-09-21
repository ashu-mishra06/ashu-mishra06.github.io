/*
 * data.js — ALL of your portfolio content lives here.
 * Edit this file to change what the terminal shows. No other file needs to change.
 *
 * Fields left as "" or [] are hidden automatically:
 *   projects: live, repo, status, role, highlights   experience: period, location, points, link
 *   education: institution, period                   links: resume
 */
const PORTFOLIO = {
  name: "Ashutosh Mishra",
  handle: "ashutosh",              // shows up as guest@ashutosh in the prompt
  role: "Full-Stack & Application Developer",
  now: "Intern at Atavishaala",
  award: "Future 6.0 national 1st runner-up",
  tagline: "I build things, break them, fix them, and learn along the way.",
  focus: ["Full Stack", "Android Apps", "AI/ML"],
  loop: "Code → Debug → Improve → Repeat",

  links: {
    github: "https://github.com/ashu-mishra06",
    linkedin: "https://www.linkedin.com/in/ashutosh-mishra-7394ab32a",
    email: "mishrashu777@gmail.com",
    resume: "Ashutosh_Mishra_Resume.pdf"   // replace that PDF in the folder to update your résumé
  },

  about: [
    "Full-stack and Android developer. I build web apps, mobile apps and small AI/ML tools, and I learn by shipping real projects.",
    "My work spans real-time communication, offline-first mobile systems, AI-assisted tooling and cloud-backed apps.",
    "Where I work most:",
    "- Full-stack web (React, Next.js, Node.js, Firebase)",
    "- Android apps (Kotlin, Jetpack Compose, React Native)",
    "- AI / ML (TensorFlow Lite, Pandas, NumPy)",
    "Right now I'm an Application Developer intern at Atavishaala.",
    "I was part of the team that won national 1st runner-up at Future 6.0, and I regularly work in teams through GitHub, documentation and hackathons (SIH 2026)."
  ],

  // Kept low-key on purpose: shown in ~/education.txt and at the bottom of the plain view only.
  education: [
    {
      degree: "B.Tech, Computer Science Engineering",
      institution: "LNCT Group of Colleges",
      period: "2024–2028"
    }
  ],

  skillLabels: { "cloud-data": "Cloud & data", "ai-ml": "AI / ML" },
  skills: [
    { id: "languages", label: "Languages", items: ["Python", "C++", "JavaScript", "Kotlin"] },
    { id: "web", label: "Web",
      items: ["HTML", "CSS", "React.js", "Next.js", "Vite", "Node.js", "Express.js", "FastAPI", "Tailwind CSS", "REST APIs"] },
    { id: "mobile", label: "Android & mobile",
      items: ["Jetpack Compose", "Android Studio", "Gradle", "React Native", "Expo"] },
    { id: "cloud-data", label: "Cloud & data",
      items: ["Firebase Authentication", "Cloud Firestore", "SQLite", "DataStore"] },
    { id: "ai-ml", label: "AI / ML",
      items: ["TensorFlow Lite", "scikit-learn", "Pandas", "NumPy"] },
    { id: "tools", label: "Tools", items: ["Git", "GitHub", "VS Code", "Jupyter Notebook"] }
  ],

  projects: [
    {
      id: "roadsos",
      name: "RoadSOS",
      summary: "Offline-first Android crash-emergency assistant.",
      description:
        "An Android emergency-response prototype that detects crash-like audio events and moves through a Detect → Countdown → Alert → Locate → Assist → Record workflow, even without internet. Built with Team Fuzeppers.",
      highlights: [
        "On-device audio monitoring with a TensorFlow Lite helper",
        "False-alarm cancellation before anything is sent",
        "Emergency SMS and call actions, with current or last-known location fallback",
        "Offline lookup of hospitals, police stations, vehicle repair and roadside assistance",
        "MVVM-style architecture: Jetpack Compose, DataStore, SQLite, foreground services, local emergency history",
        "Ships a 1.1 MB TFLite model and a 7.46 MB local database"
      ],
      stack: ["Kotlin", "Jetpack Compose", "TensorFlow Lite", "SQLite", "DataStore"],
      role: "Database, frontend, app integration, documentation",
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
      id: "burn-in",
      name: "Burn-In (SIH 2026)",
      summary: "AI anomaly detection for component burn-in screening.",
      description:
        "Statistical outlier detection plus drift prediction, with a PASS/REJECT dashboard. Team project for SIH 2026; the repository is owned by teammate vivek-jangela.",
      highlights: [
        "Statistical outlier detection on burn-in readings",
        "Drift prediction",
        "PASS/REJECT dashboard"
      ],
      stack: ["React", "FastAPI", "scikit-learn", "Pandas"],
      role: "FastAPI backend and frontend/backend integration",
      status: "",
      repo: "https://github.com/vivek-jangela/burn-in-frontend",
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
      id: "future-6-runner-up",
      title: "Future 6.0: National 1st Runner-Up",
      detail: "Won 1st runner-up at Future 6.0, a national-level event in Bhavnagar. The team started from a road-safety problem."
    },
    {
      id: "sih-2026",
      title: "Smart India Hackathon 2026",
      detail: "Participant with Team Fuzeppers. Contributed to Burn-In, an AI anomaly-detection project for SIH 2026."
    },
    {
      id: "github-pull-shark",
      title: "GitHub Pull Shark",
      detail: "GitHub achievement badge for getting pull requests merged."
    },
    {
      id: "github-yolo",
      title: "GitHub YOLO",
      detail: "GitHub achievement badge for merging a pull request without a code review."
    }
  ],

  certifications: [
    { id: "oracle-foundations-associate", title: "Oracle Certified Foundations Associate", issuer: "Oracle", issued: "Oct 2025", expires: "Oct 2027" },
    { id: "data-structures-bootcamp", title: "Data Structures Bootcamp", issuer: "GeeksforGeeks", issued: "Nov 2025", expires: "" },
    { id: "python-certification", title: "Python Certification", issuer: "", issued: "", expires: "" },
    { id: "the-ai-advantage", title: "The AI Advantage", issuer: "", issued: "", expires: "" }
  ],

  experience: [
    {
      id: "atavishaala-application-developer",
      role: "Application Developer (Intern)",
      org: "Atavishaala",
      period: "Sep 2026 – Present",
      location: "",
      summary: "Application developer internship, started September 2026.",
      points: [],
      link: ""
    },
    {
      id: "cognifyz-python-internship",
      role: "Python Development Intern",
      org: "Cognifyz Technologies",
      period: "Dec 2025 – Jan 2026",
      location: "Remote",
      summary: "Completed structured Python development tasks across two project levels.",
      points: [
        "Wrote programs for programming logic, data structures and problem solving",
        "Applied modular programming, debugging and clean-code practices",
        "Used Git and organised the finished work into a documented repository",
        "Reviewed implementations with mentors to improve code quality"
      ],
      link: "https://github.com/ashu-mishra06/python_projects_cognifyz"
    }
  ]
};

if (typeof module === "object" && module.exports) module.exports = PORTFOLIO;
else window.PORTFOLIO = PORTFOLIO;
