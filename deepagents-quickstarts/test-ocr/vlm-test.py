import base64
import json
import requests
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from PIL import Image


LLAMA_SERVER_URL = "http://127.0.0.1:8080/v1/chat/completions"
API_KEY = "local-llama"
MODEL_NAME = "qwen3vl-30b"  # llama.cpp often ignores this, but it's required in payload


def image_to_data_uri(image_path: str) -> str:
    """
    Convert local image to base64 data URI for llama.cpp multimodal input.
    """
    path = Path(image_path)
    suffix = path.suffix.lower().lstrip(".")
    mime = f"image/{'jpeg' if suffix == 'jpg' else suffix or 'png'}"

    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime};base64,{b64}"


def build_prompt() -> str:
    """
    Build the textual prompt with your role, task, output scheme and example.
    """
    return r"""
Role:
You are an assistant that converts a single-screen UI screenshot into a structured layout map.
You detect visible UI components in further hierarchy and return precise pixel bounding boxes and metadata in a strict Jensen scheme. 

Forward_Task:
Please tell me the positions and bounding boxes of each component in the given UI interface. 

Output Scheme (JSON only, no extra text):

Root object:
{
  "components": [Component...]
}

Component object (required fields):
- id: string (unique, snake_case; prefix with type, e.g., button_login_1)
- type: string (one of: container, card, toolbar, status_bar, navbar, tabbar, tab, button, icon, icon_button, label, text, image, avatar, input, search, badge, chip, list, list_item, divider, progress, slider, switch, checkbox, radio, indicator, banner, pagination, ad, space)
- bbox: [x_min, y_min, x_max, y_max] in pixels (integers)
- width: x_max - x_min
- height: y_max - y_min
- text: string (exact visible text; use English; "" if none)
- parent: string (id of parent component; omit or null for root level)

说明：
- bbox:[50,30,120,80] 表示左上角位于 (50,30)，右下角为 (120,80)。
- width 和 height 是组件的宽度和高度（单位：像素）。

Example output (illustrative, not related to this image):

{
  "components":[
    {
      "id": "status_bar",
      "type": "status_bar",
      "bbox": [0,0,1080,96],
      "width":1080,
      "height":96,
      "text": "",
      "parent": null
    },
    {
      "id":"time_label",
      "type":"label",
      "bbox":[32,16,140,64],
      "width":108,
      "height":48,
      "parent":"status_bar",
      "text":"23:07"
    },
    {
      "id":"header_card",
      "type":"card",
      "bbox":[0,160,1080,300],
      "width":1080,
      "height":140,
      "parent": null,
      "text": ""
    },
    {
      "id":"login_button",
      "type":"button",
      "bbox":[196,260,360,400],
      "width":164,
      "height":140,
      "parent":"header_card",
      "text":"Login / Register"
    }
  ]
}

STRICT REQUIREMENTS:
- Return ONLY a single valid JSON object.
- Do not include markdown, commentary, or explanations.
- Follow the schema exactly.
    """.strip()


def call_llama_vlm(image_path: str) -> dict:
    """
    Send the image + prompt to llama.cpp server and return parsed JSON of components.
    """
    data_uri = image_to_data_uri(image_path)
    prompt_text = build_prompt()

    payload = {
        "model": MODEL_NAME,
        "temperature": 0.1,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an assistant that converts a single-screen UI screenshot "
                    "into a structured layout map in Jensen scheme. "
                    "Always respond with a single valid JSON object only."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt_text,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_uri,
                        },
                    },
                ],
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    resp = requests.post(LLAMA_SERVER_URL, headers=headers, json=payload, timeout=600)
    resp.raise_for_status()
    data = resp.json()

    # llama.cpp OpenAI-style response:
    # data["choices"][0]["message"]["content"] should be JSON string
    content = data["choices"][0]["message"]["content"]

    # If model accidentally wraps it in ```json ... ``` remove that
    content_str = content.strip()
    if content_str.startswith("```"):
        # naive strip of markdown fences
        content_str = content_str.strip("` \n")
        if content_str.lower().startswith("json"):
            content_str = content_str[4:].lstrip()

    return json.loads(content_str)


def plot_components(image_path: str, components_json: dict, show_labels: bool = True):
    """
    Plot bounding boxes on top of the image with optional labels.
    """
    img = Image.open(image_path).convert("RGB")

    fig, ax = plt.subplots(figsize=(8, 16))
    ax.imshow(img)
    ax.axis("off")

    components = components_json.get("components", [])

    for comp in components:
        bbox = comp.get("bbox")
        if not bbox or len(bbox) != 4:
            continue

        x_min, y_min, x_max, y_max = bbox
        width = x_max - x_min
        height = y_max - y_min

        # Draw rectangle
        rect = Rectangle(
            (x_min, y_min),
            width,
            height,
            fill=False,
            linewidth=1.5,
        )
        ax.add_patch(rect)

        if show_labels:
            cid = comp.get("id", "")
            ctype = comp.get("type", "")
            text = comp.get("text", "") or ""
            label = f"{cid} ({ctype})"
            if text:
                label += f": {text}"

            ax.text(
                x_min,
                max(y_min - 3, 0),
                label,
                fontsize=6,
                backgroundcolor="white",
                ha="left",
                va="bottom",
            )

    plt.tight_layout()
    plt.show()


def main():
    # TODO: change this to your actual screenshot path
    # image_path = "example_ui.png"
    images_list = [
        "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/5332ae2b6ed52f118c08b09b00106f8d.jpg",
        "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/9044d80f971f79fe485778a7eae95b18.png",
        "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/5825370c335a3f8d372c59b75a50a8d2.jpg",
        '/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/image.png'
    ]
    image_file = images_list[0]

    print("Sending image to llama.cpp VLM for UI segmentation...")
    components_json = call_llama_vlm(image_file)
    print("Received components JSON:")
    print(json.dumps(components_json, indent=2, ensure_ascii=False))

    print("\nPlotting bounding boxes...")
    plot_components(image_file, components_json, show_labels=True)


if __name__ == "__main__":
    main()
