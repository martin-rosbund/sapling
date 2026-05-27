import * as fs from 'fs';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import { MailAttachment } from './mail-delivery.util';

export function buildMimeMessage(
  delivery: EmailDeliveryItem,
  attachments: MailAttachment[],
  plainTextBody: string,
  senderEmail?: string,
): string {
  const mixedBoundary = `mixed_${Date.now()}`;
  const alternativeBoundary = `alt_${Date.now()}`;
  const headers = [
    ...(senderEmail ? [`From: ${senderEmail}`] : []),
    `To: ${delivery.toRecipients.join(', ')}`,
    ...(delivery.ccRecipients?.length
      ? [`Cc: ${delivery.ccRecipients.join(', ')}`]
      : []),
    ...(delivery.bccRecipients?.length
      ? [`Bcc: ${delivery.bccRecipients.join(', ')}`]
      : []),
    `Subject: ${encodeMimeHeader(delivery.subject)}`,
    'MIME-Version: 1.0',
    attachments.length > 0
      ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
      : `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
  ];

  const alternativeBody = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    plainTextBody,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    delivery.bodyHtml,
    '',
    `--${alternativeBoundary}--`,
    '',
  ].join('\r\n');

  if (attachments.length === 0) {
    return `${headers.join('\r\n')}${alternativeBody}`;
  }

  const parts = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
    alternativeBody,
  ];

  for (const attachment of attachments) {
    const content = fs.readFileSync(attachment.filePath).toString('base64');
    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.mimetype}; name="${escapeMimeValue(attachment.filename)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${escapeMimeValue(attachment.filename)}"`,
      '',
      content,
      '',
    );
  }

  parts.push(`--${mixedBoundary}--`, '');

  return `${headers.join('\r\n')}${parts.join('\r\n')}`;
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function escapeMimeValue(value: string): string {
  return value.replace(/"/g, '');
}
