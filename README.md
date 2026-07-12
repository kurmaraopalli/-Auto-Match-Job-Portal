# Auto-Match Job Portal (Bengaluru Tech Ecosystem)

An automated web application that dynamically maps the provided executive tech resume to targeted job openings across the **Top 15 Industrial Domains** and **Top 10-15 Premier Companies** in Bengaluru. The portal features an integrated AI-driven parser, an automated daily scraping engine, and a one-click profile matching dashboard.

---

## 🚀 Key Functional Modules

### 1. Daily Automated Updates
* **Cron-Scheduled Workers:** Active background workers trigger a daily update pipeline via GitHub Actions.
* **Scraping Engine:** Built using Playwright and BeautifulSoup to pull the latest open requisitions directly from target career endpoints.

### 2. High-Precision Matching Engine
* **Resume Core Vector:** Tailored precisely around **16+ years of System Architecture/Project Management experience**, specializing in:
  * **Backend & Systems:** .NET Core, Microservices, Kafka, RabbitMQ, and Distributed Systems Architecture.
  * **AI/ML & Automation:** GenAI, RAG, LangChain, Vector Databases, Prompt Engineering, and NLP.
  * **Cloud & DevOps:** Deep expertise in Azure, AWS, and automated CI/CD DevOps workflows.
* **Semantic Filters:** Eliminates unrelated junior or cross-functional listings by screening for Managerial, Technical Lead, and Senior Architect roles.

---

## 🏗️ Technical Architecture & Directory Structure

```text
├── .github/
│   └── workflows/
│       └── daily-scraper.yml      # Cron runner executing daily at 00:00 UTC
├── src/
│   ├── scraper/
│   │   ├── engine.py              # Playwright/Request automation orchestrator
│   │   └── targets.py             # Domain maps & endpoint parameters
│   ├── matching/
│   │   └── vector_matcher.py      # TF-IDF / Semantic resume parsing script
│   └── web/
│       ├── index.html             # Main dashboard UI
│       ├── styles.css             # Unified style configurations
│       └── app.js                 # Local JSON consumer and UI renderer
├── data/
│   ├── resume_profile.json        # Structured portfolio data vector
│   └── latest_jobs.json           # Cached, scraped operational dataset
└── requirements.txt               # Main runtime dependencies
```

---

## 🌐 The 15 Target Domains & Enterprise Matrix

The scraper targets the apex enterprises across the 15 distinct functional sectors defining Bengaluru’s commercial ecosystem:

### 1. Information Technology & Software (IT/ITeS)
* **Target Companies:** Infosys, Wipro, TCS, HCLTech, Microsoft, Google, Amazon, Accenture, Cognizant, Capgemini.
* **Primary Scope:** Cloud Migration, Distributed Microservices, Enterprise Architecture.

### 2. BFSI & Global Capability Centres (GCCs)
* **Target Companies:** Goldman Sachs, JPMorgan Chase, Morgan Stanley, Wells Fargo, Deutsche Bank, HDFC Bank, HSBC, Fidelity Investments, Standard Chartered, Bank of America.
* **Primary Scope:** Investment Banking Tech, High-Volume Transaction Pipelines, Core FinTech.

### 3. Artificial Intelligence & DeepTech
* **Target Companies:** Krutrim, Sarvam AI, NVIDIA, Yellow.ai, Pixis, TrueFoundry, Signzy, SigTuple, Niramai, Gnani.ai.
* **Primary Scope:** LLM Architectures, RAG Systems, Advanced Multi-lingual Voice Infra.

### 4. Healthcare, MedTech & Digital Health
* **Target Companies:** Manipal Hospitals, Narayana Health, Fortis Healthcare, Aster DM, GE HealthCare, Siemens Healthineers, AstraZeneca, Indegene, MediBuddy, Practo.
* **Primary Scope:** Biomedical Software, Clinical Engineering AI, Telehealth Platforms.

### 5. Telecom & Network Infrastructure
* **Target Companies:** Reliance Jio, Bharti Airtel, Vodafone Idea, BSNL, Nokia, Ericsson, Huawei, Cisco Systems, Indus Towers, Tata Communications.
* **Primary Scope:** 5G Core Engineering, Intelligent Network Management Routing.

### 6. E-Commerce & Retail Tech
* **Target Companies:** Flipkart, Myntra, Meesho, Amazon India, Swiggy, Zomato, Zepto, BigBasket, Nykaa, Udaan.
* **Primary Scope:** Micro-frontend Checkout Layers, Order Flow Lifecycles, Supply Chain Engines.

### 7. FinTech & Neo-Banking
* **Target Companies:** PhonePe, Razorpay, CRED, Paytm, Groww, Zerodha, Pine Labs, Navi, Slice, BharatPe.
* **Primary Scope:** UPI Rails, High-Throughput Payment Gateways, Automated Underwriting.

