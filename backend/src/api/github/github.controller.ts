import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import {
  CreateGithubIssueDto,
  GithubIssueDto,
  GithubIssueStatus,
  GithubIssueStatusQueryDto,
  GithubReleaseDto,
  GithubRepositoryDto,
} from './dto/github.dto';

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
    summary: 'Get repository details',
    description:
      'Returns metadata for the GitHub repository configured for the Sapling integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configured GitHub repository details.',
    type: GithubRepositoryDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'GitHub access is not authorized for the current request or integration configuration.',
  })
  getRepository(): Promise<GithubRepositoryDto> {
    return this.githubService.getRepository();
  }

  /**
   * Returns all releases of the configured GitHub repository.
   * @returns {Promise<Array>} Array of release objects
   */
  @Get('releases')
  @ApiOperation({
    summary: 'List repository releases',
    description:
      'Returns the published releases of the GitHub repository configured for the Sapling integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Published releases of the configured GitHub repository.',
    type: GithubReleaseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description:
      'GitHub access is not authorized for the current request or integration configuration.',
  })
  getReleases(): Promise<GithubReleaseDto[]> {
    return this.githubService.getReleases();
  }

  /**
   * Returns issues of the configured GitHub repository by status.
   * @param {string} status Issue status (e.g., open, closed, all)
   * @returns {Promise<Array>} Array of issue objects
   */
  @Get('issues')
  @ApiOperation({
    summary: 'List repository issues',
    description:
      'Returns GitHub issues for the configured repository, optionally filtered by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: GithubIssueStatus,
    description: 'Issue state filter. Defaults to open.',
    example: GithubIssueStatus.OPEN,
  })
  @ApiResponse({
    status: 200,
    description: 'GitHub issues from the configured repository.',
    type: GithubIssueDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'The supplied issue status filter is invalid.',
  })
  @ApiUnauthorizedResponse({
    description:
      'GitHub access is not authorized for the current request or integration configuration.',
  })
  getIssues(
    @Query() query: GithubIssueStatusQueryDto,
  ): Promise<GithubIssueDto[]> {
    return this.githubService.getIssues(query.status ?? GithubIssueStatus.OPEN);
  }

  /**
   * Creates a new issue in the configured GitHub repository.
   * @param {CreateGithubIssueDto} issueDto Validated issue payload
   * @returns {Promise<GithubIssueDto>} Newly created issue
   */
  @Post('issues')
  @ApiOperation({
    summary: 'Create a GitHub issue',
    description:
      'Creates a new issue in the configured GitHub repository and stores the selected issue type as metadata.',
  })
  @ApiBody({ type: CreateGithubIssueDto })
  @ApiCreatedResponse({
    description: 'Newly created GitHub issue.',
    type: GithubIssueDto,
  })
  @ApiBadRequestResponse({
    description: 'The issue payload is invalid.',
  })
  @ApiUnauthorizedResponse({
    description:
      'The current user or configured GitHub token is not authorized to create issues.',
  })
  @ApiInternalServerErrorResponse({
    description:
      'The GitHub integration is misconfigured or issue creation failed internally.',
  })
  createIssue(@Body() issueDto: CreateGithubIssueDto): Promise<GithubIssueDto> {
    return this.githubService.createIssue(issueDto);
  }
}
