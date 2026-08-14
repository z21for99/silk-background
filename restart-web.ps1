# restart-web.ps1 — one-click restart of the dsh web GUI (loads silk-background).
# Safe: only kills node processes whose command line mentions dsh + "web --port"
# (the Next.js demo server and other node processes are untouched).
$ErrorActionPreference = "Continue"
$logOut = Join-Path $env:USERPROFILE ".dsh\web-restart.out.log"
$logErr = Join-Path $env:USERPROFILE ".dsh\web-restart.err.log"

Write-Host "== stopping current dsh web =="
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match "dsh" -and $_.CommandLine -match "web --port" } |
  ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Host "  killed PID $($_.ProcessId)" }
    catch { Write-Host "  could not kill PID $($_.ProcessId): $($_.Exception.Message)" }
  }

Start-Sleep -Seconds 3

Write-Host "== relaunching dsh web on port 17890 =="
$workdir = $env:USERPROFILE
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "npx -y @deepseek-ai/dsh web --port 17890" `
  -WorkingDirectory $workdir `
  -RedirectStandardOutput $logOut -RedirectStandardError $logErr `
  -WindowStyle Hidden

Write-Host "== done. Wait ~8 seconds, then refresh the browser at http://127.0.0.1:17890 =="
Write-Host "   logs: $logOut / $logErr"
