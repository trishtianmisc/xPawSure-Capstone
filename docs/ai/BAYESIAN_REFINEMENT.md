# Provisional Bayesian Questionnaire Refinement

Status: experimental mobile-only screening refinement. Not a diagnosis and not a validated probability model.

## Purpose

The image model produces five class probabilities. After a screening, the owner answers the 12-question veterinary-informed questionnaire. The refinement engine combines the image probabilities with those answers and returns five screening likelihoods.

The questionnaire is adaptively ordered by default. Early stopping is implemented but disabled by default. This replaces the previous additive score as the active method, but the additive engine remains available as a rollback. The image pipeline, TensorFlow.js model, three-photo flow, quality gates, skin-validity gates, minimum-valid-image rule, and rejection states are unchanged.

## Why this is Bayesian-style rather than a fully calibrated Bayesian model

The questionnaire sources are completed veterinary forms, not paired case data. The vote points in `knowledge.ts` are a screening reference. They are not calibrated likelihoods `P(answer | disease)`.

The provisional engine therefore uses each question's vote points as expert log-evidence. It is a defensible way to preserve the veterinary input and move from unnormalized additive scores to normalized class probabilities. It must not be described as clinically validated.

True likelihoods require either:

1. Veterinarian elicitation: for each question and disease, counts or probabilities for every answer option.
2. Paired labeled cases containing questionnaire answers and confirmed diagnoses.

## Algorithm

For every disease class and answered question:

1. Build a provisional likelihood over the question's answer options:

   `L_c(option) = softmax_over_question_options(vote(option, c) / 20)`

   The softmax is taken across the question's answer options separately for each disease. `20` is the provisional vote-points-per-log-unit scale.

2. Convert the selected option to a log-likelihood:

   `logLikelihood_c = ln(L_c(selected option))`

3. For a multi-select question, average the log-likelihoods of the selected informative options. A selected `unsure` option or an option with no non-zero votes is not informative and is skipped.

4. Questions are grouped when they describe related evidence. The group contribution is the average of its answered questions' log-likelihoods:

   | Group | Questions |
   | --- | --- |
   | 1 | `ear_reflex` |
   | 2 | `circular`, `scaly` |
   | 3 | `spread`, `symmetric`, `location` |
   | 4 | `hot_touch`, `oozing` |
   | 5 | `pustules` |
   | 6 | `thickened` |
   | 7 | `allergy_trigger` |
   | 8 | `onset` |

5. Sum the group contributions to obtain expert log-odds `e_c`, then center them so their mean is zero.

6. Cap the expert contribution:

   `max_c |e_c| <= 2.5`

   If the cap is exceeded, all expert log-odds are scaled down proportionally. This prevents a long questionnaire or all-selected location list from overwhelming the image model.

7. Normalize the five image confidences to `p_c`. If the image vector is zero, use a uniform prior. Zero image probabilities are floored at `1e-9` before taking the log. An empty prediction list is rejected.

8. Compute the posterior:

   `P_c ∝ p_c * exp(e_c)`

9. Normalize the posterior to sum to 1 and expose it to the UI as percentages. Bars therefore represent screening likelihood, not calibrated confidence.

There is no special case for `ear_reflex`. Its influence is class-specific, as encoded in its votes. There is no hard-coded disease override.

## Adaptive Questionnaire Ordering

After each committed answer, the engine recomputes the current posterior and chooses the next unanswered question with the highest discrimination between the current top two classes:

`TV = 1/2 * sum_over_options |P(option | leading) - P(option | runner-up)|`

The existing question likelihoods are used for this ranking. Ties keep the original `KNOWLEDGE` order. Multi-select Q11 uses the option distribution for ranking only; its scoring semantics are unchanged. If the findings are nearly evenly split, no question may be discriminative, but the questionnaire still asks the next unanswered question. It never stops merely because no informative question remains.

Answers are stored by question ID. Back navigation preserves committed answers, and editing re-runs the next-question selection from the updated state. No question is dropped or duplicated.

