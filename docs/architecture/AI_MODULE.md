# AI_MODULE.md

> Version: 1.0
> Project: XPawSure
> AI Module: Canine Skin Disease Screening
> Deployment: TensorFlow Lite (Mobile)
> Last Updated: July 2026

---

# 1. Purpose

This document defines the architecture, responsibilities, implementation guidelines, deployment strategy, and operational workflow of the XPawSure Artificial Intelligence module.

The AI module provides **preliminary screening** of canine skin conditions using image classification.

The AI module is designed to assist pet owners and veterinarians and **must never replace professional veterinary diagnosis**.

---

# 2. Objectives

The AI subsystem aims to:

- Detect common canine skin diseases
- Provide fast preliminary screening
- Run inference on-device; a server-side image safety review (never
  inference) checks photo suitability before classification
- Produce confidence scores
- Reduce consultation time
- Improve record consistency
- Integrate seamlessly with the mobile application

---

# 3. AI Responsibilities

The AI module is responsible for:

- Image preprocessing
- Reviewing photo suitability before classification (stateless, server-side; see section 26)
- Running TensorFlow Lite inference
- Returning prediction probabilities
- Returning confidence score
- Returning top predictions
- Recording model metadata

The AI module is NOT responsible for:

- Medical diagnosis
- Treatment recommendations
- Prescription generation
- Veterinary decision making
- Cloud training
- Dataset management
- Server-side disease inference

---

# 4. Supported Diseases

Current Version

- Mange
- Fungal Infection
- Bacterial Infection
- Hot Spot

Future versions may include:

- Ringworm
- Tick Bite Dermatitis
- Allergic Dermatitis
- Flea Allergy Dermatitis
- Seborrhea
- Yeast Infection

The disease list is configurable through model updates.

---

# 5. AI System Architecture

```
Camera

↓

Capture Image

↓

Image Validation

↓

Image Preprocessing

↓

TensorFlow Lite Model

↓

Softmax Probabilities

↓

Prediction

↓

Confidence Score

↓

Top Predictions

↓

Review Screen

↓

Upload Result
```

---

# 6. Image Acquisition

Images are captured using the device camera.

Requirements:

- Clear lighting
- Single affected skin region
- No motion blur
- Focused image
- Visible lesion

The application should warn users if image quality is poor.

---

# 7. Image Validation

Before inference, validate:

- Image format
- Resolution
- File size
- Color channels
- Corrupted files

Invalid images must never reach the inference engine.

---

# 8. Image Preprocessing

The preprocessing pipeline must match the training pipeline exactly.

Typical preprocessing:

1. Resize image
2. Convert RGB
3. Normalize pixel values
4. Convert to tensor
5. Feed into TensorFlow Lite

Example input size:

224 × 224

Changing preprocessing requires retraining or validating the model.

---

# 9. Model Architecture

Current Production Model

Base Architecture

- MobileNetV2

Transfer Learning

- ImageNet pretrained weights

Deployment Format

- TensorFlow Lite (.tflite)

Future model upgrades may replace MobileNetV2 provided the input/output interface remains compatible.

---

# 10. Model Inputs

Input Type

RGB Image

Input Size

224 × 224

Data Type

Float32

Batch Size

1

Input preprocessing must remain identical across training and inference.

---

# 11. Model Outputs

The model returns:

- Predicted class
- Confidence score
- Probability distribution
- Top predicted classes

Example

```
Prediction

Mange

Confidence

97.84%

Top Predictions

1. Mange

2. Fungal Infection

3. Hot Spot
```

---

# 12. Confidence Threshold

Recommended thresholds

95–100%

Very High Confidence

90–94%

High Confidence

80–89%

Moderate Confidence

Below 80%

Recommend manual examination only

Confidence thresholds may be adjusted after clinical evaluation.

---

# 13. Inference Workflow

```
Capture Image

↓

Preprocess

↓

TensorFlow Lite

↓

Prediction

↓

Confidence

↓

Display Result

↓

Upload Result
```

