import { Controller, Get, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Controller für GitHub API Abfragen (Repository, Releases, Issues).
 */
@ApiTags('GitHub')
@Controller('api/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  /**
   * Liefert Informationen zum GitHub-Repository.
   */
  @Get('repository')
  @ApiOperation({
    summary: 'Repository-Informationen',
    description: 'Liefert Informationen zum konfigurierten GitHub-Repository.',
  })
  @ApiResponse({ status: 200, description: 'Repository-Objekt', type: Object })
  getRepository() {
    return this.githubService.getRepository();
  }

  /**
   * Liefert alle Releases des GitHub-Repositories.
   */
  @Get('releases')
  @ApiOperation({
    summary: 'Releases abrufen',
    description: 'Liefert alle Releases des konfigurierten GitHub-Repository.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array von Release-Objekten',
    type: Array,
  })
  getReleases() {
    return this.githubService.getReleases();
  }

  /**
   * Liefert Issues des GitHub-Repositories nach Status.
   * @param status Status der Issues (z.B. open, closed, all)
   */
  @Get('issues')
  @ApiOperation({
    summary: 'Issues nach Status abrufen',
    description:
      'Liefert Issues des konfigurierten GitHub-Repository nach Status (open, closed, all).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array von Issue-Objekten',
    type: Array,
  })
  getIssues(@Query('status') status: string = 'open') {
    return this.githubService.getIssues(status);
  }
}
