# TensorFlow Lite Model

Place the following files here after model training/conversion:

- `model.json` — TF.js format model architecture
- `weights.bin` — TF.js format model weights
- `labels.txt` — Class labels (one per line)

## Convert TFLite to TF.js

```bash
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  path/to/model.tflite \
  ./assets/model/
```

Or convert from Keras:

```bash
tensorflowjs_converter \
  --input_format=keras \
  path/to/model.h5 \
  ./assets/model/
```

## After replacing weights.bin

Run the offline BatchNorm variance fix and keep only these files:

```bash
node scripts/fix-model-bn-variance.cjs --verify
```

The mobile app no longer clamps negative `moving_variance` values at load
time (it used to cause a UI freeze), so the weight file must contain no
negative variance values. Without `--verify`, the script clamps them.
