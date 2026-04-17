import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

/**
 * @class GithubController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller providing API endpoints for GitHub repository, releases, and issues.
 *
 * @property        {GithubService} githubService Service for GitHub API queries
 */
@ApiTags('GitHub')
@ApiBearerAuth()
@Controller('api/github')
@UseGuards(SessionOrBearerAuthGuard)
export class GithubController {
  /**
   * Creates an instance of GithubController.
   * @param {GithubService} githubService Service for GitHub API queries
   */
  constructor(private readonly githubService: GithubService) {}

  /**
   * Returns information about the configured GitHub repository.
   * @returns {Promise<Object>} Repository object
   */
  @Get('repository')
  @ApiOperation({
    summary: 'Repository information',
    description: 'Returns information about the configured GitHub repository.',
  })
  @ApiResponse({ status: 200, description: 'Repository object', type: Object })
  getRepository() {
    return this.githubService.getRepository();
  }

  /**
   * Returns all releases of the configured GitHub repository.
   * @returns {Promise<Array>} Array of release objects
   */
  @Get('releases')
  @ApiOperation({
    summary: 'Fetch releases',
    description: 'Returns all releases of the configured GitHub repository.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of release objects',
    type: Array,
  })
  getReleases() {
    return this.githubService.getReleases();
  }

  /**
   * Returns issues of the configured GitHub repository by status.
   * @param {string} status Issue status (e.g., open, closed, all)
   * @returns {Promise<Array>} Array of issue objects
   */
  @Get('issues')
  @ApiOperation({
    summary: 'Fetch issues by status',
    description:
      'Returns issues of the configured GitHub repository by status (open, closed, all).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of issue objects',
    type: Array,
  })
  getIssues(@Query('status') status: string = 'open') {
    return this.githubService.getIssues(status);
  }
}
