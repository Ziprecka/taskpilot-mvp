import os
import time
import requests

BASE_URL = os.getenv("TASKPILOT_BASE_URL", "http://localhost:3000")
API_KEY = os.getenv("TASKPILOT_ROBOT_API_KEY", "")
ROBOT_ID = os.getenv("TASKPILOT_ROBOT_ID", "deskbot_001")


def headers():
    return {
        "Content-Type": "application/json",
        "x-taskpilot-robot-key": API_KEY,
    }


def post(path, payload):
    res = requests.post(f"{BASE_URL}{path}", headers=headers(), json=payload, timeout=20)
    print(f"POST {path} -> {res.status_code}")
    print(res.text)
    return res.json()


def get(path):
    res = requests.get(f"{BASE_URL}{path}", headers=headers(), timeout=20)
    print(f"GET {path} -> {res.status_code}")
    print(res.text)
    return res.json()


def patch(path, payload):
    res = requests.patch(f"{BASE_URL}{path}", headers=headers(), json=payload, timeout=20)
    print(f"PATCH {path} -> {res.status_code}")
    print(res.text)
    return res.json()


def main():
    if not API_KEY:
        raise RuntimeError("TASKPILOT_ROBOT_API_KEY is required")

    post(
        "/api/robot/register",
        {
            "robot_id": ROBOT_ID,
            "name": "TaskPilot DeskBot",
            "device_type": "raspberry_pi",
            "capabilities": {
                "speaker": True,
                "microphone": True,
                "camera": True,
                "screen": True,
                "movement": False,
                "leds": True,
            },
        },
    )

    post(
        "/api/robot/event",
        {
            "robot_id": ROBOT_ID,
            "event_type": "button_pressed",
            "content": "User pressed check-in button.",
            "metadata": {},
        },
    )

    while True:
        post("/api/robot/heartbeat", {"robot_id": ROBOT_ID, "battery": 92, "status": "idle"})
        command = get(f"/api/robot/command?robot_id={ROBOT_ID}")
        pending = command.get("command")
        if pending:
            print("Pending command:", pending)
            patch("/api/robot/command", {"command_id": pending["id"], "status": "acknowledged"})
        time.sleep(10)


if __name__ == "__main__":
    main()
