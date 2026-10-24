# Screening Summary Manual QA

Status: Automated logic checks pass. Manual UI verification is IN PROGRESS.

Last automated run: October 24, 2026.

Scope:

- Five-photo capture guide
- Five-photo result thumbnails from durable copies and image-load fallback
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
| `npm run test:screening` | PASS — `screening logic tests passed` |
| `npm run test:bayesian` | PASS — `Bayesian refinement tests passed` |
| `npm run test:adaptive` | PASS — `Adaptive questionnaire tests passed` |
| `npm run test:summary` | PASS — `summary logic tests passed` |
| `npm run test:result-view` | PASS — `result view logic tests passed` |

Jest and React Native Testing Library are not configured, so there are no component tests for the guide, result cards, camera flow, or screen layout.

## Prerequisites

1. From `mobile/`, launch the project's normal Expo development setup on a device with camera and photo-library access.
2. Sign in as an owner with at least one pet.
3. Backend access is required only for the save-and-book path.
4. Know how to reset the guide key for the platform:
   - Android: clear app storage, then sign in again.
   - iOS: delete and reinstall the app, then sign in again.
   - Web: open DevTools, go to Application > Local Storage, and remove `xpawsure_screening_guide_seen_v1`.
5. For mock home care, set `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE=true` before starting Expo.

## Manual Scenarios

### QA-01 — First-visit photo guide

Priority: High

Steps:

1. Remove `xpawsure_screening_guide_seen_v1` or clear app storage.
2. Sign in and open a pet's skin screening screen.
3. Confirm the photo guide opens automatically.
4. Read the three numbered steps and the quality tips.
5. Dismiss the guide with `Got it`.
6. Go back and reopen the screening screen.
7. Confirm the guide does not open automatically again.
8. Tap the help icon in the header and confirm the guide reopens.
9. Dismiss it with the close button.

Expected:

- The guide explains camera/gallery uploads, all five slots, on-device quality checks, the minimum of three valid photos, and retaking rejected photos.
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

### QA-03 — Five-slot capture and quality gates

Priority: High

Steps:

1. Select a pet.
2. Tap `Take Photo` and capture a well-lit close-up of the affected skin area.
3. Confirm the photo fills slot 1 and the next empty slot becomes active.
4. Use `Gallery` to fill the remaining four slots with clear, varied close-ups.
5. Run screening and wait for analysis.
6. Repeat with one or two intentionally invalid images, such as a face or background photo.
7. Repeat with three or more invalid images.

Expected:

- Five photos are required before `Run Screening` is available.
- Camera and gallery both fill the active slot.
- Tapping a filled slot and choosing a new source replaces that photo.
- With at least three valid photos, screening continues and the result reports how many photos were used.
- With fewer than three valid photos, screening returns the not-skin state and the retake guidance.
- Poor-quality images show the appropriate rejection message.

Status: PARTIAL — a device run with five photos (three valid dog-skin close-ups and two selfie photos) reported `3/5 photos used` and showed `2 photos did not look like dog skin.` with per-slot red X badges; with at least three valid photos screening continued. The fewer-than-three-photo, quality-rejection, and slot-replacement paths were not exercised.

### QA-04 — Questionnaire and answer review

Priority: High

Steps:

1. Complete a valid five-photo screening.
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

1. Complete a valid five-photo screening and finish the questionnaire.
2. On the result screen, confirm all five thumbnail slots show durable copies derived from the original captures.
3. Confirm all five quality-status badges remain visible beside the thumbnails.
4. Open a test result route with an unreadable or nonexistent thumbnail URI.
5. Confirm that slot shows a neutral photo placeholder instead of a black tile.
6. Confirm the app does not loop, crash, or repeatedly update the fallback state.

Expected:

- Result thumbnails use durable copies, not temporary picker or prepared-image URIs.
- All five thumbnails render when their durable copies remain available.
- An unreadable image shows a neutral photo icon and keeps the correct status badge.
- No thumbnail-load failure triggers repeated state updates or affected result calculations.
- Prepared images remain unchanged for inference and quality checks.

Status: PASS — after durable document-directory thumbnails were added, a device run rendered all five result thumbnails, including two rejected non-dog photos; the rejected slots kept their red X badges and no neutral placeholders appeared. The earlier failures (all five placeholders, and before that one rendered and four black) are resolved.

## Regression Checklist

- Five photos are still required by the capture screen.
- Result thumbnails use durable copies derived from the original captures; prepared inference URIs are unchanged.
- A failed thumbnail load shows a neutral placeholder rather than a black tile.
- Existing quality and not-skin rejection messages are unchanged.
- Minimum valid images remains three.
- Screening auto-save and the save-and-book retry path remain functional.
- Questionnaire back navigation preserves answers.
- Early stopping remains disabled by default.
- Q11 wording and multi-select behavior are unchanged.
- The backend request shape and screening persistence are unchanged.
- No questionnaire answers, mode-specific results, or stopping metadata are sent to the backend.
- No new API endpoint, database field, or migration is required.

## Sign-off

Automated logic verification: PASS on October 24, 2026.

Device-level UI verification: IN PROGRESS.

Do not mark this feature UI-complete until the remaining high-priority scenarios have been executed on a development build or device, including QA-01, QA-03's remaining invalid/quality cases, QA-04's label variants, and QA-07. QA-12 passed after the durable-thumbnail change on October 24, 2026.
