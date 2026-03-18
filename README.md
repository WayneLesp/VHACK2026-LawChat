# ⚖️ LawChat — Malaysian Rights Explainer

> **Snap a letter. Ask a law. Know your rights.**
>
> An AI-powered multilingual civic assistant that helps every Malaysian understand government documents and their legal rights — in multiple languages.

---

## 🏆 V HACK 2026 — Varsity Hackathon

| | |
|---|---|
| **Track** | Natural Language Processing (NLP) |
| **SDG** | SDG 10: Reduced Inequalities (Target 10.2) |
| **Team** | VHACK2026-LawChat |
| **University** | Sunway Univerity |
| **Deadline** | 19 March 2026 |

---

<!-- Add your screenshots here after building -->
## 🖼️ User Interface Showcase



<table border="0">

  <tr>
    <td align="center" width="40%">
      <b>🔐 The Login Page</b><br />
      <img src="https://github.com/user-attachments/assets/cae24716-0d95-4252-9325-9d58085e6a45" width="100%" />
    </td>
    <td align="center" width="40%">
      <b> 📝 Document Explainer </b><br />
      <img src="https://github.com/user-attachments/assets/4cab477b-6ecd-48a5-870e-3c9b0cbeaa99" width="100%" />
    </td>
   </tr>
   <tr>
    <td align="center" width="40%">
      <b> ⚖️ Law Chat</b><br />
      <img src="https://github.com/user-attachments/assets/8c2f9975-6b0b-4454-ba3d-35531a137a72" width="100%" />
    </td>
    <td align="center" width="40%">
      <b>⚡ History Page ><br />
      <img src="https://github.com/user-attachments/assets/b667a61b-0cf0-45c5-85fb-d88f6a0feaaa" width=100%" />
    </td>
  </tr>
</table>

## 🎯 Problem Statement

ASEAN is a mosaic of thousands of languages and dialects. However, digital government portals (e-Gov) often use a single dominant national language and complex official terminology. This creates a barrier for:

- 👴 **Elderly users** who cannot understand formal BM or English
- 👷 **Migrant workers** unfamiliar with local legal language
- 🏘️ **Rural B40 communities** excluded from welfare and legal services
- 📋 **SMEs and freelancers** confused by LHDN and JKM letters

> *"In Malaysia, 1,001 undang-undang exist. Most rakyat don't know a single one."*

---

## 💡 Solution

**SuaraRakyat** is a Flutter mobile + web app powered by the **Claude AI API** that:

1. 📷 **Snaps any government document** (LHDN notice, JKM letter, hospital bill, welfare form)
2. 🤖 **Claude AI reads and explains it** in simple BM, English, Mandarin, or Tamil
3. ✅ **Gives 3 clear action steps** the user must take
4. ✍️ **Drafts a reply letter** if needed
5. ⚖️ **Answers legal questions** about tenancy, employment, consumer, family, road, and welfare rights
6. 🔊 **Supports voice input** for elderly and low-literacy users

---

## ✨ Key Features

### 📄 Module 1 — Document Explainer
| Feature | Description |
|---|---|
| Snap & Explain | Camera photo → Claude extracts meaning in plain language |
| File Upload | PDF or image from gallery |
| Action Guide | 3 simple steps of what to do next |
| Reply Draft | Auto-generates a formal reply letter |

### ⚖️ Module 2 — Law Explainer
| Feature | Description |
|---|---|
| Law Categories | Tenancy · Employment · Consumer · Family · Road · Welfare |
| Ask Anything | Open-ended legal Q&A in any language |
| Snap a Contract | Flags unfair or illegal clauses in rental/employment contracts |
| Quick Prompts | Pre-built common questions per category |

### 🌏 Module 3 — Multilingual AI
| Feature | Description |
|---|---|
| 4 Languages | Bahasa Malaysia, English, Mandarin, Tamil |
| Auto-detect | Detects language automatically from input |
| Voice Input | Speak your question — no typing needed |
| Simple Mode | Primary school reading level output |

### 🛡️ Module 4 — Safety & Trust
| Feature | Description |
|---|---|
| RAG Grounded | All law answers sourced from official Malaysian statutes |
| Hallucination Control | Claude is grounded in real acts, not guessing |
| Legal Disclaimer | Complex cases → refers to YBGK / legal aid contacts |

---

## 🏗️ Architecture
```
┌──────────────────────────────────────────────────────┐
│         React 18 + TypeScript (SPA)                  │
│              Tailwind CSS                            │
│                                                      │
│  ┌──────────────┐        ┌────────────────────────┐  │
│  │  LawChat Tab │        │  Document Explainer    │  │
│  │  Legal Q&A   │        │  PDF / Photo Upload    │  │
│  └──────┬───────┘        └────────────┬───────────┘  │
│         └──────────────┬──────────────┘              │
│                        │                             │
│           ┌────────────▼────────────┐                │
│           │     Firebase Auth       │                │
│           │   (User Identity)       │                │
│           └────────────┬────────────┘                │
└────────────────────────│─────────────────────────────┘
                         │ HTTPS
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐         ┌─────────────────────┐
│ Gemini 2.5 Flash │         │  Cloud Firestore    │
│  (AI Engine)     │         │  (Real-time DB)     │
│                  │         │                     │
│ • Legal reasoning│         │ • Chat history      │
│ • Doc parsing    │         │ • Analysed docs     │
│ • NLP & dialect  │         │ • User preferences  │
│ • RAG grounding  │         └─────────────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────┐
│   Google Cloud   │
│      Run         │
│  (Hosted via AI  │
│  Studio Build)   │
└──────────────────┘
```
 
