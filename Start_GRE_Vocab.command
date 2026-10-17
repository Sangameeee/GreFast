#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start lightweight local server if not already active on 8080
if ! lsof -i :8080 | grep LISTEN > /dev/null 2>&1; then
    nohup python3 -m http.server 8080 --directory "$DIR" > /dev/null 2>&1 &
    sleep 0.4
fi

# Open in default browser
open "http://127.0.0.1:8080/index.html" || open "$DIR/index.html"
