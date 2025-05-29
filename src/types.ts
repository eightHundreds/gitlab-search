export interface Group {
  id: string;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  web_url: string;
  archived: boolean;
}

export type SearchFilter = 
  | { type: 'filename'; value?: string }
  | { type: 'extension'; value?: string }
  | { type: 'path'; value?: string };

export interface SearchCriteria {
  term: string;
  filters: SearchFilter[];
}

export interface SearchResult {
  data: string;
  filename: string;
  ref: string;
  startline: number;
}

export type ProjectSearchResults = [Project, SearchResult[]];
