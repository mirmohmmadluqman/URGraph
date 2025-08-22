export type Action = {
  id: string;
  description: string;
  score: number;
  date: string; // ISO string
  category?: string;
};

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export type HistoryCompaction = 'never' | 'weekly' | 'monthly';

export interface URGraphSettings {
    historyCompaction: HistoryCompaction;
    activeApiKey?: string; // 'main', 'secondary', or a custom key name
    apiKeys?: { name: string; key: string }[];
}
