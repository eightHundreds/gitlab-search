import { Command } from 'commander';
import { SearchFilter } from './types';
import { ArchiveMode } from './config';

export interface CommandOptions {
  groups?: string;
  filename?: string;
  extension?: string;
  path?: string;
  archive?: 'all' | 'only' | 'exclude';
  token?: string;
  domain?: string;
  ignoreSSL?: boolean;
  concurrency?: number;
  protocol?: string;
}

export interface SetupCommandOptions {
  ignoreSsl?: boolean;
  apiDomain?: string;
  dir?: string;
  concurrency?: number;
}

export function createProgram(version: string): Command {
  const program = new Command();
  
  program
    .version(version)
    .description('Search for contents across all your GitLab repositories')
    .argument('<search-term>', 'The term to search for')
    .option('-g, --groups <groups>', 'group(s) to find repositories in (separated with comma)')
    .option('-f, --filename <filename>', 'only search for contents in given a file, glob matching with wildcards (*)')
    .option('-e, --extension <extension>', 'only search for contents in files with given extension')
    .option('-p, --path <path>', 'only search in files in the given path')
    .option('-a, --archive <mode>', 'to only search on archived repositories, or to exclude them, by default the search will be apply to all repositories', ArchiveMode.ALL)
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

export function createSetupCommand(program: Command): Command {
  return program
    .command('setup')
    .description('create configuration file')
    .argument('<personal-access-token>', 'GitLab personal access token')
    .option('--ignore-ssl', 'ignore invalid SSL certificate from the GitLab API server')
    .option('--api-domain <name>', 'domain name or root URL of GitLab API server,\nspecify root URL (without trailing slash) to use HTTP instead of HTTPS', 'gitlab.com')
    .option('--dir <path>', 'path to directory to save configuration file in', require('os').homedir() + '/.config')
    .option('--concurrency <number>', 'limit the amount of concurrent HTTPS requests sent to GitLab when searching,\nuseful when *many* projects are hosted on a small GitLab instance\nto avoid overwhelming the instance resulting in 502 errors', '10');
}
