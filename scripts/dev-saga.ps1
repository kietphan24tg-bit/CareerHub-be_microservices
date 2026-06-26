# Khởi động 5 service cần cho demo Saga đăng ký, mỗi service 1 cửa sổ terminal.
# Build 1 lần (tuần tự) để tránh race khi build:packages, rồi mở 5 cửa sổ chạy `start`.
#
# Dùng:
#   pnpm run dev:saga                     (build + mở 5 cửa sổ)
#   pnpm run dev:saga:skip-build          (bỏ qua build, mở luôn)
#   powershell -ExecutionPolicy Bypass -File scripts/dev-saga.ps1 [-SkipBuild]

param(
  [switch]$SkipBuild
)

$root = Split-Path $PSScriptRoot -Parent

# Thứ tự: hạ tầng (iam/candidate/employer) -> orchestrator (workflow) -> cong vao (gateway)
$services = @(
  'iam-service',
  'candidate-service',
  'employer-service',
  'workflow-service',
  'gateway'
)

if (-not $SkipBuild) {
  Write-Host '==> Building shared packages...' -ForegroundColor Cyan
  pnpm -C $root build:packages
  if ($LASTEXITCODE -ne 0) { Write-Host 'build:packages FAILED' -ForegroundColor Red; exit 1 }

  foreach ($svc in $services) {
    Write-Host "==> Building @careerhub/$svc ..." -ForegroundColor Cyan
    pnpm -C $root --filter "@careerhub/$svc" build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build $svc FAILED" -ForegroundColor Red; exit 1 }
  }
}

Write-Host '==> Opening 5 terminals (start)...' -ForegroundColor Green
foreach ($svc in $services) {
  $inner = "Set-Location '$root'; " +
           "`$Host.UI.RawUI.WindowTitle = '$svc'; " +
           "Write-Host 'SERVICE: $svc' -ForegroundColor Yellow; " +
           "pnpm --filter '@careerhub/$svc' start"
  Start-Process -FilePath 'powershell.exe' `
    -WorkingDirectory $root `
    -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $inner)
  Start-Sleep -Milliseconds 600   # gian cach de Windows mo cua so on dinh
}

Write-Host ''
Write-Host 'Da mo 5 cua so: iam, candidate, employer, workflow, gateway.' -ForegroundColor Green
Write-Host 'Gateway HTTP: http://localhost:3000' -ForegroundColor Green
Write-Host 'Neu cua so nao tat ngay => service do crash: doc loi trong cua so do (thuong la .env / DB).' -ForegroundColor DarkGray
