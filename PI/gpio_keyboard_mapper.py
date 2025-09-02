import time
import logging
from gpiozero import Button, Device
from pynput.keyboard import Controller, Key

# --- 로깅 설정 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 설정 ---
# 라즈베리파이가 아닌 다른 환경에서 테스트할 경우, 아래 라인의 주석을 해제하세요.
# from gpiozero.pins.mock import MockFactory
# Device.pin_factory = MockFactory()

# 사용할 GPIO 핀 번호 (BCM 모드)
# 충돌을 피하기 위해 I2C(2,3) 등 특수 목적 핀이 아닌 일반 GPIO 핀을 사용합니다.
NORMAL_BUTTON_PIN = 17   # '정상' 버튼
ABNORMAL_BUTTON_PIN = 27 # '비정상' 버튼
EXIT_BUTTON_PIN = 22     # '종료' 버튼

# 매핑할 키보드 키
NORMAL_KEY = 'n'
ABNORMAL_KEY = 'a'
EXIT_KEY = 'x'

# pynput 키보드 컨트롤러 초기화
keyboard = Controller()

# --- 버튼 눌렸을 때 실행될 함수 ---

def press_normal_key():
    """'정상' 버튼이 눌리면 NORMAL_KEY를 누릅니다."""
    logging.info(f"'정상' 버튼(GPIO {NORMAL_BUTTON_PIN}) 눌림 -> '{NORMAL_KEY}' 키 입력 시뮬레이션")
    keyboard.press(NORMAL_KEY)
    keyboard.release(NORMAL_KEY)

def press_abnormal_key():
    """'비정상' 버튼이 눌리면 ABNORMAL_KEY를 누릅니다."""
    logging.info(f"'비정상' 버튼(GPIO {ABNORMAL_BUTTON_PIN}) 눌림 -> '{ABNORMAL_KEY}' 키 입력 시뮬레이션")
    keyboard.press(ABNORMAL_KEY)
    keyboard.release(ABNORMAL_KEY)

def press_exit_key():
    """'종료' 버튼이 눌리면 EXIT_KEY를 누릅니다."""
    logging.info(f"'종료' 버튼(GPIO {EXIT_BUTTON_PIN}) 눌림 -> '{EXIT_KEY}' 키 입력 시뮬레이션")
    keyboard.press(EXIT_KEY)
    keyboard.release(EXIT_KEY)

# --- 메인 로직 ---
def main():
    """메인 프로그램을 실행합니다."""
    try:
        logging.info("GPIO-키보드 매퍼를 시작합니다.")
        logging.info(f"  정상 버튼: GPIO {NORMAL_BUTTON_PIN} -> Key '{NORMAL_KEY}'")
        logging.info(f"  비정상 버튼: GPIO {ABNORMAL_BUTTON_PIN} -> Key '{ABNORMAL_KEY}'")
        logging.info(f"  종료 버튼: GPIO {EXIT_BUTTON_PIN} -> Key '{EXIT_KEY}'")

        # GPIO 버튼 객체 생성
        # VCC, OUT, GND 3핀 버튼 모듈은 pull_up=False 로 설정해야 합니다.
        normal_button = Button(NORMAL_BUTTON_PIN, pull_up=False)
        abnormal_button = Button(ABNORMAL_BUTTON_PIN, pull_up=False)
        exit_button = Button(EXIT_BUTTON_PIN, pull_up=False)

        # 버튼이 눌렸을 때 실행될 함수 연결
        normal_button.when_pressed = press_normal_key
        abnormal_button.when_pressed = press_abnormal_key
        exit_button.when_pressed = press_exit_key

        logging.info("버튼 입력 대기 중... (Ctrl+C로 종료)")
        # 스크립트가 바로 종료되지 않도록 무한 대기
        while True:
            time.sleep(1)

    except Exception as e:
        logging.error(f"프로그램 실행 중 오류 발생: {e}")
    finally:
        logging.info("프로그램을 종료합니다.")

if __name__ == "__main__":
    main()