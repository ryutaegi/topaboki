import openai
import base64
import json

# OpenAI API 키 (주의: 보안을 위해 하드코딩하는 것은 권장되지 않습니다)
#openai.api_key =
# Base64 변환 함수
def encode_image(path):
    with open(path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# --- 이미지 경로 설정 ---
# 기준 이미지
normal_image_path = "정상이미지.jpg"
abnormal_image_paths = [
    "비정상이미지1.jpg",
    "비정상이미지2.jpg",
    "비정상이미지3.jpg"
]
# 분석할 테스트 이미지 (비정상 이미지 중 하나를 선택)
test_image_path = "테스트이미지3(비정상).jpg"

# --- 이미지 인코딩 ---
try:
    normal_img_b64 = encode_image(normal_image_path)
    abnormal_imgs_b64 = [encode_image(path) for path in abnormal_image_paths]
    test_img_b64 = encode_image(test_image_path)
except FileNotFoundError as e:
    print(f"오류: {e.filename} 파일을 찾을 수 없습니다.")
    exit()

# --- 메시지 구성 (JSON 출력 및 이유 요청으로 수정) ---
messages = [
    {
        "role": "system",
        "content": (
            "당신은 스위치 전선 결선 상태를 비교하여 판단하는 정밀 시각 AI입니다.\n\n"
            "정상 여부의 판단 기준은 아래와 같습니다:\n"
            "1. 전선의 색상, 위치, 개수, 방향이 기준 이미지와 대체로 동일해야 합니다.\n"
            "2. 전체 결선 구조가 유사하고 연결 실수가 없으면 '정상'으로 판단하십시오.\n"
            "3. 눈에 띄는 차이, 빠진 선, 다른 위치의 결선이 있으면 '비정상'입니다.\n\n"
            "출력은 반드시 아래 JSON 형식에 맞춰주세요. 다른 말은 절대 하지 마세요:\n"
            "```json\n"
            "{\n"
            '  \"판단\": \"정상 or 비정상\",\n'
            '  \"이유\": \"만약 비정상이라면, 어떤 점이 다른지 구체적인 이유를 1~2문장으로 설명하세요. 정상이라면 `해당 없음`으로 표기하세요.\"\n'
            "}\n"
            "```"
        )
    },
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "이 이미지는 정상적으로 결선된 스위치입니다."},
            {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{normal_img_b64}"}}
        ]
    }
]

for idx, b64_img in enumerate(abnormal_imgs_b64):
    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": f"이 이미지는 비정상 스위치 예시 {idx+1}입니다."},
            {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{b64_img}"}}
        ]
    })

messages.append({
    "role": "user",
    "content": [
        {"type": "text", "text": "이 이미지를 판단하고, 위에서 요청한 JSON 형식으로 결과를 알려주세요."},
        {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{test_img_b64}"}}
    ]
})

# --- API 호출 및 결과 처리 ---
print(f"'{test_image_path}' 이미지 분석 중...")

try:
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0,
        max_tokens=200, # 이유를 받아야 하므로 토큰 수 증가
        response_format={"type": "json_object"} # JSON 출력 모드 활성화
    )

    # 결과 파싱 및 출력
    response_content = response.choices[0].message.content
    response_data = json.loads(response_content)
    
    judgment = response_data.get("판단", "오류")
    reason = response_data.get("이유", "이유를 파악할 수 없음")

    print("\n" + "-"*20)
    print(f" 판단 결과: {judgment}")
    if judgment == "비정상":
        print(f" 판단 이유: {reason}")
    print("-"*20)

except openai.APIError as e:
    print(f"OpenAI API 오류가 발생했습니다: {e}")
except json.JSONDecodeError:
    print("오류: 모델의 응답이 유효한 JSON 형식이 아닙니다.")
    print("원본 응답:", response_content)
except Exception as e:
    print(f"알 수 없는 오류가 발생했습니다: {e}")
