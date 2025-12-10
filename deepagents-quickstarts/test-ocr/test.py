from transformers import AutoModel, AutoTokenizer
import torch
import os


os.environ["CUDA_VISIBLE_DEVICES"] = '0'


model_name = '/home/hans/workspace/outsource/models/deepseek-ocr'


tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
model = AutoModel.from_pretrained(model_name, _attn_implementation='eager', trust_remote_code=True, use_safetensors=True)
model = model.eval().cuda().to(torch.bfloat16)



# prompt = "<image>\nFree OCR. "
prompt = "<image>\n<|grounding|>Convert the document to markdown."

prompt = "<image>\n<|grounding|>Identify all elements in the image and output them in bounding boxes."

# prompt = "<image>\n<|grounding|>Identify all UI elements in the image."
# image_file = '/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/IMG20251209-152652.jpg'

images_list = [
    "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/5332ae2b6ed52f118c08b09b00106f8d.jpg",
    "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/9044d80f971f79fe485778a7eae95b18.png",
    "/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis/5825370c335a3f8d372c59b75a50a8d2.jpg",
    '/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/image.png'
]

images_list = os.listdir('/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis-full-resolution/inputs')
image_file = os.path.join('/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/simple-uis-full-resolution/inputs',
    images_list[0])
output_path = '/home/hans/workspace/outsource/deep-dark-agent/deepagents-quickstarts/test-ocr/'



# infer(self, tokenizer, prompt='', image_file='', output_path = ' ', base_size = 1024, image_size = 640, crop_mode = True, test_compress = False, save_results = False):

# Tiny: base_size = 512, image_size = 512, crop_mode = False
# Small: base_size = 640, image_size = 640, crop_mode = False
# Base: base_size = 1024, image_size = 1024, crop_mode = False
# Large: base_size = 1280, image_size = 1280, crop_mode = False

# Gundam: base_size = 1024, image_size = 640, crop_mode = True

res = model.infer(tokenizer, prompt=prompt, image_file=image_file, output_path = output_path, base_size = 1024, image_size = 640, crop_mode=True, save_results = True, test_compress = True)