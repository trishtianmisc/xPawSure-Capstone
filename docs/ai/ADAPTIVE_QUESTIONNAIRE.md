# Adaptive Follow-up Questionnaire

> Version: 1.0  
> Project: XPawSure  
> Status: **Experimental — not clinically validated**  
> Last updated: 2026-10-21  
> Scope: Mobile canine skin screening (owner app)

---

# 1. Purpose

This document describes the adaptive follow-up questionnaire that replaces the
fixed-order question sequence for canine skin screening on mobile.

The questionnaire selects the next question by expected information gain and
updates a relative evidence distribution with Bayes' theorem. It is intended to:

- ask fewer, more informative questions;
- show how each answer contributed;
- preserve the original image-model output separately;
- return **Unable to Determine** when the evidence is weak or conflicting.

It does **not** provide a diagnosis and does **not** produce calibrated
probabilities.

---

# 2. What Was Deliberately Preserved

The following components were not changed:

- EfficientNetB0 inference, topology, weights, and model version (`2.0.0`);
- the 224×224×3 input pipeline;
- the five screening classes;
- every existing question, option, label, and vet-consensus vote in
  `mobile/ai/decisionTree/knowledge.ts`;
- the existing image state thresholds:
  - feature similarity ≥ `0.30` → `DISEASE_DETECTED`;
  - feature similarity < `0.10` → `NOT_SKIN_IMAGE`;
  - otherwise → `UNCERTAIN`;
- the backend screening API and database contract;
- the existing rule-based `refinePredictions` path as a fallback.

No model retraining or replacement was performed.

---

# 3. Architecture

All adaptive logic is on-device TypeScript under `mobile/ai/adaptive/`.

| File | Responsibility |
| --- | --- |
| `types.ts` | Shared types, fixed disease order, profile validation metadata |
| `config.ts` | Operational thresholds, profile metadata, heuristic groups |
| `math.ts` | Normalisation, entropy, Bayes update, expected information gain |
| `likelihoods.ts` | Likelihood-profile construction and answer likelihoods |
| `redundancy.ts` | Correlation and image-coupling weights |
| `selector.ts` | Strategy resolution and information-gain question selection |
| `session.ts` | Session lifecycle, answer updates, stopping, serialisation |
| `sessionStorage.ts` | Best-effort AsyncStorage persistence |
| `index.ts` | Public exports |

The UI integration lives in:

- `mobile/app/(owner)/pets/screening/adjust.tsx`
- `mobile/app/(owner)/pets/screening/result.tsx`

The original decision tree files remain unchanged:

- `mobile/ai/decisionTree/knowledge.ts`
- `mobile/ai/decisionTree/engine.ts`

---

# 4. Prior Construction

The raw image output is kept in `imagePredictions` and `imageDistribution`.
Neither is modified by questionnaire answers.

The first prior is a smoothed version of the image distribution:

```text
imageDistribution(c) = imageConfidence(c) / 100
prior(c)              = (imageDistribution(c) + priorSmoothing) / normaliser
```

`priorSmoothing = 0.01` is a numerical and over-confidence guard, **not a
calibration procedure**. The raw image distribution remains available for
display and comparison.

Raw EfficientNetB0 softmax output is **not** treated as a calibrated
probability. The UI labels it as the preliminary image output.

---

# 5. Likelihood Profile

## 5.1 Source

The built-in profile is an explicit transformation of the existing ordinal
vet-consensus vote weights in `mobile/ai/decisionTree/knowledge.ts`. Those
weights came from two veterinarian symptom-verification questionnaires
(2026-09-14 and 2026-09-19).

The repository does **not** contain symptom likelihoods, patient-level data, or
a vet-confirmed answer dataset. The profile is therefore labelled:

```text
validation: unvalidated_expert_heuristic
profile id: vet-vote-exp-v1
```

## 5.2 Vote-to-log-odds Mapping

For a vote `v` and the maximum absolute vote `30`:

```text
logit(v) = (v / 30) * ln(4)
```

The `|v| = 30` cap corresponds to at most 4:1 evidence. This is an explicit
heuristic mapping, not a fitted or calibrated model.

## 5.3 Single-choice Questions

For each condition, the informative options are softmax-normalised:

```text
P(option_i | condition) = exp(logit_i) / sum_j exp(logit_j)
```

