# DeskBot Python Client

## Install

```bash
pip install requests
```

## Environment variables

```bash
TASKPILOT_BASE_URL=http://localhost:3000
TASKPILOT_ROBOT_API_KEY=your_key
TASKPILOT_ROBOT_ID=deskbot_001
```

## Run

```bash
python deskbot_client.py
```

What it does:
- Registers the robot
- Sends a `button_pressed` test event
- Sends heartbeat every 10 seconds
- Fetches pending command
- Prints command and acknowledges it
