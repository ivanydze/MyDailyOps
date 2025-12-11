#!/bin/bash

echo "================================================"
echo "Security Test for MyDailyOps"
echo "================================================"
echo ""
read -p "Enter Supabase URL: " SUPABASE_URL
read -p "Enter Supabase Anon Key: " SUPABASE_KEY
read -p "Enter User 1 Email: " USER1_EMAIL
read -s -p "Enter User 1 Password: " USER1_PASS
echo ""
read -p "Enter User 2 Email: " USER2_EMAIL
read -s -p "Enter User 2 Password: " USER2_PASS
echo ""
echo "Starting test..."
echo ""

VITE_SUPABASE_URL="$SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$SUPABASE_KEY" \
TEST_USER1_EMAIL="$USER1_EMAIL" \
TEST_USER1_PASSWORD="$USER1_PASS" \
TEST_USER2_EMAIL="$USER2_EMAIL" \
TEST_USER2_PASSWORD="$USER2_PASS" \
npx tsx test-security-api.ts

