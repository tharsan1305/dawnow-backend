$Uri = "http://localhost:5000/api/auth/login"
$Body = @{
    username = "admin"
    password = "Admin@12345"
} | ConvertTo-Json

Write-Host "Sending login request..."
Write-Host "URI: $Uri"
Write-Host "Body: $Body"

try {
    $Response = Invoke-WebRequest -Uri $Uri -Method POST -ContentType "application/json" -Body $Body -ErrorAction Stop
    Write-Host "Status Code: $($Response.StatusCode)"
    Write-Host "Response Content:" 
    Write-Host $Response.Content
    
    $Data = $Response.Content | ConvertFrom-Json
    Write-Host "Token: $($Data.token)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response.StatusCode)"
}
