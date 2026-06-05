param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Password = "12345678"
)

$ErrorActionPreference = "Stop"

$email = "candidate-auth-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-JsonPost {
  param(
    [string]$Uri,
    [hashtable]$Body,
    [hashtable]$Headers,
    [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession
  )

  $payload = $Body | ConvertTo-Json

  if ($WebSession) {
    return Invoke-RestMethod -Method Post -Uri $Uri -ContentType "application/json" -Headers $Headers -Body $payload -WebSession $WebSession
  }

  return Invoke-RestMethod -Method Post -Uri $Uri -ContentType "application/json" -Headers $Headers -Body $payload
}

$register = Invoke-JsonPost `
  -Uri "$BaseUrl/auth/candidate/register" `
  -Headers @{ "x-request-id" = "req-register-smoke-001" } `
  -Body @{
    email = $email
    password = $Password
    confirmPassword = $Password
    acceptTerms = $true
    fullName = "Auth Smoke Candidate"
    phone = "0123456789"
  }

$login = Invoke-JsonPost `
  -Uri "$BaseUrl/auth/login" `
  -Headers @{ "x-request-id" = "req-login-smoke-001" } `
  -Body @{
    email = $email
    password = $Password
    rememberMe = $true
  } `
  -WebSession $session

$accessToken = $login.data.accessToken

$me = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/auth/me" `
  -Headers @{
    "x-request-id" = "req-me-smoke-001"
    "Authorization" = "Bearer $accessToken"
  }

$refresh = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/auth/refresh" `
  -Headers @{ "x-request-id" = "req-refresh-smoke-001" } `
  -WebSession $session

$logout = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/auth/logout" `
  -Headers @{ "x-request-id" = "req-logout-smoke-001" } `
  -WebSession $session

try {
  $null = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/auth/refresh" `
    -Headers @{ "x-request-id" = "req-refresh-smoke-002" } `
    -WebSession $session

  $refreshAfterLogout = @{
    unexpectedSuccess = $true
  }
} catch {
  $refreshAfterLogout = @{
    expectedFailure = $true
    message = $_.Exception.Message
  }
}

[ordered]@{
  email = $email
  register = @{
    message = $register.message
    userId = $register.data.userId
    role = $register.data.role
  }
  login = @{
    message = $login.message
    hasAccessToken = [bool]$login.data.accessToken
    userId = $login.data.user.id
    role = $login.data.user.role
  }
  me = @{
    message = $me.message
    email = $me.data.user.email
    userId = $me.data.user.id
    role = $me.data.user.role
  }
  refresh = @{
    message = $refresh.message
    hasAccessToken = [bool]$refresh.data.accessToken
    userId = $refresh.data.user.id
    role = $refresh.data.user.role
  }
  logout = @{
    message = $logout.message
    loggedOut = $logout.data.loggedOut
  }
  refreshAfterLogout = $refreshAfterLogout
} | ConvertTo-Json -Depth 8
