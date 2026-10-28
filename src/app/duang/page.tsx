import type { Metadata } from "next";
import { DuangHubList } from "./duang-hub-list";

export const metadata: Metadata = {
  title: "ทุกศาสตร์ดูดวง | ดูดวงดิ",
  description: "รวมทุกศาสตร์ดูดวงในที่เดียว ทั้งที่ AI น้องมูตอบให้ได้เลย และที่ต้องหาหมอดูตัวจริง",
};

export default function DuangHubPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-[18px] pt-2 pb-10 md:px-10 md:pt-8 md:pb-20">
      <p className="text-sm text-muted-foreground">สารบัญ</p>
      <h1 className="mt-0.5 text-[28px] leading-[1.55] font-bold md:text-[40px]">ทุกศาสตร์ดูดวง</h1>
      <p className="mt-2.5 max-w-[560px] text-soft-text">
        ส่วนใหญ่น้องมูตอบได้ทันที เรื่องที่มีป้าย “หมอดูจริง” จะต่อกับหมอดูตัวจริง
      </p>
      <DuangHubList />
    </div>
  );
}
