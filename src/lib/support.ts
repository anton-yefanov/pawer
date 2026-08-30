import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { attempt, captureFeedback } from '@/lib/observability';
import { track } from '@/lib/telemetry';

const NAME_KEY = 'support_name';
const EMAIL_KEY = 'support_email';

export type SupportMessage = {
  name: string;
  email: string;
  message: string;
};

export async function sendSupportMessage(input: SupportMessage): Promise<boolean> {
  const message = input.message.trim();
  if (message === '') return false;

  const name = input.name.trim();
  const email = input.email.trim();

  const sent = await captureFeedback({ name, email, message });
  track('support_message_sent', { sent, length: message.length });
  if (!sent) return false;

  // Silent on failure: the message is already away, and nobody needs an alert
  // about a name that won't be prefilled next time.
  void attempt('support', remember(name, email));
  return true;
}

export async function loadSupportIdentity(): Promise<SupportMessage> {
  const [name, email] = await Promise.all([getSetting(db, NAME_KEY), getSetting(db, EMAIL_KEY)]);
  return { name: name ?? '', email: email ?? '', message: '' };
}

async function remember(name: string, email: string): Promise<void> {
  await setSetting(db, NAME_KEY, name);
  await setSetting(db, EMAIL_KEY, email);
}
