import { Game } from "@/components/Game";
import { ERAS, eraById } from "@/lib/eras";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return ERAS.map((e) => ({ era: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[era]">): Promise<Metadata> {
  const era = eraById((await params).era);
  return { title: era ? `${era.name} | Market City` : "Market City" };
}

async function Play({ params }: { params: PageProps<"/play/[era]">["params"] }) {
  const { era } = await params;
  if (!eraById(era)) notFound();
  return <Game eraId={era} />;
}

export default function PlayPage({ params }: PageProps<"/play/[era]">) {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sub">Loading…</div>}>
      <Play params={params} />
    </Suspense>
  );
}
