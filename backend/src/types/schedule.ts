/**
 * Schedule Types
 * Task 4.3: Scheduling & Calendar Integration
 * As per plan lines 984-1018
 */

/**
 * Agent availability slot
 */
export interface AvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format (e.g., "09:00")
  endTime: string;   // HH:mm format (e.g., "17:00")
}

/**
 * Agent availability settings
 * Stored in Agent.settings.availability
 */
export interface AgentAvailability {
  timezone: string; // e.g., "Africa/Cairo"
  slots: AvailabilitySlot[];
  bufferMinutes: number; // Buffer time between viewings (default: 30)
  viewingDuration: number; // Default viewing duration in minutes (default: 60)
}

/**
 * Available time slot for booking
 */
export interface AvailableTimeSlot {
  startTime: Date;
  endTime: Date;
  propertyId?: string; // If searching for specific property
}

/**
 * Viewing booking request
 */
export interface BookViewingRequest {
  conversationId: string;
  propertyId: string;
  scheduledTime: Date;
  durationMinutes?: number; // Optional, defaults to 60
  customerPhone: string;
  customerName?: string;
  notes?: string;
}

/**
 * Viewing reschedule request
 */
export interface RescheduleViewingRequest {
  newScheduledTime: Date;
  notes?: string;
}

/**
 * Scheduled viewing status
 */
export type ViewingStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

/**
 * Viewing with related data
 */
export interface ViewingWithDetails {
  id: string;
  conversationId: string;
  propertyId: string;
  agentId: string;
  customerPhone: string;
  customerName: string | null;
  scheduledTime: Date;
  durationMinutes: number;
  status: ViewingStatus;
  notes: string | null;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  property?: {
    id: string;
    projectName: string;
    propertyType: string;
    city: string;
    district: string;
    address: string | null;
  };
  
  agent?: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    whatsappNumber: string;
  };
}

/**
 * Calendar event data
 */
export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  attendees: string[]; // Email addresses
  organizer: string;   // Email address
}

/**
 * iCalendar format event
 */
export interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizer: string;
  attendees: string[];
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}
