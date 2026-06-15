import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import { google, admin_directory_v1 } from 'googleapis';
import { EntityManager } from '@mikro-orm/core';
import { CompanyItem } from '../entity/CompanyItem';
import { PersonItem } from '../entity/PersonItem';
import { PersonSessionItem } from '../entity/PersonSessionItem';
import { PersonTypeItem } from '../entity/PersonTypeItem';
import { RoleItem } from '../entity/RoleItem';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '../constants/project.constants';
import {
  ImportProviderUsersDto,
  ProviderUserDto,
  ProviderUserImportResponseDto,
  ProviderUserImportRowDto,
  ProviderUserListResponseDto,
  ProviderUserProvider,
} from './dto/provider-user.dto';

type AzureGraphUser = {
  id?: string | null;
  displayName?: string | null;
  givenName?: string | null;
  surname?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type AzureGraphUsersResponse = {
  value?: AzureGraphUser[];
  '@odata.nextLink'?: string;
};

type GoogleDirectoryUser = {
  id?: string | null;
  primaryEmail?: string | null;
  name?: {
    givenName?: string | null;
    familyName?: string | null;
    fullName?: string | null;
  } | null;
  suspended?: boolean | null;
};

type GoogleDirectoryUsersResponse = {
  users?: GoogleDirectoryUser[];
  nextPageToken?: string | null;
};

const PROVIDER_DIRECTORY_RETRY_ATTEMPTS = 2;
const PROVIDER_DIRECTORY_RETRY_DELAY_MS = 350;
const PROVIDER_DIRECTORY_PAGE_SIZE = 50;
const PROVIDER_DIRECTORY_SEARCH_SCAN_LIMIT = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getProviderErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.statusCode === 'number'
    ? error.statusCode
    : typeof error.status === 'number'
      ? error.status
      : typeof error.code === 'number'
        ? error.code
        : isRecord(error.response) && typeof error.response.status === 'number'
          ? error.response.status
          : undefined;
}

function isAuthenticationProviderError(error: unknown): boolean {
  const status = getProviderErrorStatus(error);

  if (status === 401 || status === 403) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  const message =
    typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('token') ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
}

function isTransientProviderError(error: unknown): boolean {
  const status = getProviderErrorStatus(error);
  if (
    status === 408 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (typeof status === 'number' && status >= 500)
  ) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  const code =
    typeof error.code === 'string' ? error.code.toLowerCase() : undefined;
  if (
    code &&
    [
      'typeerror',
      'econnreset',
      'econnrefused',
      'etimedout',
      'enotfound',
      'eai_again',
      'und_err_connect_timeout',
      'und_err_headers_timeout',
      'und_err_socket',
    ].includes(code)
  ) {
    return true;
  }

  const message =
    typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('temporarily unavailable')
  );
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[^@\s<>]+@[^@\s<>]+$/.test(normalized)
    ? normalized
    : null;
}

@Injectable()
export class AuthProviderUserImportService {
  constructor(private readonly em: EntityManager) {}

  async listProviderUsers(
    currentUser: PersonItem,
    provider: ProviderUserProvider,
    options: { search?: string; pageToken?: string } = {},
  ): Promise<ProviderUserListResponseDto> {
    this.assertCurrentUserCanUseProvider(currentUser, provider);
    const session = await this.getCurrentProviderSession(currentUser, provider);

    const users =
      provider === 'azure'
        ? await this.listAzureUsersWithRetry(session, options)
        : await this.listGoogleUsersWithRetry(session, options);

    await this.em.flush();
    users.users = await this.annotateExistingPeople(users.users);
    return users;
  }

  async importProviderUsers(
    currentUser: PersonItem,
    dto: ImportProviderUsersDto,
  ): Promise<ProviderUserImportResponseDto> {
    this.assertCurrentUserCanUseProvider(currentUser, dto.provider);
    const session = await this.getCurrentProviderSession(
      currentUser,
      dto.provider,
    );

    const roleHandles = Array.from(new Set(dto.roleHandles));
    const roles = await this.em.find(RoleItem, {
      handle: { $in: roleHandles },
    });

    if (roles.length !== roleHandles.length) {
      throw new BadRequestException('providerUserImport.rolesNotFound');
    }

    const personType = await this.em.findOne(PersonTypeItem, {
      handle: dto.provider,
    });
    if (!personType) {
      throw new BadRequestException('providerUserImport.personTypeMissing');
    }
    const company = dto.companyHandle
      ? await this.em.findOne(CompanyItem, { handle: dto.companyHandle })
      : null;

    if (dto.companyHandle && !company) {
      throw new BadRequestException('providerUserImport.companyNotFound');
    }

    const result: ProviderUserImportResponseDto = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      rows: [],
    };

