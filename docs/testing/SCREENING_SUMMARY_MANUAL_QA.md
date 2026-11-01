# Screening Summary Manual QA

Status: Automated logic checks pass. Manual device verification is PENDING.

Last automated run: October 27, 2026.

Scope (single-photo, AI-only primary result):

- Single-photo capture (camera or gallery) and on-device quality checks
- Claude independent image-validation gate (one review request per run)
- Adaptive 12-question supplementary questionnaire with early stopping
- Result screen: AI Preliminary Screening Result as the sole primary result,
  Top-3 list, Symptom Summary (supplementary), Independent Review card
- Save / Save-and-Book with a payload that contains only raw AI values
- Booking gating

This checklist is for the project's normal Expo development setup on an Android or iOS device. Use Expo Go only if the current native dependencies load there; otherwise use the project development build. Automated checks do not replace device testing of camera, gallery, storage, modal presentation, accessibility, or layout.

## Automated Verification

Run from `mobile/`:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS — exit 0, no diagnostics |
| `npm test` (test:screening + test:appointment) | PASS — 22 tests, 0 failures (16 screening incl. `resultNavigationParams.test.ts` and `savePayload.test.ts` with its `symptom_answers` cases, 6 appointment) |
| `npm run test:bayesian` | PASS — `Bayesian refinement tests passed` (retained library) |
| `npm run test:adaptive` | PASS — `Adaptive questionnaire tests passed` |
| `npm run test:summary` | PASS — `summary logic tests passed` (retained library) |

From `backend/`:

| Command | Result |
| --- | --- |
| `python manage.py test ai_screenings` | PASS — 75 tests, 0 failures, run 2026-10-28 against a test database built from this working tree (`Ran 75 tests in 477.429s` → `OK`); includes `SymptomAnswersTests` (12 tests: JSON-body and multipart round-trip, validation limits with exact error messages, AI-field integrity, owner isolation). Note: an earlier run against the team's shared Supabase `test_postgres` showed 61/63 — the 2 `VerdictComparisonTests` failures were schema drift, not code: that database carries migration `consultations/0003_consultation_follow_up` (NOT NULL `CON_FOLLOW_UP_REQUIRED`) which exists in no branch or commit of this repository. The shared database and git history need to be reconciled by the team. |

Jest and React Native Testing Library are not configured, so there are no component tests for the capture screen, result cards, camera flow, or screen layout.

## Prerequisites

