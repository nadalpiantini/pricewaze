#!/bin/bash

# ============================================================================
# PROCESS NCE JOBS
# ============================================================================
# This script processes pending NCE jobs by calling the calculate endpoint
# Can be run manually or via cron
# ============================================================================

# Get the API URL from environment or use default
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

# Get service role key (required for processing)
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  exit 1
fi

echo "Processing NCE jobs..."
echo "API URL: $API_URL"
echo "Timestamp: $(date)"

# Call the calculate endpoint
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"limit": 10}' \
  "$API_URL/api/negotiation/coherence/calculate")

echo "Response: $RESPONSE"

# Parse response
PROCESSED=$(echo $RESPONSE | grep -o '"processed":[0-9]*' | grep -o '[0-9]*')
ERRORS=$(echo $RESPONSE | grep -o '"errors":[0-9]*' | grep -o '[0-9]*')

if [ ! -z "$PROCESSED" ]; then
  echo "✅ Processed: $PROCESSED jobs"
  if [ ! -z "$ERRORS" ] && [ "$ERRORS" -gt 0 ]; then
    echo "⚠️  Errors: $ERRORS"
  fi
else
  echo "⚠️  No jobs to process or error occurred"
fi

