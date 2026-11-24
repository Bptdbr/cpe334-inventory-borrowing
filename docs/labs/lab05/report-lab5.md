# Lab 5: Cloud Deployment and CI/CD Pipeline on GCP
## Equipment Inventory and Borrowing System (Theme 2)

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — Semester 1/2026  
**Students:**
- DUBROEUCQ Baptiste, ID 69540460002 (Bptdbr)
- LEPOUTRE Léo, ID 69540460045 (LeoMin13)

**Repository:** `https://github.com/Bptdbr/cpe334-inventory-borrowing`  
**Submission:** LEB2, one PDF per team (`lab5_sec<sec>_<group>.pdf`)  
**Target Release Tag:** `v1.1-lab5`  
**Public Service URL:** `[TO FILL FROM GCP CLOUD RUN]`  

---

## Navigation Table

| Part | Title | Points | Key Identifiers and Content |
|---|---|---|---|
| **Part 0** | Identification, Contributions & Evidence Index | - | Team info, repository link, release commit, contribution table, evidence index |
| **Part 1** | CI Pipeline & Branch Protection | 30 pts | `ci-docker.yml`, C-01 (passing PR), GitHub ruleset configuration, C-02 (failing PR blocked) |
| **Part 2** | Containerization & Clean Local Execution | 20 pts | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, C-03 (clean clone build and run), `.env.example` |
| **Part 3** | Cloud Deployment & Persistence on GCP | 35 pts | Public Cloud Run URL, C-04 (domain workflow: login, request, checkout, forbidden), C-05 (data persistence across restart and redeploy) |
| **Part 4** | CD Pipeline, Release Workflow & Auditability | 15 pts | `deploy.yml`, reviewed release PR `lab5-staging` -> `main`, C-06 (digest deployment, audit trail), release procedure |

---

## Part 0: Project Baseline and Evidence Index

### 0.1 Team and Project Identification

| Item | Value |
|---|---|
| **Project Theme** | Theme 2: Equipment Inventory and Borrowing System |
| **Repository (Public)** | `https://github.com/Bptdbr/cpe334-inventory-borrowing` |
| **Student 1** | DUBROEUCQ Baptiste (69540460002) — GitHub: `Bptdbr` |
| **Student 2** | LEPOUTRE Léo (69540460045) — GitHub: `LeoMin13` |
| **Release Tag** | `v1.1-lab5` |
| **Release Commit SHA** | `[TO FILL: 40-character commit SHA]` |
| **Public Service URL** | `[TO FILL: Cloud Run HTTPS URL]` |
| **GCP Shared Project** | `cpe-se-course-2026` |
| **GCP Region** | `asia-southeast1` |
| **GCP Team Prefix** | `[TO CONFIRM FROM PORTAL]` |

### 0.2 Contribution Table

| Task / Issue | Description | Author | Reviewer | PR / Evidence |
|---|---|---|---|---|
| **L5-1** | Course Portal Activation & GCP Cloud Provisioning | Léo | Baptiste | Portal screenshots, resources confirmation |
| **L5-2** | Cloud-Ready Application (GET /api/ready, static serving, config) | Léo | Baptiste | PR `feat/lab5-cloud-ready` -> `lab5-staging` |
| **L5-3** | Docker Packaging & Docker Compose Setup | Léo | Baptiste | PR `feat/lab5-docker` -> `lab5-staging` |
| **L5-4** | CI Pipeline with `test-and-docker` Job & Dependabot | Baptiste | Léo | PR `feat/lab5-ci` -> `lab5-staging` |
| **L5-5** | Initial Staging Deployment on Cloud Run | Léo | Baptiste | PR `feat/lab5-first-deploy` -> `lab5-staging` |
| **L5-6** | Branch Protection Ruleset & C-02 Rejection Demonstration | Baptiste | Léo | GitHub ruleset, PR on `test/lab5-failing-check` |
| **L5-7** | Continuous Deployment Pipeline (`deploy.yml` & Release Audit) | Baptiste | Léo | PR `feat/lab5-deploy-workflow` -> `lab5-staging` |
| **L5-8** | Database Persistence Verification across Redeploy | Léo | Baptiste | Evidence C-05 (Cloud SQL persistence) |
| **L5-9** | Deployment Documentation & Final Deliverable PDF | Léo & Baptiste | Both | `docs/labs/lab05/deployment.md` & PDF |

### 0.3 Master Evidence Index (Checks C-01 to C-06)

| Check ID | Requirement | Target / Description | Evidence Location in Report | Status |
|---|---|---|---|---|
| **C-01** | R-05, R-10 | PR triggers `test-and-docker` CI; all tests pass | Part 1, Figure 1.2 | To verify |
| **C-02** | R-06 | PR with failing test cannot be merged (merge blocked) | Part 1, Figure 1.4 | To verify |
| **C-03** | R-01, R-02 | Clean clone builds and runs with `.env.example` only | Part 2, Figure 2.2 | To verify |
| **C-04** | R-03, R-11 | Public URL demonstrates login, domain action, and rejection | Part 3, Figures 3.1–3.4 | To verify |
| **C-05** | R-04 | Data persists across Cloud Run container restart and redeployment | Part 3, Figures 3.5–3.7 | To verify |
| **C-06** | R-07, R-08 | Reviewed release merges to main; deployed revision matches SHA | Part 4, Figures 4.1–4.3 | To verify |

---

## Part 1: CI Pipeline & Branch Protection (30 points)

*(To be filled during L5-4 and L5-6)*

---

## Part 2: Containerization & Clean Local Execution (20 points)

*(To be filled during L5-3)*

---

## Part 3: Cloud Deployment & Persistence on GCP (35 points)

*(To be filled during L5-5 and L5-8)*

---

## Part 4: CD Pipeline, Release Workflow & Auditability (15 points)

*(To be filled during L5-7)*
