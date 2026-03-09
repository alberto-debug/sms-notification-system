#!/bin/bash
# Africa's Talking SMS API Test Script
# This script demonstrates how to test the SMS sending functionality

BASE_URL="http://localhost:3000"

# Test 1: Send a single SMS message
echo "=== Test 1: Send a single SMS message ==="
curl -X POST "$BASE_URL/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "recipientPhone": "+254719833166",
    "messageContent": "Hello from SMS Notification System! This is a test message."
  }' | jq .

echo -e "\n\n=== Test 2: Check Africa'\''s Talking Account Balance ==="
curl -X GET "$BASE_URL/api/africas-talking/balance" \
  -H "Accept: application/json" | jq .

echo -e "\n\n=== Test 3: Get Dashboard Stats with Balance ==="
curl -X GET "$BASE_URL/api/dashboard/stats?userId=1&includeBalance=true" \
  -H "Accept: application/json" | jq .

echo -e "\n\n=== Test 4: Get Message History ==="
curl -X GET "$BASE_URL/api/messages?userId=1" \
  -H "Accept: application/json" | jq .

echo -e "\n\nTests completed!"

# Note: Replace +254711123456 with a valid phone number for your region
# For sandbox testing, check Africa's Talking documentation for test numbers
