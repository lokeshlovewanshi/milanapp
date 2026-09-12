#!/usr/bin/env bash
set -euo pipefail

TARGET_PERCENT="${1:-20}" # Defaults to 20%
TARGET_FLOAT=$(awk "BEGIN {print $TARGET_PERCENT / 100}")

echo "==> Configuring ${TARGET_PERCENT}% CPU Keep-Alive Service..."

# 1. Write the Python load generator script
sudo tee /usr/local/bin/keep_cpu_busy.py > /dev/null << EOF
import time
import multiprocessing

TARGET_UTILIZATION = ${TARGET_FLOAT}  # ${TARGET_PERCENT}% target
CYCLE_TIME = 0.1                      # 100ms cycle window

def generate_load():
    busy_time = CYCLE_TIME * TARGET_UTILIZATION
    sleep_time = CYCLE_TIME * (1.0 - TARGET_UTILIZATION)
    while True:
        start = time.perf_counter()
        while (time.perf_counter() - start) < busy_time:
            pass
        time.sleep(sleep_time)

if __name__ == '__main__':
    processes = []
    # Spawn one worker per CPU core to evenly maintain ${TARGET_PERCENT}%
    for _ in range(multiprocessing.cpu_count()):
        p = multiprocessing.Process(target=generate_load)
        p.daemon = True
        p.start()
        processes.append(p)
    
    for p in processes:
        p.join()
EOF

sudo chmod +x /usr/local/bin/keep_cpu_busy.py

# 2. Write the systemd service file
sudo tee /etc/systemd/system/keep-alive.service > /dev/null << EOF
[Unit]
Description=Keep CPU utilization at ${TARGET_PERCENT} percent to prevent idle reclamation
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /usr/local/bin/keep_cpu_busy.py
Restart=always
RestartSec=5
Nice=19

[Install]
WantedBy=multi-user.target
EOF

# 3. Reload systemd, enable and restart service
sudo systemctl daemon-reload
sudo systemctl enable keep-alive.service
sudo systemctl restart keep-alive.service

echo "==> Service keep-alive started successfully at ${TARGET_PERCENT}% CPU load!"
sudo systemctl status keep-alive.service --no-pager
