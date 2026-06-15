$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$templatePath = Join-Path $repoRoot 'infrastructure/observability/stack/prometheus/prometheus.cloudamqp.yml.template'
$outputPath = Join-Path $repoRoot 'infrastructure/observability/stack/prometheus/prometheus.generated.yml'

$cloudAmqpUrl = $env:CLOUDAMQP_PROMETHEUS_URL
$cloudAmqpUsername = $env:CLOUDAMQP_PROMETHEUS_USERNAME
$cloudAmqpPassword = $env:CLOUDAMQP_PROMETHEUS_PASSWORD

if ([string]::IsNullOrWhiteSpace($cloudAmqpUrl)) {
  throw 'CLOUDAMQP_PROMETHEUS_URL is required. Example: https://your-instance-host/metrics/detailed'
}

$uri = [System.Uri]::new($cloudAmqpUrl)

if ([string]::IsNullOrWhiteSpace($cloudAmqpUsername) -and -not [string]::IsNullOrWhiteSpace($uri.UserInfo)) {
  $userInfoParts = $uri.UserInfo.Split(':', 2)
  if ($userInfoParts.Length -ge 1) {
    $cloudAmqpUsername = [System.Uri]::UnescapeDataString($userInfoParts[0])
  }
  if ($userInfoParts.Length -eq 2 -and [string]::IsNullOrWhiteSpace($cloudAmqpPassword)) {
    $cloudAmqpPassword = [System.Uri]::UnescapeDataString($userInfoParts[1])
  }
}

if ([string]::IsNullOrWhiteSpace($cloudAmqpUsername)) {
  throw 'CLOUDAMQP_PROMETHEUS_USERNAME is required when not embedded in CLOUDAMQP_PROMETHEUS_URL.'
}

if ([string]::IsNullOrWhiteSpace($cloudAmqpPassword)) {
  throw 'CLOUDAMQP_PROMETHEUS_PASSWORD is required when not embedded in CLOUDAMQP_PROMETHEUS_URL.'
}

$scheme = $uri.Scheme
$target = $uri.Authority
$metricsPath = $uri.AbsolutePath

if ([string]::IsNullOrWhiteSpace($metricsPath) -or $metricsPath -eq '/') {
  $metricsPath = '/metrics/detailed'
}

$template = Get-Content -Raw -Path $templatePath
$rendered = (
  $template.Replace('__CLOUDAMQP_PROMETHEUS_SCHEME__', $scheme)
).Replace('__CLOUDAMQP_PROMETHEUS_PATH__', $metricsPath).
  Replace('__CLOUDAMQP_PROMETHEUS_TARGET__', $target).
  Replace('__CLOUDAMQP_PROMETHEUS_USERNAME__', $cloudAmqpUsername.Replace('"', '\"')).
  Replace('__CLOUDAMQP_PROMETHEUS_PASSWORD__', $cloudAmqpPassword.Replace('"', '\"'))

Set-Content -Path $outputPath -Value $rendered -NoNewline
Write-Output "Rendered Prometheus config to $outputPath for target $target$metricsPath"
