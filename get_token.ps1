$body = @{
    code = "1000.1d7b7d56c760608797ec7de81c3b520b.4273fc6387b519240e443109996b005f"
    client_id = "1000.CGGK0M58LOXYJG9IR23UZ5G7XAZZBA"
    client_secret = "f60455449d30984ca1c026a872a2395cb5100dba36"
    grant_type = "authorization_code"
}

try {
    $response = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method POST -Body $body
    Write-Host "RefreshToken: $($response.refresh_token)"
    Write-Host "AccessToken: $($response.access_token)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Details: $($_.ErrorDetails.Message)"
}
