import openai
import base64
import json
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
openai.api_key = api_key

# # 설명문_1 : 관리자가 입력한 설명문
# 설명문_1 = f"""
# 먼저, 스위치쪽이 보이도록 책상 위에 두고 스위치 6개가 3(세로)*2(가로) 배열로 정상적으로 꽂혀있는지 확인한다. 
# 그 다음, 알맹이 쪽이 보이도록 책상 위에 두고 알맹이 6개가 3(세로)*2(가로) 배열로 정상적으로 꽂혀있는지 확인한다. 
# 왼쪽 위 2개의 알맹이의 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다. 
# 왼쪽 아래 2개의 알맹이의 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다.
# 오른쪽 알맹이도 동일하게 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다.
# 왼쪽 상단 알맹이와 오른쪽 상단 알맹이를 노란색 선으로 서로 결합한다.
# """

# # 기본설명문_prompt : 관리자가 입력한 설명문을 지정된 형식에 맞추어 순서도로 정리
# 기본설명문_prompt = f"""
# You will be provided with text delimited by triple quotes.
# You can only answer in korean, without using emoticons.
# It contains a sequence of instructions, so re-write those instructions in the following format:

# 1. ...
# 2. ...
# 3. ...

# If the text does not contain a sequence of instructions, then simply write "제공된 설명문 없음"
# """


# # 설명문_1과 기본설명문_prompt를 활용하여 응답 생성
# response = openai.chat.completions.create(
#     model="gpt-4.1-mini",
#     messages=[
#         {"role": "system", "content": 기본설명문_prompt},
#         {"role": "user", "content": 설명문_1}
#     ],
#     temperature=0.5
# )

# print("완성된 순서도:")
# print(response.choices[0].message.content.strip())

# 기본설명문_1 : 기본설명문생성.py를 통해 생성된 순서도
기본설명문_1 = f"""
1. 스위치 쪽이 보이도록 책상 위에 두고, 스위치 6개가 2(가로)*3(세로) 배열로 정상적으로 꽂혀있는지 확인한다.
2. 알맹이 쪽이 보이도록 책상 위에 두고, 알맹이 6개가 2(가로)*3(세로) 배열로 정상적으로 꽂혀있는지 확인한다.
3. 왼쪽 위 2개의 알맹이의 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다.
4. 왼쪽 아래 2개의 알맹이의 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다.
5. 오른쪽 알맹이도 동일하게 왼쪽 두 구멍을 빨간색 선을 이용하여 서로 결합한다.
6. 왼쪽 상단 알맹이와 오른쪽 상단 알맹이를 노란색 선으로 서로 결합한다.
"""

# 장애유형입력 : 
장애유형입력 = f"""
지적장애 2급의 중증도 지적장애인
정신연령 4~5세
숫자세기 5까지 가능
"""

# 장애맞춤설명문_prompt : 장애 유형 입력과 기본설명문을 바탕으로 한 설명문 생성
장애맞춤설명문_prompt = f"""
You will be provided with text delimited by triple quotes.
You can only answer in korean, without using emoticons.
First Text contains a sequence of instructions, and Second Text contains a Description of the degree and type of disability.
Because the recipient has an intellectual disability, the easier it is to explain it to them, the better.
Also, the recipients have no understanding of the arrangement. The concepts of vertical, horizontal, and direction are also confusing.


So re-write those instructions depending on the degree and type of disability, in the following format (You can write a description by generating more orders than the given order.):

1. ...
2. ...
3. ...

If the text does not contain a sequence of instructions, then simply write "제공된 설명문 없음"
"""

# 설명문_1과 기본설명문_prompt를 활용하여 응답 생성
response = openai.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "system", "content": 장애맞춤설명문_prompt},
        {"role": "user", "content": 장애유형입력 + 기본설명문_1}
    ],
    temperature=0.5
)

print("완성된 장애맞춤설명문:")
print(response.choices[0].message.content.strip())
