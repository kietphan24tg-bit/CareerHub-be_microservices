$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

docker compose -f (Join-Path $repoRoot 'docker-compose.observability.yml') down

& (Join-Path $PSScriptRoot 'cleanup-prometheus-cloudamqp-config.ps1')
