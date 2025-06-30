#!/bin/bash

# Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
#
# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied. See the License for the
# specific language governing permissions and limitations
# under the License.

# Start xvfb
xvfb-run --listen-tcp --server-num 98.0 -s "-ac -screen 0 1920x1080x24" pnpm run e2e-test > test-resources/output.txt 2>&1 &
XVFB_RUN_PID=$!

# Wait for xvfb to start (adjust the sleep time as needed)
sleep 2

# Start recording with ffmpeg
ffmpeg -video_size 1920x1080 -framerate 25 -f x11grab -i :98.0 test-resources/e2e-test-out.mp4

# Wait for the xvfb-run process to finish
wait $XVFB_RUN_PID

# Capture the exit code of xvfb-run process
XVFB_RUN_EXIT_CODE=$?

# Print Logs
echo 'log<<EOF' >> $GITHUB_OUTPUT
cat test-resources/output.txt
echo 'EOF' >> $GITHUB_OUTPUT
{
  echo 'LOG<<EOF'
  cat test-resources/output.txt
  echo EOF
} >> $GITHUB_OUTPUT

# Check if xvfb-run command failed
if [ $XVFB_RUN_EXIT_CODE -ne 0 ]; then
  echo "Run failed with exit code $XVFB_RUN_EXIT_CODE"
  exit $XVFB_RUN_EXIT_CODE
fi
