"use client";

import { MotivacaoSonhosSection } from "@/components/features/motivacao/MotivacaoSonhosSection";
import { mockSonhos } from "@/lib/mock-data";

export default function MotivacaoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-4 md:pt-6">
      <h1 className="text-2xl font-bold">Motivação</h1>
      <MotivacaoSonhosSection seedSonhos={mockSonhos} />
    </div>
  );
}
