# รันใน PowerShell แบบ Administrator บนเซิร์ฟเวอร์ หลัง npm ci && npm run build แล้ว
# ลงทะเบียนแอป (และ Caddy ถ้าใส่ -WithCaddy) เป็นงานของ Task Scheduler ที่:
#   - เริ่มเองตอนเครื่องบูต (รันเป็น SYSTEM ไม่ต้องล็อกอินค้างไว้)
#   - ถ้าโปรแกรมล้ม ให้เริ่มใหม่ทุก 1 นาที
# ใช้ของที่มากับ Windows จึงไม่ต้องพึ่ง NSSM หรือโปรแกรมภายนอก
param(
  [string]$AppDir = "C:\apps\doodoungdi",
  [int]$Port = 3000,
  [switch]$WithCaddy
)
$ErrorActionPreference = "Stop"

$node = (Get-Command node).Source
$nextBin = Join-Path $AppDir "node_modules\next\dist\bin\next"
if (-not (Test-Path $nextBin)) { throw "ไม่พบ $nextBin — รัน npm ci && npm run build ก่อน" }
if (-not (Test-Path (Join-Path $AppDir ".env.local"))) { throw "ไม่พบ .env.local ใน $AppDir" }

$logs = Join-Path $AppDir "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

function Register-AppTask($name, $command) {
  $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$command`"" -WorkingDirectory $AppDir
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  Start-ScheduledTask -TaskName $name
  Write-Host "เริ่มงาน $name แล้ว"
}

# แอป Next.js ฟังเฉพาะ 127.0.0.1 (เปิดสู่ภายนอกผ่าน Caddy เท่านั้น)
Register-AppTask "doodoungdi-app" "`"$node`" `"$nextBin`" start -p $Port -H 127.0.0.1 >> `"$logs\out.log`" 2>&1"

if ($WithCaddy) {
  $caddy = (Get-Command caddy).Source
  $caddyfile = Join-Path $AppDir "deploy\windows\Caddyfile"
  Register-AppTask "doodoungdi-caddy" "`"$caddy`" run --config `"$caddyfile`" >> `"$logs\caddy.log`" 2>&1"
}

Write-Host "ดูบันทึก: $logs"
Write-Host "รีสตาร์ท: Stop-ScheduledTask doodoungdi-app; Start-ScheduledTask doodoungdi-app"
