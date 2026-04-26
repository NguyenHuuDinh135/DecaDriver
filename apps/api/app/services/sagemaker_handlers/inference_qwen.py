"""SageMaker inference handler for Qwen2.5-VL-7B-Instruct — AI Stylist."""
import json
import re
import torch
from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration


def model_fn(model_dir: str):
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        model_dir,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    processor = AutoProcessor.from_pretrained(model_dir)
    return {"model": model, "processor": processor}


def predict_fn(data: dict, model_artifacts: dict):
    model = model_artifacts["model"]
    processor = model_artifacts["processor"]

    image_url = data.get("image_url", "")
    prompt = data.get("prompt", "Analyze this person's style.")

    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": image_url},
            {"type": "text", "text": prompt},
        ],
    }]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text], images=[image_url], return_tensors="pt").to(model.device)

    with torch.no_grad():
        output_ids = model.generate(**inputs, max_new_tokens=512)

    generated = processor.batch_decode(
        output_ids[:, inputs.input_ids.shape[1]:],
        skip_special_tokens=True,
    )[0]

    # Try to parse JSON from response
    try:
        json_match = re.search(r"\{.*\}", generated, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except (json.JSONDecodeError, AttributeError):
        pass

    return {"raw_response": generated}


def output_fn(prediction: dict, accept: str) -> str:
    return json.dumps(prediction)
