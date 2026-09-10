# Antigravity Quota Monitor Installer for Windows (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "Installing Antigravity Quota Monitor on Windows..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetApp = Join-Path $env:USERPROFILE ".gemini\antigravity"
$TargetBin = Join-Path $TargetApp "bin"

New-Item -ItemType Directory -Force -Path $TargetApp | Out-Null
New-Item -ItemType Directory -Force -Path $TargetBin | Out-Null

Copy-Item "$ScriptDir\antigravity_quota_injector.js" "$TargetApp\antigravity_quota_injector.js" -Force
Copy-Item "$ScriptDir\antigravity_quota_injector.js" "$TargetBin\antigravity_quota_injector.js" -Force
Copy-Item "$ScriptDir\quota_engine.py" "$TargetBin\quota_engine.py" -Force
Copy-Item "$ScriptDir\sync_daemon.py" "$TargetBin\sync_daemon.py" -Force

# Create Windows Startup Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$StartupFolder = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupFolder "AntigravityQuotaMonitor.lnk"
$PythonwCmd = (Get-Command pythonw.exe -ErrorAction SilentlyContinue)
$PythonwPath = if ($PythonwCmd) { $PythonwCmd.Source } else { "pythonw.exe" }

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PythonwPath
$Shortcut.Arguments = "`"$TargetBin\sync_daemon.py`""
$Shortcut.WorkingDirectory = $TargetBin
$Shortcut.WindowStyle = 7 # Minimized / Hidden
$Shortcut.Save()

Write-Host "Registered in Windows Startup folder: $ShortcutPath" -ForegroundColor Green

# Run once to sync immediately
Start-Process python -ArgumentList "`"$TargetBin\sync_daemon.py`" --once" -NoNewWindow -Wait

# Launch background daemon immediately via WScript.Shell (truly detached & hidden)
$WshShell.CurrentDirectory = $TargetBin
$WshShell.Run("`"$PythonwPath`" `"$TargetBin\sync_daemon.py`"", 0, $false)

Write-Host "Installation completed successfully! Background daemon is running and Antigravity model bar is updated." -ForegroundColor Green
