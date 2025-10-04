/**
 * WhatsApp Business API Types
 * Based on 360dialog API specifications
 */

// Message Types
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'location' | 'audio' | 'interactive';

// WhatsApp Message Interfaces
export interface TextContent {
  body: string;
}

export interface MediaContent {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ButtonContent {
  type: 'button';
  body: {
    text: string;
  };
  action: {
    buttons: Array<{
      type: 'reply';
      reply: {
        id: string;
        title: string;
      };
    }>;
  };
}

export interface ListContent {
  type: 'list';
  body: {
    text: string;
  };
  action: {
    button: string;
    sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
}

// Outgoing Message Structure
export interface WhatsAppMessage {
  to: string;
  type: MessageType;
  text?: TextContent;
  image?: MediaContent;
  video?: MediaContent;
  document?: MediaContent;
  location?: LocationContent;
  audio?: MediaContent;
  interactive?: ButtonContent | ListContent;
}

// Incoming Webhook Payload
export interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: MessageType;
        text?: {
          body: string;
        };
        image?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        video?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        document?: {
          id: string;
          mime_type: string;
          sha256: string;
          filename?: string;
          caption?: string;
        };
        location?: {
          latitude: number;
          longitude: number;
          name?: string;
          address?: string;
        };
        audio?: {
          id: string;
          mime_type: string;
          sha256: string;
        };
        button?: {
          text: string;
          payload: string;
        };
        interactive?: {
          type: string;
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

// Parsed Message (internal format)
export interface ParsedMessage {
  messageId: string;
  from: string;
  fromName?: string;
  timestamp: string;
  type: MessageType;
  content: string | MediaContent | LocationContent;
  mediaId?: string;
  buttonPayload?: string;
}

// Message Send Response
export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

// Error Response
export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: {
      details: string;
    };
    fbtrace_id: string;
  };
}

// Template Message
export interface TemplateMessage {
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string; // e.g., 'en', 'ar'
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'image' | 'video' | 'document';
        text?: string;
        image?: MediaContent;
        video?: MediaContent;
        document?: MediaContent;
      }>;
    }>;
  };
}

