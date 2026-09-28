import { notFound } from "next/navigation";
import { PERSONALITY_CATEGORIES, type PersonalityCategoryKey } from "@/lib/personality-content";
import { PersonalityPicker } from "./personality-picker";

export function generateStaticParams() {
  return Object.keys(PERSONALITY_CATEGORIES).map((category) => ({ category }));
}

export default async function PersonalityPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = PERSONALITY_CATEGORIES[category as PersonalityCategoryKey];
  if (!config) notFound();

  return <PersonalityPicker config={config} />;
}
