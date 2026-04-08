"use client";

import { LivrosKanbanBoard } from "@/components/features/livros/LivrosKanbanBoard";
import { mockLivros } from "@/lib/mock-data";

export default function LivrosPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pt-4 md:pt-6">
      <h1 className="text-2xl font-bold">Livros</h1>
      <LivrosKanbanBoard seedBooks={mockLivros} />
    </div>
  );
}
