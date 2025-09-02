import openai
import base64

# OpenAI API 키
#openai.api_key = 이거 나중에 필요하면 추가하삼
# Base64 변환 함수
def encode_image(path):
    with open(path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# 이미지 경로
normal_image_path = "정상이미지.jpg"
abnormal_image_paths = [
    "비정상이미지1.jpg",
    "비정상이미지2.jpg",
    "비정상이미지3.jpg"
]
test_image_path = "테스트이미지2(비정상).jpg"

# 이미지 인코딩
normal_img_b64 = encode_image(normal_image_path)
abnormal_imgs_b64 = [encode_image(path) for path in abnormal_image_paths]
test_img_b64 = encode_image(test_image_path)

# 메시지 구성
messages = [
    {
        "role": "system",
        "content": (
            "당신은 스위치 전선 결선 상태를 비교하여 판단하는 시각 AI입니다.\n\n"
            "정상 여부의 판단 기준은 아래와 같습니다:\n"
            "1. 전선의 색상, 위치, 개수, 방향이 기준 이미지와 **대체로 동일해야 합니다**.\n"
            "2. 전체 결선 구조가 유사하고 연결 실수가 없으면 '정상'으로 판단하십시오.\n"
            "3. 전선의 개수가 기준과 다르면 비정상입니다.\n"
            "4. 조명, 그림자, 배경, 카메라 각도는 무시합니다. 오직 색상과 위치만 중요합니다.\n"
            "5. 눈에 띄는 차이, 빠진 선, 다른 위치의 결선이 있으면 '비정상'입니다.\n\n"
            "출력은 반드시 아래 중 하나만 사용하세요:\n"
            "- 정상\n"
            "- 비정상\n\n"
            "절대 다른 말은 하지 마세요. '정상' 또는 '비정상' 이외의 문장은 포함하지 마세요."
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

# 여러 비정상 이미지 추가
for idx, b64_img in enumerate(abnormal_imgs_b64):
    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": f"이 이미지는 비정상 스위치 예시 {idx+1}입니다."},
            {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{b64_img}"}}
        ]
    })

# 테스트 이미지 추가
messages.append({
    "role": "user",
    "content": [
        {"type": "text", "text": "이 이미지는 정상입니까 비정상입니까? 반드시 그 둘 중 하나로만 답하세요."},
        {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{test_img_b64}"}}
    ]
})

# API 호출
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0,
    max_tokens=20  # 안전하게 약간 여유
)

# 결과 출력
result = response.choices[0].message.content.strip()
print("판단 결과:", result)
