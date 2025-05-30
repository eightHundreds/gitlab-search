import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as https from 'https';
import { Config } from './config';
import { Group, Project, SearchCriteria, SearchResult, ProjectSearchResults } from './types';

const DEBUG = process.env['DEBUG'];

export class GitLabAPI {
  private client: AxiosInstance;

  constructor(config: Config) {
    const baseURL = `${config.protocol}://${config.domain}/api/v4`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'PRIVATE-TOKEN': config.token,
        'Content-Type': 'application/json'
      },
      httpsAgent: config.ignoreSSL ? new https.Agent({
        rejectUnauthorized: false
      }) : undefined
    });

    if (DEBUG) {
      this.client.interceptors.request.use(request => {
        console.log('Starting Request:', request.url);
        return request;
      });

      this.client.interceptors.response.use(response => {
        console.log('Response:', response.status, response.config.url);
        return response;
      });
    }
  }

  async fetchGroups(groupIds?: string): Promise<Group[]> {
    if (!groupIds) {
      // Fetch all groups with pagination
      let page = 1;
      let hasMore = true;
      const allGroups: Group[] = [];

      while (hasMore) {
        const response: AxiosResponse<Group[]> = await this.client.get('/groups', {
          params: {
            page,
            per_page: 100
          }
        });

        const groups = response.data;
        allGroups.push(...groups);
        hasMore = groups.length === 100;
        page++;
      }

      return allGroups;
    }

    // For specified group IDs, create group objects directly like in original code
    const ids = groupIds.split(',').map(id => id.trim());
    return ids.map(id => ({
      id,
      name: id // Use ID as name since we don't need to fetch from API
    }));
  }

  async fetchProjectsInGroups(groups: Group[], archiveMode?: 'all' | 'only' | 'exclude' | boolean): Promise<Project[]> {
    const allProjects: Project[] = [];

    for (const group of groups) {
      try {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            let archived: boolean | undefined;
            
            // Handle different archive modes to match original functionality
            if (archiveMode === 'only' || archiveMode === true) {
              archived = true;
            } else if (archiveMode === 'exclude' || archiveMode === false) {
              archived = false;
            } else {
              // 'all' mode or undefined - include both archived and non-archived
              archived = undefined;
            }

            const response: AxiosResponse<Project[]> = await this.client.get(`/groups/${group.id}/projects`, {
              params: {
                page,
                per_page: 100,
                archived
              }
            });

            const projects = response.data;
            allProjects.push(...projects);

            hasMore = projects.length === 100;
            page++;
          } catch (error) {
            if (DEBUG) {
              console.warn(`Failed to fetch page ${page} for group ${group.name}:`, error);
            }
            // 如果某一页失败，跳过这一页继续下一页
            // 但如果是第一页就失败，说明可能是权限或网络问题，停止该组的获取
            if (page === 1) {
              console.warn(`Failed to fetch first page for group ${group.name}, skipping this group`);
              hasMore = false;
            } else {
              // 对于非第一页的失败，我们假设已经到达了最后一页或网络临时问题
              // 可以选择继续尝试下一页或停止
              page++;
              // 设置最大重试次数避免无限循环
              if (page > 1000) { // 设置合理的页数上限
                console.warn(`Reached maximum page limit for group ${group.name}`);
                hasMore = false;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch projects for group ${group.name}:`, error);
      }
    }

    return allProjects;
  }

  async searchInProject(project: Project, criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      // Build search parameters similar to original implementation
      const searchFilters: string[] = [];
      
      criteria.filters.forEach(filter => {
        if (filter.value) {
          switch (filter.type) {
            case 'filename':
              searchFilters.push(`filename:${encodeURIComponent(filter.value)}`);
              break;
            case 'extension':
              searchFilters.push(`extension:${encodeURIComponent(filter.value)}`);
              break;
            case 'path':
              searchFilters.push(`path:${encodeURIComponent(filter.value)}`);
              break;
          }
        }
      });

      const searchQuery = [criteria.term, ...searchFilters].join(' ');

      const response: AxiosResponse<SearchResult[]> = await this.client.get(`/projects/${project.id}/search`, {
        params: {
          scope: 'blobs',
          search: searchQuery
        }
      });

      return response.data;
    } catch (error) {
      if (DEBUG) {
        console.warn(`Search failed for project ${project.name}:`, error);
      }
      return [];
    }
  }

  async searchInProjects(projects: Project[], criteria: SearchCriteria): Promise<ProjectSearchResults[]> {
    // Create promises for all projects, similar to the original implementation
    const searchPromises = projects.map(async (project): Promise<ProjectSearchResults | null> => {
      const searchResults = await this.searchInProject(project, criteria);
      if (searchResults.length > 0) {
        return [project, searchResults];
      }
      return null;
    });

    const results = await Promise.all(searchPromises);
    
    // Filter out null results (projects with no search results)
    return results.filter((result): result is ProjectSearchResults => result !== null);
  }
}
