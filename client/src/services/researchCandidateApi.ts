export interface ResearchCandidate {
  id: string;
  name: string;
  status: string;
  promoted_strategy?: boolean;
  strategy_definition?: { name: string };
  [key: string]: any;
}
export const researchCandidateApi = {
  createCandidate: async (params?: any) => ({ id: "c_stub", name: "Stub", status: "pending" }),
  runBacktest: async (id: string, days: number) => ({ id: "c_stub", name: "Stub", status: "completed", success: true, promoted_strategy: true, strategy_definition: { name: "Stub" } }),
  getCandidates: async () => ([]),
  addCandidate: async () => ({})
};