### 8. Automotive & Electric Vehicles (EV)
* **Target Companies:** Ola Electric, Ather Energy, Mahindra Electric, Tata Motors Tech, Bosch India, Continental, Ola Mobility, Altigreen, Ultraviolette, Bounce Infinity.
* **Primary Scope:** Smart Connected Vehicle Software, Embedded Control Units.

### 9. Aerospace & Defence
* **Target Companies:** HAL, ISRO, DRDO (ADE/LRDE), BEL, Boeing India, Airbus India, Honeywell Aerospace, Safran India, Collins Aerospace, Team Indus.
* **Primary Scope:** Avionics Processing Software, Mission-Critical Systems.

### 10. Semiconductor & VLSI Design
* **Target Companies:** Intel India, AMD, Qualcomm, Texas Instruments, NVIDIA Hardware, NXP Semiconductors, MediaTek, Synopsys, Cadence, Broadcom.
* **Primary Scope:** System-on-Chip (SoC) Firmware, Hardware Emulation Environments.

### 11. Biotechnology & Pharmaceuticals
* **Target Companies:** Biocon, Syngene International, Kiran Mazumdar-Shaw Labs, Strand Life Sciences, Anthem Biosciences, Connexios, Medreich, Micro Labs, Bal Pharma, Himalaya Wellness.
* **Primary Scope:** Bioinformatics Platforms, Clinical Trials Compliance Systems.

### 12. EdTech (Educational Technology)
* **Target Companies:** UpGrad, Simplilearn, Unacademy, PhysicsWallah, Vedantu, Eruditus, Classplus, Lead School, CueMath, Adda247.
* **Primary Scope:** Real-time Classroom Streaming Infrastructure, Enterprise Upskilling LMS.

### 13. Real Estate & Managed Infrastructure
* **Target Companies:** Prestige Group, Brigade Group, Sobha Limited, Embassy Group, Puravankara, RMZ Corp, Awfis, Indiqube, WeWork India, Assetz.
* **Primary Scope:** Smart PropTech Platforms, Commercial Space Allocation Engines.

### 14. Renewable Energy & CleanTech
* **Target Companies:** ReNew Power, CleanMax Solar, Sterling & Wilson, Orb Energy, Ecoppia, SunSource Energy, GPS Renewables, Fourth Partner Energy, Promethean Energy, Eniphaza.
* **Primary Scope:** Smart Grid Analytics, Industrial Carbon Footprint Software.

### 15. Logistics & Supply Chain Automation
* **Target Companies:** Delhivery, BlackBuck, Shadowfax, Porter, Rivigo, Letstrack, Locus.sh, Shiprocket, ElasticRun, Ninjacart.
* **Primary Scope:** Telematics Data Ingestion, Route Optimization Algos.

---

## 🛠️ Automated Cron Pipeline Setup

The data automation engine relies entirely on GitHub Actions, circumventing the need for standalone server infrastructure.

### GitHub Workflow Configuration (`.github/workflows/daily-scraper.yml`)

```yaml
name: Daily Telecom & Tech Job Scraper

on:
  schedule:
    - cron: '0 0 * * *' # Executes automatically every single day at midnight UTC
  workflow_dispatch:   # Permits manual trigger from the Actions tab

jobs:
  run-scraper:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code Repository
        uses: actions/checkout@v4

      - name: Initialize Python Runtime
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install System Dependencies
        run: |
          pip install -r requirements.txt
          playwright install --with-deps chromium

      - name: Execute Scraping and AI Matching Pipeline
        run: |
          python src/scraper/engine.py
          python src/matching/vector_matcher.py

      - name: Commit and Push Refreshed Datasets
        run: |
          git config --global user.name "GitHub Automated Scraper"
          git config --global user.email "scraper-bot@github.com"
          git add data/latest_jobs.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "Automated Sync: Latest Openings ($(date +'%Y-%m-%d'))" && git push)
```

---

## 💻 Front-End Implementation Sample (`src/web/index.html`)

This optimized frontend layout processes the matched openings data array and handles profile submission triggers directly via a responsive visual UI.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MatchBoard // Enterprise Job Locator</title>
    <style>
        :root {
            --bg-deep: #0f172a; --panel-surface: #1e293b; 
            --accent-green: #10b981; --text-main: #f8fafc;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-deep); color: var(--text-main); margin: 0; padding: 2rem; }
        .dashboard-header { border-bottom: 1px solid #334155; padding-bottom: 1rem; margin-bottom: 2rem; }
        .grid-layout { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; }
        .filter-panel { background: var(--panel-surface); padding: 1.5rem; border-radius: 8px; height: fit-content; }
        .job-card { background: var(--panel-surface); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3b82f6; display: flex; justify-content: space-between; align-items: center; }
        .job-card.high-match { border-left-color: var(--accent-green); }
        .apply-btn { background: var(--accent-green); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; }
        .match-badge { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
    </style>
</head>
<body>

    <div class="dashboard-header">
        <h1>MatchBoard Profile Analytics</h1>
