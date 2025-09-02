import openai
import base64
import json
import os
import shutil
import uuid
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Query, Depends, Body, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

# .env 파일에서 환경 변수 로드
load_dotenv()

# --- OpenAI API 키 설정 ---
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
openai.api_key = api_key

# --- FastAPI 앱 초기화 ---
app = FastAPI()

# --- CORS 미들웨어 설정 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, os.pardir))
UPLOADS_BASE_PATH = os.path.join(SCRIPT_DIR, "WEB", "server", "uploads") # SCRIPT_DIR 기준으로 경로 설정

# --- 이미지 캐시 ---
# { room_id: { "normal": [b64_image1, ...], "abnormal": [b64_image1, ...] } }
ROOM_IMAGE_CACHE = {}

# --- API 키 인증을 위한 의존성 주입 ---
API_KEY_SECRET = os.getenv("AI_API_KEY_SECRET") # .env 파일에 AI_API_KEY_SECRET 추가 필요
def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

# --- 이미지 Base64 인코딩 함수 ---
def encode_image(path: str) -> str:
    with open(path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# --- 핵심 분석 로직 함수 ---
def get_analysis_from_openai(test_image_path: str, normal_imgs_b64: list[str], abnormal_imgs_b64: list[str]) -> dict:
    try:
        test_img_b64 = encode_image(test_image_path)
    except FileNotFoundError as e:
        print(f"Error: Required image file not found - {e.filename}")
        raise HTTPException(status_code=500, detail=f"필수 이미지 파일을 찾을 수 없습니다: {e.filename}")

    # OpenAI API에 전달할 메시지 구성
    messages = [
        {
            "role": "system",
            "content": (
            "당신은 스위치 전선 결선 상태를 비교하여 판단하는 정밀 시각 AI입니다.\n\n"
            "정상 여부의 판단 기준은 아래와 같습니다:\n"
            "1. 전선의 색상, 위치, 개수, 방향이 기준 이미지와 대체로 동일해야 합니다.\n"
            "2. 전체 결선 구조가 유사하고 연결 실수가 없으면 '정상'으로 판단하십시오.\n"
            "3. 눈에 띄는 차이, 빠진 선, 다른 위치의 결선이 있으면 '비정상'입니다.\n\n"
            "4. 문제가 생기거나 분석할 수 없으면 반드시 아래를 출력하세요.:\n"
            '{\"판단\": \"판독 불가\",\n'
            '\"이유\": \"이미지를 분석할 수 없습니다.\"\n}'
            "5. 출력은 반드시 아래 형식에 맞춰주세요. 다른 말은 절대 하지 마세요:\n"
            '{\"판단\": \"정상 or 비정상\",\n'
            '\"이유\": \"만약 비정상이라면, 어떤 점이 다른지 단순하고 명확하게 설명하세요. 비정상이라면 예시 이미지를 언급하지 말고, 정상이라면 `해당 없음`으로 표기하세요.\"\n}'
        )
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "이 이미지는 정상적으로 결선된 스위치입니다."}, 
                {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{normal_imgs_b64[0]}"}}
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
            {"type": "text", "text": "이 이미지를 판단해서 위의 양식에 맞춰 답하세요'"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpg;base64,{test_img_b64}"}}
        ]
    })

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0,
            max_tokens=200,
        )

        response_content = response.choices[0].message.content if response.choices and response.choices[0].message else None

        if response_content is None:
            print(f"OpenAI API 응답 content가 None입니다. 전체 응답: {response}")
            return {"판단": "판독 불가", "이유": "OpenAI API 응답에서 유효한 content를 받지 못했습니다."}

        try:
            response_data = json.loads(response_content)
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 오류: {e}\n응답 내용: {response_content}")
            return {"판단": "판독 불가", "이유": f"{response_content[:200]}"}
        except Exception as e:
            print(f"예상치 못한 파싱 오류: {e}\n응답 내용: {response_content}")
            traceback.print_exc()
            return {"판단": "판독 불가", "이유": f"예상치 못한 파싱 오류: {e}"}

        judgment = response_data.get("판단", "오류")
        reason = response_data.get("이유", "이유를 파악할 수 없음")

        print("\n" + "-"*20)
        print(f" 판단 결과: {judgment}")
        if judgment != "정상":
            print(f" 판단 이유: {reason}")
        print("-" * 20)

        return {"판단": judgment, "이유": reason}

    except openai.APIError as e:
        print(f"OpenAI API 오류 발생: {e}")
        return {"판단": "판독 불가", "이유": f"OpenAI API 오류: {e}"}
    except Exception as e:
        print(f"예상치 못한 오류 발생: {e}")
        traceback.print_exc()
        return {"판단": "판독 불가", "이유": f"서버 내부 오류: {e}"}

