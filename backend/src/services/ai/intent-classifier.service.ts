/**
 * Intent Classification Service
 * Uses LLM for zero-shot intent classification and entity extraction
 * Implements approach from plan (lines 571-588)
 */

import { createServiceLogger } from '../../utils/logger';
import { llmService } from './llm.service';
import {
  Intent,
  ExtractedEntities,
  IntentAnalysisResult,
  INTENT_DESCRIPTIONS,
  getAllIntents,
} from './intent-types';

const logger = createServiceLogger('IntentClassifier');

/**
 * Intent Classification Service
 * Analyzes customer messages to determine intent and extract entities
 */
export class IntentClassifierService {
  /**
   * Analyze a customer message to classify intent and extract entities
   * 
   * @param message - The customer's message
   * @param conversationContext - Optional previous conversation context
   * @returns Intent analysis result with entities
   */
  async analyze(
    message: string,
    conversationContext?: string
  ): Promise<IntentAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Analyzing message for intent and entities', {
        messageLength: message.length,
        hasContext: !!conversationContext,
      });

      // Build the classification prompt
      const prompt = this.buildClassificationPrompt(message, conversationContext);

      // Call LLM for classification
      const response = await llmService.generateResponse(
        prompt,
        message,
        undefined,
        {
          temperature: 0.3, // Lower temperature for more consistent classification
          maxTokens: 500,
        }
      );

      // Parse the LLM response
      const result = this.parseClassificationResponse(response.content);

      const duration = Date.now() - startTime;
      logger.info('Intent classification complete', {
        intent: result.intent,
        confidence: result.confidence,
        entityCount: Object.keys(result.entities).length,
        duration,
        tokensUsed: response.tokenUsage.totalTokens,
      });

      return result;

    } catch (error) {
      logger.error('Error during intent classification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: message.substring(0, 100),
      });

      // Return a safe default
      return {
        intent: Intent.PROPERTY_INQUIRY,
        entities: {},
        confidence: 0.5,
        explanation: 'Classification failed, defaulting to PROPERTY_INQUIRY',
      };
    }
  }

  /**
   * Build the classification prompt for the LLM
   * Follows the structure from plan lines 574-588
   */
  private buildClassificationPrompt(
    message: string,
    conversationContext?: string
  ): string {
    // Build intent list with descriptions
    const intentList = getAllIntents()
      .map((intent) => `- ${intent}: ${INTENT_DESCRIPTIONS[intent]}`)
      .join('\n');

    const contextSection = conversationContext
      ? `\n\nConversation context:\n${conversationContext}\n`
      : '';

    return `You are an expert intent classifier for a real estate WhatsApp assistant in Egypt.

Your task is to:
1. Classify the customer's message into ONE of the following intents
2. Extract any relevant entities from the message

Available Intents:
${intentList}

${contextSection}
Customer message: "${message}"

Instructions:
- Choose the SINGLE most appropriate intent
- Extract ALL relevant entities (budget, location, property type, bedrooms, bathrooms, area, timeline, payment preferences, etc.)
- For prices/budget: extract numeric values in Egyptian Pounds (EGP)
- For locations: extract city, district, or specific area names
- For property types: use standard terms (apartment, villa, townhouse, duplex, studio, penthouse)
- For urgency: classify as "urgent", "flexible", "just_browsing"
- For payment: look for cash, installment, mortgage preferences
- Provide a confidence score (0.0 to 1.0)

Return ONLY a valid JSON object with this EXACT structure:
{
  "intent": "INTENT_NAME",
  "entities": {
    "budget": number or null,
    "minPrice": number or null,
    "maxPrice": number or null,
    "location": "string" or null,
    "city": "string" or null,
    "district": "string" or null,
    "propertyType": "string" or null,
    "bedrooms": number or null,
    "bathrooms": number or null,
    "minArea": number or null,
    "maxArea": number or null,
    "deliveryTimeline": "string" or null,
    "urgency": "string" or null,
    "paymentMethod": "string" or null,
    "downPaymentPercentage": number or null,
    "installmentYears": number or null,
    "purpose": "string" or null
  },
  "confidence": 0.95,
  "explanation": "Brief explanation of classification"
}

Important:
- Use null for entities not found in the message
- Budget/prices should be in EGP (Egyptian Pounds)
- Area should be in square meters
- Return ONLY valid JSON, no additional text`;
  }

  /**
   * Parse the LLM response to extract intent and entities
   * Handles various response formats and validates data
   */
  private parseClassificationResponse(response: string): IntentAnalysisResult {
    try {
      // Try to extract JSON from the response
      // Sometimes LLM adds extra text around the JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate intent
      const intent = this.validateIntent(parsed.intent);

      // Extract and clean entities
      const entities = this.cleanEntities(parsed.entities || {});

      // Validate confidence
      const confidence = typeof parsed.confidence === 'number' 
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7;

      return {
        intent,
        entities,
        confidence,
        explanation: parsed.explanation || undefined,
      };

    } catch (error) {
      logger.warn('Failed to parse classification response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 200),
      });

      // Try to extract intent from text if JSON parsing fails
      const detectedIntent = this.detectIntentFromText(response);

      return {
        intent: detectedIntent,
        entities: {},
        confidence: 0.5,
        explanation: 'Fallback classification due to parsing error',
      };
    }
  }

  /**
   * Validate and normalize intent value
   */
  private validateIntent(intent: string): Intent {
    const upperIntent = intent?.toUpperCase();
    
    // Check if it's a valid intent
    if (Object.values(Intent).includes(upperIntent as Intent)) {
      return upperIntent as Intent;
    }

    // Fallback to property inquiry
    logger.warn('Invalid intent detected, defaulting to PROPERTY_INQUIRY', { intent });
    return Intent.PROPERTY_INQUIRY;
  }

  /**
   * Clean and validate extracted entities
   */
  private cleanEntities(rawEntities: any): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Numbers
    if (rawEntities.budget && typeof rawEntities.budget === 'number') {
      entities.budget = rawEntities.budget;
    }
    if (rawEntities.minPrice && typeof rawEntities.minPrice === 'number') {
      entities.minPrice = rawEntities.minPrice;
    }
    if (rawEntities.maxPrice && typeof rawEntities.maxPrice === 'number') {
      entities.maxPrice = rawEntities.maxPrice;
    }
    if (rawEntities.bedrooms && typeof rawEntities.bedrooms === 'number') {
      entities.bedrooms = rawEntities.bedrooms;
    }
    if (rawEntities.bathrooms && typeof rawEntities.bathrooms === 'number') {
      entities.bathrooms = rawEntities.bathrooms;
    }
    if (rawEntities.minArea && typeof rawEntities.minArea === 'number') {
      entities.minArea = rawEntities.minArea;
    }
    if (rawEntities.maxArea && typeof rawEntities.maxArea === 'number') {
      entities.maxArea = rawEntities.maxArea;
    }
    if (rawEntities.downPaymentPercentage && typeof rawEntities.downPaymentPercentage === 'number') {
      entities.downPaymentPercentage = rawEntities.downPaymentPercentage;
    }
    if (rawEntities.installmentYears && typeof rawEntities.installmentYears === 'number') {
      entities.installmentYears = rawEntities.installmentYears;
    }

    // Strings
    if (rawEntities.location && typeof rawEntities.location === 'string') {
      entities.location = rawEntities.location.trim();
    }
    if (rawEntities.city && typeof rawEntities.city === 'string') {
      entities.city = rawEntities.city.trim();
    }
    if (rawEntities.district && typeof rawEntities.district === 'string') {
      entities.district = rawEntities.district.trim();
    }
    if (rawEntities.propertyType && typeof rawEntities.propertyType === 'string') {
      entities.propertyType = rawEntities.propertyType.toLowerCase().trim();
    }
    if (rawEntities.deliveryTimeline && typeof rawEntities.deliveryTimeline === 'string') {
      entities.deliveryTimeline = rawEntities.deliveryTimeline.trim();
    }
    if (rawEntities.urgency && typeof rawEntities.urgency === 'string') {
      entities.urgency = rawEntities.urgency.toLowerCase().trim();
    }
    if (rawEntities.paymentMethod && typeof rawEntities.paymentMethod === 'string') {
      entities.paymentMethod = rawEntities.paymentMethod.toLowerCase().trim();
    }
    if (rawEntities.purpose && typeof rawEntities.purpose === 'string') {
      entities.purpose = rawEntities.purpose.toLowerCase().trim();
    }

    return entities;
  }

  /**
   * Fallback intent detection from text when JSON parsing fails
   */
  private detectIntentFromText(text: string): Intent {
    const lowerText = text.toLowerCase();

    // Check for specific keywords
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('السعر')) {
      return Intent.PRICE_INQUIRY;
    }
    if (lowerText.includes('payment') || lowerText.includes('installment') || lowerText.includes('قسط')) {
      return Intent.PAYMENT_PLANS;
    }
    if (lowerText.includes('location') || lowerText.includes('where') || lowerText.includes('موقع')) {
      return Intent.LOCATION_INFO;
    }
    if (lowerText.includes('visit') || lowerText.includes('viewing') || lowerText.includes('tour') || lowerText.includes('معاينة')) {
      return Intent.SCHEDULE_VIEWING;
    }
    if (lowerText.includes('compare') || lowerText.includes('difference') || lowerText.includes('مقارنة')) {
      return Intent.COMPARISON;
    }
    if (lowerText.includes('agent') || lowerText.includes('speak') || lowerText.includes('talk') || lowerText.includes('موظف')) {
      return Intent.AGENT_REQUEST;
    }
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('السلام') || lowerText.includes('مرحبا')) {
      return Intent.GREETING;
    }
    if (lowerText.includes('bye') || lowerText.includes('goodbye') || lowerText.includes('شكرا') || lowerText.includes('وداعا')) {
      return Intent.GOODBYE;
    }
    if (lowerText.includes('complain') || lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('شكوى')) {
      return Intent.COMPLAINT;
    }

    // Default to property inquiry
    return Intent.PROPERTY_INQUIRY;
  }

  /**
   * Get conversation context summary for classification
   * Used to provide context from previous messages
   */
  formatConversationContext(messages: Array<{ role: string; content: any }>): string {
    if (!messages || messages.length === 0) {
      return '';
    }

    // Take last 3 messages for context
    const recentMessages = messages.slice(-3);
    
    return recentMessages
      .map((msg) => {
        const content = typeof msg.content === 'string' 
          ? msg.content 
          : JSON.stringify(msg.content);
        return `${msg.role}: ${content}`;
      })
      .join('\n');
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifierService();

