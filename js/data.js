/*
 * data.js — ALL of your portfolio content lives here.
 * Edit this file to change what the terminal shows. No other file needs to change.
 *
 * Optional fields (leave as "" or [] to hide them): live, period, institution, resume
 */
const PORTFOLIO = {
  name: "Ashutosh Mishra",
  handle: "ashutosh",              // shows up as guest@ashutosh in the prompt
  role: "B.Tech CSE Student",
  tagline: "a little curious about everything",
  focus: ["Full Stack Development", "AI", "Android Apps"],
  approach: "Building real-world projects while learning",
  loop: "Code → Debug → Improve → Repeat",

  links: {
    github: "https://github.com/ashu-mishra06",
    linkedin: "https://www.linkedin.com/in/ashutosh-mishra-7394ab32a",
    email: "mishrashu777@gmail.com",
    resume: ""                     // paste a PDF link here later, e.g. "resume.pdf"
  },

  about: [
    "B.Tech CSE student building full-stack web apps, Android apps and small AI/ML tools.",
    "I learn by shipping real projects: Code → Debug → Improve → Repeat.",
    "My work sits between three areas:",
    "- Full-stack development (React, Node.js, FastAPI, Firebase)",
    "- Android apps (Kotlin, Jetpack Compose)",
    "- AI / ML (TensorFlow Lite, scikit-learn, Pandas)",
    "I work in teams through GitHub, documentation and hackathons (SIH 2026, Team Fuzeppers)."
  ],

  education: [
    { degree: "B.Tech, Computer Science & Engineering", institution: "", period: "" }
  ],

  skills: {
    languages: ["Python", "JavaScript", "Kotlin"],
    frameworks: [
      "React", "React Native", "Expo", "Vite", "Node.js", "Express.js", "FastAPI",
      "Firebase", "Tailwind CSS", "Jetpack Compose", "SQLite",
      "TensorFlow Lite", "scikit-learn", "Pandas", "NumPy"
    ],
    tools: ["Git", "GitHub", "VS Code", "Android Studio", "Gradle", "Jupyter"]
  },

  projects: [
    {
      id: "roadsos",
      name: "RoadSOS",
      summary: "Offline-first Android crash-emergency assistant.",
      description:
        "Detects crash-like sounds on-device, runs a false-alarm countdown, then sends an SOS SMS with your location and shows nearby emergency services offline. Hackathon prototype built by Team Fuzeppers.",
      highlights: [
        "Detects crash-like sounds on-device",
        "False-alarm countdown before an SOS is sent",
        "SOS SMS with location, and nearby emergency services shown offline"
      ],
      stack: ["Kotlin", "Jetpack Compose", "TensorFlow Lite", "SQLite"],
      role: "Database, frontend, app integration, documentation",
      repo: "https://github.com/ashu-mishra06/RoadSOS",
      live: ""
    },
    {
      id: "couple-connect",
      name: "Couple-connect",
      summary: "Retro-brutalist app for couples, with realtime sharing.",
      description:
        "A couples app with a couple-ID join flow, a realtime shared snap feed, a consent-based location map and private chat.",
      highlights: [
        "Couple-ID join flow",
        "Realtime shared snap feed",
        "Consent-based location map",
        "Private chat"
      ],
      stack: ["React", "Vite", "Firebase", "Netlify"],
      role: "",
      repo: "https://github.com/ashu-mishra06/Couple-connect",
      live: ""
    },
    {
      id: "burn-in",
      name: "Burn-In (SIH 2026)",
      summary: "AI anomaly detection for component burn-in screening.",
      description:
        "Statistical outlier detection plus drift prediction, with a PASS/REJECT dashboard. Team project for SIH 2026. The repository is owned by teammate vivek-jangela.",
      highlights: [
        "Statistical outlier detection on burn-in readings",
        "Drift prediction",
        "PASS/REJECT dashboard"
      ],
      stack: ["React", "FastAPI", "scikit-learn", "Pandas"],
      role: "FastAPI backend and frontend/backend integration",
      repo: "https://github.com/vivek-jangela/burn-in-frontend",
      live: ""
    },
    {
      id: "recurly",
      name: "Recurly",
      summary: "Subscription management mobile app.",
      description: "A subscription management app built with React Native and the Expo framework.",
      highlights: [],
      stack: ["React Native", "Expo"],
      role: "",
      repo: "https://github.com/ashu-mishra06/Recurly",
      live: ""
    },
    {
      id: "python-cognifyz",
      name: "Python Internship Tasks",
      summary: "Task solutions from the Cognifyz Python internship.",
      description: "A collection of the programming tasks completed during the Cognifyz Python internship.",
      highlights: [],
      stack: ["Python"],
      role: "",
      repo: "https://github.com/ashu-mishra06/python_projects_cognifyz",
      live: ""
    }
  ],

  achievements: [
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

  experience: [
    {
      id: "cognifyz-python-internship",
      role: "Python Intern",
      org: "Cognifyz",
      period: "",
      summary: "Worked through the internship's Python programming tasks. Solutions are in the python_projects_cognifyz repo.",
      link: "https://github.com/ashu-mishra06/python_projects_cognifyz"
    }
  ]
};

if (typeof module === "object" && module.exports) module.exports = PORTFOLIO;
else window.PORTFOLIO = PORTFOLIO;