Options with no vet-consensus votes for any condition (for example
`"Not sure"`) are marked `neutralOptions`. A neutral answer has likelihood `1`
for every condition, so it cannot change the posterior. Neutral options are
excluded from expected-information-gain calculations because they carry zero
information and the repository contains no measured "Not sure" response rate.

## 5.4 Multi-select Questions

Each option is a positive-only Bernoulli observation:

```text
p_o(c)          = sigmoid((vote_o,c / 30) * ln(4))
P(selected_o|c) = p_o(c) / (1 + p_o(c))
P(absent_o|c)   = 1 / (1 + p_o(c))
```

For an answer subset, the per-option factors are multiplied. Unselected options
therefore contribute weak evidence, not a hard negative symptom. The product
over all subsets is a proper distribution.

Enumeration is capped at `12` options (`2^12` subsets). Above the cap, the
selector averages per-option information gains and explicitly treats that value
as an approximation.

## 5.5 Correlation and Image Coupling

Two configurable heuristics reduce double counting:

- **Redundancy:** the first answer in an evidence group has weight `1`; later
  answers decay by `0.7`, with a minimum of `0.4`.
- **Image coupling:** questions describing signs already visible in the image
  use weight `0.8`.

These weights are expert heuristics. No joint image-questionnaire calibration
data exists.

---

# 6. Information-Gain Selection

For the current posterior `P` and a candidate question `Q`:

```text
IG(Q) = H(P) - sum_a P(a) * H(P(condition | a))
```

where `H` is Shannon entropy in bits and `P(a)` is the predictive probability of
answer `a` under the current profile.

Selection rules:

1. Exclude answered, inapplicable, and structurally unusable questions.
2. Apply the same redundancy and image-coupling weights that will be used for
   the real update.
3. Pick the highest expected information gain.
4. Break exact ties by original `KNOWLEDGE.questions` order, then question id.
5. Stop when the best gain is below `minExpectedInformationGain` (`0.02` bits)
   or the maximum of `12` questions is reached.

`0.02` bits is a numerical/product floor, not a validated clinical stopping
point.

## 6.1 Strategy Resolution

| Mode | Profile | Strategy |
| --- | --- | --- |
| `adaptive` | any available profile | `information_gain` |
| `auto` | `validation: validated` | `information_gain` |
| `auto` | unvalidated or missing | `fixed_order` |
| `rule_based` | any | `fixed_order` |

The app currently runs `mode: 'adaptive'` with the unvalidated built-in profile,
so the UI must show the experimental notice. Switching to `auto` restores the
fixed order until a validated profile is supplied.

---

# 7. Bayesian Update

After an answer:

```text
P(condition | answer) ∝ P(answer | condition) * P(condition)
```

The update is computed in log space with a probability floor (`1e-9`) to avoid
`log(0)` and underflow. A likelihood vector that is constant across conditions
is short-circuited: it cannot change the posterior.

Important behaviours:

- `"Not sure"` and other neutral options leave the posterior unchanged.
- Missing answers are never treated as negative symptoms; unanswered questions
  contribute no likelihood.
- Multi-select absence contributes only the weak positive-only Bernoulli term.
- The original image output is never overwritten.

---

# 8. Stopping and Outcome

Operational defaults (all unvalidated):

| Parameter | Value | Purpose |
| --- | --- | --- |
| `uncertaintyTopProbability` | `0.45` | Minimum top posterior |
| `uncertaintyMargin` | `0.10` | Minimum top-two margin |
| `uncertaintyEntropy` | `1.5` bits | Maximum posterior entropy |
| `maxQuestions` | `12` | Preserves the existing ceiling |
| `minExpectedInformationGain` | `0.02` bits | Numerical/product floor |

Outcome rules:

- **Zero answered questions:** preserve the existing image-only result and mark
  `outcomeBasis: 'image_only'`. The questionnaire does not claim credit for it.
- **Top probability below threshold or entropy too high:**
  `UNCERTAIN` / `insufficient_evidence`.
- **Top-two margin too small:** `UNCERTAIN` / `conflicting_evidence`.
- **Otherwise:** `DISEASE_DETECTED` with `outcomeBasis: 'adaptive'`.

A label is never forced when evidence is weak or conflicting. The UI shows
**Unable to Determine** and does not auto-save a screening for an uncertain
adaptive outcome.

The session records:

```text
stoppingRuleId: operational-defaults-v1
stoppingRuleValidation: unvalidated_operational
```

