$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputPath = Join-Path $repoRoot 'infrastructure/observability/stack/prometheus/prometheus.generated.yml'

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
  Write-Output "Removed rendered Prometheus config at $outputPath"
} else {
  Write-Output "No rendered Prometheus config to remove at $outputPath"
}
