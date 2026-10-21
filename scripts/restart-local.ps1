param([ValidateSet('start','dev')][string]$Mode = 'start')
$ErrorActionPreference = 'Stop'
$shopRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$nextCli = Join-Path $shopRoot 'node_modules\next\dist\bin\next'
if (!(Test-Path -LiteralPath $nextCli)) { throw 'Project dependencies are missing.' }
if ($Mode -eq 'start' -and !(Test-Path -LiteralPath (Join-Path $shopRoot '.next\BUILD_ID'))) { throw 'Build the project first, or use -Mode dev.' }
$nodePath = $null
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$candidates = @((Join-Path $env:LOCALAPPDATA 'hermes\node\node.exe'))
if ($nodeCommand) { $candidates += $nodeCommand.Source }
foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
        $version = & $candidate --version 2>$null
        if ($LASTEXITCODE -eq 0 -and $version -match '^v\d+\.') { $nodePath = $candidate; break }
    }
}
if (!$nodePath) { throw 'No working Node.js runtime found. Install or activate Node.js.' }
$listener = Get-NetTCPConnection -LocalPort 3019 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if ($owner.Name -ne 'node.exe' -or $owner.CommandLine -notlike ('*' + $shopRoot + '*') -or $owner.CommandLine -notmatch '\b(start|dev)\b.*--port(?:=|\s+)3019(?:\s|$)') {
        throw 'Port 3019 belongs to a different or unverified process; stop it manually.'
    }
    Stop-Process -Id $listener.OwningProcess
    Start-Sleep -Milliseconds 400
}
$logRoot = Join-Path $shopRoot '.local'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$server = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $nextCli + '"'),$Mode,'--hostname','127.0.0.1','--port','3019') -WorkingDirectory $shopRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'site-server.stdout.log') -RedirectStandardError (Join-Path $logRoot 'site-server.stderr.log') -PassThru
Write-Output ('ONEPIECE starting at http://127.0.0.1:3019 (PID ' + $server.Id + ').')
Write-Output 'Environment changes require a new login because local sessions are kept in memory.'
