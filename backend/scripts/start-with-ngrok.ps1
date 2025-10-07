# PowerShell script to start backend with ngrok
# This script starts both the backend server and ngrok tunnel

Write-Host "================================" -ForegroundColor Cyan
Write-Host "WhatsApp Agent - Ngrok Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
Write-Host "Checking ngrok installation..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "ERROR: ngrok is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install ngrok using one of these methods:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Or run: choco install ngrok" -ForegroundColor White
    Write-Host "3. Or run: npm install -g ngrok" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Success: ngrok is installed" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    Write-Host "Please create .env file in backend directory" -ForegroundColor Yellow
    Write-Host "See .env.example or docs/NGROK_SETUP.md for reference" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "Success: .env file found" -ForegroundColor Green
Write-Host ""

# Get port from .env or use default
$PORT = 3000
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "PORT=(\d+)") {
        $PORT = $matches[1]
    }
}

Write-Host "Starting backend server on port $PORT..." -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Starting backend server...' -ForegroundColor Cyan; npm run dev" -PassThru

Write-Host "Success: Backend server starting in new window" -ForegroundColor Green
Write-Host ""

# Wait for backend to start
Write-Host "Waiting for backend to initialize (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$PORT" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Success: Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not verify backend is running" -ForegroundColor Yellow
    Write-Host "Check the backend terminal window for errors" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""

# Start ngrok in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting ngrok tunnel...' -ForegroundColor Cyan; Write-Host ''; ngrok http $PORT"

Write-Host "Success: Ngrok tunnel starting in new window" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 3

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Check ngrok terminal for your public URL" -ForegroundColor White
Write-Host "   Look for: Forwarding https://xxxx.ngrok-free.app" -ForegroundColor White
Write-Host ""
Write-Host "2. Copy the https URL" -ForegroundColor White
Write-Host ""
Write-Host "3. Update WhatsApp webhook in Twilio console:" -ForegroundColor White
Write-Host "   Webhook URL: https://YOUR-NGROK-URL.ngrok-free.app/webhook/whatsapp" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Open ngrok web interface: http://127.0.0.1:4040" -ForegroundColor White
Write-Host "   (Monitor incoming requests and debug)" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Send a test WhatsApp message to your business number" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop this script" -ForegroundColor Gray
Write-Host "Close terminal windows to stop servers" -ForegroundColor Gray
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Keep script running
Write-Host "Monitoring... (Press Ctrl+C to exit)" -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 60
    }
} finally {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor Yellow
}
