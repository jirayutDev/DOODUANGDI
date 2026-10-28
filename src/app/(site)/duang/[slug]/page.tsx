import { DuangTopicClient } from "./duang-topic-client";

export default async function DuangTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DuangTopicClient slug={slug} />;
}
