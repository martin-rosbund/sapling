import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum GithubIssueStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ALL = 'all',
}

export enum GithubIssueType {
  BUG = 'bug',
  FEATURE = 'feature',
}

export class GithubIssueStatusQueryDto {
  @ApiPropertyOptional({
    description: 'Filtert Issues nach Status.',
    enum: GithubIssueStatus,
    default: GithubIssueStatus.OPEN,
  })
  @IsEnum(GithubIssueStatus)
  status: GithubIssueStatus = GithubIssueStatus.OPEN;
}

export class CreateGithubIssueDto {
  @ApiProperty({
    description: 'Titel des anzulegenden GitHub-Issues.',
    maxLength: 256,
    example: 'Export bricht bei leerem Filter ab',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @ApiProperty({
    description: 'Beschreibung des Problems oder Feature-Wunsches.',
    maxLength: 10000,
    example:
      'Beim Export ohne aktive Filter erscheint ein 500-Fehler im Backend.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description!: string;

  @ApiProperty({
    description:
      'Kategorisierung des Issues. Wird im GitHub-Issue als Typ hinterlegt und nach Möglichkeit als Label gesetzt.',
    enum: GithubIssueType,
    example: GithubIssueType.BUG,
  })
  @IsEnum(GithubIssueType)
  type!: GithubIssueType;
}

export class GithubIssueAssigneeDto {
  @ApiProperty()
  login!: string;

  @ApiProperty()
  avatar_url!: string;

  @ApiProperty()
  html_url!: string;
}

export class GithubIssueLabelDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  color!: string;
}

export class GithubIssueDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  html_url!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  updated_at!: string;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty({ type: [GithubIssueAssigneeDto] })
  assignees!: GithubIssueAssigneeDto[];

  @ApiProperty({ type: [GithubIssueLabelDto] })
  labels!: GithubIssueLabelDto[];
}

export class GithubRepositoryOwnerDto {
  @ApiProperty()
  login!: string;

  @ApiProperty()
  id!: number;

  @ApiProperty()
  avatar_url!: string;

  @ApiProperty()
  html_url!: string;
}

export class GithubRepositoryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  full_name!: string;

  @ApiProperty()
  html_url!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  private!: boolean;

  @ApiProperty({ type: GithubRepositoryOwnerDto })
  owner!: GithubRepositoryOwnerDto;

  @ApiProperty()
  fork!: boolean;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;

  @ApiProperty()
  pushed_at!: string;

  @ApiPropertyOptional()
  homepage!: string | null;

  @ApiProperty()
  size!: number;

  @ApiProperty()
  stargazers_count!: number;

  @ApiProperty()
  watchers_count!: number;

  @ApiPropertyOptional()
  language!: string | null;

  @ApiProperty()
  forks_count!: number;

  @ApiProperty()
  open_issues_count!: number;

  @ApiProperty()
  default_branch!: string;
}

export class GithubReleaseAuthorDto {
  @ApiProperty()
  login!: string;

  @ApiProperty()
  id!: number;

  @ApiProperty()
  avatar_url!: string;

  @ApiProperty()
  html_url!: string;
}

export class GithubReleaseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  tag_name!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  draft!: boolean;

  @ApiProperty()
  prerelease!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  published_at!: string;

  @ApiProperty()
  html_url!: string;

  @ApiProperty()
  tarball_url!: string;

  @ApiProperty()
  zipball_url!: string;

  @ApiPropertyOptional()
  body!: string | null;

  @ApiProperty({ type: GithubReleaseAuthorDto })
  author!: GithubReleaseAuthorDto;
}
