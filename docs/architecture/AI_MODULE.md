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
- Operate completely offline
- Produce confidence scores
- Reduce consultation time
- Improve record consistency
- Integrate seamlessly with the mobile application

---

# 3. AI Responsibilities

The AI module is responsible for:

- Image preprocessing
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

---

# 14. Backend Integration

The backend receives:

- Prediction
- Confidence
- Model Version
- Inference Time
- Consultation ID
- Captured Image

The backend stores these values without modification and stores the captured image in Supabase Storage.

---

# 15. Database Storage

Each screening record stores:

- Prediction
- Confidence
- Image reference in Supabase Storage
- Model Version
- Timestamp
- Veterinarian
- Consultation

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
- Match preprocessing to the training pipeline.
- Do not hardcode disease names outside configuration files.
- Preserve model version information.
- Store prediction metadata with every screening.
- Never present predictions as confirmed diagnoses.
- Ensure the AI module can be upgraded without changing the public API.
- Maintain compatibility with the mobile application architecture.
