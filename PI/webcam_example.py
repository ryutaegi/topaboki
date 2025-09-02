import cv2
import logging
from flask import Flask, Response

# --- 로깅 설정 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Flask 앱 초기화 ---
app = Flask(__name__)

def frame_generator():
    """OpenCV를 사용하여 웹캠 프레임을 생성합니다."""
    # 0은 시스템의 기본 웹캠을 의미합니다.
    # 만약 다른 카메라를 사용하려면 1, 2 등으로 바꿀 수 있습니다.
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logging.error("웹캠을 열 수 없습니다. 카메라가 연결되어 있는지, 다른 프로그램에서 사용 중이지 않은지 확인하세요.")
        # 오류 메시지를 담은 이미지 프레임을 생성하여 사용자에게 문제를 알릴 수 있습니다.
        # (여기서는 간단히 빈 응답으로 처리)
        return

    logging.info("웹캠을 성공적으로 열었습니다.")

    try:
        while True:
            # 프레임 읽기
            success, frame = cap.read()
            if not success:
                logging.warning("프레임을 읽는 데 실패했습니다. 스트리밍을 종료합니다.")
                break
            else:
                # 프레임을 JPEG 형식으로 인코딩
                ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if not ret:
                    logging.warning("프레임 인코딩에 실패했습니다.")
                    continue

                # 바이트 스트림으로 변환하여 yield
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        # 작업 완료 후 카메라 해제
        logging.info("웹캠을 해제합니다.")
        cap.release()


@app.route("/")
def index():
    """메인 페이지. 실시간 스트리밍을 보여줍니다."""
    return """
    <html>
        <head>
            <title>USB 웹캠 스트리밍 (OpenCV)</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding-top: 2em; background-color: #f0f0f0; }
                h1 { color: #333; }
                img { border: 3px solid #ccc; background-color: #fff; }
            </style>
        </head>
        <body>
            <h1>USB 웹캠 스트리밍 (OpenCV)</h1>
            <p>현재 카메라에서 실시간으로 전송되는 영상입니다.</p>
            <img src="/video_feed" width="640" height="480">
        </body>
    </html>
    """

@app.route("/video_feed")
def video_feed():
    """비디오 스트리밍 경로."""
    return Response(frame_generator(), mimetype='multipart/x-mixed-replace; boundary=frame')

# --- 메인 실행 ---
if __name__ == "__main__":
    try:
        logging.info("Flask 서버를 시작합니다. http://127.0.0.1:5001 로 접속하세요.")
        # threaded=True 옵션은 여러 클라이언트의 동시 접속을 원활하게 처리합니다.
        app.run(host="0.0.0.0", port=5001, threaded=True)
    except Exception as e:
        logging.error(f"서버 시작 중 오류 발생: {e}")
