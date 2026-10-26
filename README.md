This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ระบบ coin และดวงตามตารางเวลา

- ฟรี: ดวงรายวัน `/daily-horoscope`, รายสัปดาห์ `/duang/weekly`, รายเดือน `/duang/monthly` (ตามราศี)
- บริการอื่นทั้งหมดต้อง ล็อกอิน + จ่าย coin ต่อครั้ง (ไม่มีสมาชิก/แพ็กเกจรายเดือน) ราคาแก้ที่ `src/lib/coin-config.ts`
- ผู้ใช้ใหม่ได้ coin ต้อนรับครั้งเดียว (`WELCOME_COINS` ใน `coin-config.ts`) ให้ตอนเปิด `/api/coins/balance` ครั้งแรก
- เติม coin: `/coins` (PromptPay QR) และแลกโค้ด; แอดมินสร้างโค้ดที่ `/admin/codes`
- หลังแก้ schema ให้รัน `npx drizzle-kit push` (ตารางใหม่: coin_wallets, coin_transactions, coin_codes, coin_code_redemptions, scheduled_horoscopes และคอลัมน์ payments.coins, payments.slip_trans_ref)

### ตัวแปร env ที่เกี่ยวข้อง

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `PROMPTPAY_ID` | เบอร์/เลขพร้อมเพย์ของบัญชีเราที่ใช้สร้าง QR รับเงิน |
| `ADMIN_EMAILS` | อีเมลแอดมิน คั่นด้วยจุลภาค |
| `CRON_SECRET` | รหัสที่ cron ใช้เรียก `/api/cron/horoscopes` (Vercel แนบให้เองเมื่อตั้งค่าไว้) |
| `SLIP2GO_API_URL`, `SLIP2GO_SECRET` | เปิดตรวจสลิปอัตโนมัติด้วย Slip2Go (ไม่ตั้ง = แอดมินยืนยันมือ) |
| `SLIP2GO_PROMPTPAY_TYPE` (`phone_number`/`citizen_id`/`e_wallet`), `SLIP2GO_ACCOUNT_NAME` | ให้ Slip2Go สร้าง QR จาก `PROMPTPAY_ID` ของเรา (ไม่ตั้ง/เรียกไม่สำเร็จ = สร้างเองในเครื่อง) |
| `SLIP2GO_RECEIVER_TYPE`, `SLIP2GO_RECEIVER_ACCOUNT` | ไม่บังคับ: ตรวจว่าสลิปโอนเข้าบัญชีเราจริง |

### ตารางสร้างดวงล่วงหน้า (`vercel.json`, เวลาไทย)

รายวันทุกเที่ยงคืน, รายสัปดาห์เที่ยงคืนวันอาทิตย์, รายเดือนเที่ยงคืนวันที่ 1 ผลเก็บในตาราง `scheduled_horoscopes` ทุกคนอ่านค่าเดียวกัน ถ้า cron ยังไม่รัน หน้าเว็บจะสร้างให้ครั้งแรกครั้งเดียวแล้วแคชไว้