    for (const providerUserId of Array.from(new Set(dto.userIds))) {
      const row = await this.importOneProviderUser(
        session,
        dto.provider,
        providerUserId,
        personType,
        roles,
        company,
      );
      result.rows.push(row);
      result[row.action] += 1;
    }

    await this.em.flush();
    return result;
  }

  private async importOneProviderUser(
    session: PersonSessionItem,
    provider: ProviderUserProvider,
    providerUserId: string,
    personType: PersonTypeItem,
    roles: RoleItem[],
    company: CompanyItem | null,
  ): Promise<ProviderUserImportRowDto> {
    try {
      const providerUser =
        provider === 'azure'
          ? await this.getAzureUserWithRetry(session, providerUserId)
          : await this.getGoogleUserWithRetry(session, providerUserId);

      if (!providerUser.id) {
        return {
          providerUserId,
          action: 'skipped',
          message: 'providerUserImport.providerUserMissingId',
        };
      }

      const { person, action } = await this.upsertPersonFromProviderUser(
        providerUser,
        personType,
        roles,
        company,
      );

      return {
        providerUserId,
        action,
        personHandle: person.handle ?? null,
        displayName: providerUser.displayName,
        email: providerUser.email,
      };
    } catch (error) {
      return {
        providerUserId,
        action: 'failed',
        message:
          error instanceof Error
            ? error.message
            : 'providerUserImport.importFailed',
      };
    }
  }

  private async upsertPersonFromProviderUser(
    providerUser: ProviderUserDto,
    personType: PersonTypeItem,
    roles: RoleItem[],
    company: CompanyItem | null,
  ): Promise<{ person: PersonItem; action: 'created' | 'updated' }> {
    const externalId = providerUser.id.trim();
    const email = normalizeEmail(providerUser.email);
    let person = (await this.em.findOne(
      PersonItem,
      { loginName: externalId },
      { populate: ['roles', 'type'] },
    )) as PersonItem | null;

    if (!person && email) {
      person = (await this.em.findOne(
        PersonItem,
        { email },
        { populate: ['roles', 'type'] },
      )) as PersonItem | null;
    }

    const names = this.resolvePersonNames(providerUser);
    const action = person ? 'updated' : 'created';

    if (!person) {
      person = this.em.create(PersonItem, {
        loginName: externalId,
        firstName: names.firstName,
        lastName: names.lastName,
        email: email ?? undefined,
        type: personType,
        company: company ?? undefined,
        isActive: true,
      });
      this.em.persist(person);
    } else {
      person.loginName = externalId;
      person.firstName = names.firstName;
      person.lastName = names.lastName;
      person.email = email ?? person.email;
      person.type = personType;
      if (company) {
        person.company = company;
      }
      person.isActive = true;
    }

    for (const role of roles) {
      if (!person.roles.contains(role)) {
        person.roles.add(role);
      }
    }

    return { person, action };
  }

  private resolvePersonNames(providerUser: ProviderUserDto): {
    firstName: string;
    lastName: string;
  } {
    const displayName = providerUser.displayName.trim();
    const fallbackLabel =
      displayName ||
      providerUser.email?.trim() ||
      providerUser.userPrincipalName?.trim() ||
      providerUser.id.trim();
    const parts = fallbackLabel.split(/\s+/).filter(Boolean);
    const firstName =
      providerUser.firstName?.trim() ||
      (parts.length > 1 ? parts.slice(0, -1).join(' ') : fallbackLabel);
    const lastName =
      providerUser.lastName?.trim() ||
      (parts.length > 1 ? parts[parts.length - 1] : fallbackLabel);

    return {
      firstName: truncate(firstName, 64),
      lastName: truncate(lastName, 64),
    };
  }

  private async annotateExistingPeople(
    users: ProviderUserDto[],
  ): Promise<ProviderUserDto[]> {
    const ids = users.map((user) => user.id).filter(Boolean);
    const emails = users
      .map((user) => normalizeEmail(user.email))
      .filter((email): email is string => Boolean(email));

    const people =
      ids.length || emails.length
        ? await this.em.find(PersonItem, {
            $or: [
              ...(ids.length ? [{ loginName: { $in: ids } }] : []),
              ...(emails.length ? [{ email: { $in: emails } }] : []),
            ],
          })
        : [];

    return users.map((user) => {
      const normalizedEmail = normalizeEmail(user.email);
      const existing = people.find(
        (person) =>
          person.loginName === user.id ||
          (normalizedEmail && normalizeEmail(person.email) === normalizedEmail),
      );

      return {
        ...user,
        existingPersonHandle: existing?.handle ?? null,
      };
    });
  }

  private assertCurrentUserCanUseProvider(
    currentUser: PersonItem,
    provider: ProviderUserProvider,
  ): void {
    const typeHandle = currentUser.type?.handle;
    if (typeHandle !== provider) {
      throw new ForbiddenException(
        provider === 'azure'
          ? 'providerUserImport.azureUserRequired'
          : 'providerUserImport.googleUserRequired',
      );
    }
  }

  private async getCurrentProviderSession(
    currentUser: PersonItem,
    provider: ProviderUserProvider,
  ): Promise<PersonSessionItem> {
    const session = await this.em.findOne(PersonSessionItem, {
      person: { handle: currentUser.handle },
    });

    if (!session) {
      throw new UnauthorizedException(
        provider === 'azure'
          ? 'providerUserImport.azureSessionNotFound'
          : 'providerUserImport.googleSessionNotFound',
      );
    }

    return session;
  }

  private createAzureClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  private async listAzureUsersWithRetry(
    session: PersonSessionItem,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const accessToken = await this.resolveAzureAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('providerUserImport.azureTokenNotFound');
    }

    try {
      return await this.executeProviderDirectoryRequest('azure', () =>
        this.listAzureUsers(accessToken, options),
      );
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshAzureAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.executeProviderDirectoryRequest('azure', () =>
        this.listAzureUsers(refreshedToken, options),
      );
    }
  }

  private async listAzureUsers(
    accessToken: string,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const client = this.createAzureClient(accessToken);
    const search = options.search?.trim();

    if (search) {
      return this.listAzureUsersByLocalSearch(client, options);
    }

    const response = await this.fetchAzureUsersPage(client, options.pageToken);
    return {
      users: (response.value ?? []).map((user) =>
        this.mapAzureUserToProviderUser(user),
      ),
      nextPageToken: response['@odata.nextLink'] ?? null,
    };
  }

  private async listAzureUsersByLocalSearch(
    client: Client,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const matches: ProviderUserDto[] = [];
    let scanned = 0;
    let nextPageToken: string | null = options.pageToken ?? null;

    do {
      const response = await this.fetchAzureUsersPage(client, nextPageToken);
      const pageUsers = response.value ?? [];
      scanned += pageUsers.length;
      matches.push(
        ...pageUsers
          .map((user) => this.mapAzureUserToProviderUser(user))
          .filter((user) =>
            this.providerUserMatchesSearch(user, options.search),
          ),
      );
      nextPageToken = response['@odata.nextLink'] ?? null;
    } while (
      nextPageToken &&
      matches.length < PROVIDER_DIRECTORY_PAGE_SIZE &&
      scanned < PROVIDER_DIRECTORY_SEARCH_SCAN_LIMIT
    );

    return {
      users: matches.slice(0, PROVIDER_DIRECTORY_PAGE_SIZE),
      nextPageToken,
    };
  }

  private async fetchAzureUsersPage(
    client: Client,
    pageToken?: string | null,
  ): Promise<AzureGraphUsersResponse> {
    let request = client.api(pageToken || '/users');

    if (!pageToken) {
      request = request
        .select(
          'id,displayName,givenName,surname,mail,userPrincipalName,accountEnabled',
        )
        .top(PROVIDER_DIRECTORY_PAGE_SIZE);
    }

    return (await request.get()) as AzureGraphUsersResponse;
  }

  private async getAzureUserWithRetry(
    session: PersonSessionItem,
    userId: string,
  ): Promise<ProviderUserDto> {
    const accessToken = await this.resolveAzureAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('providerUserImport.azureTokenNotFound');
    }

    try {
      return await this.executeProviderDirectoryRequest('azure', () =>
        this.getAzureUser(accessToken, userId),
      );
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshAzureAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.executeProviderDirectoryRequest('azure', () =>
        this.getAzureUser(refreshedToken, userId),
      );
    }
  }

  private async getAzureUser(
    accessToken: string,
    userId: string,
  ): Promise<ProviderUserDto> {
    const client = this.createAzureClient(accessToken);
    const user = (await client
      .api(`/users/${encodeURIComponent(userId)}`)
      .select('id,displayName,givenName,surname,mail,userPrincipalName')
      .get()) as AzureGraphUser;
    return this.mapAzureUserToProviderUser(user);
  }

  private mapAzureUserToProviderUser(user: AzureGraphUser): ProviderUserDto {
    const id = user.id?.trim() ?? '';
    const email =
      normalizeEmail(user.mail) ?? normalizeEmail(user.userPrincipalName);
    const displayName =
      user.displayName?.trim() ||
      [user.givenName, user.surname].filter(Boolean).join(' ').trim() ||
      email ||
      id;

    return {
      provider: 'azure',
      id,
      displayName,
      firstName: user.givenName?.trim() || null,
      lastName: user.surname?.trim() || null,
      email,
      userPrincipalName: user.userPrincipalName?.trim() || null,
    };
  }

  private async listGoogleUsersWithRetry(
    session: PersonSessionItem,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const accessToken = await this.resolveGoogleAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('providerUserImport.googleTokenNotFound');
    }

    try {
      return await this.executeProviderDirectoryRequest('google', () =>
        this.listGoogleUsers(accessToken, options),
      );
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshGoogleAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.executeProviderDirectoryRequest('google', () =>
        this.listGoogleUsers(refreshedToken, options),
      );
    }
  }

  private async listGoogleUsers(
    accessToken: string,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const directory = google.admin({ version: 'directory_v1' });
    const search = options.search?.trim();

    if (search) {
      return this.listGoogleUsersByLocalSearch(directory, accessToken, options);
    }

    const response = await this.fetchGoogleUsersPage(
      directory,
      accessToken,
      options.pageToken,
    );

    return {
      users: (response.users ?? []).map((user) =>
        this.mapGoogleUserToProviderUser(user),
      ),
      nextPageToken: response.nextPageToken ?? null,
    };
  }

  private async listGoogleUsersByLocalSearch(
    directory: admin_directory_v1.Admin,
    accessToken: string,
    options: { search?: string; pageToken?: string },
  ): Promise<ProviderUserListResponseDto> {
    const matches: ProviderUserDto[] = [];
    let scanned = 0;
    let nextPageToken: string | null = options.pageToken ?? null;

    do {
      const response = await this.fetchGoogleUsersPage(
        directory,
        accessToken,
        nextPageToken,
      );
      const pageUsers = response.users ?? [];
      scanned += pageUsers.length;
      matches.push(
        ...pageUsers
          .map((user) => this.mapGoogleUserToProviderUser(user))
          .filter((user) =>
            this.providerUserMatchesSearch(user, options.search),
          ),
      );
      nextPageToken = response.nextPageToken ?? null;
    } while (
      nextPageToken &&
      matches.length < PROVIDER_DIRECTORY_PAGE_SIZE &&
      scanned < PROVIDER_DIRECTORY_SEARCH_SCAN_LIMIT
    );

    return {
      users: matches.slice(0, PROVIDER_DIRECTORY_PAGE_SIZE),
      nextPageToken,
    };
  }

  private async fetchGoogleUsersPage(
    directory: admin_directory_v1.Admin,
    accessToken: string,
    pageToken?: string | null,
  ): Promise<GoogleDirectoryUsersResponse> {
    const response = (await directory.users.list({
      auth: accessToken,
      customer: 'my_customer',
      maxResults: PROVIDER_DIRECTORY_PAGE_SIZE,
      orderBy: 'email',
      pageToken: pageToken || undefined,
    })) as { data: GoogleDirectoryUsersResponse };

    return response.data;
  }

  private async getGoogleUserWithRetry(
    session: PersonSessionItem,
    userId: string,
  ): Promise<ProviderUserDto> {
    const accessToken = await this.resolveGoogleAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('providerUserImport.googleTokenNotFound');
    }

    try {
      return await this.executeProviderDirectoryRequest('google', () =>
        this.getGoogleUser(accessToken, userId),
      );
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshGoogleAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.executeProviderDirectoryRequest('google', () =>
        this.getGoogleUser(refreshedToken, userId),
      );
    }
  }

  private async getGoogleUser(
    accessToken: string,
    userId: string,
  ): Promise<ProviderUserDto> {
    const directory = google.admin({ version: 'directory_v1' });
    const response = (await directory.users.get({
      auth: accessToken,
      userKey: userId,
    })) as { data: GoogleDirectoryUser };
    return this.mapGoogleUserToProviderUser(response.data);
  }

  private mapGoogleUserToProviderUser(
    user: GoogleDirectoryUser,
  ): ProviderUserDto {
    const id = user.id?.trim() ?? '';
    const email = normalizeEmail(user.primaryEmail);
    const displayName =
      user.name?.fullName?.trim() ||
      [user.name?.givenName, user.name?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      email ||
      id;

    return {
      provider: 'google',
      id,
      displayName,
      firstName: user.name?.givenName?.trim() || null,
      lastName: user.name?.familyName?.trim() || null,
      email,
      userPrincipalName: email,
    };
  }

  private providerUserMatchesSearch(
    user: ProviderUserDto,
    search?: string,
  ): boolean {
    const normalizedSearch = search?.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return [
      user.displayName,
      user.email,
      user.userPrincipalName,
      user.firstName,
      user.lastName,
      user.id,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
  }

  private async refreshAzureAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const refreshToken = session.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_AD_TENNANT_ID || 'common'}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: AZURE_AD_CLIENT_ID,
      client_secret: AZURE_AD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    if (AZURE_AD_SCOPE.length > 0) {
      params.set('scope', AZURE_AD_SCOPE.join(' '));
    }

    const response = await axios.post<{ access_token?: string }>(
      tokenEndpoint,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = response.data.access_token?.trim() ?? null;
    if (accessToken) {
      session.accessToken = accessToken;
    }

    return accessToken;
  }

  private async resolveAzureAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    return session.accessToken?.trim() || this.refreshAzureAccessToken(session);
  }

  private async refreshGoogleAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const refreshToken = session.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || undefined,
      GOOGLE_CLIENT_SECRET || undefined,
      GOOGLE_CALLBACK_URL || undefined,
    );
    auth.setCredentials({ refresh_token: refreshToken });
    const refreshed = await auth.refreshAccessToken();
    const accessToken = refreshed.credentials.access_token?.trim() ?? null;

    if (accessToken) {
      session.accessToken = accessToken;
    }

    return accessToken;
  }

  private async resolveGoogleAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    return (
      session.accessToken?.trim() || this.refreshGoogleAccessToken(session)
    );
  }

  private async executeProviderDirectoryRequest<T>(
    provider: ProviderUserProvider,
    request: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= PROVIDER_DIRECTORY_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await request();
      } catch (error) {
        lastError = error;

        if (
          isAuthenticationProviderError(error) ||
          !isTransientProviderError(error) ||
          attempt >= PROVIDER_DIRECTORY_RETRY_ATTEMPTS
        ) {
          break;
        }

        await this.waitForProviderRetry(PROVIDER_DIRECTORY_RETRY_DELAY_MS);
      }
    }

    if (
      lastError &&
      !isAuthenticationProviderError(lastError) &&
      isTransientProviderError(lastError)
    ) {
      throw new BadGatewayException(
        provider === 'azure'
          ? 'providerUserImport.azureDirectoryUnavailable'
          : 'providerUserImport.googleDirectoryUnavailable',
      );
    }

    throw lastError;
  }

  private async waitForProviderRetry(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
