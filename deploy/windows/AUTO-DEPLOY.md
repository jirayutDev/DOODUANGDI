# ดีพลอยอัตโนมัติจาก GitHub

push เข้า `main` -> GitHub Actions สั่ง runner บนเซิร์ฟเวอร์ ดึงโค้ด, ติดตั้ง, ตรวจ type, build แล้วรีสตาร์ทแอป
ไฟล์ workflow: [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)

ต้องทำครั้งแรกให้แอปรันได้ด้วยมือก่อน (README ขั้น 1–5: มี `C:\apps\doodoungdi`, `.env.local`, และงาน `doodoungdi-app`)

## ติดตั้ง runner บนเซิร์ฟเวอร์ (ครั้งเดียว)
1. บน GitHub: repo > Settings > Actions > Runners > **New self-hosted runner** > Windows x64
   หน้านั้นให้คำสั่งดาวน์โหลดและโทเคนลงทะเบียน (โทเคนหมดอายุเร็ว อย่าแชร์)
2. บนเซิร์ฟเวอร์ (PowerShell แบบ Administrator) ทำตามคำสั่งดาวน์โหลดที่หน้านั้นให้ลงใน `C:\actions-runner`
   (ตั้ง TLS 1.2 ก่อนเหมือนขั้น 1 ของ README) แล้วลงทะเบียน:
```powershell
cd C:\actions-runner
.\config.cmd --url https://github.com/<owner>/<repo> --token <TOKEN> --labels doodoungdi --runasservice --windowslogonaccount "NT AUTHORITY\SYSTEM" --unattended
```
   รันเป็น SYSTEM เพื่อให้สั่งหยุด/เริ่มงาน `doodoungdi-app` (ที่รันเป็น SYSTEM เหมือนกัน) ได้
3. ตรวจ: Settings > Actions > Runners ต้องเห็น runner สถานะ **Idle**

## ความปลอดภัย (สำคัญ)
runner รันโค้ดจาก repo ด้วยสิทธิ์ SYSTEM บนเซิร์ฟเวอร์ที่เก็บ `.env.local` จึงต้อง:
- ใช้กับ repo **private** เท่านั้น (ห้ามใช้ self-hosted runner กับ repo สาธารณะที่รับ PR จากคนนอก)
- ตั้ง branch protection ให้ `main` ต้องผ่าน Pull Request และจำกัดคนที่ merge ได้
- workflow ตั้งให้รันเฉพาะ `push` เข้า `main` ไม่รันตอน `pull_request`
- ห้ามใส่ secret ลง repo secrets ถ้าไม่จำเป็น ค่าจริงอยู่ใน `.env.local` บนเซิร์ฟเวอร์

## สิ่งที่ workflow ไม่ทำ (ต้องทำเองเมื่อจำเป็น)
- **เปลี่ยน schema ฐานข้อมูล:** `npx drizzle-kit push` ไม่รันอัตโนมัติ เพราะอาจลบข้อมูลได้ รันเองเมื่อแก้ `src/db/schema.ts`
- **เปลี่ยนค่า `.env.local`:** แก้ในเซิร์ฟเวอร์ แล้วรีสตาร์ทงาน `Stop-ScheduledTask doodoungdi-app; Start-ScheduledTask doodoungdi-app`
- **ย้อนกลับ:** Actions > Deploy > เลือกรันซ้ำของ commit ก่อนหน้า (Re-run) หรือ revert ใน git แล้ว push

## ข้อจำกัดที่ควรรู้
- ระหว่าง build (ประมาณ 1–3 นาที) เว็บจะล่มชั่วคราว ถ้า build ล้มเหลว workflow จะเริ่มแอปรุ่นเดิมกลับมา
- RAM 4 GB: ถ้า build ล้มเพราะหน่วยความจำ ให้เพิ่ม page file
