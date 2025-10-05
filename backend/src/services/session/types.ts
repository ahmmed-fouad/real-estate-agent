/**
 * Session & Context Management Types
 * Implements interfaces from plan (lines 315-331)
 */

// Import media/location types from WhatsApp service
export interface MediaContent {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// Conversation States - as per plan line 305-310
export enum ConversationState {
  NEW = 'NEW',                    // First message
  ACTIVE = 'ACTIVE',              // Ongoing conversation
  WAITING_AGENT = 'WAITING_AGENT', // Escalated to human
  IDLE = 'IDLE',                  // No activity for X minutes
  CLOSED = 'CLOSED',              // Conversation ended
}

// Message in conversation history
// FIXED: Changed content type from string to union type to support rich media
// As per plan lines 253-256
export interface Message {
  role: 'user' | 'assistant' | 'agent';
  content: string | MediaContent | LocationContent; // Now supports media and location
  timestamp: Date;
  messageId?: string;
  type?: string;
}

// Extracted information from conversation
// FIXED: Now uses ExtractedEntities from intent-types to eliminate duplication
// This ensures consistency between intent classification and session storage
import { ExtractedEntities, Intent } from '../ai/intent-types';
import { LanguagePreference } from '../language/language-types';

// ExtractedInfo is now just an alias for ExtractedEntities
// This eliminates duplication while maintaining backwards compatibility
export type ExtractedInfo = ExtractedEntities;

// Conversation Session - Exact structure from plan (lines 315-331)
// FIXED: Added missing fields from plan line 300-301:
// - Conversation start time
// - Current intent/topic
// Task 4.2: Added language preference for multi-language support
export interface ConversationSession {
  id: string;
  customerId: string;
  agentId: string;
  state: ConversationState;
  startTime: Date; // When conversation started (plan line 300)
  context: {
    messageHistory: Message[];
    extractedInfo: ExtractedInfo;
    lastActivity: Date;
    currentIntent?: Intent; // FIXED: Use Intent enum for type safety (plan line 301)
    currentTopic?: string;  // Additional context for what customer is discussing
    languagePreference?: LanguagePreference;  // Task 4.2: Detected language preference
    awaitingSchedulingResponse?: boolean;  // Task 4.3 Fix #3: Awaiting slot selection
    schedulingContext?: {  // Task 4.3 Fix #3: Scheduling state
      propertyId?: string;
      step: 'awaiting_time_selection' | 'awaiting_confirmation';
      selectedTime?: Date;
    };
  };
}

// Session Manager Interface - Complete public API
// Core methods from plan (lines 333-337) plus additional public methods
export interface ISessionManager {
  // Core methods from plan
  getSession(customerId: string): Promise<ConversationSession>;
  updateSession(session: ConversationSession): Promise<void>;
  closeSession(sessionId: string): Promise<void>;
  
  // Additional public methods for session management
  addMessageToHistory(session: ConversationSession, message: Message): Promise<void>;
  // REMOVED: updateExtractedInfo() - Never used, entity merging handled by EntityExtractorService
  updateState(session: ConversationSession, newState: ConversationState): Promise<void>;
  updateCurrentIntent(session: ConversationSession, intent: Intent, topic?: string): Promise<void>;
  checkIdleSessions(): Promise<void>;
  getConversationDuration(session: ConversationSession): number;
  close(): Promise<void>;
}

