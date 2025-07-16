#!/bin/bash
cd /home/kavia/workspace/code-generation/app-generation-metrics-dashboard-44fe8aa2/kavia_templates_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

