import base64
import json
import re
import requests
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from copy import deepcopy

LLAMA_URL = "http://0.0.0.0:8080/v1/chat/completions"
API_KEY = "local-llama"
MODEL = "qwen3vl-30b"  # matches your served model id
# Empirical default: llama.cpp + qwen3-vl appears to operate in ~1080x1k coords
# (e.g., scale_y ~ 2.5 for 1170x2532 inputs). Adjust if your server differs.
MODEL_FRAME_W = 1000
MODEL_FRAME_H = 1000
INPUT_DIR = Path(
    "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis-full-resolution/inputs"
)
OUTPUT_DIR = Path(
    "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis-full-resolution/vlm-results"
)

PROMPT = """Role:
You are an assistant that converts a single-screen UI screenshot into a structured layout map.
You detect visible UI components in further hierarchy and return precise pixel bounding boxes and metadata in a strict Json scheme.

Forward_Task:
Please tell me the positions and bounding boxes of each component in the given UI interface.

Output Scheme (JSON)
Root object:
components: [Component...]

Component object (required fields)
id: string (unique, snake_case; prefix with type, e.g., button_login_1)
type: string (one of: container, card, toolbar, status_bar, navbar, tabbar, tab, button, icon, icon_button, label, text, image, avatar, input, search, badge, chip, list, list_item, divider, progress, slider, switch, checkbox, radio, indicator, banner, pagination, ad, space)
bbox: [x_min, y_min, x_max, y_max] in pixels (integers)
width: x2 - x1
height: y2 - y1
text: string (exact visible text; "" if none)
parent: string (id of parent component)

Example output (illustrative)
{
  "components":[
    {"id": "status_bar", "type":"status_bar", "bbox": [0,0,1080,96], "width":1080, "height":96},
    {"id":"time_label", "type":"label", "bbox":[32,16,140,64], "width":108, "height":48, "parent":"status_bar", "text":"23:07"},
    {"id":"header_card", "type":"card", "bbox":[0,160,1080,300]},
    {"id":"login_button", "type":"button", "bbox":[196,260,360,400], "width":164, "height":140, "parent":"header_card", "text":"Login/Register"}
  ]
}

STRICT REQUIREMENTS:
- Return ONLY a single valid JSON object.
- Do not include markdown, commentary, or explanations.
- Follow the schema exactly.
"""

def encode_image(path: Path) -> str:
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{data}"

