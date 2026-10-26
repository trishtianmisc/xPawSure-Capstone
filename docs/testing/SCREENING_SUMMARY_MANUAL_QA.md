# Screening Summary Manual QA

Status: Automated logic checks pass. Manual UI verification is IN PROGRESS.

Last automated run: October 26, 2026.

Scope:

- Three-photo capture guide (main area, wider view, additional angle)
- Three-photo result thumbnails from durable copies and image-load fallback
- Claude image safety review gate (all three photos must pass quality, review, and similarity; at most three requests including retries)
- Adaptive 12-question questionnaire
- AI-only, questionnaire-only, and combined screening summaries
- Canonical answer review
- Booking gating
- Optional mock home care

This checklist is for the project's normal Expo development setup on an Android or iOS device. Use Expo Go only if the current native dependencies load there; otherwise use the project development build. Automated checks do not replace device testing of camera, gallery, storage, modal presentation, accessibility, or layout.

## Automated Verification

Run from `mobile/`:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS — exit 0, no diagnostics |
| `npm run test:claude` | PASS — `claude validation logic tests passed` |
| `npm run test:screening` | PASS — `screening logic tests passed` |
| `npm run test:bayesian` | PASS — `Bayesian refinement tests passed` |
| `npm run test:adaptive` | PASS — `Adaptive questionnaire tests passed` |
| `npm run test:summary` | PASS — `summary logic tests passed` |
| `npm run test:result-view` | PASS — `result view logic tests passed` |

Jest and React Native Testing Library are not configured, so there are no component tests for the guide, result cards, camera flow, or screen layout.

## Prerequisites

1. From `mobile/`, launch the project's normal Expo development setup on a device with camera and photo-library access.
2. Sign in as an owner with at least one pet.
3. Backend access is required for every screening run (the image safety review) and for the save-and-book path. Real review calls need a valid `ANTHROPIC_API_KEY` in the backend `.env`; without it, photos report `validation_error`.
4. Know how to reset the guide key for the platform:
   - Android: clear app storage, then sign in again.
   - iOS: delete and reinstall the app, then sign in again.
   - Web: open DevTools, go to Application > Local Storage, and remove `xpawsure_screening_guide_seen_v2`.
5. For mock home care, set `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE=true` before starting Expo.

## Manual Scenarios

### QA-01 — First-visit photo guide

Priority: High

Steps:

1. Remove `xpawsure_screening_guide_seen_v2` or clear app storage.
2. Sign in and open a pet's skin screening screen.
3. Confirm the photo guide opens automatically.
4. Read the five numbered steps and the photo-taking tips.
5. Dismiss the guide with `Got it`.
6. Go back and reopen the screening screen.
7. Confirm the guide does not open automatically again.
8. Tap the help icon in the header and confirm the guide reopens.
9. Dismiss it with the close button.

Expected:

- The guide explains the three slots (main affected area, wider view, additional angle), camera/gallery uploads, on-device quality checks, the AI safety review, and the all-three-photos-must-pass rule.
- The guide is scrollable and fully readable on a small screen.
- Dismissal closes it immediately.
- The help icon reopens it on demand.
- No camera, pet selection, or screening action is blocked after dismissal.

Status: NOT TESTED.

### QA-02 — Guide storage failure

Priority: Medium

Steps:

1. In a development build, temporarily make the storage helper's `getItem` and `setItem` reject or throw.
2. Open the screening screen.
3. Confirm the screen remains usable and the guide can be dismissed even though the seen flag cannot be saved.
4. Restore the storage helper.

Expected:

- A guide-storage failure does not block pet selection, photo capture, or screening.
- The guide may appear again on a later launch when the flag cannot be persisted.
- There is no crash or unhandled rejection.

Status: NOT TESTED. The code path catches storage read and write failures; fault injection has not been performed on a device.

### QA-03 — Three-slot capture and quality gates

Priority: High

Steps:

1. Select a pet.
2. Tap `Take Photo` and capture a well-lit close-up of the affected skin area.
3. Confirm the photo fills slot 1 (`Main area`) and the next empty slot becomes active.
4. Use `Gallery` to fill the remaining two slots (`Wider view`, `Additional area`) with clear, varied close-ups.
5. Run screening and wait for analysis.
6. Repeat with one intentionally invalid image, such as a face or background photo.
7. Repeat with all three slots filled with invalid images.

