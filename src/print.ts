import chalk from 'chalk';
import { Project, SearchResult, ProjectSearchResults } from './types';

function urlToLineInFile(project: Project, result: SearchResult): string {
  return `${project.web_url}/blob/${result.ref}/${result.filename}#L${result.startline}`;
}

function indentPreview(preview: string): string {
  return preview.replace(/\n/g, '\n\t\t');
}

function highlightMatchedTerm(term: string, data: string): string {
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return data.replace(regex, chalk.red('$1'));
}

export function printSearchResults(term: string, results: ProjectSearchResults[]): void {
  results.forEach(([project, searchResults]) => {
    const formattedResults = searchResults.reduce((sum, current) => {
      return sum + 
        '\n\t' + chalk.underline(urlToLineInFile(project, current)) +
        '\n\n\t\t' + highlightMatchedTerm(term, indentPreview(current.data));
    }, '');

    const archivedInfo = project.archived ? chalk.bold(chalk.red(' (archived)')) : '';
    
    console.log(chalk.bold(chalk.green(project.name + archivedInfo + ':')));
    console.log(formattedResults);
  });

  if (results.length === 0) {
    console.log(chalk.yellow(`No results found for "${term}"`));
  } else {
    const totalResults = results.reduce((sum, [, searchResults]) => sum + searchResults.length, 0);
    const projectCount = results.length;
    console.log(chalk.blue(`\nFound ${totalResults} results in ${projectCount} project(s)`));
  }
}
