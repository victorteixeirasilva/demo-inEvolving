/** Modelos alinhados a docs/REQUISITOS_UX_UI.md §5 */

export interface Objective {
  id: number;
  nameObjective: string;
  descriptionObjective: string;
  statusObjective: "IN_PROGRESS" | "DONE";
  completionDate?: string;
  idUser?: number;
  totNumberTasks?: number;
  numberTasksToDo?: number;
  numberTasksDone?: number;
  numberTasksInProgress?: number;
  numberTasksOverdue?: number;
  numberTasksCancelled?: number;
}

export interface Category {
  id: number;
  categoryName: string;
  categoryDescription: string;
  objectives: Objective[];
  /**
   * Quando a categoria aparece no dashboard do convidado após aceitar o compartilhamento.
   * Não vem da API base; é mesclado no cliente.
   */
  sharedFrom?: {
    ownerEmail: string;
    ownerName?: string;
  };
  /** Token do convite (cliente) — usado para sair de uma categoria compartilhada aceita. */
  shareToken?: string;
  /** Id da categoria no contexto do dono (positivo), para tarefas colaborativas quando o convite não está no storage. */
  sharedSourceCategoryId?: number;
}

export interface ResponseDashboard {
  idUser: number;
  categoryDTOList: Category[];
  /**
   * URL do vision board (`GET .../visionbord/generate`). `null`, vazio ou mensagem
   * tipo "No dreams were found" = sem preview.
   */
  urlVisionBord?: string | null;
}

export type TarefaStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE" | "CANCELLED";

/**
 * Subtarefa = mesma forma conceitual de uma tarefa simples, sempre ligada a uma tarefa pai.
 * `idObjective` deve coincidir com o da tarefa pai (sem filtro de objetivo no Kanban de subtarefas).
 */
export interface TarefaSubtarefa {
  id: string;
  nameTask: string;
  descriptionTask: string;
  dateTask: string;
  status: TarefaStatus;
  idObjective: number;
}

export interface Tarefa {
  id: number;
  uuid: string;
  nameTask: string;
  descriptionTask: string;
  status: TarefaStatus;
  dateTask: string; // YYYY-MM-DD
  idObjective: number;
  idUser?: number;
  isRecurring?: boolean;
  /** 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb */
  recurringDays?: number[];
  recurringUntil?: string; // YYYY-MM-DD
  blockedByObjective?: boolean;
  cancellationReason?: string;
  /** Checklist opcional (subtarefas). */
  subtasks?: TarefaSubtarefa[];
  /**
   * Tarefa colaborativa vinculada a categoria compartilhada (mock local).
   * Visível ao dono e aos convidados com convite aceito.
   */
  sharedTask?: {
    sourceCategoryId: number;
    ownerEmail: string;
    createdByEmail: string;
    createdByName?: string;
  };
}

export interface Transacao {
  id: string | number;
  idUser?: string;
  date: string;
  description: string;
  value: number;
  type: string;
}

/** Transação do JSON de finanças com categoria normalizada para UI. */
export type FinancaTxCategory = "cost" | "invest" | "extra";

export interface FinancaTransacaoView extends Transacao {
  id: string;
  category: FinancaTxCategory;
}

export interface ResponseFinancas {
  idUser: number;
  wage: number;
  totalBalance: number;
  availableCostOfLivingBalance: number;
  balanceAvailableToInvest: number;
  extraBalanceAdded: number;
  transactionsCostOfLiving: Transacao[];
  transactionsInvestment: Transacao[];
  transactionsExtraAdded: Transacao[];
}

export type LivroStatus = "PENDENTE_LEITURA" | "LENDO" | "LEITURA_FINALIZADA";

export interface Livro {
  id: number;
  title: string;
  author: string;
  theme: string;
  status: LivroStatus;
  /** URL da capa (absoluta ou caminho em /public). */
  coverImage?: string;
  idUser?: number;
}

export interface Sonho {
  id: number;
  name: string;
  description: string;
  urlImage?: string;
  idUser?: number;
}

/** Snapshot de análise JARVAR (IA) armazenada localmente por objetivo. */
export interface JarvarAnalysis {
  id: string;
  objectiveId: number;
  createdAt: string; // ISO-8601
  userContext: string;
  response: string;
  objectiveSnapshot: Objective;
}

/** Dados enriquecidos retornados por GET /api/mock/objetivo-analise/{id} */
export interface ObjectiveAnalyticsData {
  cancellationReasons: { reason: string; count: number }[];
  weeklyProgress: { week: string; done: number; cancelled: number; added: number }[];
  tasksByPriority: { priority: string; count: number }[];
}
