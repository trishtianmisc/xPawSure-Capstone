# AI_MODULE.md

> Version: 1.1
> Project: XPawSure
> AI Module: Canine Skin Disease Screening
> Deployment: TensorFlow.js (on-device) + Anthropic API (backend image-validation gate)
> Last Updated: October 2026

---

# 1. Purpose

This document defines the architecture, responsibilities, implementation guidelines, deployment strategy, and operational workflow of the XPawSure Artificial Intelligence module.

The AI module provides **preliminary screening** of canine skin conditions using
image classification. It has two independent components:

1. A backend image-validation gate produced by Claude through the Anthropic
   Messages API.
2. An on-device EfficientNetB0 classifier served by TensorFlow.js.

The image-validation gate runs first. Only a `SUITABLE` image with
`screening_eligibility: ELIGIBLE` proceeds to the on-device classifier. The
components remain independent, and their outputs are displayed side by side
when both exist. They are never averaged, fused, or converted into a combined
disease probability. Agreement between them is not confirmation.

The AI module is designed to assist pet owners and veterinarians and **must never replace professional veterinary diagnosis**.

---

# 2. Objectives

The AI subsystem aims to:

- Detect common canine skin diseases
- Provide fast preliminary screening
- Keep the classifier fully on-device
- Produce on-device confidence scores
- Validate that a photo is suitable and shows a potentially supported skin
  disease before running the classifier
- Offer a separate, non-diagnostic structured image review
- Keep both outputs independent and auditable
- Reduce consultation time
- Improve record consistency
- Integrate seamlessly with the mobile application

---

# 3. AI Responsibilities

On-device classifier responsibilities:

- Image preprocessing
- Running TensorFlow.js inference
- Returning prediction probabilities
- Returning confidence score
- Returning top predictions
- Recording model metadata
- Applying the existing uncertainty and image-quality thresholds

Backend image-validation responsibilities:

- Validate the single uploaded image
- Call Anthropic with a structured, non-diagnostic tool schema
- Decide `image_suitability` and `screening_eligibility`
- Return an owner-facing screening message, visible features, image-quality
  observations, condition assessment, and a veterinary recommendation
- Record provider status, latency, token usage, and model ID
- Reject malformed or inconsistent gate responses without inventing findings
- Produce a deterministic cross-analysis status only after both outputs exist

The AI module is NOT responsible for:

- Medical diagnosis
- Treatment recommendations
- Prescription generation
- Veterinary decision making
- Cloud training
- Dataset management
- Combining the two outputs into one score

---

# 4. Supported Diseases

Current Version (fixed output index order)

1. Allergic Dermatitis (`ALLERGIC_DERMATITIS`)
2. Bacterial (`BACTERIAL`)
3. Fungal (`FUNGAL`)
4. Hotspot (`HOTSPOT`)
5. Mange (`MANGE`)

The order is defined once in `mobile/ai/constants/classes.ts` and must match the
trained model. Changing it silently changes the meaning of every prediction.

Future versions may include additional classes, but the current five-class
output contract must remain stable until a new model is trained and validated.

---

# 5. AI System Architecture

```
Camera / Gallery

↓

Capture Exactly One Image

↓

Prepare One 512 px JPEG

↓

Claude Vision image-validation gate
(MIME + signature + size check, structured tool call)

↓

Suitable and eligible?
        │
   ┌────┴────┐
   │ No      │ Yes
   ↓         ↓
Show gate   EfficientNetB0 (TensorFlow.js)
result      Preprocessing → softmax → confidence + top predictions
   │         │
   └────┬────┘
        ↓
Display validated result, classifier output when it exists, and
Claude's independent findings
        ↓
Save single image + both outputs (if booking)
        ↓
Backend records deterministic cross-analysis for audit
```

If the gate rejects the image, the classifier is not run and no prediction is
shown. If the gate fails, the classifier is not run and the owner gets a retry
or error message. If the classifier fails after approval, no prediction is
fabricated and the Claude findings remain visible. No findings are fabricated
for a failed review.

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
5. Feed into the on-device TensorFlow.js model

Example input size:

224 × 224

Changing preprocessing requires retraining or validating the model.

---

# 9. Model Architecture

Current Production Model

Base Architecture

- EfficientNetB0

Deployment Format

- TensorFlow.js Layers model (bundled `model.json` + `weights.bin`)

Runtime

- Mobile only (`mobile/ai/services/tensorflow.service.ts`)
- No TensorFlow.js classifier inference runs in Django

Future model upgrades may replace EfficientNetB0 provided the input shape,
five-class output order, preprocessing, and uncertainty thresholds remain
compatible.

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
Capture One Image

↓

Prepare One 512 px JPEG

↓

POST /api/owner/screenings/vision-analysis/
(Claude gate; nothing persisted)

↓

Eligible?
   │
   ├─ No → show gate explanation, no classifier
   │
   └─ Yes → run TensorFlow.js EfficientNetB0 on the same JPEG
                    ↓
             Prediction + confidence
                    ↓
        Display review and classifier result separately
                    ↓
        Save image + both outputs (if booking)
                    ↓
        Backend records deterministic cross-analysis
