# Get current ngrok URL
# Fetches the public URL from ngrok API

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Current Ngrok URL" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method GET -TimeoutSec 5
    
    if ($response.tunnels.Count -eq 0) {
        Write-Host "⚠ No active tunnels found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Make sure ngrok is running:" -ForegroundColor White
        Write-Host "  ngrok http 3000" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }
    
    Write-Host "Active Tunnels:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($tunnel in $response.tunnels) {
        $publicUrl = $tunnel.public_url
        $localAddr = $tunnel.config.addr
        
        if ($publicUrl -like "https://*") {
            Write-Host "🌐 Public URL (HTTPS):" -ForegroundColor Cyan
            Write-Host "   $publicUrl" -ForegroundColor White
            Write-Host ""
            Write-Host "📱 WhatsApp Webhook URL:" -ForegroundColor Yellow
            Write-Host "   $publicUrl/webhook/whatsapp" -ForegroundColor White
            Write-Host ""
            Write-Host "🔗 Ngrok Web Interface:" -ForegroundColor Magenta
            Write-Host "   http://127.0.0.1:4040" -ForegroundColor White
            Write-Host ""
            Write-Host "➜ Local Address:" -ForegroundColor Gray
            Write-Host "   $localAddr" -ForegroundColor Gray
            Write-Host ""
            
            # Copy to clipboard if possible
            try {
                "$publicUrl/webhook/whatsapp" | Set-Clipboard
                Write-Host "✓ Webhook URL copied to clipboard!" -ForegroundColor Green
            } catch {
                # Clipboard not available, that's okay
            }
        }
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Copy the webhook URL above" -ForegroundColor White
    Write-Host "2. Go to: https://console.twilio.com/" -ForegroundColor White
    Write-Host "3. Update your WhatsApp webhook configuration" -ForegroundColor White
    Write-Host "4. Send a test message to your WhatsApp business number" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ ERROR: Could not connect to ngrok" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "• Ngrok is not running" -ForegroundColor White
    Write-Host "• Ngrok web interface is not on port 4040" -ForegroundColor White
    Write-Host ""
    Write-Host "To start ngrok:" -ForegroundColor Yellow
    Write-Host "  ngrok http 3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

