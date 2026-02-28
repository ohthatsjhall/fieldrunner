/** Action to perform before scraping (e.g., wait, scroll, click) */
export type FirecrawlAction =
  | { type: 'wait'; milliseconds: number }
  | { type: 'click'; selector: string }
  | { type: 'scroll'; direction?: 'up' | 'down'; amount?: number };

/** JSON extraction format descriptor */
export type JsonFormat = {
  type: 'json';
  schema: Record<string, unknown>;
  prompt?: string;
};

/** Options for the scrape endpoint */
export type ScrapeOptions = {
  formats?: (string | JsonFormat)[];
  onlyMainContent?: boolean;
  waitFor?: number;
  actions?: FirecrawlAction[];
  timeout?: number;
};

/** Result from a scrape call */
export type ScrapeResult = {
  markdown?: string;
  links?: string[];
  json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

/** Result from a scrapeJson call — typed data + raw metadata */
export type ScrapeJsonResult<T> = {
  data: T;
  metadata: Record<string, unknown>;
};

/** Options for the map endpoint */
export type MapOptions = {
  search?: string;
  limit?: number;
};
