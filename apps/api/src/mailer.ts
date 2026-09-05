export type InviteMail = {
  to: string;
  inviteUrl: string;
  /** Optional company or product display name in the body. */
  companyName?: string;
};

export interface Mailer {
  sendDriverInvite(mail: InviteMail): Promise<boolean>;
}

/** Escape text for safe HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text invite body (multipart fallback). */
export function driverInviteText(mail: InviteMail): string {
  const product = mail.companyName?.trim() || "Fleet";
  return [
    `${product} — driver invitation`,
    "",
    `Hello,`,
    "",
    `You have been invited to join ${product} as a driver.`,
    "Use the secure link below to create your password and activate your account.",
    "",
    "Accept invitation:",
    mail.inviteUrl,
    "",
    "This invitation expires in 7 days and can be used once.",
    "If you were not expecting this email, you can ignore it.",
    "",
    "—",
    `${product} operations`,
  ].join("\n");
}

/**
 * Enterprise HTML invite — table layout + inline CSS for major clients.
 * Colors aligned with design tokens (navy brand / gray neutrals).
 */
export function driverInviteHtml(mail: InviteMail): string {
  const product = escapeHtml(mail.companyName?.trim() || "Fleet");
  const url = escapeHtml(mail.inviteUrl);
  const year = new Date().getUTCFullYear();

  // Tokens (light): brand #163a64 (navy.600), text #0c1219, secondary #4b5968, canvas #f6f8fb, border #e2e8ef
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${product} invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    You are invited to join ${product} as a driver. Create your password to get started.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f6f8fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="border-collapse:collapse;width:100%;max-width:560px;">
          <!-- Brand bar -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#6b8a9e;">&nbsp;</td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background-color:#0a1b30;padding:24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#a7c1dc;">
                    ${product}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:600;color:#ffffff;">
                    Driver invitation
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e2e8ef;border-top:0;padding:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#0c1219;">
                    Hello,
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#0c1219;">
                    You have been invited to join <strong style="font-weight:600;">${product}</strong> as a driver.
                    Create your password to activate access. This link is personal to your invitation.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;" align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" stroke="f" fillcolor="#163a64">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Segoe UI,sans-serif;font-size:15px;font-weight:600;">Accept invitation</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${url}"
                       style="display:inline-block;background-color:#163a64;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;border-radius:6px;padding:0 28px;min-width:180px;">
                      Accept invitation
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#4b5968;">
                    Or copy and paste this link into your browser:
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;line-height:1.5;color:#163a64;word-break:break-all;">
                    <a href="${url}" style="color:#163a64;text-decoration:underline;">${url}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;border-top:1px solid #e2e8ef;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#4b5968;">
                          <strong style="color:#1e2a37;font-weight:600;">Security notes</strong><br />
                          • This invitation expires in <strong style="font-weight:600;color:#1e2a37;">7 days</strong> and can be used once.<br />
                          • ${product} will never ask you for your password by email.<br />
                          • If you did not expect this message, you can ignore it safely.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 8px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7a8c;text-align:center;">
              Sent by ${product} · Operations access for invited drivers only<br />
              © ${year} ${product}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** No-op mailer for tests / missing config — reports not sent. */
export class NullMailer implements Mailer {
  constructor(private readonly reason = "RESEND_API_KEY and RESEND_FROM are required") {}

  async sendDriverInvite(_mail: InviteMail): Promise<boolean> {
    console.warn(`@fleet/api invite email not sent (${this.reason})`);
    return false;
  }
}

export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendDriverInvite(mail: InviteMail): Promise<boolean> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [mail.to],
          subject: "You're invited to Fleet",
          text: driverInviteText(mail),
          html: driverInviteHtml(mail),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `@fleet/api Resend invite failed status=${res.status} to=${mail.to} body=${body.slice(0, 500)}`,
        );
        return false;
      }
      console.log(`@fleet/api invite email sent to=${mail.to}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`@fleet/api Resend invite error to=${mail.to}: ${msg}`);
      return false;
    }
  }
}

export function mailerFromEnv(): Mailer {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (key && from) {
    console.log(`@fleet/api mailer=Resend from=${from}`);
    return new ResendMailer(key, from);
  }
  const missing = [
    !key ? "RESEND_API_KEY" : null,
    !from ? "RESEND_FROM" : null,
  ]
    .filter(Boolean)
    .join(", ");
  console.warn(`@fleet/api mailer=NullMailer (missing ${missing || "config"})`);
  return new NullMailer(`missing ${missing || "config"}`);
}

export function inviteUrlForToken(token: string): string {
  const base = (process.env.PUBLIC_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/invite?token=${encodeURIComponent(token)}`;
}