Inference occurs entirely on the mobile device.

Before TensorFlow Lite runs, every quality-passing photo of the screening
session (three slots, at most three photos) goes through the stateless image
safety review described in section 26.
Photos that are not approved by the review never reach the model.

---

# 14. Backend Integration

The backend receives:

- Prediction
- Confidence
- Model Version
- Inference Time
- Consultation ID
- The reviewed photo together with its signed validation token (multipart
  create path only)

The backend stores these values without modification. The uploaded photo is
used solely to recompute its SHA-256 for validation-token verification and is
not stored; no image-review data is persisted.

---

# 15. Database Storage

Each screening record stores:

- Prediction
- Confidence
- Model Version
- Timestamp
- Veterinarian
- Consultation

No image is stored with the screening record.

Historical predictions are preserved permanently.

---

# 16. Model Versioning

Every deployed model requires:

Model Version

Training Date

Dataset Version

Framework Version

TensorFlow Version

Accuracy Metrics

Example

```
Model

1.0.0

Dataset

2026.07

TensorFlow

2.21

Architecture

MobileNetV2
```

---

# 17. Performance Metrics

Track:

Accuracy

Precision

Recall

F1 Score

Confusion Matrix

Inference Time

Memory Usage

Model Size

Performance metrics must be documented for every release.

---

# 18. Dataset Requirements

Dataset should contain:

High-quality images

Balanced classes

Multiple breeds

Different lighting conditions

Different skin tones

Various camera devices

Representative disease severity

Poor-quality samples should be removed during preprocessing.

---

# 19. Training Pipeline

Training occurs outside the application.

Typical workflow

```
Dataset

↓

Cleaning

↓

Augmentation

↓

Train

↓

Validation

↓

Testing

↓

Evaluation

↓

TensorFlow Lite Conversion

↓

Deployment
```

No training code exists inside the mobile application.

---

# 20. Model Conversion

Deployment format

TensorFlow Lite

Conversion occurs after model validation.

Only validated models may be distributed to users.

---

# 21. Limitations

The AI may produce incorrect predictions when:

- Images are blurred
- Lighting is poor
- Lesions are partially hidden
- Diseases are outside the training dataset
- Multiple diseases are present simultaneously

Users must always rely on veterinary judgment.

---

# 22. Ethical Considerations

The AI:

- Assists pet owners and veterinarians
- Does not diagnose
- Does not prescribe medication
- Does not replace clinical expertise

The application must clearly communicate these limitations.

---

# 23. Security

The deployed TensorFlow Lite model is read-only.

Users cannot modify:

- Labels
- Weights
- Model structure

The application validates model integrity before loading.

---

# 24. Future Improvements

Possible future enhancements:

- Multi-label classification
- Lesion segmentation
- Explainable AI (Grad-CAM)
- Automatic image quality assessment
- Cloud-assisted inference
- Continuous learning pipeline
- Additional disease classes
- Model update mechanism

---

# 25. Rules for AI Coding Assistants

When working on the AI module:

- Keep inference entirely on-device.
- Never perform inference on the backend.
- Never classify a photo that the image safety review did not approve.
- Never spend more than three review requests per screening session
  (retries included).
- Match preprocessing to the training pipeline.
- Do not hardcode disease names outside configuration files.
- Preserve model version information.
- Store prediction metadata with every screening.
- Never present predictions as confirmed diagnoses.
- Ensure the AI module can be upgraded without changing the public API.
- Maintain compatibility with the mobile application architecture.

---

# 26. Image Validation Gate (Mobile)

Multi-image screening validates every photo before disease prediction.

Quality and similarity gate (on-device):

- Quality gate: brightness must be between `15` and `240`, and variance must be at least `30`.
- Similarity below `0.10` is classified as `low_similarity`.
- Similarity from `0.10` to below `0.30` is classified as `not_skin`.
- Similarity at or above `0.30` is classified as `ok` and is a skin-valid image.
- At least three skin-valid images are required. If fewer than three pass, the result is `NOT_SKIN_IMAGE` and no disease prediction is shown.
- If fewer than three images pass the quality gate, the result is `INVALID_IMAGE`.
- Disease probabilities and mean similarity are computed only from skin-valid images.
- A green check means the photo was accepted as a dog-skin image. It does not mean a disease was detected.