# --- API 엔드포인트 정의 ---
@app.post("/analyze")
async def analyze_image_endpoint(
    file: UploadFile = File(...),
    roomId: int = Query(..., description="The ID of the room for classification images"),
    authorization: str = Header(None, description="Bearer token for authentication with NestJS server")
):
    """
    이미지 파일을 받아 분석하고 정상/비정상 여부와 이유를 JSON으로 반환합니다.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")

    token = authorization.split(" ")[1] if "Bearer" in authorization else authorization

    # 캐시 확인
    if roomId in ROOM_IMAGE_CACHE:
        print(f"INFO: Cache hit for room {roomId}")
        cached_images = ROOM_IMAGE_CACHE[roomId]
        normal_imgs_b64 = cached_images["normal"]
        abnormal_imgs_b64 = cached_images["abnormal"]
    else:
        print(f"INFO: Cache miss for room {roomId}. Fetching from NestJS...")
        # NestJS 서버에서 룸 상세 정보 가져오기
        nestjs_url = os.getenv("NESTJS_URL", "https://topaboki.kr/api") + f"/room/{roomId}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    nestjs_url,
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                room_data = response.json()
                normal_images_urls = room_data.get("normalImages", [])
                abnormal_images_urls = room_data.get("abnormalImages", [])

                if not normal_images_urls or not abnormal_images_urls:
                    raise HTTPException(status_code=400, detail="정상 또는 비정상 이미지가 룸에 등록되어 있지 않습니다.")

                # NestJS에서 받은 상대 경로를 AI 서버에서 접근 가능한 절대 경로로 변환
                full_normal_image_paths = [os.path.join(UPLOADS_BASE_PATH, img_url.lstrip('/uploads/')) for img_url in normal_images_urls]
                full_abnormal_image_paths = [os.path.join(UPLOADS_BASE_PATH, img_url.lstrip('/uploads/')) for img_url in abnormal_images_urls]

                # 이미지 Base64 인코딩 및 캐시에 저장
                normal_imgs_b64 = [encode_image(path) for path in full_normal_image_paths]
                abnormal_imgs_b64 = [encode_image(path) for path in full_abnormal_image_paths]
                ROOM_IMAGE_CACHE[roomId] = {"normal": normal_imgs_b64, "abnormal": abnormal_imgs_b64}

        except httpx.HTTPStatusError as e:
            print(f"Error fetching room details from NestJS: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"룸 정보를 가져오는데 실패했습니다: {e.response.text}")
        except httpx.RequestError as e:
            print(f"Network error connecting to NestJS: {e}")
            raise HTTPException(status_code=500, detail=f"NestJS 서버에 연결할 수 없습니다: {e}")
        except Exception as e:
            print(f"Unexpected error fetching room details: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"룸 정보 처리 중 오류 발생: {e}")

    unique_id = uuid.uuid4()
    temp_file_path = f"temp_{unique_id}_{file.filename}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 캐시된 Base64 이미지 데이터를 분석 함수에 전달
        analysis_result = get_analysis_from_openai(
            temp_file_path,
            normal_imgs_b64,
            abnormal_imgs_b64
        )

        return JSONResponse(content=analysis_result)

    except Exception as e:
        print(f"Error in analyze_image_endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 내부 오류 발생: {e}")

    finally:
        # 임시 파일 삭제
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# --- 캐시 무효화 엔드포인트 ---
@app.post("/clear-cache")
async def clear_cache_endpoint(
    request: Request, # Request 객체 임포트 및 주입
    api_key: str = Depends(verify_api_key)
):
    try:
        body = await request.json()
        print(f"Received raw body: {body}")
        roomId = body.get("roomId")
        if roomId is None:
            raise HTTPException(status_code=400, detail="roomId is missing in request body")
        if not isinstance(roomId, int):
            raise HTTPException(status_code=400, detail="roomId must be an integer")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    except Exception as e:
        print(f"Error processing request body: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing request body: {e}")

    if roomId in ROOM_IMAGE_CACHE:
        del ROOM_IMAGE_CACHE[roomId]
        print(f"INFO: Cache for room {roomId} cleared successfully.")
    else:
        print(f"INFO: Cache for room {roomId} not found, no action needed.")
    return {"message": f"Cache for room {roomId} cleared successfully"}


# --- 설명문 생성을 위한 요청 모델 ---
class DescriptionRequest(BaseModel):
    base_description: str
    disability_info: str

# --- 장애 맞춤 설명문 생성 함수 ---
def get_custom_description_from_openai(base_description: str, disability_info: str) -> str:
    장애맞춤설명문_prompt = f"""
You can only answer in korean, without using emoticons.
First Text contains a sequence of instructions, and Second Text contains a Description of the degree and type of disability.
Because the recipient has an intellectual disability, the easier it is to explain it to them, the better.
Also, the recipients have no understanding of the arrangement. The concepts of vertical, horizontal, and direction are also confusing.

So re-write those instructions depending on the degree and type of disability, in the following format (You can write a description by generating more orders than the given order.):

1. ...
2. ...
3. ...
...

If the text does not contain a sequence of instructions, then simply write "제공된 설명문 없음"
"""
    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": 장애맞춤설명문_prompt},
                {"role": "user", "content": disability_info + base_description}
            ],
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except openai.APIError as e:
        print(f"OpenAI API 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API 오류: {e}")
    except Exception as e:
        print(f"예상치 못한 오류 발생: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {e}")

# --- 설명문 생성 엔드포인트 ---
@app.post("/generate-description")
async def generate_description_endpoint(request: DescriptionRequest, api_key: str = Depends(verify_api_key)):
    """
    기본 설명문과 장애 유형 정보를 받아 장애 맞춤 설명문을 생성합니다.
    """
    try:
        custom_description = get_custom_description_from_openai(
            base_description=request.base_description,
            disability_info=request.disability_info
        )
        print(request)
        print("description : "+custom_description)
        return {"description": custom_description}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in generate_description_endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"설명문 생성 중 서버 내부 오류 발생: {e}")

# --- 서버 실행을 위한 코드 ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
