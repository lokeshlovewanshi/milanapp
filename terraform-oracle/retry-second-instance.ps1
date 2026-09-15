param(
    [int]$RetryDelaySeconds = 900
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

while ($true) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Output "[$timestamp] Requesting OCI Always Free second VM..."

    & terraform apply -target='oci_core_instance.dev[1]' -auto-approve -no-color
    if ($LASTEXITCODE -eq 0) {
        Write-Output 'Second VM created. Applying the remaining load-balancer backend configuration...'
        & terraform apply -auto-approve -no-color
        exit $LASTEXITCODE
    }

    Write-Output "Capacity is still unavailable. Retrying in $RetryDelaySeconds seconds."
    Start-Sleep -Seconds $RetryDelaySeconds
}
