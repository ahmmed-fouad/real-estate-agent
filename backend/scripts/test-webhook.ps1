# Test webhook endpoints
# Usage: .\scripts\test-webhook.ps1 [ngrok-url]

param(
    [string]$NgrokUrl = "http://localhost:3000"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Webhook Endpoint Tests" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = $NgrokUrl.TrimEnd('/')

Write-Host "Testing against: $baseUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Root health check
Write-Host "Test 1: Root Health Check" -ForegroundColor Yellow
Write-Host "GET $baseUrl/" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET -TimeoutSec 10
    Write-Host "✓ PASS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Webhook health check
Write-Host "Test 2: Webhook Health Check" -ForegroundColor Yellow
Write-Host "GET $baseUrl/webhook/health" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/webhook/health" -Method GET -TimeoutSec 10
    Write-Host "✓ PASS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Webhook verification (simulating WhatsApp)
Write-Host "Test 3: Webhook Verification (WhatsApp)" -ForegroundColor Yellow

# Try to get verify token from .env
$verifyToken = "test_token"
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "WHATSAPP_VERIFY_TOKEN=(.+)") {
        $verifyToken = $matches[1].Trim()
    }
}

$challenge = "test_challenge_string"
$verifyUrl = "$baseUrl/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=$challenge"

Write-Host "GET $baseUrl/webhook/whatsapp" -ForegroundColor Gray
Write-Host "  hub.mode=subscribe" -ForegroundColor Gray
Write-Host "  hub.verify_token=$verifyToken" -ForegroundColor Gray
Write-Host "  hub.challenge=$challenge" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $verifyUrl -Method GET -TimeoutSec 10
    if ($response -eq $challenge) {
        Write-Host "✓ PASS - Challenge echoed correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL - Challenge not echoed correctly" -ForegroundColor Red
        Write-Host "Expected: $challenge" -ForegroundColor Yellow
        Write-Host "Got: $response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check if ngrok web interface is accessible
if ($NgrokUrl -like "https://*.ngrok*.app") {
    Write-Host "Test 4: Ngrok Web Interface" -ForegroundColor Yellow
    Write-Host "Open: http://127.0.0.1:4040" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method GET -TimeoutSec 5
        Write-Host "✓ PASS - Ngrok interface is accessible" -ForegroundColor Green
        
        $tunnels = $response.tunnels
        if ($tunnels.Count -gt 0) {
            Write-Host ""
            Write-Host "Active Tunnels:" -ForegroundColor Cyan
            foreach ($tunnel in $tunnels) {
                Write-Host "  $($tunnel.public_url) -> $($tunnel.config.addr)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "⚠ WARNING - Ngrok web interface not accessible" -ForegroundColor Yellow
        Write-Host "Make sure ngrok is running" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed:" -ForegroundColor Green
Write-Host "1. Your backend is running correctly" -ForegroundColor White
Write-Host "2. Webhook endpoints are accessible" -ForegroundColor White
Write-Host "3. Ready to receive WhatsApp messages" -ForegroundColor White
Write-Host ""
Write-Host "Next: Update Twilio webhook with your ngrok URL" -ForegroundColor Yellow
Write-Host "Webhook URL: $baseUrl/webhook/whatsapp" -ForegroundColor Cyan
Write-Host ""

