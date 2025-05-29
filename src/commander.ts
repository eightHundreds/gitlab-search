import { Command } from 'commander';
import { SearchFilter } from './types';

export interface CommandOptions {
  groups?: string;
  filename?: string;
  extension?: string;
  path?: string;
  archive?: boolean;
  token?: string;
  domain?: string;
  ignoreSSL?: boolean;
  concurrency?: number;
  protocol?: string;
}

export function createProgram(version: string): Command {
  const program = new Command();
  
  program
    .version(version)
    .description('Search for contents across all your GitLab repositories')
    .argument('<search-term>', 'The term to search for')
    .option('-g, --groups <groups>', 'Comma-separated list of group IDs to search in')
    .option('-f, --filename <filename>', 'Filter by filename')
    .option('-e, --extension <extension>', 'Filter by file extension')
    .option('-p, --path <path>', 'Filter by file path')
    .option('-a, --archive', 'Include archived projects in search', false)
    .option('-t, --token <token>', 'GitLab access token')
    .option('-d, --domain <domain>', 'GitLab domain (default: gitlab.com)')
    .option('--ignore-ssl', 'Ignore SSL certificate errors', false)
    .option('-c, --concurrency <number>', 'Number of concurrent requests', '10')
    .option('--protocol <protocol>', 'Protocol to use (http or https)', 'https');

  return program;
}

export function parseFilters(options: CommandOptions): SearchFilter[] {
  const filters: SearchFilter[] = [];

  if (options.filename) {
    filters.push({ type: 'filename', value: options.filename });
  }

  if (options.extension) {
    filters.push({ type: 'extension', value: options.extension });
  }

  if (options.path) {
    filters.push({ type: 'path', value: options.path });
  }

  return filters;
}
