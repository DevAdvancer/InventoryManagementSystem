# =====================================================================
# Inventory & Order Management System — local start script (PowerShell)
# ---------------------------------------------------------------------
# Same behaviour as scripts/start.sh for Windows / PowerShell users.
#
# Usage:
#   .\scripts\start.ps1            # docker compose up --build (default)
#   .\scripts\start.ps1 dev        # uvicorn + npm start (hot reload)
#   .\scripts\start.ps1 down       # stop the stack
#   .\scripts\start.ps1 logs       # tail logs
#   .\scripts\start.ps1 status     # show running services
#   .\scripts\start.ps1 clean      # stop + remove containers and volumes
# =====================================================================

param(
  [ValidateSet('up','dev','down','logs','status','clean','help')]
  [string]$Command = 'up'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $ProjectRoot

function Info($m)  { Write-Host "▸ $m" -ForegroundColor Cyan }
function Ok($m)    { Write-Host "✓ $m" -ForegroundColor Green }
function Warn($m)  { Write-Host "! $m" -ForegroundColor Yellow }
function Err($m)   { Write-Host "✗ $m" -ForegroundColor Red }
function Hr()      { Write-Host "────────────────────────────────────────────────────" -ForegroundColor DarkGray }
function Bold($m)  { Write-Host $m -ForegroundColor White }

function Ensure-Env {
  if (-not (Test-Path '.env')) {
    Warn '.env not found — creating one from .env.example'
    Copy-Item '.env.example' '.env'
    Ok 'Created .env (please edit it with your Railway DATABASE_URL)'
  }
}

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Err "Required command not found: $name"
    exit 1
  }
}

function Get-Compose {
  if (Get-Command 'docker' -ErrorAction SilentlyContinue) {
    $ver = (docker compose version 2>$null)
    if ($LASTEXITCODE -eq 0) { return @('docker','compose') }
  }
  if (Get-Command 'docker-compose' -ErrorAction SilentlyContinue) {
    return @('docker-compose')
  }
  Err "Neither 'docker compose' nor 'docker-compose' is available"
  exit 1
}

function Cmd-Up {
  Hr
  Bold "Starting Inventory Management System (docker compose)"
  Hr
  Require-Cmd docker
  $compose = Get-Compose
  Ensure-Env
  if (Select-String -Path '.env' -Pattern 'USER:PASSWORD@HOST' -Quiet) {
    Warn 'DATABASE_URL still has the placeholder value.'
    Write-Host '  Edit .env and paste your real Railway Postgres URL before continuing.'
  } else {
    Ok 'DATABASE_URL looks configured.'
  }
  & $compose[0] $compose[1..($compose.Length-1)] up -d --build
  Hr
  Bold "URLs"
  Hr
  Write-Host "  Frontend      http://localhost:8080" -ForegroundColor Cyan
  Write-Host "  Backend API   http://localhost:8000" -ForegroundColor Cyan
  Write-Host "  API docs      http://localhost:8000/docs" -ForegroundColor Cyan
  Hr
  Bold "Tip"
  Write-Host "  Run .\scripts\start.ps1 logs to follow the logs."
  Write-Host "  Run .\scripts\start.ps1 down to stop the stack."
  Hr
}

function Cmd-Down {
  Require-Cmd docker
  $compose = Get-Compose
  & $compose[0] $compose[1..($compose.Length-1)] down
  Ok 'Stack stopped'
}

function Cmd-Logs {
  Require-Cmd docker
  $compose = Get-Compose
  & $compose[0] $compose[1..($compose.Length-1)] logs -f --tail=200
}

function Cmd-Status {
  Require-Cmd docker
  $compose = Get-Compose
  & $compose[0] $compose[1..($compose.Length-1)] ps
}

function Cmd-Clean {
  Require-Cmd docker
  $compose = Get-Compose
  & $compose[0] $compose[1..($compose.Length-1)] down -v --remove-orphans
  Ok 'Containers and volumes removed'
}

function Cmd-Help {
  Write-Host @"
Usage:
  .\scripts\start.ps1            docker compose up --build (default)
  .\scripts\start.ps1 dev        uvicorn + npm start (hot reload)
  .\scripts\start.ps1 down       stop the stack
  .\scripts\start.ps1 logs       tail logs
  .\scripts\start.ps1 status     show running services
  .\scripts\start.ps1 clean      stop + remove containers and volumes
  .\scripts\start.ps1 help       show this help
"@
}

switch ($Command) {
  'up'     { Cmd-Up }
  'down'   { Cmd-Down }
  'logs'   { Cmd-Logs }
  'status' { Cmd-Status }
  'clean'  { Cmd-Clean }
  'help'   { Cmd-Help }
  'dev'    {
    Hr
    Bold "Dev mode (uvicorn + npm start) is not yet implemented in PowerShell — use the bash script on macOS/Linux."
    Hr
  }
  default  { Cmd-Help; exit 1 }
}