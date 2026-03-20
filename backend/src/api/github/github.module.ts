/**
 * @class GithubModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module providing GitHub-related services and controller for GitHub API endpoints.
 *
 * @property        {GithubService}     GithubService     Service for GitHub API queries
 * @property        {GithubController}  GithubController  Controller for GitHub endpoints
 */
import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}
