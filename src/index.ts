#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, validateConfig, Protocol } from './config';
import { GitLabAPI } from './gitlab';
import { printSearchResults } from './print';
import { createProgram, parseFilters, CommandOptions } from './commander';
import { SearchCriteria } from './types';

async function main(): Promise<void> {
  try {
    // Load package.json for version
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Setup commander
    const program = createProgram(packageJson.version);

    program.action(async (searchTerm: string, options: CommandOptions) => {
      try {
        // Load and merge configuration
        let config = loadConfig();
        
        // Override config with command line options
        if (options.token) config.token = options.token;
        if (options.domain) config.domain = options.domain;
        if (options.ignoreSSL !== undefined) config.ignoreSSL = options.ignoreSSL;
        if (options.concurrency) config.concurrency = parseInt(String(options.concurrency), 10);
        if (options.protocol) {
          config.protocol = options.protocol === 'http' ? Protocol.HTTP : Protocol.HTTPS;
        }

        // Validate configuration
        validateConfig(config);

        // Create search criteria
        const criteria: SearchCriteria = {
          term: searchTerm,
          filters: parseFilters(options)
        };

        // Initialize GitLab API
        const gitlab = new GitLabAPI(config);

        // Fetch groups
        console.log('Fetching groups...');
        const groups = await gitlab.fetchGroups(options.groups);
        
        if (groups.length === 0) {
          console.log('No groups found');
          return;
        }

        console.log(`Found ${groups.length} group(s)`);

        // Fetch projects
        console.log('Fetching projects...');
        const projects = await gitlab.fetchProjectsInGroups(groups, options.archive);
        
        if (projects.length === 0) {
          console.log('No projects found');
          return;
        }

        console.log(`Found ${projects.length} project(s)`);

        // Search in projects
        console.log(`Searching for "${searchTerm}"...`);
        const results = await gitlab.searchInProjects(projects, criteria);

        // Print results
        printSearchResults(searchTerm, results);

      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

    // Parse command line arguments
    await program.parseAsync();

  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