Expected:

- Three photos are required before `Run Screening` is available.
- Each slot shows its caption (`Main area`, `Wider view`, `Additional area`).
- Camera and gallery both fill the active slot.
- Tapping a filled slot and choosing a new source replaces that photo.
- With all three photos valid and approved, screening continues and the result reports three photos used.
- With fewer than three valid photos, screening is blocked with the retake message for blurry, too dark, or unclear photos, or with the AI-safety-review message when the review rejects a photo.
- The counters read `Capture 1/3`, `Capture 2/3`, `Capture 3/3` as slots fill.

Status: PARTIAL — the last device run used the previous five-photo flow (five slots, `3/5 photos used`, two not-skin badges with at least three valid photos continuing). The three-slot flow, its all-photos-must-pass gate, the quality-rejection message, and slot replacement are not yet exercised on a device.

### QA-04 — Questionnaire and answer review

Priority: High

Steps:

1. Complete a valid three-photo screening.
2. Answer the questionnaire using `Next`.
3. On Q11, select multiple locations and confirm all selections remain selected.
4. Continue until the result screen.
5. Scroll to `Your answers`.
6. Confirm the review shows Q1 through Q12 in standard order.
7. Confirm answered, not-answered, and not-asked labels are clear.
8. Confirm the Q11 row shows all selected locations.

Expected:

- The questionnaire retains committed answers when navigating back.
- Q11 remains multi-select.
- Exactly 12 canonical review rows appear.
- The review does not reorder questions to the adaptive asking order.
- Answered values are readable and invalid or missing answers are labeled.

Status: PARTIAL — device screenshots showed all 12 questions in canonical order, `12 of 12 answered`, and Q11 retained four selected locations. The not-answered and not-asked label variants were not exercised.

### QA-05 — Independent result modes

Priority: High

Steps:

1. Complete photos and the questionnaire with informative answers.
2. Inspect the `Screening views` section.
3. Compare the photo-only, questionnaire-only, and combined cards.
4. Confirm each card uses its own confidence label and does not repeat another card's percentages.
5. Confirm the combined card is marked provisional or experimental.
6. Confirm the disclaimer is visible near the bottom of the result.

Expected:

- All three modes are shown independently when valid.
- Photo-only is labeled as photo-only.
- Questionnaire-only is labeled as preliminary and uncalibrated.
- Combined is labeled combined and provisional.
- No mode is silently substituted for another.
- The result is described as a screening suggestion, not a diagnosis.

Status: PASS — device screenshots show independent photo-only, questionnaire-only, and combined cards with the correct labels, percentages, and disclaimer. A later run showed all three cards independently topping Fungal (photo-only 81%, questionnaire-only 66%, combined 97%) while keeping separate labels and calculations.

### QA-06 — Questionnaire-only unavailable

Priority: Medium

Steps:

1. Complete the questionnaire with no informative answers, using `Unsure` wherever available.
2. Open the result screen.
3. Locate the questionnaire-only section.

Expected:

- `No informative questionnaire result is available.` is shown instead of a uniform 20% result.
- The photo-only and combined cards remain independent.
- A uniform questionnaire-only distribution is never presented as a result.

Status: NOT TESTED.

### QA-07 — Booking gate

Priority: High

Steps:

1. Complete a valid screening and questionnaire with a combined result.
2. Confirm `Book Appointment` is visible.
3. Open a result route with a non-empty summary whose `combined` field is missing or invalid, using a test fixture or temporary development route.
4. Confirm booking is hidden and the combined-unavailable message is shown.
5. With backend access available, tap `Book Appointment` on a valid result and confirm the screening saves before the booking screen opens.

Expected:

- Booking is available only with a valid combined result.
- A missing or invalid combined result shows the unavailable message.
- Saved screening data uses the combined top prediction.
- Save failure shows the retry message and does not navigate to booking.

Status: PARTIAL — `Book Appointment` was visible on a valid combined result. The save-and-book transition and failure path were not exercised.

