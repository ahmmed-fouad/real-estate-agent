/**
 * Intent Classification Types
 * Implements intent categories from plan (lines 549-560)
 */

/**
 * Intent categories for customer messages
 * Each intent represents a specific customer need or action
 */
export enum Intent {
  PROPERTY_INQUIRY = 'PROPERTY_INQUIRY',   // Asking about available properties
  PRICE_INQUIRY = 'PRICE_INQUIRY',         // Questions about pricing
  PAYMENT_PLANS = 'PAYMENT_PLANS',         // Payment options and financing
  LOCATION_INFO = 'LOCATION_INFO',         // Location details and directions
  SCHEDULE_VIEWING = 'SCHEDULE_VIEWING',   // Book property visit
  COMPARISON = 'COMPARISON',               // Compare multiple properties
  GENERAL_QUESTION = 'GENERAL_QUESTION',   // FAQs about buying process
  COMPLAINT = 'COMPLAINT',                 // Issues or complaints
  AGENT_REQUEST = 'AGENT_REQUEST',         // Want to speak with human agent
  GREETING = 'GREETING',                   // Initial contact
  GOODBYE = 'GOODBYE',                     // End conversation
}

/**
 * Extracted entities from customer messages
 * As per plan lines 562-569
 */
export interface ExtractedEntities {
  // Price and budget
  budget?: number;
  minPrice?: number;
  maxPrice?: number;

  // Location preferences
  location?: string;
  city?: string;
  district?: string;

  // Property specifications
  propertyType?: string;  // apartment, villa, townhouse, etc.
  propertyId?: string;    // Task 4.3 Fix #4: Specific property being discussed
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;       // Minimum area in square meters
  maxArea?: number;       // Maximum area in square meters

  // Timeline and urgency
  deliveryTimeline?: string;  // e.g., "ready to move", "under construction"
  urgency?: string;           // e.g., "urgent", "flexible", "just looking"

  // Payment preferences
  paymentMethod?: string;     // e.g., "cash", "installment", "mortgage"
  downPaymentPercentage?: number;
  installmentYears?: number;

  // Additional context
  purpose?: string;           // e.g., "investment", "residence"
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Result of intent classification and entity extraction
 * As per plan lines 582-587
 */
export interface IntentAnalysisResult {
  intent: Intent;
  entities: ExtractedEntities;
  confidence: number;  // 0.0 to 1.0
  explanation?: string; // Why this intent was chosen (for debugging)
}

/**
 * Intent descriptions for LLM prompts
 */
export const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  [Intent.PROPERTY_INQUIRY]: 'Customer is asking about available properties, what properties are available, property features, amenities, or general information about listings',
  [Intent.PRICE_INQUIRY]: 'Customer is specifically asking about prices, costs, how much something costs, price ranges, or affordability',
  [Intent.PAYMENT_PLANS]: 'Customer is asking about payment options, financing, installment plans, down payments, or how to pay',
  [Intent.LOCATION_INFO]: 'Customer is asking about property locations, directions, nearby facilities, neighborhood information, or distance to landmarks',
  [Intent.SCHEDULE_VIEWING]: 'Customer wants to book a property visit, schedule a viewing, arrange a tour, or see the property in person',
  [Intent.COMPARISON]: 'Customer wants to compare multiple properties, see differences between options, or understand which property is better',
  [Intent.GENERAL_QUESTION]: 'Customer has general questions about the buying process, documentation requirements, legal procedures, or real estate FAQs',
  [Intent.COMPLAINT]: 'Customer is expressing dissatisfaction, reporting a problem, making a complaint, or describing a negative experience',
  [Intent.AGENT_REQUEST]: 'Customer explicitly wants to speak with a human agent, requests personal assistance, or asks to talk to someone',
  [Intent.GREETING]: 'Customer is greeting, introducing themselves, or starting the conversation (e.g., "Hello", "Hi", "السلام عليكم")',
  [Intent.GOODBYE]: 'Customer is ending the conversation, saying goodbye, or indicating they are done (e.g., "Thanks, bye", "شكرا")',
};

/**
 * Helper function to get all intent names as array
 */
export function getAllIntents(): Intent[] {
  return Object.values(Intent);
}

/**
 * Helper function to get intent description
 */
export function getIntentDescription(intent: Intent): string {
  return INTENT_DESCRIPTIONS[intent];
}

