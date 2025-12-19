import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import axios from 'axios';
import { GITHUB_API_URL, GITHUB_REPO, GITHUB_TOKEN } from 'src/constants/project.constants';

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

  async getRepository() {
    const url = `${this.apiUrl}/repos/${this.repo}`;
    const { data } = await axios.get(url, { headers: this.headers });
    return data;
  }

  async getReleases() {
    const url = `${this.apiUrl}/repos/${this.repo}/releases`;
    const { data } = await axios.get(url, { headers: this.headers });
    return data;
  }

  async getIssues(status: string = 'open') {
    const url = `${this.apiUrl}/repos/${this.repo}/issues?state=${status}`;
    const { data } = await axios.get(url, { headers: this.headers });
    return data;
  }
}
