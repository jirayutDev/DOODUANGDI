# ขึ้นเครื่อง Windows Server (RDP)

ทำบนเซิร์ฟเวอร์ผ่าน Remote Desktop ใน PowerShell แบบ Run as Administrator

## 0. ความปลอดภัยของเครื่องก่อนเริ่ม
- เปลี่ยนรหัสผ่าน Administrator (รหัสที่เคยส่งผ่านแชท/ข้อความถือว่ารั่วแล้ว)
- เปิด Network Level Authentication ของ RDP และจำกัดพอร์ต 3389 ให้เข้าได้เฉพาะ IP ของคุณ (Windows Firewall > Inbound Rules > Remote Desktop)
- เปิด Windows Update ให้ครบ
- เปิดพอร์ตภายนอกแค่ 80 และ 443 พอร์ต 3000 ของแอปฟังเฉพาะ 127.0.0.1

## 1. ติดตั้งเครื่องมือ
Windows Server 2019 ไม่มี winget และ Internet Explorer ที่มาพร้อมเครื่องมักโหลดไฟล์ไม่ได้ (IE Enhanced Security)
ให้ดาวน์โหลดผ่าน PowerShell แทน โดยบังคับ TLS 1.2 ก่อน:
```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest <url> -OutFile $env:TEMP\file.msi
```

- Node.js LTS (ให้ตรงกับที่ Next 16 ต้องการ ดู `engines`/เอกสาร) จาก https://nodejs.org
- Git for Windows
- Caddy (https://caddyserver.com/download) เป็น reverse proxy + HTTPS อัตโนมัติ
- (ไม่ต้องใช้ NSSM แล้ว: สคริปต์รันแอปด้วย Task Scheduler ของ Windows)

## 2. โดเมน
ตั้ง A record ของโดเมนให้ชี้ `154.197.69.93` ก่อน ใบรับรอง HTTPS ต้องใช้โดเมน
(การล็อกอินผ่าน Supabase ต้องใช้ https และ Redirect URL เป็นโดเมนจริง)

## 3. โค้ดและ env
```powershell
git clone <repo-url> C:\apps\doodoungdi
cd C:\apps\doodoungdi
git checkout features/redesign-coins-security   # หรือ main หลัง merge
copy .env.example .env.local                    # แล้วแก้ค่าจริงด้วย notepad
npm ci
$env:NODE_OPTIONS = "--max-old-space-size=2048"   # RAM เครื่องมี 4 GB กัน build กินเกิน
npm run build
```
ถ้า build ค้างหรือโดนฆ่าเพราะหน่วยความจำไม่พอ ให้เพิ่ม page file (System Properties > Advanced > Performance > Virtual memory)
หรือ build บนเครื่องของคุณ (Windows x64 เหมือนกัน) แล้วคัดลอก `.next`, `node_modules`, `package.json`, `next.config.ts`, `public` ไปที่เซิร์ฟเวอร์

ค่าที่ต้องใส่ใน `.env.local`: ดู [.env.example](../../.env.example)
- `NEXT_PUBLIC_SITE_URL` = `https://โดเมนของคุณ`
- `CRON_SECRET` = สตริงสุ่มยาว สร้างด้วย (ใช้ได้กับ PowerShell 5.1 ของ Server 2019)
  `-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })`
- `ADMIN_USER_IDS` = UUID ผู้ใช้ Supabase ของแอดมิน

## 4. Supabase (ทำครั้งเดียว ทำจากเครื่องไหนก็ได้)
```powershell
npx drizzle-kit push          # ต้องมี DATABASE_URL ใน environment
```
แล้วรัน `supabase/rls.sql` ในหน้า SQL Editor ของ Supabase
ตั้ง Site URL / Redirect URLs เป็นโดเมนจริง และเปิด "Confirm email"

## 5. รันแอปให้ทำงานต่อเนื่อง
ลงทะเบียนเป็นงานของ Task Scheduler (เริ่มเองตอนบูต, ล้มแล้วเริ่มใหม่ทุก 1 นาที):
```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\install-service.ps1
```
ตรวจ: `Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing` ต้องได้ 200 (รอสัก 10 วินาทีหลังสั่ง)
ดูบันทึก: `Get-Content C:\apps\doodoungdi\logs\out.log -Tail 50`

## 6. HTTPS ด้วย Caddy
แก้ `example.com` ใน `deploy\windows\Caddyfile` เป็นโดเมนจริง แล้ว
```powershell
New-NetFirewallRule -DisplayName "HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
caddy run --config deploy\windows\Caddyfile       # ทดสอบก่อน
```
พอใช้ได้ กด Ctrl+C หยุด แล้วลงทะเบียน Caddy ให้รันเองตอนบูต:
```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\install-service.ps1 -WithCaddy
```

## 7. ตารางสร้างดวง (แทน vercel.json)
```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\schedule-horoscopes.ps1 -CronSecret "<ค่าเดียวกับ CRON_SECRET>"
```
งานนี้ตั้งเวลาเครื่องเป็นเวลาไทย และรันทุก 00:00

## 8. อัปเดตโค้ดครั้งต่อไป
```powershell
cd C:\apps\doodoungdi
git pull
npm ci
npm run build
Stop-ScheduledTask doodoungdi-app
Start-ScheduledTask doodoungdi-app
```
