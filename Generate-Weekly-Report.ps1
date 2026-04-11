$ErrorActionPreference = "Stop"

$AdminUsername = "admin"
$AdminPassword = "Admin@12345"
$ApiBase = "http://localhost:5000"

# Get current week (Monday to Saturday)
$Now = Get-Date
$DayOfWeek = $Now.DayOfWeek
$DaysToMonday = [int]$DayOfWeek - 1
if ($DaysToMonday -lt 0) { $DaysToMonday = 6 }
$Monday = $Now.AddDays(-$DaysToMonday).Date
$Saturday = $Monday.AddDays(5)

Write-Host "`nPDF Report Generator" -ForegroundColor Cyan
Write-Host "===================================================="
Write-Host "Period: $($Monday.ToShortDateString()) to $($Saturday.ToShortDateString())"
Write-Host "====================================================" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`nAuthenticating..." -ForegroundColor Yellow

try {
    $LoginUri = "$ApiBase/api/auth/login"
    $LoginBody = @{
        username = $AdminUsername
        password = $AdminPassword
    } | ConvertTo-Json

    $LoginResponse = Invoke-WebRequest -Uri $LoginUri -Method POST `
        -ContentType "application/json" `
        -Body $LoginBody -UseBasicParsing

    $LoginData = $LoginResponse.Content | ConvertFrom-Json
    $Token = $LoginData.token
    Write-Host "Authentication successful" -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Generate PDF
Write-Host "Generating PDF report..." -ForegroundColor Yellow

try {
    $FromDate = $Monday.ToUniversalTime().ToString("o")
    $ToDate = $Saturday.ToUniversalTime().ToString("o")
    $PdfUri = "$ApiBase/api/reports/pdf"
    
    # Create output directory if it doesn't exist
    $OutputDir = "g:\java apache maven file"
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force -ErrorAction SilentlyContinue | Out-Null
    }
    
    # Generate filename with timestamp
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $OutputFile = Join-Path $OutputDir "CFRD-Weekly-Report_$Timestamp.pdf"
    
    $Headers = @{
        "Authorization" = "Bearer $Token"
    }
    
    $FullUri = "$PdfUri`?from=$([Uri]::EscapeDataString($FromDate))&to=$([Uri]::EscapeDataString($ToDate))"
    
    Invoke-WebRequest -Uri $FullUri -Method GET `
        -Headers $Headers `
        -OutFile $OutputFile -UseBasicParsing
    
    $FileSize = (Get-Item $OutputFile).Length / 1024
    Write-Host "`nPDF Generated Successfully!" -ForegroundColor Green
    Write-Host "Location: $OutputFile"
    Write-Host "Size: $('{0:F2}' -f $FileSize) KB"
    Write-Host "`n====================================================" -ForegroundColor Green
}
catch {
    Write-Host "PDF generation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode)"
    }
    exit 1
}
