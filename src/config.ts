import rc from 'rc';

export enum Protocol {
  HTTP = 'http',
  HTTPS = 'https'
}

export interface Config {
  domain: string;
  token: string;
  ignoreSSL: boolean;
  protocol: Protocol;
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

export function loadConfig(): Config {
  const rcConfig: RcConfig = rc('gitlab-search');
  
  return {
    domain: rcConfig.domain || DEFAULT_CONFIG.domain,
    token: rcConfig.token || DEFAULT_CONFIG.token,
    ignoreSSL: rcConfig.ignoreSSL !== undefined ? rcConfig.ignoreSSL : DEFAULT_CONFIG.ignoreSSL,
    protocol: rcConfig.protocol === 'http' ? Protocol.HTTP : Protocol.HTTPS,
    concurrency: rcConfig.concurrency || DEFAULT_CONFIG.concurrency
  };
}

export function validateConfig(config: Config): void {
  if (!config.token) {
    throw new Error('GitLab access token is required. Please configure it using: gitlab-search --token <your-token>');
  }
  
  if (!config.domain) {
    throw new Error('GitLab domain is required');
  }
}
