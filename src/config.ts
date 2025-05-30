import rc from 'rc';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export enum Protocol {
  HTTP = 'http',
  HTTPS = 'https'
}

export enum ArchiveMode {
  ALL = 'all',
  ONLY = 'only',
  EXCLUDE = 'exclude'
}

export interface Config {
  domain: string;
  token: string;
  ignoreSSL: boolean;
  protocol: Protocol;
  concurrency: number;
}

export interface SetupOptions {
  domainOrRootUri: string;
  ignoreSSL: boolean;
  token: string;
  directory: string;
  concurrency: number;
}

interface RcConfig {
  domain?: string;
  token?: string;
  config?: string;
  ignoreSSL?: boolean;
  concurrency?: number;
  protocol?: string;
}

const DEFAULT_CONFIG: Config = {
  domain: 'gitlab.com',
  token: '',
  ignoreSSL: false,
  protocol: Protocol.HTTPS,
  concurrency: 10
};

export const defaultDomain = 'gitlab.com';
export const defaultDirectory = join(homedir(), '.config');
export const defaultConcurrency = 10;
export const defaultArchive = ArchiveMode.ALL;

export function loadConfig(): Config {
  const rcConfig: RcConfig = rc('gitlab-search');
  
  const result = {
    domain: rcConfig.domain || DEFAULT_CONFIG.domain,
    token: rcConfig.token || DEFAULT_CONFIG.token,
    ignoreSSL: rcConfig.ignoreSSL !== undefined ? rcConfig.ignoreSSL : DEFAULT_CONFIG.ignoreSSL,
    protocol: rcConfig.protocol === 'http' ? Protocol.HTTP : Protocol.HTTPS,
    concurrency: rcConfig.concurrency || DEFAULT_CONFIG.concurrency
  };
  if(process.env['DEBUG']) {
    console.log('Loaded configuration:', result);
  }
  return result as Config;
}

export function validateConfig(config: Config): void {
  if (!config.token) {
    throw new Error('GitLab access token is required. Please configure it using: gitlab-search setup <your-token>');
  }
  
  if (!config.domain) {
    throw new Error('GitLab domain is required');
  }
}

export function writeToFile(options: SetupOptions): string {
  const { domainOrRootUri, ignoreSSL, token, directory, concurrency } = options;
  
  // Determine protocol and domain from domainOrRootUri
  let domain: string;
  let protocol: Protocol;
  
  if (domainOrRootUri.startsWith('http://') || domainOrRootUri.startsWith('https://')) {
    const url = new URL(domainOrRootUri);
    domain = url.hostname;
    protocol = url.protocol === 'https:' ? Protocol.HTTPS : Protocol.HTTP;
  } else {
    domain = domainOrRootUri;
    protocol = Protocol.HTTPS;
  }

  const config = {
    domain,
    token,
    ignoreSSL,
    protocol,
    concurrency
  };

  // Ensure directory exists
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  const configPath = join(directory, '.gitlab-searchrc');
  const configContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  writeFileSync(configPath, configContent, 'utf8');
  
  return configPath;
}
