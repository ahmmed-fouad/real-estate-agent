/**
 * Email Template Service
 * Task 4.5 Refactor: Centralized email template generation
 * Eliminates CSS/HTML duplication across notification services
 */

import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('EmailTemplateService');

/**
 * Base template styles shared across all emails
 */
const BASE_STYLES = `
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
.info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
.label { font-weight: bold; color: #374151; }
.value { color: #6b7280; margin-left: 10px; }
.cta-button { display: inline-block; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
.footer { text-align: center; padding-top: 20px; color: #9ca3af; font-size: 12px; }
`.trim();

/**
 * Info section for displaying key-value pairs
 */
export interface InfoSection {
  label: string;
  value: string;
}

/**
 * Content section for the email body
 */
export interface ContentSection {
  heading?: string;
  content: string;
  style?: 'default' | 'highlight' | 'warning' | 'code';
}

/**
 * Call-to-action button
 */
export interface CTAButton {
  text: string;
  url: string;
  color?: string;
}

/**
 * Email template options
 */
export interface EmailTemplateOptions {
  title: string;
  subtitle?: string;
  headerColor: string;
  infoSections?: InfoSection[];
  contentSections: ContentSection[];
  cta?: CTAButton;
  actionNote?: string;
  footerText?: string;
  customStyles?: string;
}

export class EmailTemplateService {
  /**
   * Generate a styled HTML email from template options
   */
  generateEmail(options: EmailTemplateOptions): string {
    logger.debug('Generating email template', {
      title: options.title,
      sectionsCount: options.contentSections.length,
    });

    const styles = this.buildStyles(options);
    const header = this.buildHeader(options);
    const infoBoxes = this.buildInfoBoxes(options.infoSections);
    const contentSections = this.buildContentSections(options.contentSections);
    const ctaButton = this.buildCTAButton(options.cta, options.headerColor);
    const actionNote = this.buildActionNote(options.actionNote);
    const footer = this.buildFooter(options.footerText);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
${styles}
  </style>
</head>
<body>
  <div class="container">
    ${header}
    <div class="content">
      ${infoBoxes}
      ${contentSections}
      ${ctaButton}
      ${actionNote}
    </div>
    ${footer}
  </div>
</body>
</html>
    `.trim();

    logger.debug('Email template generated', {
      htmlLength: html.length,
    });

    return html;
  }

  /**
   * Build complete styles (base + custom)
   */
  private buildStyles(options: EmailTemplateOptions): string {
    const headerStyle = `.header { background: ${options.headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }`;
    const contentStyle = options.infoSections && options.infoSections.length > 0
      ? `.content { border-top: none; }`
      : '';

    return `${BASE_STYLES}\n${headerStyle}\n${contentStyle}\n${options.customStyles || ''}`;
  }

  /**
   * Build email header
   */
  private buildHeader(options: EmailTemplateOptions): string {
    const subtitle = options.subtitle ? `<p>${options.subtitle}</p>` : '';
    
    return `
    <div class="header">
      <h1>${options.title}</h1>
      ${subtitle}
    </div>
    `.trim();
  }

  /**
   * Build info boxes for key-value pairs
   */
  private buildInfoBoxes(sections?: InfoSection[]): string {
    if (!sections || sections.length === 0) return '';

    const items = sections
      .map((section) => `<p><span class="label">${section.label}:</span><span class="value">${section.value}</span></p>`)
      .join('\n      ');

    return `
      <div class="info-box">
        ${items}
      </div>
    `.trim();
  }

  /**
   * Build content sections
   */
  private buildContentSections(sections: ContentSection[]): string {
    return sections
      .map((section) => {
        const heading = section.heading ? `<h3>${section.heading}</h3>` : '';
        const className = this.getContentClassName(section.style);
        const content = section.style === 'code' 
          ? `<div class="${className}">${section.content}</div>`
          : `<p>${section.content}</p>`;

        return `
      ${heading}
      ${content}
        `.trim();
      })
      .join('\n\n      ');
  }

  /**
   * Get CSS class name for content style
   */
  private getContentClassName(style?: string): string {
    switch (style) {
      case 'highlight':
        return 'highlight-box';
      case 'warning':
        return 'warning-box';
      case 'code':
        return 'code-block';
      default:
        return '';
    }
  }

  /**
   * Build CTA button
   */
  private buildCTAButton(cta?: CTAButton, defaultColor?: string): string {
    if (!cta) return '';

    const color = cta.color || defaultColor || '#3b82f6';

    return `
      <div style="text-align: center;">
        <a href="${cta.url}" class="cta-button" style="background: ${color};">
          ${cta.text}
        </a>
      </div>
    `.trim();
  }

  /**
   * Build action note box
   */
  private buildActionNote(note?: string): string {
    if (!note) return '';

    return `
      <div class="info-box" style="border-left-color: #3b82f6;">
        <h4 style="margin-top: 0;">📝 Action Required</h4>
        <p>${note}</p>
      </div>
    `.trim();
  }

  /**
   * Build email footer
   */
  private buildFooter(customText?: string): string {
    const text = customText || 'WhatsApp Real Estate AI';
    
    return `
    <div class="footer">
      <p>${text}</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
    `.trim();
  }

  /**
   * Format conversation messages for email display
   */
  formatConversationMessages(messages: Array<{ role: string; content: string; timestamp: Date }>): string {
    const formattedMessages = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Customer' : msg.role === 'agent' ? 'Agent' : 'AI';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const content = typeof msg.content === 'string' ? msg.content : '[Media Message]';

        return `<div style="background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 14px;">
          <strong>${role}</strong> <span style="color: #9ca3af;">${time}</span><br>
          ${content}
        </div>`;
      })
      .join('\n');

    return formattedMessages;
  }

  /**
   * Add custom style definitions for specialized content
   */
  getCustomStyles(options: {
    includeScoreBadge?: boolean;
    includeConversationStyle?: boolean;
    includeHighlightBox?: boolean;
  }): string {
    let styles = '';

    if (options.includeScoreBadge) {
      styles += '.score-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; }\n';
    }

    if (options.includeConversationStyle) {
      styles += '.conversation { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; white-space: pre-wrap; font-family: monospace; font-size: 12px; }\n';
    }

    if (options.includeHighlightBox) {
      styles += '.summary { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }\n';
      styles += '.message { background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 14px; }\n';
    }

    return styles;
  }
}

// Export singleton instance
export const emailTemplateService = new EmailTemplateService();