def call_vlm(image_path: str) -> dict:
    img_b64 = encode_image(Path(image_path))
    payload = {
        "model": MODEL,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": [{"type": "text", "text": PROMPT}]},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this UI screenshot and return only the JSON per the scheme."},
                    {"type": "image_url", "image_url": {"url": img_b64}},
                ],
            },
        ],
    }
    headers = {"Authorization": f"Bearer {API_KEY}"}
    resp = requests.post(LLAMA_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    # If the model wraps JSON in a code block, strip it
    match = re.search(r"\{.*\}", content, re.DOTALL)
    cleaned = match.group(0) if match else content
    return json.loads(cleaned)

def infer_frame_size(components: list) -> tuple[int | None, int | None]:
    """Infer the model's coordinate frame size from returned bboxes."""
    xs = [c["bbox"][2] for c in components if "bbox" in c]
    ys = [c["bbox"][3] for c in components if "bbox" in c]
    if not xs or not ys:
        return None, None
    return max(xs), max(ys)

def scale_components_to_image(
    components: list,
    target_size: tuple[int, int],
    frame_w: int | None = MODEL_FRAME_W,
    frame_h: int | None = MODEL_FRAME_H,
) -> tuple[list, dict]:
    """
    Scale model bboxes to the original image size when the model used a smaller frame.
    Returns scaled components and metadata about the applied scaling.
    """
    target_w, target_h = target_size
    if frame_w is None or frame_h is None or frame_w == 0 or frame_h == 0:
        frame_w, frame_h = infer_frame_size(components)
    if frame_w is None or frame_h is None or frame_w == 0 or frame_h == 0:
        # Nothing to scale
        return components, {"scale_x": 1.0, "scale_y": 1.0, "frame_w": frame_w, "frame_h": frame_h}

    scale_x = target_w / frame_w
    scale_y = target_h / frame_h
    scaled_components = []

    for comp in components:
        if "bbox" not in comp:
            scaled_components.append(comp)
            continue

        x1, y1, x2, y2 = comp["bbox"]
        nx1 = int(round(x1 * scale_x))
        ny1 = int(round(y1 * scale_y))
        nx2 = int(round(x2 * scale_x))
        ny2 = int(round(y2 * scale_y))

        # Clamp to image bounds
        nx1 = max(0, min(nx1, target_w))
        nx2 = max(nx1, min(nx2, target_w))
        ny1 = max(0, min(ny1, target_h))
        ny2 = max(ny1, min(ny2, target_h))

        updated = deepcopy(comp)
        updated["bbox"] = [nx1, ny1, nx2, ny2]
        updated["width"] = nx2 - nx1
        updated["height"] = ny2 - ny1
        scaled_components.append(updated)

    meta = {"scale_x": scale_x, "scale_y": scale_y, "frame_w": frame_w, "frame_h": frame_h}
    return scaled_components, meta

def plot_components(image_path: str, components: list, save_path: str = "annotated.png"):
    img = Image.open(image_path).convert("RGB")
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.imshow(img)
    for comp in components:
        x1, y1, x2, y2 = comp["bbox"]
        w, h = x2 - x1, y2 - y1
        rect = patches.Rectangle((x1, y1), w, h, linewidth=1.5, edgecolor="red", facecolor="none")
        ax.add_patch(rect)
        label = f'{comp["id"]} ({comp["type"]})'
        text_val = comp.get("text")
        if text_val:
            label += f' | {text_val}'
        ax.text(
            x1,
            max(y1 - 4, 0),
            label,
            color="yellow",
            fontsize=6,
            backgroundcolor="black",
            alpha=0.5,  # half opaque label for better visibility
            verticalalignment="bottom",
        )
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(save_path, dpi=200)
    plt.close(fig)
    print(f"Saved annotated image to: {save_path}")

if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    images = sorted(
        [p for p in INPUT_DIR.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
    )
    if not images:
        print(f"No images found in {INPUT_DIR}")
        raise SystemExit(1)

    for image_path in images:
        print(f"Processing {image_path.name} ...")
        try:
            result = call_vlm(str(image_path))
        except Exception as exc:
            print(f"Failed on {image_path.name}: {exc}")
            continue

        comps = result.get("components", [])

        # Rescale model bboxes to the original image dimensions
        img_w, img_h = Image.open(image_path).size
        scaled_components, meta = scale_components_to_image(
            comps, target_size=(img_w, img_h)
        )

        # Save both raw and scaled JSON for transparency
        raw_json_path = OUTPUT_DIR / f"{image_path.stem}_raw.json"
        raw_json_path.write_text(json.dumps(result, indent=2))

        scaled_result = deepcopy(result)
        scaled_result["components"] = scaled_components
        scaled_result["meta"] = {**scaled_result.get("meta", {}), **meta}

        json_path = OUTPUT_DIR / f"{image_path.stem}.json"
        json_path.write_text(json.dumps(scaled_result, indent=2))

        annotated_path = OUTPUT_DIR / f"{image_path.stem}_annotated.png"
        plot_components(str(image_path), scaled_components, save_path=str(annotated_path))
        print(
            f"Saved scaled JSON to {json_path.name}, raw model output to {raw_json_path.name}, "
            f"and annotated image to {annotated_path.name} | scale_x={meta['scale_x']:.2f}, scale_y={meta['scale_y']:.2f}"
        )
