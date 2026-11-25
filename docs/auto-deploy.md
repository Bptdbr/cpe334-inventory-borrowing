# Automated Deployment and Security Configuration Guide
## Google Cloud Platform & GitHub Actions CI/CD Integration

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — Semester 1/2026  
**Project:** Equipment Inventory and Borrowing System (Theme 2)  
**Team Prefix:** `s9bc98308`  
**Related Issue:** #L5-6 (GitHub-GCP Connection, Rulesets & Merge Lock)  
**Authors:** DUBROEUCQ Baptiste (69540460002) and LEPOUTRE Léo (69540460045)  

---

## 1. Overview and Security Principles

In conformance with the course security requirements (R-02, R-06, R-10, Rule 5):
1. **Keyless Authentication (Zero Long-Lived Credentials):** GitHub Actions authenticates to Google Cloud Platform using **Workload Identity Federation (WIF)** via OpenID Connect (OIDC). No long-lived service account JSON keys are downloaded, stored in GitHub Secrets, or committed.
2. **Short-Lived Tokens:** GitHub's OIDC provider issues short-lived JWT tokens exchanged at runtime for ephemeral Google Cloud credentials scoped strictly to the team's service account.
3. **Branch Protection (Merge Lock R-06):** Releases on `main` are strictly guarded by GitHub Rulesets requiring mandatory peer approval (1 reviewer) and successful execution of the required check `test-and-docker`.

---

## 2. GitHub Actions to GCP Connection Setup (WIF)

### 2.1 Repository Variables Configuration

In GitHub, navigate to **Settings > Secrets and variables > Actions > Variables** (Repository variables). Ensure the following 4 variables are defined:

| Variable Name | Value | Purpose |
|---|---|---|
| `GCP_PROJECT_ID` | `cpe-se-course-2026` | Shared GCP Project identifier |
| `GCP_REGION` | `asia-southeast1` | Regional deployment datacenter |
| `WIF_PROVIDER` | `projects/cpe-se-course-2026/locations/global/workloadIdentityPools/.../providers/...` | Full resource path of the OIDC Workload Identity Provider |
| `WIF_SERVICE_ACCOUNT` | `s9bc98308-deployer@cpe-se-course-2026.iam.gserviceaccount.com` | Dedicated deployer service account provisioned by the portal |

*(Note: These are resource identifiers and configuration names, not secrets).*

### 2.2 Repository Secrets Configuration

Navigate to **Settings > Secrets and variables > Actions > Secrets** (Repository secrets). Define the private runtime credentials used by the smoke test:

| Secret Name | Content Description | Sensitivity |
|---|---|---|
| `SMOKE_USER` | `borrower1` (or test account username) | Synthetic test credential |
| `SMOKE_PASSWORD` | Password corresponding to `s9bc98308-demo-password` | **Private Secret** (never committed or printed) |

---

## 3. GitHub Branch Protection & Merge Lock Configuration (R-06)

To satisfy requirement **R-06** and prove that failed checks block entry into the release path, configure a GitHub Ruleset on `main`:

### 3.1 Step-by-Step GitHub Ruleset Setup
1. In the GitHub repository, open **Settings > Rules > Rulesets**.
2. Click **New ruleset > New branch ruleset**.
3. Fill in the general settings:
   - **Ruleset Name:** `protect-main-release`
   - **Enforcement status:** `Active`
4. **Target branches:**
   - Click **Add target > Include default branch** (targets `main`).
   - Click **Add target > Include by pattern** and type `lab5-staging` (ensures staging is also protected against accidental merges with failing checks).
5. **Branch rules to enable:**
   - [x] **Restrict deletions:** Prevents accidental deletion of the `main` branch.
   - [x] **Block force pushes:** Prohibits `git push --force` to preserve immutable release history (R-10).
   - [x] **Require a pull request before merging:**
     - Required approvals: `1` (The PR author cannot approve their own PR, R-09).
     - [x] Dismiss stale pull request approvals when new commits are pushed.
   - [x] **Require status checks to pass:**
     - [x] **Require branches to be up to date before merging.**
     - In "Status checks that are required", search and add:
       - **`test-and-docker`** *(Strictly match this job name from `.github/workflows/ci-docker.yml`)*.
6. Click **Save changes**.

### 3.2 Secret Scanning and Push Protection
Navigate to **Settings > Code security and analysis**:
- Ensure **Secret scanning** is set to `Enabled`.
- Ensure **Push protection** is set to `Enabled`.

---

## 4. Demonstration of Check C-02 (Failing PR Merge Blocked)

Requirement **R-06 / Check C-02** mandates demonstrating that an intentionally failing test cannot be merged into `main`.

### 4.1 Procedure
1. Create a dedicated temporary branch: `test/lab5-failing-check` (branched from `main`).
2. Add an intentional failing assertion in `backend/tests/unit/merge-lock-proof.test.ts`:
   ```typescript
   import { describe, it, expect } from "vitest";

   describe("Demonstration of C-02 merge lock check (L5-6, R-06)", () => {
     it("deliberately fails to prove that failing required check blocks merge into main", () => {
       expect(true).toBe(false);
     });
   });
   ```
3. Push the branch to GitHub:
   ```bash
   git push -u origin test/lab5-failing-check
   ```
4. Open a Pull Request:
   - **Base:** `main`
   - **Compare:** `test/lab5-failing-check`
   - **Title:** `[Lab5-6] test: demonstration of C-02 required check blocking merge`
5. Observe the CI run:
   - The workflow `.github/workflows/ci-docker.yml` triggers.
   - Job `test-and-docker` fails on the unit test stage.
   - GitHub displays the blocked merge banner:
     > *"Required status check 'test-and-docker' failed. Merging is blocked."*
6. **Capture Evidence:**
   - Take a clear screenshot of the pull request page showing:
     - The red failed check `test-and-docker`.
     - The disabled, blocked "Merge pull request" button.
     - The PR URL and commit SHA.
   - Record the screenshot in `report-lab5.md` as **Figure 1.4 (Check C-02)**.
7. **Cleanup:**
   - Close the pull request without merging.
   - Delete the temporary branch `test/lab5-failing-check` on GitHub and locally:
     ```bash
     git push origin --delete test/lab5-failing-check
     ```
   - **`main` remains 100% clean and untouched.**