### QA-08 — Optional mock home care

Priority: Medium

Steps:

1. Start Expo with `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE` unset or `false`.
2. Complete a valid summary result and confirm no home-care card appears.
3. Restart with `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE=true`.
4. Complete a valid summary result and inspect the home-care card.
5. Confirm the card is absent when the combined result is invalid.

Expected:

- The card is hidden by default.
- When enabled, the card is marked `DEMO / MOCK CONTENT`.
- The card never appears for a missing or invalid combined result.
- The copy does not present mock guidance as a treatment plan or diagnosis.

Status: NOT TESTED.

### QA-09 — Legacy result fallback

Priority: Medium

Steps:

1. Open a result route that has no `summary` parameter, or use an older screening history entry.
2. Confirm the legacy top prediction and breakdown still render.
3. Confirm the app does not crash or show empty summary cards.
4. Confirm booking remains available for a valid detected result, consistent with the previous behavior.

Expected:

- Legacy results use the existing prediction breakdown.
- Malformed non-empty summary data shows a load warning and does not enable booking.
- Default new screening results use the summary view.

Status: NOT TESTED.

### QA-10 — Accessibility and layout regression

Priority: Medium

Steps:

1. Enable a large system font size.
2. Open the guide and result screen.
3. Navigate with TalkBack or VoiceOver.
4. Confirm the help button is announced as `Open photo guide`.
5. Confirm the close and `Got it` controls are reachable and announced.
6. Rotate the device or use a small-screen device.

Expected:

- Text wraps without clipping.
- The guide remains scrollable with the action button reachable.
- The help, close, and dismiss controls have accessible roles and labels.
- No essential content is hidden behind the status bar or safe area.

Status: NOT TESTED.

### QA-11 — Invalid result route data

Priority: Medium

Steps:

1. In a development build, open a result route with malformed values such as `predictions={}`, `refined=null`, `imageReports=[null]`, and `state=not-a-state`.
2. Confirm the screen renders without an exception.
3. Confirm invalid cards are absent and booking is unavailable.
4. Tap `Scan Again` and confirm navigation still works.

Expected:

- Malformed JSON values are treated as empty data.
- An unknown screening state falls back to the invalid-image state.
- Partial image-report data is ignored rather than crashing rejection summaries.
- The screen retains its normal error/information layout.

Status: NOT TESTED. Route parsing is covered by automated logic tests; full screen rendering during a malformed deep link is not device-tested.

### QA-12 - Result thumbnail rendering and fallback

Priority: Medium

Steps:

1. Complete a valid three-photo screening and finish the questionnaire.
2. On the result screen, confirm all three thumbnail slots show durable copies derived from the original captures.
3. Confirm all three quality-status badges remain visible beside the thumbnails.
4. Open a test result route with an unreadable or nonexistent thumbnail URI.
5. Confirm that slot shows a neutral photo placeholder instead of a black tile.
6. Confirm the app does not loop, crash, or repeatedly update the fallback state.

Expected:

- Result thumbnails use durable copies, not temporary picker or prepared-image URIs.
- All three thumbnails render when their durable copies remain available.
- An unreadable image shows a neutral photo icon and keeps the correct status badge.
- No thumbnail-load failure triggers repeated state updates or affected result calculations.
- Prepared images remain unchanged for inference and quality checks.

Status: PASS (previous five-photo flow) — after durable document-directory thumbnails were added, a device run rendered all five result thumbnails, including two rejected non-dog photos; the rejected slots kept their red X badges and no neutral placeholders appeared. The earlier failures (all five placeholders, and before that one rendered and four black) are resolved. Three-thumbnail rendering uses the same code path but needs a spot-check.

### QA-13 - Claude review approves the screening path

Priority: High

Steps:

1. Confirm the backend `.env` has a working `ANTHROPIC_API_KEY`.
2. Complete a valid three-photo screening with clear dog-skin close-ups.
3. Tap `Run Screening` and wait for the analysis overlay.
4. Finish the questionnaire and reach the result screen.
5. Save the screening (auto-save or Save & Book).

Expected:

