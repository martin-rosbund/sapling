import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import {
  GITHUB_API_URL,
  GITHUB_REPO,
  GITHUB_TOKEN,
} from '../../constants/project.constants';
import {
  CreateGithubIssueDto,
  GithubIssueDto,
  GithubIssueLabelDto,
  GithubIssueType,
  GithubReleaseDto,
  GithubRepositoryDto,
} from './dto/github.dto';

type GithubIssueApiResponse = GithubIssueDto & {
  pull_request?: object;
};

type GithubLabelConfig = {
  name: string;
  color: string;
  description: string;
};

/**
 * @class GithubService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing GitHub API queries for repository, releases, and issues.
 *
 * @property        {string} repo     GitHub repository name
 * @property        {string} apiUrl   GitHub API base URL
 * @property        {string} token    GitHub API token
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly repo: string;
  private readonly apiUrl: string;
  private readonly token: string;

  /**
   * Creates an instance of GithubService.
   */
  constructor() {
    this.repo = GITHUB_REPO;
    this.apiUrl = GITHUB_API_URL;
    this.token = GITHUB_TOKEN;
  }

  /**
   * Returns HTTP headers for GitHub API requests.
   * @returns {object} Headers object
   */
  private get headers() {
    return {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      Accept: 'application/vnd.github+json',
    };
  }

  /**
   * Ensures the repository configuration is present and valid.
   * @returns Parsed GitHub owner and repository name
   */
  private get repositoryParts() {
    if (!this.repo) {
      throw new InternalServerErrorException('github.repositoryNotConfigured');
    }

    const [owner, name, ...rest] = this.repo.split('/').filter(Boolean);

    if (!owner || !name || rest.length) {
      throw new InternalServerErrorException('github.invalidRepositoryFormat');
    }

    return { owner, name };
  }

  /**
   * Returns the repository API URL with an optional suffix.
   * @param {string} suffix Path suffix relative to the repository root
   * @returns {string} Fully qualified GitHub API URL
   */
  private buildRepositoryUrl(suffix: string = ''): string {
    const { owner, name } = this.repositoryParts;

    return `${this.apiUrl}/repos/${owner}/${name}${suffix}`;
  }

  /**
   * Ensures a write-capable GitHub token is configured.
   */
  private assertTokenConfigured() {
    if (!this.token) {
      throw new InternalServerErrorException('github.tokenMissing');
    }
  }

  /**
   * Returns the desired label configuration for the selected issue type.
   * @param {GithubIssueType} type Requested issue type
   * @returns {GithubLabelConfig} Label definition used for GitHub
   */
  private getTypeLabelConfig(type: GithubIssueType): GithubLabelConfig {
    switch (type) {
      case GithubIssueType.FEATURE:
        return {
          name: 'feature',
          color: '0E8A16',
          description: 'New feature request',
        };
      case GithubIssueType.BUG:
      default:
        return {
          name: 'bug',
          color: 'D73A4A',
          description: "Something isn't working",
        };
    }
  }

  /**
   * Builds the GitHub issue body and preserves the chosen type in markdown.
   * @param {CreateGithubIssueDto} issueDto Issue creation payload
   * @returns {string} Markdown body for GitHub
   */
  private buildIssueBody(issueDto: CreateGithubIssueDto): string {
    const typeLabel =
      issueDto.type === GithubIssueType.FEATURE ? 'Feature' : 'Bug';

    return `**Type:** ${typeLabel}\n\n${issueDto.description.trim()}`;
  }

  /**
   * Creates the selected type label in GitHub if it does not exist yet.
   * @param {GithubLabelConfig} labelConfig Label definition for the issue type
   */
  private async ensureTypeLabelExists(
    labelConfig: GithubLabelConfig,
  ): Promise<void> {
    const labelUrl = this.buildRepositoryUrl(
      `/labels/${encodeURIComponent(labelConfig.name)}`,
    );

    try {
      await axios.get<GithubIssueLabelDto>(labelUrl, {
        headers: this.headers,
      });
      return;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw error;
      }
    }

    await axios.post<GithubIssueLabelDto>(
      this.buildRepositoryUrl('/labels'),
      labelConfig,
      {
        headers: this.headers,
      },
    );
  }

  /**
   * Adds the issue type label to a GitHub issue.
   * @param {number} issueNumber GitHub issue number
   * @param {GithubLabelConfig} labelConfig Desired label configuration
   * @returns {Promise<GithubIssueLabelDto[]>} Resulting label set
   */
  private async attachTypeLabelToIssue(
    issueNumber: number,
    labelConfig: GithubLabelConfig,
  ): Promise<GithubIssueLabelDto[]> {
    const { data } = await axios.post<GithubIssueLabelDto[]>(
      this.buildRepositoryUrl(`/issues/${issueNumber}/labels`),
      {
        labels: [labelConfig.name],
      },
      {
        headers: this.headers,
      },
    );

    return data;
  }

  /**
   * Returns information about the configured GitHub repository.
   * @returns {Promise<GithubRepositoryDto>} Repository object
   */
  async getRepository(): Promise<GithubRepositoryDto> {
    const { data } = await axios.get<GithubRepositoryDto>(
      this.buildRepositoryUrl(),
      {
        headers: this.headers,
      },
    );

    return data;
  }

  /**
   * Returns all releases of the configured GitHub repository.
   * @returns {Promise<GithubReleaseDto[]>} Array of release objects
   */
  async getReleases(): Promise<GithubReleaseDto[]> {
    const { data } = await axios.get<GithubReleaseDto[]>(
      this.buildRepositoryUrl('/releases'),
      {
        headers: this.headers,
      },
    );

    return data;
  }

  /**
   * Returns issues of the configured GitHub repository by status.
   * Filters out pull requests.
   * @param {string} status Issue status (e.g., open, closed, all)
   * @returns {Promise<GithubIssueDto[]>} Array of issue objects
   */
  async getIssues(status: string = 'open'): Promise<GithubIssueDto[]> {
    const { data } = await axios.get<GithubIssueApiResponse[]>(
      this.buildRepositoryUrl(`/issues?state=${status}&per_page=25`),
      {
        headers: this.headers,
      },
    );

    return data.filter((issue) => !issue.pull_request);
  }

  /**
   * Creates a new GitHub issue and applies the selected issue type as metadata.
   * @param {CreateGithubIssueDto} issueDto Validated issue creation payload
   * @returns {Promise<GithubIssueDto>} Newly created GitHub issue
   */
  async createIssue(issueDto: CreateGithubIssueDto): Promise<GithubIssueDto> {
    this.assertTokenConfigured();

    const { data } = await axios.post<GithubIssueApiResponse>(
      this.buildRepositoryUrl('/issues'),
      {
        title: issueDto.title.trim(),
        body: this.buildIssueBody(issueDto),
      },
      {
        headers: this.headers,
      },
    );

    const createdIssue: GithubIssueDto = {
      ...data,
      labels: data.labels ?? [],
      assignees: data.assignees ?? [],
    };
    const labelConfig = this.getTypeLabelConfig(issueDto.type);

    try {
      await this.ensureTypeLabelExists(labelConfig);
      createdIssue.labels = await this.attachTypeLabelToIssue(
        createdIssue.number,
        labelConfig,
      );
    } catch (error) {
      this.logger.warn(
        `Created issue #${createdIssue.number}, but could not sync label "${labelConfig.name}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return createdIssue;
  }
}