---
 
## 🛠️ Tech Stack
 
| Component | Technology | Role |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Responsive Single Page Application (SPA) styled with Tailwind CSS |
| **Backend** | Firebase (Serverless) | Firebase Auth for user identity and Cloud Firestore for real-time data storage |
| **AI Engine** | Gemini 2.5 Flash | Core "brain" for legal reasoning, document parsing, and multi-dialect translation |
| **Environment** | Cloud Run | Hosted on Google Cloud via the AI Studio Build environment |
| **NLP** | Natural Language Processing | Gemini handles semantic analysis to turn complex legal jargon into plain language |
| **RAG** | Grounded Context | Uses System Instructions to ground the AI in national statutes and legal frameworks |
| **Storage** | Firestore | Stores chat history, analysed documents, and user preferences |
| **Sharing** | HTTPS Preview | Shared via a secure URL that allows others to interact with your specific build |
| **Voice** | Web Speech API | Text-to-speech accessibility for elderly and low-literacy users |
 
---
 
## 📋 CS4 Technical Requirements — Coverage
 
| Requirement | Implementation |
|---|---|
| ✅ Dialect-Aware Translation | Gemini handles BM, English, Indonesian, Tagalog, Kelantan and Sarawak dialects |
| ✅ Text Simplification | Gemini converts legal jargon to plain everyday language (5th-grade level) |
| ✅ Recursive Summarisation | Long policy documents condensed into 3–5 actionable bullet points |
| ✅ Cross-Lingual Retrieval | Ask in any dialect → Gemini retrieves from national-language statute |
| ✅ Hallucination Control | RAG via System Instructions grounds all answers in official Malaysian acts |
| ✅ Low-Resource Languages | Covers local dialects not supported by standard translation tools |
| ✅ Inclusivity UI | Guest mode, voice input, simple layout designed for low digital literacy |
 
---
 

## 📱 Mobile App Mode (iOS + Android)

LawChat now ships as a **mobile-first installable web app**:

- **Standalone app shell** for iPhone and Android home screens
- **Bottom navigation + safe-area spacing** for notch devices
- **Direct camera capture** for document and contract scanning
- **Offline app shell caching** via a service worker for faster relaunches
- **Mobile-friendly Google sign-in redirect flow** for embedded and mobile browsers

### Install on iPhone
1. Open the deployed site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch LawChat like a native app.

### Install on Android
1. Open the deployed site in Chrome.
2. Tap **Install app** or **Add to Home Screen**.
3. Open LawChat from your launcher.

## 🚀 Getting Started
 
#### Prerequisites
- Node.js 18+
- Firebase account
- Google AI Studio API Key (Gemini)
 
#### Installation
 
```bash
# 1. Clone the repository
git clone https://github.com/Gohpeijia/VHACK2026-LawChat.git
cd VHACK2026-LawChat
 
# 2. Install dependencies
npm install
 
# 3. Set up environment variables
cp .env.example .env
# Add your keys to .env:
# VITE_GEMINI_API_KEY=your_gemini_key
# VITE_FIREBASE_API_KEY=your_firebase_key
# VITE_FIREBASE_PROJECT_ID=your_project_id
 
# 4. Start development server
npm run dev
```
 
#### Firebase Setup
 
```bash
# Install Firebase CLI
npm install -g firebase-tools
 
# Login and initialise
firebase login
firebase init
 
# Deploy
firebase deploy
```
 
---
 
## 📁 Project Structure
 
```
VHACK2026-LawChat/
├── src/
│   ├── components/
│   │   ├── LawChat.tsx              # Legal Q&A chat interface
│   │   ├── DocumentExplainer.tsx    # PDF/photo upload + AI result
│   │   ├── LanguageSelector.tsx     # Dialect and language picker
│   │   └── AuthModal.tsx            # Sign in / Guest mode
│   ├── services/
│   │   ├── geminiService.ts         # All Gemini API calls
│   │   └── firebaseService.ts       # Firestore + Auth
│   ├── hooks/
│   │   └── useAuth.ts               # Firebase auth hook
│   └── App.tsx                      # Root component
├── public/
├── .env                             # API keys (not committed)
├── firebase.json                    # Firebase config
└── package.json
```
 
---
 
## 📚 Malaysian Laws Referenced

| Category | Acts |
|---|---|
| Tenancy | Specific Relief Act 1950, Distress Act 1951, National Land Code 1965 |
| Employment | Employment Act 1955, Industrial Relations Act 1967, Minimum Wages Order 2022 |
| Consumer | Consumer Protection Act 1999, Sale of Goods Act 1957 |
| Family | Law Reform (Marriage and Divorce) Act 1976, Guardianship of Infants Act 1961 |
| Road | Road Transport Act 1987, Motor Vehicles (Third Party Risks) Act 1960 |
| Welfare | SOCSO Act 1969, EPF Act 1991, JKM Assistance Guidelines |

---

## 📄 License

This project was built for **V HACK 2026**.

---

<div align="center">

**SuaraRakyat** — *Snap a letter. Ask a law. Know your rights.*

Built with ❤️ for every Malaysian who deserves to understand their rights.

</div>