Claude image safety review (stateless, runs after the quality gate and before inference; logic in `mobile/ai/services/claudeValidation.ts`):

- Every quality-passing photo of a screening session is reviewed through
  `POST /api/owner/screenings/vision-analysis/`. The capture screen has three
  slots, so a session reviews at most three photos.
- A session is one visit to the capture screen. It may spend at most **three
  requests including retries**. All first attempts run before any retry; a
  transient failure (`TIMEOUT`, `PROVIDER_ERROR`, transport errors) is retried
  at most once and only while budget remains. `RATE_LIMITED`,
  `QUOTA_EXHAUSTED`, `NOT_CONFIGURED`, `MALFORMED_RESPONSE` and
  `NOT_VALIDATED` are never retried.
- Only photos answered `OK` + `SUITABLE` + `ELIGIBLE` are approved. Screening
  continues only when all three photos are approved:
  - If any photo fails the quality gate, fewer than three photos reach the
    review, and screening is blocked with a message asking the owner to retake
    the photos that are blurry, too dark, or unclear.
  - If any reviewed photo is rejected, screening is blocked with a message
    asking the owner to replace the rejected photo(s) and then start a new
    screening. A rejection run always spends the whole session budget.
- Replacing a photo inside the session keeps the session
  budget; an exhausted budget reports the replacement as `not_validated` and
  a new screening (new session) is required.
- Approved photos are then classified as before. A photo rejected as
  `POOR_QUALITY` is reported as `quality_failed`, other rejections as
  `not_skin`, and failed reviews as `validation_error`.
- The approval travels as a signed token bound to the owner and the image
  SHA-256 (expiry `SCREENING_CLAUDE_TOKEN_MAX_AGE`, default 3600 seconds).
  The backend re-verifies it on screening create and persists nothing about
  the review.
- The review never diagnoses: it only triages photo suitability, and its
  wording must never state a disease.
- Regression coverage is available through `npm run test:claude` in `mobile/`.

The `0.30` skin-valid threshold must be calibrated against real canine skin images. Human faces must not be accepted as skin-valid. Regression coverage is available through `npm run test:screening` in `mobile/`.

---

# 27. Provisional Bayesian Questionnaire Refinement (Mobile)

The questionnaire refinement step is an experimental mobile-only layer over the five-class image model.

- The active method is `bayesian-provisional-v1`, configured in `mobile/ai/decisionTree/bayesian.config.ts`.
- The image model, quality gates, skin-validity gates, and minimum-valid-image rule are unchanged.
- Questionnaire vote points are converted to provisional option likelihoods using `softmax(vote / 20)`.
- Related questions are averaged in groups; multi-select locations are averaged across selected locations.
- Expert log-odds are centered and capped at `2.5` before combining with the normalized image prior.
- The output is a normalized posterior over the five classes, labeled as screening likelihood rather than confidence.
- Adaptive ordering is enabled by default. It selects the unanswered question with the highest top-two discrimination.
- Early stopping is implemented but disabled by default. When enabled it requires `P1 >= 0.85`, margin `>= 0.30`, at least two informative groups, and two consecutive stable informative updates.
- `unsure` answers and unanswered questions add no evidence. All 12 questions remain the fallback.
- Setting `REFINEMENT_METHOD` to `additive` forces the original static 12-question order and disables Bayesian early stopping.
- The refinement is not clinically calibrated and does not provide a diagnosis.
- Questionnaire answers, refinement method, and stopping metadata are not yet persisted by the backend.
- Regression coverage is available through `npm run test:bayesian` and `npm run test:adaptive` in `mobile/`.

Detailed assumptions, formula, limitations, rollout, and evaluation requirements are documented in `docs/ai/BAYESIAN_REFINEMENT.md`.
