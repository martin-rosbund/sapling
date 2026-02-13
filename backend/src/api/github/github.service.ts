import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import axios from 'axios';
import {
  GITHUB_API_URL,
  GITHUB_REPO,
  GITHUB_TOKEN,
} from 'src/constants/project.constants';

export interface SaplingIssue {
  id: number;
  title: string;
  html_url: string;
  body: string;
  updated_at: string;
  created_at: string;
  pull_request?: boolean;
  assignees: Array<{
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
  state: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export interface SaplingRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
}

export interface SaplingRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  tarball_url: string;
  zipball_url: string;
  body: string;
  author: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
}

@Injectable()
export class GithubService {
  private readonly repo: string;
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    this.repo = GITHUB_REPO;
    this.apiUrl = GITHUB_API_URL;
    this.token = GITHUB_TOKEN;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
    };
  }

  async getRepository(): Promise<SaplingRepository> {
    const url = `${this.apiUrl}/repos/${this.repo}`;
    const { data } = await axios.get<SaplingRepository>(url, {
      headers: this.headers,
    });
    return data;
  }

  async getReleases(): Promise<SaplingRelease[]> {
    const url = `${this.apiUrl}/repos/${this.repo}/releases`;
    const { data } = await axios.get<SaplingRelease[]>(url, {
      headers: this.headers,
    });
    return data;
  }

  async getIssues(status: string = 'open') {
    const url = `${this.apiUrl}/repos/${this.repo}/issues?state=${status}&per_page=10`;
    const { data } = await axios.get<SaplingIssue[]>(url, {
      headers: this.headers,
    });
    // Filter out pull requests (they have a 'pull_request' property)
    return data.filter((issue: SaplingIssue) => !issue.pull_request);
  }
}
