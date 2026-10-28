import { notFound } from "next/navigation";
import { PERSONALITY_CATEGORIES, type PersonalityCategoryKey } from "@/lib/personality-content";
import { PersonalityPicker } from "./personality-picker";

export default async function PersonalityPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!Object.prototype.hasOwnProperty.call(PERSONALITY_CATEGORIES, category)) notFound();
  const { data, ...meta } = PERSONALITY_CATEGORIES[category as PersonalityCategoryKey];

  // ส่งเฉพาะรายชื่อ key ไป client — เนื้อหาคำทำนายต้องขอผ่าน /api/personality เท่านั้น
  return (
    <PersonalityPicker
      key={category}
      config={meta}
      keys={Object.keys(data)}
      categoryKey={category as PersonalityCategoryKey}
    />
  );
}