## Early Stopping

Stopping is evaluated immediately after each committed answer. All four criteria must hold:

| Criterion | Default |
| --- | --- |
| Leading posterior `P1` | `>= 0.85` |
| Top-two margin `P1 - P2` | `>= 0.30` |
| Distinct informative question groups | `>= 2` |
| Consecutive informative updates with the same leader | `>= 2` |

An informative answer is one with at least one selected option carrying a non-zero vote. `unsure`, empty selections, and unanswered questions add no evidence, group credit, or stability update.

Stability is recomputed deterministically from the ordered prefixes of answered questions. When a previous answer is edited, the prefixes after it are recomputed as well.

With five classes, `P1 >= 0.85` mathematically forces `P1 - P2 >= 0.70`. The `0.30` margin therefore never binds at the default leading threshold; it is retained as an independently configurable guard. Tests that exercise the margin must override the leading threshold.

If all 12 questions are answered without meeting the criteria, the questionnaire completes with the best available result and an uncertainty message. There is no separate minimum-question rule beyond the stability requirement. The earliest possible criteria stop is after two informative updates.

## Configuration

`mobile/ai/decisionTree/bayesian.config.ts` contains:

- `REFINEMENT_METHOD`: active method. Current value is `bayesian-provisional-v1`.
- `PROVISIONAL_VOTE_LOG_SCALE`: `20`.
- `MAX_EXPERT_LOG_ODDS`: `2.5`.
- `QUESTION_GROUPS`: the correlated-question groups above.

`mobile/ai/decisionTree/adaptive.config.ts` contains:

- `ADAPTIVE_ORDERING_ENABLED`: `true`.
- `EARLY_STOPPING_ENABLED`: `false`. Early stopping is opt-in until it is evaluated.
- `LEADING_POSTERIOR_THRESHOLD`: `0.85`.
- `MIN_TOP2_MARGIN`: `0.30`.
- `MIN_INFORMATIVE_GROUPS`: `2`.
- `STABILITY_INFORMATIVE_UPDATES`: `2`.

To roll back immediately without touching the questionnaire UI or image pipeline, set:

```ts
export const REFINEMENT_METHOD: RefinementMethod = 'additive'
```

The active method is passed to the result screen. Older result links without a method remain additive-compatible. Additive mode forces both adaptive ordering and early stopping off, restoring the original static question order.

## Integration

`mobile/app/(owner)/pets/screening/adjust.tsx` uses the adaptive helpers to maintain committed answers, the asked-question order, the current cursor, and per-question drafts. It evaluates stopping after every committed answer and passes `stoppingReason`, `answeredCount`, and `totalQuestions` to the result route.

`mobile/app/(owner)/pets/screening/result.tsx` changes labels when the result came from the Bayesian method:

- Top label: `Bayesian Screening Suggestion`
- Metric label: `screening likelihood`
- Breakdown title: `Top 3 Screening Likelihoods`
- Extra disclaimer about experimental questionnaire-adjusted likelihoods
- A stopping notice when criteria were met early, when all 12 questions completed without meeting them, or when early stopping was disabled

The backend still stores the final prediction and confidence only. Questionnaire answers, the refinement method, the stopping reason, and the answer count are not persisted yet, so this implementation does not provide a production evaluation dataset.

## Result Summary

After the questionnaire completes, `buildScreeningSummary` in `mobile/ai/decisionTree/summary.ts` creates three independently parsed modes:

| Mode | Source |
| --- | --- |
| AI only | The original normalized image probabilities |
| Questionnaire only | `refineQuestionnaireOnly` with a uniform image prior |
| Combined | `refinePredictionsBayesian` with the image probabilities and questionnaire evidence |

The modes are never substituted for one another. The result screen hides missing or invalid modes, and appointment booking requires a valid combined result. Legacy result links that do not contain a summary continue to use the additive breakdown.

