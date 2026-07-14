/**
 * Outbound e-mail boundary. The console implementation is for development
 * and self-hosted trials; an SMTP implementation slots in behind the same
 * interface when a deployment needs real delivery.
 */
export interface Mailer {
  sendLoginLink(email: string, url: string): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async sendLoginLink(email: string, url: string): Promise<void> {
    console.log(`[rokade] innloggingslenke til ${email}: ${url}`);
  }
}

let defaultMailer: Mailer | undefined;

export function mailer(): Mailer {
  defaultMailer ??= new ConsoleMailer();
  return defaultMailer;
}
