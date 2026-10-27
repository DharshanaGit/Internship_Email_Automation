param(
    [int]$Port = 3000
)

Write-Host "Checking for processes listening on port ${Port}..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if (-not $connections) {
    Write-Host "Port ${Port} is free and ready to use." -ForegroundColor Green
    exit 0
}

foreach ($conn in $connections) {
    $pidToKill = $conn.OwningProcess
    if ($pidToKill -and $pidToKill -ne 0) {
        $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
        Write-Host "Found process listening on port ${Port}: PID $pidToKill ($($proc.Name))" -ForegroundColor Yellow
        try {
            Stop-Process -Id $pidToKill -Force -ErrorAction Stop
            Write-Host "Successfully stopped PID $pidToKill." -ForegroundColor Green
        } catch {
            Write-Host "Failed to stop PID $pidToKill : $_" -ForegroundColor Red
        }
    }
}

Write-Host "Port ${Port} is now cleared." -ForegroundColor Green
