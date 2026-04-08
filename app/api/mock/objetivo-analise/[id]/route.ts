import { NextResponse } from "next/server";
import type { ObjectiveAnalyticsData } from "@/lib/types/models";

/**
 * Mock de GET /auth/api/dashboard/objective-analytics/{id}
 * Retorna dados enriquecidos para os gráficos do objetivo.
 * Fase 2: trocar por `apiClient.get(\`/auth/api/dashboard/objective-analytics/\${id}\`)`
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const seed = Number(params.id) % 7;

  const data: ObjectiveAnalyticsData = {
    cancellationReasons: [
      { reason: "Mudança de prioridade", count: 3 + seed },
      { reason: "Bloqueio externo", count: 2 + (seed % 3) },
      { reason: "Falta de recursos", count: 1 + (seed % 2) },
      { reason: "Fora do escopo", count: seed % 3 },
      { reason: "Duplicada", count: 1 },
    ].filter((r) => r.count > 0),

    weeklyProgress: [
      { week: "Sem 1", done: 1 + seed, cancelled: 1, added: 4 + seed },
      { week: "Sem 2", done: 3 + seed, cancelled: seed % 2, added: 2 },
      { week: "Sem 3", done: 2, cancelled: 1, added: 3 + (seed % 2) },
      { week: "Sem 4", done: 4 + (seed % 3), cancelled: 0, added: 1 },
      { week: "Sem 5", done: 3, cancelled: seed % 3, added: 2 },
    ],

    tasksByPriority: [
      { priority: "Alta", count: 4 + seed },
      { priority: "Média", count: 6 + (seed % 4) },
      { priority: "Baixa", count: 2 + (seed % 2) },
    ],
  };

  return NextResponse.json(data);
}