The questionnaire-only mode returns `null` when no informative answer exists, so the UI can hide that card instead of showing a uniform distribution as a result. Answer review always follows the canonical order of all 12 questions in `KNOWLEDGE`, including unanswered and not-asked questions. Q11 remains a multi-select question.

The combined result is also the only result that can reveal the optional mock home-care card, and only when `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE` is enabled. That content is explicitly marked `DEMO / MOCK CONTENT` and is not a treatment plan.

## Limitations

- Vote points and the `20` scale are expert-informed assumptions, not calibrated probabilities.
- Question grouping is a modeling assumption.
- The cap is a safety constraint, not a statistical calibration result.
- Adaptive ordering and the stopping thresholds are heuristic design choices, not validated clinical decision rules.
- Early stopping is disabled by default pending evaluation. Enabling it does not make the result diagnostic.
- No paired labeled questionnaire cases are available; accuracy improvement and stopping safety are unproven.
- Only the final prediction/confidence is persisted; the method, answers, and stopping metadata are lost after the result screen.
- The underlying image model's file-split `93.71%` result is not leakage-free and is not an accuracy claim for this combined flow.
- The result is a screening suggestion and must continue to direct users to veterinary confirmation.

## Evaluation Plan

When paired data or elicited likelihoods exist, compare the same held-out cases under:

1. CNN-only prior.
2. Current additive refinement.
3. Provisional Bayesian refinement with the static 12-question order.
4. Bayesian refinement with adaptive ordering and all 12 questions.
5. Bayesian refinement with adaptive ordering and early stopping enabled.

Report top-1 accuracy with confidence intervals, per-class recall, confusion matrices, calibration/ECE, the rate at which each method changes a correct top-1 result, and the stop rate/answer count for adaptive variants. Use grouped splits so near-duplicate images cannot cross train and evaluation sets.

Until that evaluation exists, the Bayesian result must remain labeled experimental.

## Tests

Run from `mobile/`:

```powershell
npx tsc --noEmit
npm run test:screening
npm run test:bayesian
npm run test:adaptive
npm run test:summary
npm run test:result-view
```

`test:bayesian` covers:

- No-answer behavior equals the normalized CNN prior.
- `unsure` answers are non-informative.
- Ear-reflex answers move the expected classes in the expected direction.
- Posterior probabilities normalize to 1.
- All-location and saturated questionnaires stay within the expert cap.
- A questionnaire answer can change the top class.
- Additive fallback still works.
- Empty predictions are rejected.
- Every knowledge question belongs to a configured group.

`test:adaptive` covers:

- Adaptive and early-stopping mode resolution, including additive overrides.
- Earliest criteria stop with two informative updates and two groups.
- High posterior alone does not stop before enough groups or updates.
- One-group evidence does not stop.
- Margin criterion failure with overridden thresholds.
- Leader instability prevents stopping.
- `unsure` adds no evidence, group credit, or stability.
- All-12 completion without criteria returns an uncertainty fallback.
- Early stopping disabled does not stop early.
- Static ordering in additive/static modes.
- Adaptive selection favors a more discriminative question and excludes asked questions.
- No informative question remaining still selects the next unanswered question.
- Answer editing preserves history, updates the answer, and does not duplicate the question.

`test:summary` covers:

- Canonical answer review for all 12 questions, including unanswered and not-asked rows.
- Q11 multi-select answers remain valid.
- Questionnaire-only mode returns `null` without informative answers and uses a uniform prior otherwise.
- AI-only, questionnaire-only, and combined payloads remain independent.
- Malformed or missing summary data is rejected defensively.
- Invalid modes prevent booking.

`test:result-view` covers:

- Summary-mode rendering selects only valid modes.
- Legacy payloads fall back to the additive breakdown.
- Missing or invalid combined results disable booking.
- Mock home care is limited to detected results with a valid combined result and the feature flag.
- Malformed route predictions, image reports, and states are ignored or normalized without throwing.
- Mode payloads are parsed and validated independently.
