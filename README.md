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
- เติม coin: `/coins` (PromptPay QR) และแลกโค้ด; แอดมินจัดการทุกอย่างที่หน้าแอดมิน (path ลับตาม `ADMIN_PATH`)
- หลังแก้ schema ให้รัน `npx drizzle-kit push` (ตารางใหม่: coin_wallets, coin_transactions, coin_codes, coin_code_redemptions, scheduled_horoscopes และคอลัมน์ payments.coins, payments.slip_trans_ref)

### ตัวแปร env ที่เกี่ยวข้อง

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `PAYSO_MERCHANT_ID`, `PAYSO_AUTH_KEY` | รับเงินด้วย Payso PromptPay QR (สร้าง QR) |
| `PAYSO_API_KEY`, `PAYSO_SECRET_KEY` | Inquiry API ของ Payso ใช้เช็กสถานะซ้ำก่อนเติม coin (postback ของ Payso ไม่มี signature) |
| `ADMIN_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | ล็อกอินและ path ลับของหน้าแอดมิน สร้างด้วย `npm run admin:setup` (ไม่ตั้ง ADMIN_PATH = ปิดหน้าแอดมิน) |
| `CRON_SECRET` | รหัสที่ cron ใช้เรียก `/api/cron/horoscopes` (Vercel แนบให้เองเมื่อตั้งค่าไว้) |

ตั้ง Postback URL ใน Payso Control Panel เป็น `https://โดเมน/api/payments/payso/postback` (Payso มีแค่ production ทดสอบด้วยเงินจริงขั้นต่ำ 6 บาท)

### ตารางสร้างดวงล่วงหน้า (`vercel.json`, เวลาไทย)

รายวันทุกเที่ยงคืน, รายสัปดาห์เที่ยงคืนวันอาทิตย์, รายเดือนเที่ยงคืนวันที่ 1 ผลเก็บในตาราง `scheduled_horoscopes` ทุกคนอ่านค่าเดียวกัน ถ้า cron ยังไม่รัน หน้าเว็บจะสร้างให้ครั้งแรกครั้งเดียวแล้วแคชไว้
