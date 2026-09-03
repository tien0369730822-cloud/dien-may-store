 # Start Cloudflare Quick Tunnel pointing to localhost:5000
# Captures output to find the public https://*.trycloudflare.com URL

$cloudflared = "d:/webnguyênhung1/web/server/cloudflared.exe"
$logFile = "d:/webnguyênhung1/web/server/_tunnel.log"

# Remove old log
Remove-Item $logFile -ErrorAction SilentlyContinue

Write-Output "Starting Cloudflare tunnel to http://localhost:5000 ..."
Write-Output "The tunnel runs in the background. The URL will appear in $logFile"

# Start tunnel in background, redirect output to log
$proc = Start-Process -FilePath $cloudflared -ArgumentList "tunnel --url http://localhost:5000 --no-autoupdate" -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" -PassThru -NoNewWindow

Write-Output "Tunnel process started (PID: $($proc.Id))"
Write-Output "Waiting for URL assignment..."
Start-Sleep -Seconds 15

Write-Output "=== Log content ==="
if (Test-Path $logFile) { Get-Content $logFile }
if (Test-Path "$logFile.err") { Write-Output "---stderr---"; Get-Content "$logFile.err" }
