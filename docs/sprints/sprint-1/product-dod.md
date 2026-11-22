# Product Definition of Done

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Related Issue:** #6
**Version:** 1.0
**Last updated:** 2026-11-05

A feature, Issue or release is done only when every applicable item below is true and supported by evidence. A statement by an AI agent that "all tests pass" is not evidence.

## 1. Feature and Issue level

| # | Criterion | Evidence |
|---|---|---|
| 1 | The required behavior of the feature contract is implemented. | Demonstrated behavior; AC list checked |
| 2 | The contract (design, AC, STS) was written and committed before implementation, and any revision is visible and justified. | Commit history |
| 3 | For rule work, the tests were written first and failed for the right reason before the implementation. | Red output, then green output, with commit ids |
| 4 | Every planned test was executed. Each AC maps to a planned test ID and to the actual test file and name. | AC to test table |
| 5 | Meaningful tests pass, including negative and boundary cases and role restrictions. | Command, tested commit, counts of passed, failed and skipped |
| 6 | No test was weakened, disabled or skipped to obtain a pass. Failed or skipped tests are reported. | Diff review, reported counts |
| 7 | Authorization is enforced by the backend, not only by the UI. | API-level test |
| 8 | The PR into `sprint-1-staging` was reviewed by the teammate with a specific check, question, finding or reason for approval. The author did not approve their own PR. | PR review |
| 9 | Setup and documents are current (README, `.env.example`, contract, traceability). | Repository inspection |
| 10 | No secret or real personal data in Git. | Repository inspection |
| 11 | Incomplete work is disclosed. | PR description, PDF limitations |

## 2. Sprint and release level

| # | Criterion | Evidence |
|---|---|---|
| 12 | All Sprint 1 features are integrated in `sprint-1-staging`. | Merged PRs |
| 13 | The full suite (unit, integration, selected E2E) runs on the integrated branch. | Command, output, commit |
| 14 | Acceptance criteria of every Sprint 1 feature are checked on the integrated build. | AC to test to result table |
| 15 | The release PR from `sprint-1-staging` to `main` was reviewed by the teammate. | PR review |
| 16 | The release is tagged (`v1.0-sprint1`) and the tag points to the tested commit. | Tag and commit id |
| 17 | The application runs from a clean clone with documented commands (setup, migration, seed, run, test). | README run-through |
| 18 | The demonstration covers a normal journey with persisted retrieval, a rule rejection, login and logout, and a forbidden operation. | Captioned screenshots |
| 19 | Both students contributed and can explain the design, tests and released behavior. | Issues, PRs, contribution table |

## 3. Out of the definition for Deliverable 1

Docker packaging, CI/CD and GCP deployment are done in Lab 5.

## 4. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial Product Definition of Done | Baptiste |