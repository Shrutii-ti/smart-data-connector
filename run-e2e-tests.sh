#!/bin/bash

# Script to run e2e tests with all required services
# This script starts mock-server, backend, and frontend, then runs Cypress tests

echo "Starting e2e test environment..."

# Kill any existing processes on the required ports
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start mock server in background
echo "Starting mock server on port 3001..."
cd backend && npm run start:mock &
MOCK_PID=$!

# Wait for mock server to be ready
sleep 2

# Start backend in background
echo "Starting backend server on port 3000..."
npm start &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Go back to root
cd ..

# Run Cypress tests (frontend dev server will start automatically)
echo "Running Cypress e2e tests..."
cd frontend && npm run test:e2e
TEST_EXIT_CODE=$?

# Cleanup: kill background processes
echo "Cleaning up..."
kill $MOCK_PID 2>/dev/null || true
kill $BACKEND_PID 2>/dev/null || true

# Exit with test exit code
exit $TEST_EXIT_CODE
