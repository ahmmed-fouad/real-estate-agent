// Agent Types
export interface Agent {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  companyName?: string;
  whatsappNumber?: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: AgentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSettings {
  greetingMessage?: string;
  closingMessage?: string;
  workingHours?: {
    enabled: boolean;
    timezone: string;
    schedule: {
      [key: string]: { start: string; end: string; enabled: boolean };
    };
  };
  escalationTriggers?: string[];
  autoResponseEnabled?: boolean;
  notificationPreferences?: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
}

export interface AgentStats {
  totalConversations: number;
  activeConversations: number;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  totalProperties: number;
  averageResponseTime: number;
  conversionRate: number;
}

// Property Types
export interface Property {
  id: string;
  agentId: string;
  projectName: string;
  developerName?: string;
  propertyType: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  basePrice?: number;
  pricePerMeter?: number;
  currency: string;
  amenities: string[];
  description?: string;
  deliveryDate?: string;
  images: string[];
  documents: string[];
  videoUrl?: string;
  status: 'available' | 'sold' | 'reserved';
  paymentPlans: PaymentPlan[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPlan {
  id: string;
  propertyId: string;
  planName: string;
  downPaymentPercentage: number;
  installmentYears: number;
  monthlyPayment?: number;
  description?: string;
}

export interface PropertyFormData {
  projectName: string;
  developerName?: string;
  propertyType: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  basePrice?: number;
  pricePerMeter?: number;
  currency: string;
  amenities: string[];
  description?: string;
  deliveryDate?: string;
  status: string;
  paymentPlans: Omit<PaymentPlan, 'id' | 'propertyId'>[];
  images?: string[];
  documents?: string[];
}

// Conversation Types
export interface Conversation {
  id: string;
  agentId: string;
  customerPhone: string;
  customerName?: string;
  status: 'active' | 'idle' | 'closed' | 'waiting_agent';
  leadScore: number;
  leadQuality?: 'hot' | 'warm' | 'cold';
  startedAt: string;
  lastActivityAt: string;
  closedAt?: string;
  metadata: ConversationMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMetadata {
  extractedInfo?: {
    budget?: number;
    location?: string;
    propertyType?: string;
    bedrooms?: number;
    urgency?: string;
  };
  tags?: string[];
  notes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  messageType: 'text' | 'image' | 'video' | 'document' | 'location';
  whatsappMessageId?: string;
  mediaUrl?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Analytics Types
export interface AnalyticsOverview {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  averageResponseTime: number;
  averageConversationLength: number;
  conversionRate: number;
  escalationRate: number;
  period: {
    start: string;
    end: string;
  };
}

export interface ConversationMetrics {
  date: string;
  total: number;
  active: number;
  closed: number;
  escalated: number;
}

export interface LeadMetrics {
  date: string;
  hot: number;
  warm: number;
  cold: number;
  total: number;
}

export interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  inquiries: number;
  viewings: number;
  conversions: number;
}

export interface InquiryTopic {
  topic: string;
  label: string;
  count: number;
  percentage: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  companyName?: string;
  whatsappNumber?: string;
}

export interface AuthResponse {
  agent: Agent;
  accessToken: string;
  refreshToken: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
