# 🤖 AI 기반 생산품 검수 시스템

> AI 영상 인식을 통해 생산품의 정상/비정상 여부를 판별하고, 작업자에게 음성(TTS)으로 안내하는 웹 기반 협업 시스템

## ✨ 주요 기능

*   **사용자 인증**: Google 소셜 로그인을 통한 간편한 인증 시스템
*   **작업 공간(Room)**: 사용자들이 참여할 수 있는 작업 공간 생성 및 관리 기능
*   **실시간 생산품 검수**: 웹캠 또는 업로드된 이미지를 AI 모델로 전송하여 실시간 검수
*   **AI 분석**: 제품 이미지의 정상/비정상 여부를 판별하고, 비정상일 경우 그 이유를 함께 제공
*   **결과 확인**: 검수 결과를 이미지와 텍스트로 명확하게 표시
*   **음성 안내(TTS)**: 작업 지시, 검수 결과 등을 음성으로 변환하여 사용자에게 안내 (접근성 향상)

## 🏗️ 시스템 아키텍처

이 시스템은 세 가지 주요 컴포넌트가 Docker Compose를 통해 유기적으로 연동됩니다.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Web Client     │◀───▶│    Web Server    │◀───▶│     AI Server    │
│ (React, Vite)    │     │ (NestJS, Node.js)│     │(Python, FastAPI) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         ▲
         │
┌──────────────────┐
│   Hardware       │
│ (Raspberry Pi)   │
└──────────────────┘
```

1.  **Hardware (Raspberry Pi)**: 웹캠으로 제품 이미지를 촬영합니다.
2.  **Web Client**: 사용자가 웹 브라우저를 통해 시스템에 접속하고, 이미지를 업로드하거나 실시간 스트림을 확인합니다.
3.  **Web Server**: 사용자 인증, 작업 공간 관리, 이미지 저장 및 AI 서버와의 통신을 담당합니다.
4.  **AI Server**: Web Server로부터 이미지를 받아 AI 모델을 통해 분석하고 결과를 반환합니다.

## 🛠️ 기술 스택

### 🌐 WEB
*   **Client**: `React`, `TypeScript`, `Vite`, `MUI`, `Axios`
*   **Server**: `NestJS`, `TypeScript`, `TypeORM`, `PostgreSQL`, `JWT`

### 🧠 AI
*   **Framework**: `Python`, `FastAPI`
*   **ML/Vision**: `OpenAI`

### 🍓 PI
*   **Hardware**: `Raspberry Pi`
*   **Framework**: `Python`, `RPi.GPIO`

### 🐳 DevOps
*   `Docker`, `Docker Compose`, `Nginx`

## 🚀 시작하기

### 사전 요구사항

*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### 설치 및 실행

1.  **프로젝트 클론**
    ```bash
    git clone <저장소_URL>
    cd <프로젝트_폴더>
    ```

2.  **환경 변수 설정**
    루트 디렉토리에 `.env` 파일을 생성하고, `docker-compose.yml` 파일에 정의된 각 서비스(DB, 서버 등)에 필요한 환경 변수를 설정합니다. (예: `POSTGRES_DB`, `POSTGRES_USER`, `JWT_SECRET` 등)

3.  **Docker Compose 실행**
    ```bash
    # 개발 환경
    docker-compose up -d --build

    # 프로덕션 환경
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

4.  **서비스 접속**
    *   웹 클라이언트: `http://localhost:5173` (Vite 개발 서버)
    *   웹 서버 API: `http://localhost:3000`
    *   AI 서버 API: `http://localhost:8000`

## 📁 디렉토리 구조

```
.
├── AI/         # AI 모델 및 API 서버
├── PI/         # Raspberry Pi 관련 스크립트
└── WEB/        # 웹 서비스
    ├── client/ # 프론트엔드 (React)
    └── server/ # 백엔드 (NestJS)
```
![IMG_5031](https://github.com/user-attachments/assets/85e6061b-2e23-4eef-b277-c11b812f105a)
![IMG_5030](https://github.com/user-attachments/assets/712f245d-6d8d-4ee1-80a7-2969828d5c49)
![IMG_5029](https://github.com/user-attachments/assets/1a2a89a7-dd68-4449-8c48-9632954d3fc4)
![IMG_5028](https://github.com/user-attachments/assets/487ce570-d320-42a6-a182-0e2bd08c063b)