1. From `mobile/`, launch the project's normal Expo development setup on a device with camera and photo-library access.
2. Sign in as an owner with at least one pet.
3. Backend access is required for the image-validation review and the save-and-book path. Real review calls need a valid `ANTHROPIC_API_KEY` in the backend `.env`; without it, photos report `NOT_CONFIGURED` and no screening runs.
4. Keep the backend reachable from the device (`EXPO_PUBLIC_API_URL` in `mobile/.env` must point at the machine's current LAN IP).

## Manual Scenarios

### QA-01 — Single-photo capture and review overlay

Priority: High

Steps:

1. Select a pet and open the skin screening screen.
2. Confirm the primary button reads `Add a photo to continue` before a photo is chosen.
3. Tap `Take Photo`, capture a well-lit close-up of the affected skin area, and confirm the badge reads `1 photo selected` and the button changes to `Run Screening`.
4. Tap `Gallery` and confirm `Choose Another` replaces the photo.
5. Tap `Run Screening` and watch the overlay.

Expected:

- During validation the overlay reads `Checking photo...` with the hint `Independent image review is checking whether this photo is suitable for screening`.
- After approval it reads `Running screening...` with `Validation passed. The on-device model is analyzing the same photo`.
- Exactly one `POST /api/owner/screenings/vision-analysis/` request appears in backend logs for the run.
- Only one photo slot exists; there is no multi-photo requirement.

Status: NOT TESTED.

### QA-02 — Gate rejection shows validation result with no prediction

Priority: High

Steps:

1. Run a screening with a photo the review will reject (for example a plain object or background photo).
2. Wait for the result screen.

Expected:

- The result shows the `IMAGE VALIDATION` card with the owner-facing gate message (for example `Not a Skin Image` or `Photo Not Clear Enough`).
- No disease prediction, confidence, Top-3 list, or questionnaire appears.
- The screen states that no on-device disease prediction was produced.
- Save and Book are absent; nothing is sent to `POST /api/owner/screenings/`.
- `Scan Again` / `Choose Another Photo` returns to capture.

Status: NOT TESTED.

### QA-03 — AI-only result with supplementary symptom summary

Priority: High

Steps:

1. Run a screening with a clear dog-skin photo that the review approves.
2. Complete the questionnaire using `Next` (multi-select where offered).
3. On the result screen, inspect every section.

Expected:

- Section `AI PRELIMINARY SCREENING RESULT` shows one `Predicted Condition` card with a single percentage labeled `model confidence` and the note that it is raw on-device output.
- The `Top 3 Predictions` list shows exactly three AI predictions (or fewer when the model returned fewer).
- Section `SYMPTOM SUMMARY · SUPPLEMENTARY` lists the answered questions with their selected option labels, headed `Your questionnaire answers (X of 12)`, and states the answers do not change the AI prediction.
- No `QUESTIONNAIRE-ONLY`, `COMBINED`, `Answer-Only`, or `Adjusted` card exists anywhere on the screen.
- `INDEPENDENT REVIEW` shows the Claude findings card separately.
- The bottom disclaimer says the on-device AI result is the primary prediction and questionnaire answers never modify it.
- The header row reads `One photo · image validation and on-device model`.

Status: NOT TESTED.

### QA-04 — Save persists raw AI values only

Priority: High

Steps:

1. Complete an approved screening and questionnaire.
2. Capture the network request (proxy or backend log) when tapping `Save Result`.
3. After `Saved` appears, open the owner's screening history and the stored record.

Expected:

- The multipart create request contains `image` + `claude_token` and `prediction` equal to the disease shown in the AI card, `confidence` equal to the rounded percentage shown, `model_version`, `inference_time_ms`, `source=DEVICE`, and the optional `symptom_answers` JSON rows.
- No refined, combined, questionnaire-only, or mode fields appear in the request; questionnaire content travels only in the display-only `symptom_answers` field (raw question/answer rows, no personal data).
- The saved history row shows the same disease/confidence as the result screen's AI card.
- Pre-existing historical screenings (including older combined-valued records) remain unchanged and readable.

Status: NOT TESTED.

### QA-05 — Save-and-Book handoff

Priority: High

Steps:

1. From a fresh result, tap `Book an Appointment`.
2. Confirm the booking wizard opens only after the save succeeds.
3. Confirm the wizard carries the pet and the saved screening id (the booking completes and links the screening).
4. In a separate run, block the network and tap `Book an Appointment`.

Expected:

- Save happens once; no duplicate screening is created.
- On save failure the retry message `Couldn't save the screening...` appears and navigation to booking does not happen.

Status: NOT TESTED.

### QA-06 — Questionnaire behavior (adaptive order, back navigation, early stopping)

Priority: Medium

Steps:

1. Complete an approved screening and answer several questions.
2. Tap back from a question and confirm committed answers remain.
3. Finish the questionnaire (early stopping may end it before Q12).

Expected:

- Questions are asked in adaptive order; answers never change what the result screen shows in the AI section.
- Back navigation preserves committed answers.
- Early stopping remains disabled by default (all 12 questions are reachable unless configuration changes).
- The result shows `answeredCount` matching the answers actually given.

Status: NOT TESTED.

### QA-07 — Classifier failure after approval

Priority: Medium

Steps:

1. Simulate an on-device model failure (for example by removing model access in a development build).
2. Run an approved screening.

Expected:

- The result shows `On-device analysis unavailable`; no prediction is fabricated.
- The Independent Review card remains visible.
- Save and Book are unavailable.

Status: NOT TESTED.

### QA-08 — Invalid or malformed result route data

Priority: Medium

Steps:

1. In a development build, open the result route with malformed values such as `predictions={}`, `answers=[1,2]`, and `state=not-a-state`.
2. Confirm the screen renders without an exception.

Expected:

- Malformed JSON values are treated as empty data; the symptom summary section is hidden when no answers exist.
- An unknown screening state falls back to `DISEASE_DETECTED` rendering only when predictions exist.
- `Scan Again` still navigates.

Status: NOT TESTED.

### QA-09 — Accessibility and layout regression

Priority: Medium

Steps:

1. Enable a large system font size and open the result screen.
2. Navigate with TalkBack or VoiceOver.
3. Rotate the device or use a small-screen device.

Expected:

- Text wraps without clipping; Save/Book/Scan Again remain reachable.
- Sections are announced in order (AI result, symptom summary, independent review, disclaimer).

Status: NOT TESTED.

### QA-10 — Details screen shows stored questionnaire answers

Priority: High

Steps:

1. Complete an approved screening with the questionnaire and save it.
2. Open `Screening History`, tap that screening, and scroll past the AI card.
3. Open a pre-existing screening saved before answer storage (or one saved without answers).

Expected:

- The details screen shows `SYMPTOM SUMMARY · SUPPLEMENTARY` with `Your questionnaire answers (X of 12)`, the stored question/answer rows, and the supplementary note — matching the result screen's section.
- The section appears after the cross-analysis card and before the disclaimers.
- A screening without stored answers shows no symptom section at all (no empty card, no placeholder).
- The AI card, cross-analysis, and review sections are unchanged; stored answers never alter them.

Status: NOT TESTED.

## Regression Checklist

- Exactly one photo is captured; quality checks (brightness, variance) and the Claude gate are unchanged.
- At most one `vision-analysis` request is made per run; token verification, hashing, throttling, and timeout handling are unchanged.
- The AI prediction and confidence on screen and in the save payload are byte-identical to the raw classifier output.
- Questionnaire answers never modify the displayed or saved prediction; they reach the backend only as the display-only `symptom_answers` rows.
- Adaptive question ordering and early-stopping evaluation still run (internal only); `test:adaptive` passes.
- The `engine.ts`, `summary.ts`, bayesian refinement code, and their test scripts remain in the repository untouched (cleanup deferred).
- Top-3 AI list, Image Validation card, Independent Review card, state cards, Save/Book/`alreadySaved`/`scanAgain` behavior unchanged.
- Backend contract, migrations, and database history unchanged by this refactor; `ai_screenings` passes 75/75 on a test database built from this working tree (shared-DB drift on the team's Supabase instance noted under Automated Verification).
- No mode-specific results or stopping metadata are sent to the backend; questionnaire answers travel only in the display-only `symptom_answers` field.
- One additive database field was introduced (`symptom_answers` / `AIS_SYMPTOM_ANSWERS`, migration `ai_screenings.0008`, nullable); no other API surface changed and the field stays optional for legacy clients.
- Photos without an approved signed token are never saved.

## Sign-off

Automated logic verification: PASS on October 28, 2026 (tsc clean; 22 mobile tests; bayesian/adaptive/summary suites all pass; backend `ai_screenings` 75/75 on a test database built from this working tree).

Device-level UI verification: PENDING.

Do not mark this feature UI-complete until the high-priority scenarios QA-01 through QA-05 have been executed on a development build or device.
