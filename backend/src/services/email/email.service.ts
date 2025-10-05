/**
 * Email Service
 * Task 4.4, Critical Issue #2: Automated email delivery
 * 
 * Handles sending emails for:
 * - Daily summary reports
 * - Weekly performance reports
 * - Monthly analytics reports
 * - Custom notifications
 */

import nodemailer, { Transporter } from 'nodemailer';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('EmailService');

/**
 * Email configuration interface
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

/**
 * Email message interface
 */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * Initialize email service with configuration
   */
  initialize(config: EmailConfig): void {
    logger.info('Initializing email service', { host: config.host, port: config.port });

    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  /**
   * Send an email
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    if (!this.transporter || !this.config) {
      logger.warn('Email service not initialized, skipping email send');
      return false;
    }

    try {
      logger.info('Sending email', { to: message.to, subject: message.subject });

      const info = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: message.to,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: message.to, subject: message.subject });
      return false;
    }
  }

  /**
   * Send report email
   */
  async sendReportEmail(
    to: string,
    subject: string,
    htmlContent: string,
    attachment?: { filename: string; content: Buffer; contentType: string }
  ): Promise<boolean> {
    const message: EmailMessage = {
      to,
      subject,
      html: htmlContent,
      attachments: attachment ? [attachment] : undefined,
    };

    return this.sendEmail(message);
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed', { error });
      return false;
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Initialize from environment variables if available
if (
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
) {
  emailService.initialize({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'WhatsApp Real Estate AI',
      email: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER,
    },
  });
}
