import { google } from 'googleapis';

export class GmailDraftService {
  static async createManualReplyDraft(oauth2Client: any, originalMessage: any, accountEmail: string): Promise<string> {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const headers = originalMessage.payload?.headers || [];
    const subject = getHeader(headers, 'Subject') || 'No Subject';
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'Reply-To') || from; // prefer Reply-To
    const messageId = getHeader(headers, 'Message-Id') || getHeader(headers, 'Message-ID');
    const references = getHeader(headers, 'References');
    const threadId = originalMessage.threadId;

    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const body = [
      'Hi,',
      '',
      "Thanks for your email. I’ll get back to you shortly.",
      '',
      'Best,',
      'Manan'
    ].join('\r\n');

    const raw = buildRfc822({
      to,
      from: accountEmail,
      subject: replySubject,
      inReplyTo: messageId,
      references,
      body
    });

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw, threadId } }
    });

    return res.data.id!;
  }
}

function getHeader(headers: any[], name: string): string {
  const h = headers.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function base64urlEncode(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildRfc822(opts: { to: string; from: string; subject: string; inReplyTo?: string; references?: string; body: string }): string {
  const lines: string[] = [];
  lines.push(`To: ${opts.to}`);
  lines.push(`From: ${opts.from}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('MIME-Version: 1.0');
  lines.push('');
  lines.push(opts.body);
  const rfc822 = lines.join('\r\n');
  return base64urlEncode(rfc822);
}
