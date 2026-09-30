# TF.js Model

Files in this directory:

- `model.json` — TF.js layers model architecture (flattened, 249 layers)
- `weights.bin` — TF.js model weights (float32, 17,670,816 bytes / 330 weights)
- `labels.txt` — Class labels (one per line)
- `training_reference.json` — OOD reference vector (`mean_feature`) for skin-similarity screening

## BatchNorm variance requirement

`weights.bin` **must be BatchNorm-variance-clean before it ships**: every
`moving_variance` weight must be non-negative.

The app no longer clamps variances at runtime. A previous loader performed
52 synchronous `dataSync()` readbacks on startup to clamp negative variances,
which froze the JS thread during screen load — that loop has been removed.
Any negative variance in `weights.bin` must now be found and fixed offline.

Verify on the training machine before replacing `weights.bin`:

```bash
# from the model-conversion repo (next to the .keras source model)
python verify_mobile_model.py <test-image.jpg>
```

`verify_mobile_model.py` executes `model.json` + `weights.bin` layer-by-layer
and compares against the source Keras model. Also confirm byte size matches
`17,670,816` — the loader refuses any other size.

## Regenerating training_reference.json

Reference vectors must be produced by the same engine that runs on device
(TF.js), not Python/Keras:

```bash
cd mobile
npm run compute:reference -- "<Train dir>" "assets/model/training_reference.json" "<Test dir>" 8
```

This shards the work across worker threads (defaults to 8). JPEG and PNG
training images are both included. After regenerating, re-check similarity
thresholds (`FEATURE_SIMILARITY_MIN` / `FEATURE_SIMILARITY_HIGH` in
`ai/constants/diseases.ts`) against real device logs.

## Converting a model

From Keras:

```bash
tensorflowjs_converter \
  --input_format=keras \
  path/to/model.h5 \
  ./assets/model/
```