```

Classifier inference occurs entirely on the mobile device. The backend
image-validation review uses the same JPEG bytes but is an independent external
analysis, not a second run of the classifier. The backend never runs the
classifier.

---

# 14. Backend Integration

The backend receives:

- On-device prediction
- On-device confidence
- On-device model version
- Inference time
- Exactly one captured image
- Signed summary of the image-validation gate (only eligible results are saved)
- Consultation ID (when later linked)

Before the final create request, the mobile app must call
`POST /api/owner/screenings/vision-analysis/`. That endpoint:

- accepts exactly one image;
- validates its MIME type, decoded format, size, and pixel count;
- calls Anthropic with a structured tool schema;
- returns `image_suitability` and `screening_eligibility`;
- returns a signed token bound to the owner and image SHA-256;
- persists nothing.

The gate distinguishes these owner-facing outcomes:

- `NOT_DOG_SKIN` → `Not a Skin Image`
- `NO_VISIBLE_LESIONS` → `Skin Appears Healthy` (with a caveat that this does
  not rule out disease)
- `WOUND_OR_INJURY` → `Possible Wound or Injury` (never described as healthy)
- `POOR_QUALITY` → `Photo Not Clear Enough`
- `UNCERTAIN` → `Unable to Assess`

None of these outcomes runs the classifier or displays a disease prediction.

The mobile app runs the on-device classifier only when the review returns
`screening_eligibility: ELIGIBLE`. The final `POST /api/owner/screenings/`
request is multipart, validates the image once, stores it once, and records both
AI outputs. The backend stores the on-device values without modification. It
never runs the EfficientNetB0 model.

Anthropic configuration is environment-only:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_TIMEOUT_SECONDS`
- `ANTHROPIC_MAX_TOKENS`

The API key and image bytes are never logged. If the key is absent, the review
status is `NOT_CONFIGURED`; the classifier is not run and the owner sees a
retry/error message. A failed or non-eligible review token cannot be saved.

---

# 15. Database Storage

Each screening record stores:

- On-device prediction and confidence
- On-device model version and inference time
- One image reference (Supabase Storage, with a local fallback in development)
- Image content type, size, and SHA-256
- Claude review status, model, structured result, timestamp, latency, and usage
- Deterministic cross-analysis status and summary
- Timestamp
- Veterinarian
- Consultation

Historical predictions are preserved permanently. Legacy image-less screenings
remain readable.

---

# 16. Model Versioning

Every deployed model requires:

Model Version

Training Date

Dataset Version

Framework Version

TensorFlow.js Version

Accuracy Metrics

Example

```
Model

2.0.0

Dataset

2026.07

TensorFlow.js

4.22

Architecture

EfficientNetB0
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

TensorFlow.js Layers Conversion

↓

Deployment
```

No training code exists inside the mobile application.

---

# 20. Model Conversion

Deployment format

TensorFlow.js Layers model (`model.json` + `weights.bin`)

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

The image-validation review has additional limitations:

- It sees only one photograph and cannot examine the whole animal.
- It may describe features without identifying a category.
- It can reject a photo because of blur, poor lighting, a missing dog, a wound,
  or an ambiguous appearance.
- It can fail because of provider timeouts, rate limits, quotas, or malformed
  responses; the classifier is then not run.
- It never provides confidence percentages or a diagnosis.
- Its agreement with the classifier does not prove either result is correct.

Users must always rely on veterinary judgment.

---

# 22. Ethical Considerations

The AI:

- Assists pet owners and veterinarians
- Does not diagnose
- Does not prescribe medication
- Does not replace clinical expertise
- Does not claim that agreement between two AI outputs confirms a diagnosis
- Does not merge the two outputs into one score

The application must clearly communicate these limitations, including on the
result screen and in screening history.

---

# 23. Security

The deployed TensorFlow.js model is read-only.

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
- On-device image quality assessment
- Continuous learning pipeline
- Additional disease classes
- Model update mechanism
- Calibrated comparison against veterinary-confirmed outcomes

Any future second analysis must remain independent. It must not be presented as
a combined probability or as confirmation of the on-device result.

---

# 25. Rules for AI Coding Assistants

When working on the AI module:

- Keep EfficientNetB0 inference entirely on-device.
- Never run TensorFlow inference in Django.
- Match preprocessing and the 224 × 224 input to the training pipeline.
- Preserve the class label order in `mobile/ai/constants/classes.ts`.
- Preserve confidence outputs and uncertainty thresholds exactly.
- Do not hardcode disease names outside configuration files.
- Preserve model version information.
- Store prediction metadata with every screening.
- Keep the two AI outputs independent; never average or fuse their scores.
- Never present predictions or review findings as confirmed diagnoses.
- Treat `COMPATIBLE` as agreement only, not confirmation.
- Keep the Anthropic key backend-only and never log it or image bytes.
- Ensure the AI module can be upgraded without changing the public API.
- Maintain compatibility with the mobile application architecture.
