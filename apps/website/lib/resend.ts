import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '';
export const FROM = process.env.RESEND_FROM || 'Angular Stream Resource <hello@cacheplane.io>';
export const NOTIFY_TO = process.env.RESEND_NOTIFY_TO || 'hello@cacheplane.io';

/** Add a contact to the Resend audience. Fails silently. */
export async function addToAudience(email: string, firstName?: string) {
  if (!AUDIENCE_ID) return;
  try {
    await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email,
      firstName: firstName || undefined,
    });
  } catch (err) {
    console.error('[resend] addToAudience failed:', err);
  }
}