- The overlay hint reads `Quality checks, AI safety review, and analysis — usually under a minute`.
- All three quality-passing photos are sent to `POST /api/owner/screenings/vision-analysis/` (verify backend logs: three calls, no more).
- Approved slots report `ok`/similarity badges as before; screening proceeds to inference and all three result cards appear unchanged.
- The saved screening succeeds; the multipart create request carries `image` + `claude_token` for the first approved photo.
- No questionnaire answers other than the existing payload fields are sent.

Status: NOT RUN on device — the backend endpoint was smoke-tested once via a direct shell call on October 26, 2026 (`status: OK`, model `claude-sonnet-4-6` available, about 10 s latency; a synthetic flat image returned `NOT_DOG_SKIN`/`NOT_ELIGIBLE`). The full device flow with the real key now present in the backend `.env` is still pending.

### QA-14 - Blocked screening when fewer than three photos are approved

Priority: High

Steps:

1. Run a screening where one of the three photos is rejected by the AI safety review (for example a non-dog photo the review rejects), so fewer than three photos are approved.
2. Run a separate screening where one photo fails the image quality checks (blurry, too dark, or unclear), so only two photos reach the review.
3. Wait for each run to finish.

Expected:

- Both runs end `INVALID_IMAGE` with no disease prediction, probabilities, or result cards.
- The review-rejection run shows `All 3 photos must be approved by the AI safety review before screening can continue. Please replace the rejected photo(s), then start a new screening.`
- The quality-shortfall run shows `All 3 photos must pass the image quality checks before screening can continue. Please retake the photo(s) that are blurry, too dark, or unclear.`
- No `createScreening` request is sent (nothing is saved).

Status: NOT RUN — device testing pending; both message branches are covered by `npm run test:claude`.

### QA-15 - Session budget and photo replacement

Priority: Medium

Steps:

1. Start a screening session and complete a first run with all three photos (three review calls, session budget spent).
2. Go back to capture and replace photo 1 in the same session.
3. Run screening again and confirm no fourth review call appears in the backend log.
4. Confirm the replacement photo reports `not_validated` ("not AI-validated in this screening session") and the run is blocked with the AI-review-limit message; nothing is saved.
5. Leave the screen and start a new screening session; confirm the budget is restored (three new calls are made for the next run).

Expected:

- A session never spends more than three review requests, retries included.
- An exhausted budget reports a replaced photo as `not_validated` and requires a new screening; it never blocks reuse of already-approved photos' cached decisions in the same run.
- Review failures show `validation_error` copy ("could not complete the AI safety review") and are never shown as approved.

Status: NOT RUN — device testing pending; budget logic is covered by `npm run test:claude`.

## Regression Checklist

- Three photos are required by the capture screen, and all three must pass quality, AI review, and similarity.
- Result thumbnails use durable copies derived from the original captures; prepared inference URIs are unchanged.
- A failed thumbnail load shows a neutral placeholder rather than a black tile.
- Existing quality and not-skin rejection messages are unchanged.
- Minimum valid images remains three.
- Screening auto-save and the save-and-book retry path remain functional.
- Questionnaire back navigation preserves answers.
- Early stopping remains disabled by default.
- Q11 wording and multi-select behavior are unchanged.
- The JSON (image-less) create path and screening persistence are unchanged.
- No questionnaire answers, mode-specific results, or stopping metadata are sent to the backend.
- The only new API surface is `POST /api/owner/screenings/vision-analysis/`; there is no new database field or migration.
- A screening run spends at most three review requests, retries included.
- Photos without an approved signed token are never saved.

## Sign-off

Automated logic verification: PASS on October 25, 2026.

Device-level UI verification: IN PROGRESS.

Do not mark this feature UI-complete until the remaining high-priority scenarios have been executed on a development build or device, including QA-01, QA-03's remaining invalid/quality cases, QA-04's label variants, QA-07, and the review-gate scenarios QA-13 through QA-15. QA-12 passed after the durable-thumbnail change on October 24, 2026 (previous five-photo flow; see its status note). The three-photo flow, the guide key bump to `xpawsure_screening_guide_seen_v2`, and the two new block messages in QA-14 were added on October 26, 2026.
