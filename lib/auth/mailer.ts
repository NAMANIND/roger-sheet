type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Dispatch <dispatch@eretzdevelopers.com>';

  if (!apiKey) {
    console.info('[auth] Email (dev mode — no RESEND_API_KEY):');
    console.info(`  To: ${options.to}`);
    console.info(`  Subject: ${options.subject}`);
    console.info(`  ${options.text}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, '<br>'),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send email (${res.status}): ${body}`);
  }
}

export async function sendLoginOtpEmail(email: string, code: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `${code} is your Dispatch sign-in code`,
    text: [
      'Your Dispatch sign-in code',
      '',
      code,
      '',
      'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
    ].join('\n'),
  });
}
