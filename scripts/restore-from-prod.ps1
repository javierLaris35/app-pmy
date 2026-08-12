<#
.SYNOPSIS
  Restaura la BD de produccion en el MySQL local disparando el endpoint del API
  directamente, SIN pasar por el dev server de Next.

.DESCRIPTION
  Hace login (POST /auth/token) para obtener el JWT de superadmin y luego
  consume el stream NDJSON de POST /server/backup/restore-from-prod, mostrando
  el progreso en vivo. Pensado para maquinas con poca RAM: al sacar a 'next dev'
  de la operacion se liberan ~3-4 GB durante los minutos que dura el restore.

.EXAMPLE
  .\scripts\restore-from-prod.ps1 -Email admin@delyaqui.com
  (pide la contrasena de forma segura y usa http://localhost:3000/api)

.EXAMPLE
  .\scripts\restore-from-prod.ps1 -Email admin@x.com -Password secreto -BaseUrl http://192.168.1.192:3000/api
#>
param(
  [Parameter(Mandatory = $true)] [string] $Email,
  [string] $Password,
  [string] $BaseUrl = "http://localhost:3000/api"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

if ([string]::IsNullOrWhiteSpace($Password)) {
  $secure = Read-Host "Contrasena de $Email" -AsSecureString
  $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

# 1) Login -> JWT
Write-Host "-> Autenticando en $BaseUrl/auth/token ..." -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/token" -Body $loginBody -ContentType "application/json"
} catch {
  Write-Host "[X] Login fallo: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
$token = $login.access_token
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "[X] El login no devolvio access_token." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Autenticado como $($login.user.email) [$($login.user.role)]" -ForegroundColor Green

# 2) Stream NDJSON del restore (ResponseHeadersRead = linea por linea, sin buffer)
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromHours(2)
$req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$BaseUrl/server/backup/restore-from-prod")
$req.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

Write-Host "-> Disparando restore-from-prod ..." -ForegroundColor Cyan
$resp = $client.SendAsync($req, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
if (-not $resp.IsSuccessStatusCode) {
  $err = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  Write-Host "[X] El API respondio $([int]$resp.StatusCode) $($resp.ReasonPhrase): $err" -ForegroundColor Red
  exit 1
}

$stream = $resp.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
$reader = New-Object System.IO.StreamReader($stream)
$exitCode = 0
try {
  while (-not $reader.EndOfStream) {
    $line = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try { $ev = $line | ConvertFrom-Json } catch { continue }

    switch ($ev.type) {
      "step" {
        Write-Progress -Activity "Restore prod -> local" -Status $ev.message -PercentComplete $ev.percent
      }
      "progress" {
        $extra = ""
        if ($ev.bytes) { $extra = " ({0:N0}/{1:N0} bytes)" -f [long]$ev.bytes, [long]$ev.totalBytes }
        $statusText = "{0} {1}%{2}" -f $ev.phase, $ev.percent, $extra
        Write-Progress -Activity "Restore prod -> local" -Status $statusText -PercentComplete $ev.percent
      }
      "log" {
        $color = if ($ev.stream -eq "stderr") { "Yellow" } else { "DarkGray" }
        Write-Host "  $($ev.line)" -ForegroundColor $color
      }
      "done" {
        Write-Progress -Activity "Restore prod -> local" -Completed
        Write-Host "[OK] $($ev.message)" -ForegroundColor Green
      }
      "error" {
        Write-Progress -Activity "Restore prod -> local" -Completed
        Write-Host "[X] $($ev.message)" -ForegroundColor Red
        $exitCode = 1
      }
    }
  }
} catch [System.IO.IOException] {
  Write-Host "[X] La conexion se corto a mitad del restore (el API cerro el stream)." -ForegroundColor Red
  Write-Host "    Casi seguro la API se cayo durante la restauracion. Revisa su terminal" -ForegroundColor Red
  Write-Host "    para ver el error real de mysql. La BD local quedo INCOMPLETA." -ForegroundColor Red
  $exitCode = 1
} finally {
  $reader.Dispose()
  $client.Dispose()
}
exit $exitCode