---

# 9. Session State and Persistence

`AdaptiveSession` (`schemaVersion: 1`) contains:

- immutable `imagePredictions` and `imageDistribution`;
- `prior` and current `posterior`;
- `answers` and per-answer metadata;
- `currentQuestionId`, `questionCount`, stopping reason, and outcome;
- profile and stopping-rule validation metadata.

The session key is a stable FNV-1a hash of pet id, model version, and rounded
image predictions. A different image screening produces a different key.

Persistence uses AsyncStorage under:

```text
xpawsure_adaptive_questionnaire_session_v1
```

On load:

- a matching, structurally valid session resumes;
- a mismatched key, corrupt JSON, invalid distribution, or incompatible
  strategy/profile is discarded;
- no backend schema or API change is required.

The UI keeps an in-memory history of previous session snapshots so the Back
button can return to an earlier question and change the answer. The engine
itself rejects re-answering an already answered question.

The full posterior is **not** persisted server-side. The backend continues to
receive only the final disease label and an integer in its existing
`confidence` field.

---

# 10. UI Behaviour

## Questionnaire screen (`adjust.tsx`)

- creates or resumes the on-device session;
- displays the experimental notice when the profile is unvalidated;
- shows the information-gain-selected question;
- saves each answer and advances;
- restores previous snapshots on Back;
- auto-saves only when the adaptive outcome is `DISEASE_DETECTED`;
- passes a compact adaptive payload to the result screen.

The fixed-order fallback still uses the original `refinePredictions` result and
the existing `refined`/`changed` route parameters.

## Result screen (`result.tsx`)

For an adaptive questionnaire result:

- the posterior is labelled **relative evidence score**, not confidence;
- the screen states that the score is **not a calibrated probability**;
- the original image output is shown in a separate **Preliminary Image Output**
  card;
- the follow-up questions and selected answers are shown as an evidence summary;
- an uncertain adaptive outcome shows **Unable to Determine** and offers no
  booking/save-as-disease action;
- the experimental notice is shown again.

The existing image-only, fixed-order, not-skin-image, and invalid-image paths
remain available.

### Backend confidence-field caveat

When an adaptive result is saved, the existing backend `confidence` field
receives the relative evidence score. The API contract was not changed. This
field must not be interpreted as a calibrated probability for adaptive results.

---

# 11. Validation Status

## 11.1 What Is Validated

Only software behaviour is covered by automated tests:

- probability normalisation and numerical stability;
- neutral answers leave the posterior unchanged;
- Bayes updates move scores in the expected direction;
- information gain selects stronger questions and breaks ties deterministically;
- answered, inapplicable, and unusable questions are excluded;
- redundancy and image-coupling weights are applied;
- max-question and no-meaningful-question stopping;
- uncertain and conflicting outcomes;
- serialisation round-trip and corrupt-state rejection;
- original image output preservation;
- result-payload construction;
- the existing rule-based fallback.

## 11.2 What Is Not Validated

The following are **not** clinically or statistically validated:

- the vet-vote likelihood profile;
- the vote-to-log-odds mapping;
- the `0.02`-bit information-gain floor;
- the `0.45` / `0.10` / `1.5`-bit uncertainty thresholds;
- the redundancy decay and image-coupling weights;
- any claimed accuracy improvement over the fixed questionnaire;
- calibration of EfficientNetB0 softmax outputs;
- calibration of the adaptive posterior.

No prospective study, held-out likelihood fitting, or vet adjudication of
questionnaire answers exists in the repository. The profile is explicitly
marked `unvalidated_expert_heuristic` and the stopping rule
`unvalidated_operational`.

Do not change either label to `validated` without the protocol below.

---

# 12. Validation Protocol (Required Before Clinical Claims)

1. **Define the reference standard.** Use an independent veterinarian diagnosis
   as the target, with a documented adjudication process for disagreements.
2. **Collect prospective cases.** Capture image, questionnaire answers, model
   version, profile version, and final diagnosis. Include uncertain and
   non-skin cases.
3. **Fit on a training split only.** Estimate likelihoods or a calibrated
   mapping from data. Do not reuse the same cases for fitting and evaluation.
4. **Evaluate on a held-out split.** Report discrimination (e.g. AUROC), proper
   scoring rules (log loss, Brier score), and calibration (reliability curve,
   expected calibration error). Report confidence intervals.
