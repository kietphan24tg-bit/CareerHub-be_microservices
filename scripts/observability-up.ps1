$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $repoRoot '.env'

if (Test-Path -LiteralPath $envPath) {
  foreach ($line in Get-Content -Path $envPath) {
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf('=')
    if ($separatorIndex -lt 1) {
      continue
    }

    $name = $trimmed.Substring(0, $separatorIndex).Trim()
    $value = $trimmed.Substring($separatorIndex + 1).Trim()

    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

& (Join-Path $PSScriptRoot 'render-prometheus-cloudamqp-config.ps1')

docker compose -f (Join-Path $repoRoot 'docker-compose.observability.yml') up -d
