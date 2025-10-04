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
export interface ExtractedInfo {
  budget?: number;
  location?: string;
  propertyType?: string;
  bedrooms?: number;
  urgency?: string;
  // Additional fields for Egyptian real estate context
  area?: number;         // Square meters
  bathrooms?: number;
  floors?: number;
  paymentMethod?: string;
  deliveryDate?: string;
}

// Conversation Session - Exact structure from plan (lines 315-331)
// FIXED: Added missing fields from plan line 300-301:
// - Conversation start time
// - Current intent/topic
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
    currentIntent?: string; // Current intent/topic (plan line 301)
    currentTopic?: string;  // Additional context for what customer is discussing
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
  updateExtractedInfo(session: ConversationSession, info: Partial<ExtractedInfo>): Promise<void>;
  updateState(session: ConversationSession, newState: ConversationState): Promise<void>;
  updateCurrentIntent(session: ConversationSession, intent: string, topic?: string): Promise<void>;
  checkIdleSessions(): Promise<void>;
  getConversationDuration(session: ConversationSession): number;
  close(): Promise<void>;
}