5. **Evaluate safety behaviour.** Measure the uncertain/conflicting rate,
   false-negative rate for urgent conditions, and performance by breed, coat,
   skin tone, image quality, and owner-reported answer completeness.
6. **Validate the stopping rule.** Compare the operational thresholds against
   held-out outcomes. A stopping rule is only `validated` when its operating
   characteristics are documented.
7. **Version the profile.** Publish the profile id, training data provenance,
   mapping, and evaluation report.
8. **Switch modes deliberately.** Only after validation should
   `LikelihoodProfile.validation` become `validated` and `mode` move to `auto`.
9. **Re-run regression tests.** Keep the rule-based fallback available for
   rollback.

---

# 13. Test Results

Commands run from `mobile/`:

```text
npm run test:adaptive
```

Result: **69 tests passed, 0 failed** across:

- `math.test.ts`
- `likelihoods.test.ts`
- `selector.test.ts`
- `session.test.ts`
- `ruleBased.test.ts`

Mobile typecheck:

```text
npx tsc --noEmit -p tsconfig.json
```

Result: only four pre-existing, unrelated errors remain in
`features/vet/data/mock.ts` (`VetConsultation`, `VetConsultationDetail`,
`CalendarDay`, and `consultations`). No adaptive or screening-screen type errors
were introduced.

Existing suites re-run:

- backend `python manage.py test ai_screenings --keepdb`: **18 passed**;
- frontend `npm test -- --run` (from `frontend/React`): **40 passed**.

No accuracy or calibration improvement is claimed by these tests. They verify
software behaviour only.

---

# 14. Changed Files

New adaptive module:

- `mobile/ai/adaptive/types.ts`
- `mobile/ai/adaptive/config.ts`
- `mobile/ai/adaptive/math.ts`
- `mobile/ai/adaptive/likelihoods.ts`
- `mobile/ai/adaptive/redundancy.ts`
- `mobile/ai/adaptive/selector.ts`
- `mobile/ai/adaptive/session.ts`
- `mobile/ai/adaptive/sessionStorage.ts`
- `mobile/ai/adaptive/index.ts`

Tests and test tooling:

- `mobile/ai/adaptive/__tests__/helpers.ts`
- `mobile/ai/adaptive/__tests__/math.test.ts`
- `mobile/ai/adaptive/__tests__/likelihoods.test.ts`
- `mobile/ai/adaptive/__tests__/selector.test.ts`
- `mobile/ai/adaptive/__tests__/session.test.ts`
- `mobile/ai/adaptive/__tests__/ruleBased.test.ts`
- `mobile/scripts/ts-resolve-loader.mjs`
- `mobile/package.json` (test scripts)
- `mobile/tsconfig.json` (`allowImportingTsExtensions`)

Mobile UI:

- `mobile/app/(owner)/pets/screening/adjust.tsx`
- `mobile/app/(owner)/pets/screening/result.tsx`
- `mobile/app/(owner)/pets/screening/_layout.tsx`

Documentation:

- `docs/ai/ADAPTIVE_QUESTIONNAIRE.md`

Unchanged by design:

- `mobile/ai/decisionTree/knowledge.ts`
- `mobile/ai/decisionTree/engine.ts`
- `mobile/ai/services/tensorflow.service.ts`
- backend screening code and API contracts.

---

# 15. Assumptions and Open Questions

## Assumptions

- The five-class order in `mobile/ai/constants/diseases.ts` is the canonical
  class order.
- The existing vet vote weights are ordinal expert signals, not likelihoods.
- `"Not sure"` options can be identified by all-zero votes.
- A smoothed image distribution is a reasonable starting point for follow-up
  evidence, but it is not a calibrated prior.
- An on-device questionnaire is preferable for privacy and offline use.

## Open questions

- Which reference standard and case mix should be used to fit and validate the
  likelihoods?
- Should the backend eventually store the full posterior and profile version?
- Should the existing `confidence` field be renamed or accompanied by a
  score-type field?
- What neutral-response rate should be used for information gain once real
  questionnaire data exists?
- Should the image-questionnaire coupling weight be fitted rather than set to
  `0.8`?
- Are there condition-specific urgency rules that should override the generic
  uncertainty thresholds?

Until these are answered with data, the adaptive questionnaire remains an
experimental decision aid and must not be presented as a diagnosis or a
calibrated risk score.
