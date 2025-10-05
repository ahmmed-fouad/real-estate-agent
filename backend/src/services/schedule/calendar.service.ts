/**
 * Calendar Service
 * Task 4.3, Subtask 2: Calendar Integration
 * As per plan lines 995-999
 * 
 * Handles:
 * - Google Calendar integration (primary choice)
 * - iCal format support
 * - Availability sync
 */

import { createServiceLogger } from '../../utils/logger';
import { CalendarEvent, ICalEvent } from '../../types/schedule';

const logger = createServiceLogger('CalendarService');

/**
 * Calendar Service
 * Provides calendar integration functionality
 * 
 * Note: Google Calendar API integration requires:
 * - googleapis npm package
 * - OAuth2 credentials
 * - Agent authorization flow
 * 
 * This implementation provides the structure and iCal support.
 * Full Google Calendar integration requires OAuth setup in production.
 */
export class CalendarService {
  /**
   * Generate iCal format event
   * Task 4.3, Subtask 2: As per plan line 997
   * 
   * @param event - Calendar event data
   * @returns iCal formatted string
   */
  generateICalEvent(event: CalendarEvent): string {
    logger.debug('Generating iCal event', { title: event.title });

    const iCalEvent: ICalEvent = {
      uid: this.generateUID(event),
      summary: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      organizer: event.organizer,
      attendees: event.attendees,
      status: 'CONFIRMED',
    };

    const icalString = this.formatICalString(iCalEvent);

    logger.info('iCal event generated', {
      uid: iCalEvent.uid,
      summary: iCalEvent.summary,
      length: icalString.length,
    });

    return icalString;
  }

  /**
   * Format iCal string according to RFC 5545
   * Reference: https://datatracker.ietf.org/doc/html/rfc5545
   */
  private formatICalString(event: ICalEvent): string {
    const lines: string[] = [];

    // iCalendar header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Real Estate Agent//Viewing Scheduler//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:REQUEST');

    // Event
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${this.formatICalDate(new Date())}`);
    lines.push(`DTSTART:${this.formatICalDate(event.startTime)}`);
    lines.push(`DTEND:${this.formatICalDate(event.endTime)}`);
    lines.push(`SUMMARY:${this.escapeICalText(event.summary)}`);
    lines.push(`DESCRIPTION:${this.escapeICalText(event.description)}`);
    lines.push(`LOCATION:${this.escapeICalText(event.location)}`);
    lines.push(`STATUS:${event.status}`);
    
    // Organizer
    lines.push(`ORGANIZER;CN=${this.escapeICalText(event.organizer)}:mailto:${event.organizer}`);

    // Attendees
    for (const attendee of event.attendees) {
      lines.push(`ATTENDEE;CN=${this.escapeICalText(attendee)};RSVP=TRUE:mailto:${attendee}`);
    }

    // Reminder: 24 hours before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('DESCRIPTION:Reminder: Property viewing tomorrow');
    lines.push('ACTION:DISPLAY');
    lines.push('END:VALARM');

    // Reminder: 2 hours before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT2H');
    lines.push('DESCRIPTION:Reminder: Property viewing in 2 hours');
    lines.push('ACTION:DISPLAY');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Format date for iCal (ISO 8601 format without separators)
   * Format: YYYYMMDDTHHmmssZ
   */
  private formatICalDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape special characters for iCal text fields
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Generate unique identifier for calendar event
   */
  private generateUID(event: CalendarEvent): string {
    const timestamp = event.startTime.getTime();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}@realestate-agent.local`;
  }

