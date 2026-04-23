import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
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
    summary: 'Repository information',
    description: 'Returns information about the configured GitHub repository.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informationen zum konfigurierten GitHub-Repository.',
    type: GithubRepositoryDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Der Zugriff auf die GitHub-API wurde nicht autorisiert.',
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
    summary: 'Fetch releases',
    description: 'Returns all releases of the configured GitHub repository.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alle Releases des konfigurierten GitHub-Repositories.',
    type: GithubReleaseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Der Zugriff auf die GitHub-API wurde nicht autorisiert.',
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
    summary: 'Fetch issues by status',
    description:
      'Returns issues of the configured GitHub repository by status (open, closed, all).',
  })
  @ApiResponse({
    status: 200,
    description: 'GitHub-Issues des konfigurierten Repositories.',
    type: GithubIssueDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Der angegebene Issue-Status ist ungültig.',
  })
  @ApiUnauthorizedResponse({
    description: 'Der Zugriff auf die GitHub-API wurde nicht autorisiert.',
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
      'Creates a new issue in the configured GitHub repository and stores the selected type as metadata.',
  })
  @ApiBody({ type: CreateGithubIssueDto })
  @ApiCreatedResponse({
    description: 'Das GitHub-Issue wurde erfolgreich erstellt.',
    type: GithubIssueDto,
  })
  @ApiBadRequestResponse({
    description: 'Die Nutzdaten des neuen GitHub-Issues sind ungültig.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Der aktuelle Benutzer oder das GitHub-Token ist nicht für das Erstellen von Issues berechtigt.',
  })
  @ApiInternalServerErrorResponse({
    description:
      'Die GitHub-Integration ist nicht korrekt konfiguriert oder die Erstellung ist intern fehlgeschlagen.',
  })
  createIssue(@Body() issueDto: CreateGithubIssueDto): Promise<GithubIssueDto> {
    return this.githubService.createIssue(issueDto);
  }
}
