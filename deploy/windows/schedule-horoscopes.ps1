# รันใน PowerShell แบบ Administrator: สร้างงานตามเวลาแทน vercel.json (Vercel Cron ไม่ทำงานบน VPS)
# เรียก /api/cron/horoscopes เที่ยงคืนเวลาไทย: รายวันทุกคืน, รายสัปดาห์คืนวันอาทิตย์, รายเดือนวันที่ 1
# (ตัว API เช็กวันอาทิตย์/วันที่ 1 ให้เองและข้ามถ้าไม่ตรง จึงสั่งรันทุกคืนได้เลย)
param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [Parameter(Mandatory = $true)][string]$CronSecret
)
$ErrorActionPreference = "Stop"

# ให้เวลาเครื่องเป็นเวลาไทย เพื่อให้ 00:00 ของ Task Scheduler = เที่ยงคืนไทย
Set-TimeZone -Id "SE Asia Standard Time"

# เก็บ secret ไว้ในไฟล์ที่เฉพาะ Administrators/SYSTEM อ่านได้ ไม่ฝังในบรรทัดคำสั่งของงาน
$dir = "C:\apps\doodoungdi-cron"
New-Item -ItemType Directory -Force $dir | Out-Null
$secretFile = Join-Path $dir "secret.txt"
Set-Content -Path $secretFile -Value $CronSecret -NoNewline
icacls $dir /inheritance:r /grant:r "Administrators:(OI)(CI)F" "SYSTEM:(OI)(CI)F" | Out-Null

$runner = Join-Path $dir "run.ps1"
@"
`$secret = (Get-Content '$secretFile' -Raw).Trim()
foreach (`$kind in 'daily','weekly','monthly') {
  try {
    Invoke-RestMethod -Uri "$BaseUrl/api/cron/horoscopes?kind=`$kind" -Headers @{ Authorization = "Bearer `$secret" } -TimeoutSec 120 | Out-Null
  } catch { Write-Output "`$kind failed: `$(`$_.Exception.Message)" }
}
"@ | Set-Content -Path $runner -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "doodoungdi-horoscopes" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "สร้างงาน doodoungdi-horoscopes แล้ว (ทุกวัน 00:00 เวลาไทย)"
