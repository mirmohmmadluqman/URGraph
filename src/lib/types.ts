export type Action = {
  id: string;
  description: string;
  score: number;
  date: string; // ISO string
  category?: string;
};

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
