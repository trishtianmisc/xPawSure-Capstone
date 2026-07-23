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
