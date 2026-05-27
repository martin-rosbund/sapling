import { PersonItem } from '../../entity/PersonItem';
import { MailSenderOptionDto } from './dto/mail.dto';
import {
  normalizeEmailAddress,
  type SupportedMailProvider,
} from './mail-delivery.util';

export type MailSenderOption = MailSenderOptionDto;

export function extractProviderHandle(person: PersonItem): string | undefined {
  if (typeof person.type === 'string') {
    return person.type;
  }

  return person.type?.handle;
}

export function isSupportedMailProvider(
  provider: string | undefined,
): provider is SupportedMailProvider {
  return provider === 'azure' || provider === 'google';
}

export function parseSupportedProvider(
  provider: string | undefined,
): SupportedMailProvider | null {
  return isSupportedMailProvider(provider) ? provider : null;
}

export function buildFallbackSenderOptions(
  person: PersonItem,
  provider: string | undefined,
): MailSenderOption[] {
  const fallbackEmail = normalizeEmailAddress(person.email);
  if (!fallbackEmail) {
    return [];
  }

  return [
    {
      email: fallbackEmail,
      displayName: buildPersonDisplayName(person) || fallbackEmail,
      provider: provider ?? 'sapling',
      source: 'profile',
      isDefault: true,
    },
  ];
}

export function pushSenderOption(
  target: MailSenderOption[],
  email: string | undefined,
  displayName: string | undefined,
  provider: SupportedMailProvider,
  source: string,
  isDefault = false,
): void {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    return;
  }

  const existing = target.find(
    (entry) =>
      entry.email.trim().toLowerCase() === normalizedEmail.trim().toLowerCase(),
  );

  if (existing) {
    if (!existing.displayName && displayName) {
      existing.displayName = displayName;
    }
    existing.isDefault = existing.isDefault || isDefault;
    return;
  }

  target.push({
    email: normalizedEmail,
    displayName,
    provider,
    source,
    isDefault,
  });
}

export function mergeSenderOptions(
  discoveredSenders: MailSenderOption[],
  configuredSenders: MailSenderOption[],
): MailSenderOption[] {
  const merged = [...discoveredSenders];

  for (const configuredSender of configuredSenders) {
    const existing = merged.find(
      (sender) =>
        sender.email.trim().toLowerCase() ===
        configuredSender.email.trim().toLowerCase(),
    );

    if (existing) {
      existing.displayName =
        configuredSender.displayName ?? existing.displayName;
      existing.provider = configuredSender.provider;
      existing.source = configuredSender.source;
      existing.isDefault = existing.isDefault || configuredSender.isDefault;
      continue;
    }

    pushSenderOption(
      merged,
      configuredSender.email,
      configuredSender.displayName,
      configuredSender.provider as SupportedMailProvider,
      configuredSender.source,
      configuredSender.isDefault,
    );
  }

  return merged;
}

export function buildPersonDisplayName(person: PersonItem): string | undefined {
  return (
    `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || undefined
  );
}

export function buildStandaloneSenderOption(
  email: string | undefined,
  provider: string,
  displayName?: string,
): MailSenderOption | undefined {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    return undefined;
  }

  return {
    email: normalizedEmail,
    displayName,
    provider,
    source: 'profile',
    isDefault: true,
  };
}

export function getAssignedSharedMailboxSenders(
  person: PersonItem,
  provider: SupportedMailProvider,
): MailSenderOption[] {
  const sharedMailboxGroups = person.sharedMailboxGroups ?? [];
  const configuredSenders: MailSenderOption[] = [];

  for (const sharedMailboxGroup of sharedMailboxGroups) {
    if (sharedMailboxGroup.isActive === false) {
      continue;
    }

    const groupMailboxes = sharedMailboxGroup.items ?? [];
    for (const sharedMailbox of groupMailboxes) {
      if (!sharedMailbox.isActive) {
        continue;
      }

      if (
        extractSharedMailboxProviderHandle(sharedMailbox.provider)
          ?.trim()
          .toLowerCase() !== provider.trim().toLowerCase()
      ) {
        continue;
      }

      pushSenderOption(
        configuredSenders,
        sharedMailbox.email,
        sharedMailbox.title?.trim() || sharedMailbox.email,
        provider,
        'configured',
      );
    }
  }

  return configuredSenders;
}

function extractSharedMailboxProviderHandle(
  provider:
    | string
    | {
        handle?: string;
      }
    | null
    | undefined,
): string | undefined {
  if (typeof provider === 'string') {
    return provider;
  }

  return provider?.handle;
}