  /**
   * Create calendar event from viewing data
   * Helper method to convert viewing data to CalendarEvent
   */
  createEventFromViewing(viewing: {
    id: string;
    scheduledTime: Date;
    durationMinutes?: number;
    property: {
      projectName: string;
      propertyType: string;
      city: string;
      district: string;
      address: string | null;
    };
    agent: {
      fullName: string;
      phoneNumber: string | null;
      whatsappNumber: string;
    };
    customerName: string | null;
    customerPhone: string;
    notes: string | null;
  }): CalendarEvent {
    const viewingDuration = viewing.durationMinutes || 60; // Use viewing duration or default to 60
    const endTime = new Date(viewing.scheduledTime.getTime() + viewingDuration * 60000);

    // Build location string
    const location = viewing.property.address
      ? `${viewing.property.address}, ${viewing.property.district}, ${viewing.property.city}`
      : `${viewing.property.district}, ${viewing.property.city}`;

    // Build description
    const description = [
      `Property Viewing: ${viewing.property.projectName}`,
      `Type: ${viewing.property.propertyType}`,
      `Location: ${location}`,
      ``,
      `Agent: ${viewing.agent.fullName}`,
      `Agent Contact: ${viewing.agent.phoneNumber || viewing.agent.whatsappNumber}`,
      ``,
      `Customer: ${viewing.customerName || 'N/A'}`,
      `Customer Phone: ${viewing.customerPhone}`,
      viewing.notes ? `\nNotes: ${viewing.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      title: `Property Viewing: ${viewing.property.projectName}`,
      description,
      location,
      startTime: viewing.scheduledTime,
      endTime,
      attendees: [], // To be filled with actual email addresses
      organizer: `${viewing.agent.fullName} <noreply@realestate-agent.local>`,
    };
  }

  /**
   * Google Calendar Integration
   * Task 4.3, Subtask 2: As per plan line 996
   * 
   * Note: This is a placeholder for Google Calendar API integration.
   * Full implementation requires:
   * 1. Install googleapis package: npm install googleapis
   * 2. Set up OAuth2 credentials in Google Cloud Console
   * 3. Implement OAuth flow for agents to authorize calendar access
   * 4. Store refresh tokens securely in database
   * 
   * Implementation structure:
   */
  async addToGoogleCalendar(
    event: CalendarEvent,
    agentId: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    logger.info('Google Calendar integration called', { agentId, event: event.title });

    // TODO: Implement Google Calendar API integration
    // This requires:
    // 1. Retrieve agent's OAuth tokens from database
    // 2. Initialize Google Calendar API client
    // 3. Create calendar event
    // 4. Return event ID

    // Placeholder implementation
    logger.warn('Google Calendar integration not yet implemented', {
      agentId,
      eventTitle: event.title,
    });

    return {
      success: false,
      error: 'Google Calendar integration not configured. Please use iCal export.',
    };

    /* Full implementation example:
    
    try {
      // Get agent's Google OAuth tokens from database
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { settings: true },
      });

      const settings = agent?.settings as any;
      if (!settings?.googleCalendar?.refreshToken) {
        throw new Error('Agent has not authorized Google Calendar access');
      }

      // Initialize OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: settings.googleCalendar.refreshToken,
      });

      // Initialize Calendar API
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Create event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: 'Africa/Cairo',
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: 'Africa/Cairo',
          },
          attendees: event.attendees.map(email => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 24 * 60 }, // 24 hours
              { method: 'popup', minutes: 2 * 60 },  // 2 hours
            ],
          },
        },
      });

      logger.info('Event added to Google Calendar', {
        agentId,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
      });

      return {
        success: true,
        eventId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to add event to Google Calendar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to Google Calendar',
      };
    }
    */
  }

  /**
   * Update Google Calendar event
   * For rescheduling or cancellation
   */
  async updateGoogleCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Google Calendar update called', { agentId, eventId });

    // TODO: Implement update logic similar to addToGoogleCalendar

    logger.warn('Google Calendar update not yet implemented', { agentId, eventId });

    return {
      success: false,
      error: 'Google Calendar integration not configured',
    };
  }

  /**
   * Delete Google Calendar event
   * For cancellations
   */
  async deleteGoogleCalendarEvent(
    eventId: string,
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Google Calendar delete called', { agentId, eventId });

    // TODO: Implement delete logic

    logger.warn('Google Calendar delete not yet implemented', { agentId, eventId });

    return {
      success: false,
      error: 'Google Calendar integration not configured',
    };
  }

  /**
   * Sync agent availability to Google Calendar
   * Task 4.3, Subtask 2: As per plan line 998
   * 
   * This would create recurring "available" time blocks in the agent's calendar
   */
  async syncAvailabilityToGoogleCalendar(
    agentId: string,
    availability: {
      timezone: string;
      slots: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Sync availability to Google Calendar called', { agentId });

    // TODO: Implement availability sync
    // This would create recurring events for each availability slot

    logger.warn('Availability sync not yet implemented', { agentId });

    return {
      success: false,
      error: 'Google Calendar integration not configured',
    };
  }
}

// Singleton instance
export const calendarService = new CalendarService();
