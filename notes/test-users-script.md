$api = "http://localhost:4000"

$users = @(
  [pscustomobject]@{ name = "Admin User"; email = "admin@answly.local"; password = "Secret123!" },
  [pscustomobject]@{ name = "Alice Test"; email = "alice@answly.local"; password = "Secret123!" },
  [pscustomobject]@{ name = "Bob Test";   email = "bob@answly.local";   password = "Secret123!" },
  [pscustomobject]@{ name = "Cara Test";  email = "cara@answly.local";  password = "Secret123!" }
)

Write-Host "Registering users..."
foreach ($u in $users) {
  try {
    $body = $u | ConvertTo-Json -Depth 3
    $res = Invoke-RestMethod -Uri "$api/auth/register" -Method Post -ContentType "application/json" -Body $body
    Write-Host "Registered $($u.email)"
  } catch {
    $statusCode = $null
    if ($_.Exception.Response) { $statusCode = $_.Exception.Response.StatusCode.value__ }
    if ($statusCode -eq 409) {
      Write-Host "$($u.email) already exists, skipping"
    } else {
      $msg = $_.Exception.Message
      if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $msg += " - $($_.ErrorDetails.Message)" }
      Write-Host "Failed for $($u.email): $msg"
    }
  }
}