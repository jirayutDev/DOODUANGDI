// สร้างค่า env สำหรับล็อกอินแอดมิน: node scripts/admin-setup.mjs (หรือ npm run admin:setup)
// ถามรหัสผ่านแบบไม่แสดงตัวอักษร แล้วพิมพ์ ADMIN_PASSWORD_HASH / ADMIN_SESSION_SECRET / ADMIN_PATH ให้คัดลอกไปใส่ env
// ไม่พิมพ์รหัสผ่านจริงออกมา และไม่เขียนไฟล์ใดๆ
import { randomBytes, scryptSync } from "node:crypto";

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      let buf = "";
      stdin.on("data", (d) => (buf += d));
      stdin.on("end", () => resolve(buf.split(/\r?\n/)[0]));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await askHidden("ตั้งรหัสผ่านแอดมิน (อย่างน้อย 12 ตัวอักษร): ");
if (password.length < 12) {
  console.error("รหัสผ่านสั้นเกินไป (ต้องอย่างน้อย 12 ตัวอักษร)");
  process.exit(1);
}
const again = await askHidden("พิมพ์รหัสผ่านอีกครั้ง: ");
if (again !== password) {
  console.error("รหัสผ่านไม่ตรงกัน");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
const slug = `m${randomBytes(6).toString("hex")}-${randomBytes(3).toString("hex")}`;

console.log("\nคัดลอก 3 บรรทัดนี้ไปใส่ใน .env.local และใน Environment variables ของโฮสต์ (แล้วเพิ่ม ADMIN_USERNAME เอง):\n");
console.log(`ADMIN_PASSWORD_HASH=${salt}:${hash}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log(`ADMIN_PATH=${slug}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("hex")}   # ใส่เฉพาะถ้ายังไม่มี CRON_SECRET (ถ้ามีอยู่แล้วอย่าเปลี่ยน)`);
console.log("\nและตั้ง ADMIN_USERNAME=ชื่อที่ต้องการ แล้วเข้าหน้าแอดมินที่ /" + slug);
