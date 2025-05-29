import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as https from 'https';
import { Config } from './config';
import { Group, Project, SearchCriteria, SearchResult, ProjectSearchResults } from './types';

const DEBUG = process.env['DEBUG'];

export class GitLabAPI {
  private client: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    
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
      const response: AxiosResponse<Group[]> = await this.client.get('/groups');
      return response.data;
    }

    const ids = groupIds.split(',').map(id => id.trim());
    const groups: Group[] = [];

    for (const id of ids) {
      try {
        const response: AxiosResponse<Group> = await this.client.get(`/groups/${id}`);
        groups.push(response.data);
      } catch (error) {
        console.warn(`Failed to fetch group ${id}:`, error);
      }
    }

    return groups;
  }

  async fetchProjectsInGroups(groups: Group[], includeArchived: boolean = false): Promise<Project[]> {
    const allProjects: Project[] = [];

    for (const group of groups) {
      try {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const response: AxiosResponse<Project[]> = await this.client.get(`/groups/${group.id}/projects`, {
              params: {
                page,
                per_page: 100,
                archived: includeArchived ? undefined : false
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
      const params: Record<string, string> = {
        scope: 'blobs',
        search: criteria.term
      };

      // Apply filters
      criteria.filters.forEach(filter => {
        if (filter.value) {
          switch (filter.type) {
            case 'filename':
              params['filename'] = filter.value;
              break;
            case 'extension':
              params['filename'] = `*.${filter.value}`;
              break;
            case 'path':
              params['filename'] = `*${filter.value}*`;
              break;
          }
        }
      });

      const response: AxiosResponse<SearchResult[]> = await this.client.get(`/projects/${project.id}/search`, {
        params
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
    const results: ProjectSearchResults[] = [];
    const concurrentRequests: Promise<void>[] = [];
    let index = 0;

    const processProject = async (project: Project): Promise<void> => {
      const searchResults = await this.searchInProject(project, criteria);
      if (searchResults.length > 0) {
        results.push([project, searchResults]);
      }
    };

    while (index < projects.length) {
      const batch = projects.slice(index, index + this.config.concurrency);
      
      for (const project of batch) {
        concurrentRequests.push(processProject(project));
      }

      await Promise.all(concurrentRequests);
      concurrentRequests.length = 0;
      index += this.config.concurrency;
    }

    return results;
  }
}
