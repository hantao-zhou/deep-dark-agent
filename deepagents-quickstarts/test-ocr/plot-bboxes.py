import json
import cv2
import random

# ---------- Configuration ----------
json_data = r'''
{
	"components": [
		{
			"id": "status_bar",
			"type": "status_bar",
			"bbox": [
				0,
				0,
				1170,
				140
			],
			"width": 1170,
			"height": 140,
			"text": ""
		},
		{
			"id": "label_time",
			"type": "label",
			"bbox": [
				60,
				40,
				200,
				100
			],
			"width": 140,
			"height": 60,
			"parent": "status_bar",
			"text": "17:20"
		},
		{
			"id": "container_url_pill",
			"type": "container",
			"bbox": [
				390,
				30,
				780,
				100
			],
			"width": 390,
			"height": 70,
			"parent": "status_bar",
			"text": "uinotes.com"
		},
		{
			"id": "icon_signal_wifi_battery",
			"type": "icon",
			"bbox": [
				950,
				40,
				1120,
				100
			],
			"width": 170,
			"height": 60,
			"parent": "status_bar",
			"text": ""
		},
		{
			"id": "navbar",
			"type": "navbar",
			"bbox": [
				0,
				140,
				1170,
				250
			],
			"width": 1170,
			"height": 110,
			"text": ""
		},
		{
			"id": "icon_close",
			"type": "icon_button",
			"bbox": [
				40,
				150,
				120,
				230
			],
			"width": 80,
			"height": 80,
			"parent": "navbar",
			"text": ""
		},
		{
			"id": "icon_help",
			"type": "icon_button",
			"bbox": [
				1050,
				150,
				1130,
				230
			],
			"width": 80,
			"height": 80,
			"parent": "navbar",
			"text": ""
		},
		{
			"id": "image_logo",
			"type": "image",
			"bbox": [
				520,
				320,
				650,
				450
			],
			"width": 130,
			"height": 130,
			"text": ""
		},
		{
			"id": "label_title",
			"type": "label",
			"bbox": [
				435,
				490,
				735,
				560
			],
			"width": 300,
			"height": 70,
			"text": "华为帐号"
		},
		{
			"id": "label_subtitle",
			"type": "label",
			"bbox": [
				310,
				580,
				860,
				630
			],
			"width": 550,
			"height": 50,
			"text": "用于访问所有华为终端云服务"
		},
		{
			"id": "container_input",
			"type": "container",
			"bbox": [
				60,
				780,
				1110,
				920
			],
			"width": 1050,
			"height": 140,
			"text": ""
		},
		{
			"id": "label_country_code",
			"type": "label",
			"bbox": [
				60,
				830,
				180,
				880
			],
			"width": 120,
			"height": 50,
			"parent": "container_input",
			"text": "+86"
		},
		{
			"id": "icon_dropdown_arrow",
			"type": "icon",
			"bbox": [
				190,
				845,
				220,
				870
			],
			"width": 30,
			"height": 25,
			"parent": "container_input",
			"text": ""
		},
		{
			"id": "divider_vertical",
			"type": "divider",
			"bbox": [
				250,
				835,
				252,
				875
			],
			"width": 2,
			"height": 40,
			"parent": "container_input",
			"text": ""
		},
		{
			"id": "input_phone_number",
			"type": "input",
			"bbox": [
				290,
				830,
				1050,
				880
			],
			"width": 760,
			"height": 50,
			"parent": "container_input",
			"text": "手机号"
		},
		{
			"id": "divider_horizontal",
			"type": "divider",
			"bbox": [
				60,
				915,
				1110,
				917
			],
			"width": 1050,
			"height": 2,
			"parent": "container_input",
			"text": ""
		},
		{
			"id": "button_next",
			"type": "button",
			"bbox": [
				60,
				1040,
				1110,
				1150
			],
			"width": 1050,
			"height": 110,
			"text": "下一步"
		},
		{
			"id": "button_password_login",
			"type": "button",
			"bbox": [
				60,
				1200,
				1110,
				1310
			],
			"width": 1050,
			"height": 110,
			"text": "密码登录"
		},
		{
			"id": "container_scan_text",
			"type": "container",
			"bbox": [
				280,
				1400,
				890,
				1450
			],
			"width": 610,
			"height": 50,
			"text": ""
		},
		{
			"id": "label_scan_prompt",
			"type": "label",
			"bbox": [
				280,
				1400,
				700,
				1450
			],
			"width": 420,
			"height": 50,
			"parent": "container_scan_text",
			"text": "其他设备已登录帐号?"
		},
		{
			"id": "button_scan_link",
			"type": "button",
			"bbox": [
				720,
				1400,
				890,
				1450
			],
			"width": 170,
			"height": 50,
			"parent": "container_scan_text",
			"text": "扫码登录"
		},
		{
			"id": "button_other_methods",
			"type": "button",
			"bbox": [
				450,
				2250,
				720,
				2320
			],
			"width": 270,
			"height": 70,
			"text": "其他方式登录"
		},
		{
			"id": "home_indicator",
			"type": "indicator",
			"bbox": [
				385,
				2460,
				785,
				2475
			],
			"width": 400,
			"height": 15,
			"text": ""
		}
	]
}
'''

image_path = "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/9044d80f971f79fe485778a7eae95b18.png"
output_path = "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/annotated_result.png"
# -----------------------------------

# Load JSON
data = json.loads(json_data)

# Load image
img = cv2.imread(image_path)

if img is None:
    raise FileNotFoundError(f"Image not found at: {image_path}")

# Draw bounding boxes
for comp in data["components"]:
    bbox = comp["bbox"]  # xmin, ymin, xmax, ymax
    xmin, ymin, xmax, ymax = bbox

    # Generate a consistent random color per component type
    random.seed(hash(comp["type"]) % 100000)
    color = (
        random.randint(50, 255),
        random.randint(50, 255),
        random.randint(50, 255),
    )

    # Draw rectangle
    cv2.rectangle(img, (xmin, ymin), (xmax, ymax), color, 2)

    # Draw label text
    label = comp["id"]
    cv2.putText(
        img,
        label,
        (xmin, ymin - 5),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        color,
        2,
        cv2.LINE_AA
    )

print(f"Saving annotated result to: {output_path}")
cv2.imwrite(output_path, img)
print("Done.")
