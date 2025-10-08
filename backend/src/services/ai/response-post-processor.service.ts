/**
 * Response Post-Processor Service
 * Enhances LLM responses with media, buttons, formatting
 * Implements post-processing from plan (lines 664-669)
 */

import { createServiceLogger } from '../../utils/logger';
import { PriceFormatter } from '../../utils/price-formatter';
import { Intent } from './intent-types';
import { PropertyDocument } from './rag-types';
import { ResponseTemplates } from './response-templates';

const logger = createServiceLogger('ResponsePostProcessor');

/**
 * Enhanced response with additional content
 */
export interface EnhancedResponse {
  text: string;
  properties?: PropertyDocument[]; // Properties to send as cards
  buttons?: ResponseButton[];      // CTA buttons
  location?: LocationData;          // Location pin to send
  requiresEscalation?: boolean;    // Should escalate to human
}

/**
 * Response button (CTA)
 */
export interface ResponseButton {
  id: string;
  title: string;
  payload?: string;
}

/**
 * Location data for pin
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

/**
 * Post-processing options
 */
export interface PostProcessOptions {
  intent: Intent;
  properties?: PropertyDocument[];
  customerName?: string;
  agentName?: string;
  extractedInfo?: any;
  detectedLanguage?: 'ar' | 'en' | 'mixed';  // FIX: Add detected language
}

/**
 * Response Post-Processor Service
 * Enhances AI responses with rich content
 */
export class ResponsePostProcessorService {
  /**
   * Post-process an LLM response
   * Adds property cards, buttons, formatting, etc.
   * 
   * @param rawResponse - The LLM-generated response
   * @param options - Post-processing options (intent, properties, etc.)
   * @returns Enhanced response with additional content
   */
  async postProcess(
    rawResponse: string,
    options: PostProcessOptions
  ): Promise<EnhancedResponse> {
    logger.info('Post-processing response', {
      intent: options.intent,
      responseLength: rawResponse.length,
      propertiesCount: options.properties?.length || 0,
    });

    let text = rawResponse;
    const enhanced: EnhancedResponse = { text };

    // 1. Check if we should use a template instead
    const template = this.checkForTemplate(options.intent, rawResponse, options);
    if (template) {
      text = template;
      enhanced.text = text;
    }

    // 2. Format prices in Egyptian Pounds (using centralized utility)
    text = PriceFormatter.formatTextPrices(text);

    // 3. Add property cards if properties were retrieved
    if (options.properties && options.properties.length > 0) {
      enhanced.properties = this.selectPropertiesToShow(options.properties);
      
      // Add property summary to text if not already there
      if (!this.hasPropertySummary(text)) {
        text += this.generatePropertySummary(enhanced.properties);
      }
    }

    // 4. Add CTA buttons based on intent
    enhanced.buttons = this.generateButtons(options.intent, options.properties);

    // 5. Add location pin if relevant
    enhanced.location = this.extractLocation(options.intent, options.properties);

    // 6. Check if escalation is needed
    enhanced.requiresEscalation = this.shouldEscalate(options.intent, rawResponse);

    // 7. Final text with formatting
    enhanced.text = text;

    logger.info('Post-processing complete', {
      intent: options.intent,
      hasProperties: !!enhanced.properties,
      buttonsCount: enhanced.buttons?.length || 0,
      hasLocation: !!enhanced.location,
      requiresEscalation: enhanced.requiresEscalation,
    });

    return enhanced;
  }

  /**
   * Check if we should use a pre-defined template
   * FIX: Now passes detected language to templates
   */
  private checkForTemplate(
    intent: Intent,
    response: string,
    options: PostProcessOptions
  ): string | null {
    const language = options.detectedLanguage || 'mixed';
    // Use templates for specific intents (FIX: now pass language parameter)
    switch (intent) {
      case Intent.GREETING:
        return ResponseTemplates.getGreetingTemplate(options.customerName, options.agentName, language);
      
      case Intent.GOODBYE:
        return ResponseTemplates.getClosingTemplate(options.agentName, language);
      
      case Intent.AGENT_REQUEST:
        return ResponseTemplates.getEscalationTemplate('Customer requested human agent', language);
      
      default:
        // Check if no properties found
        if (options.properties && options.properties.length === 0 && this.isPropertyInquiry(intent)) {
          const criteria = this.extractCriteria(options.extractedInfo);
          return ResponseTemplates.getNoResultsTemplate(criteria, language);
        }
        return null;
    }
  }

  // REMOVED: Price formatting logic moved to centralized PriceFormatter utility
  // See: backend/src/utils/price-formatter.ts

  /**
   * Select which properties to show (limit to avoid overwhelming)
   */
  private selectPropertiesToShow(properties: PropertyDocument[]): PropertyDocument[] {
    // Show top 3 properties
    return properties.slice(0, 3);
  }

  /**
   * Check if text already contains property summaries
   */
  private hasPropertySummary(text: string): boolean {
    // Check for common property-related keywords that indicate a summary
    const summaryIndicators = [
      'property',
      'عقار',
      'شقة',
      'villa',
      'فيلا',
      'bedroom',
      'غرفة',
      'price',
      'سعر',
    ];

    return summaryIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Generate property summary to append to response
   */
  private generatePropertySummary(properties: PropertyDocument[]): string {
    if (!properties || properties.length === 0) {
      return '';
    }

    let summary = '\n\n📋 Properties / العقارات:\n\n';

    properties.forEach((prop, index) => {
      const formattedPrice = PriceFormatter.formatForDisplay(
        prop.pricing.basePrice,
        prop.pricing.currency
      );
      
      summary += `${index + 1}. **${prop.projectName}**\n`;
      summary += `   📍 ${prop.location.district}, ${prop.location.city}\n`;
      summary += `   🏠 ${prop.specifications.bedrooms} BR, ${prop.specifications.area}m²\n`;
      summary += `   💰 ${formattedPrice}\n\n`;
    });

    return summary;
  }

  /**
   * Generate CTA buttons based on intent
   */
  private generateButtons(intent: Intent, properties?: PropertyDocument[]): ResponseButton[] {
    const buttons: ResponseButton[] = [];

    switch (intent) {
      case Intent.PROPERTY_INQUIRY:
      case Intent.PRICE_INQUIRY:
      case Intent.COMPARISON:
        if (properties && properties.length > 0) {
          buttons.push({
            id: 'schedule_viewing',
            title: 'Schedule Viewing / حجز معاينة 📅',
            payload: 'action:schedule_viewing',
          });
        }
        buttons.push({
          id: 'talk_to_agent',
          title: 'Talk to Agent / تحدث مع مندوب 👤',
          payload: 'action:talk_to_agent',
        });
        break;

      case Intent.PAYMENT_PLANS:
        buttons.push({
          id: 'calculate_payment',
          title: 'Calculate Payment / احسب القسط 💳',
          payload: 'action:calculate_payment',
        });
        buttons.push({
          id: 'talk_to_agent',
          title: 'Talk to Agent / تحدث مع مندوب 👤',
          payload: 'action:talk_to_agent',
        });
        break;

      case Intent.LOCATION_INFO:
        if (properties && properties.length > 0) {
          buttons.push({
            id: 'view_map',
            title: 'View on Map / عرض على الخريطة 🗺️',
            payload: 'action:view_map',
          });
        }
        break;

      case Intent.SCHEDULE_VIEWING:
        buttons.push({
          id: 'confirm_viewing',
          title: 'Confirm Viewing / تأكيد المعاينة ✅',
          payload: 'action:confirm_viewing',
          });
        break;

      default:
        // Default button for most intents
        buttons.push({
          id: 'talk_to_agent',
          title: 'Talk to Agent / تحدث مع مندوب 👤',
          payload: 'action:talk_to_agent',
        });
    }

    return buttons.slice(0, 3); // WhatsApp limits to 3 buttons
  }

  /**
   * Extract location pin to send
   */
  private extractLocation(intent: Intent, properties?: PropertyDocument[]): LocationData | undefined {
    // Only send location pin for location-related intents
    if (intent === Intent.LOCATION_INFO && properties && properties.length > 0) {
      const prop = properties[0]; // Send location of first property
      
      if (prop.location.coordinates && prop.location.coordinates.length === 2) {
        return {
          latitude: prop.location.coordinates[1],
          longitude: prop.location.coordinates[0],
          name: prop.projectName,
          address: `${prop.location.district}, ${prop.location.city}`,
        };
      }
    }

    return undefined;
  }

  /**
   * Determine if conversation should be escalated to human
   * 
   * FIX: Made more conservative - only escalate when truly needed
   * The AI often mentions "agent" or "مندوب" as an option, but that doesn't
   * mean it can't help. Only escalate when explicitly requested or when
   * the AI admits it cannot help.
   */
  private shouldEscalate(intent: Intent, response: string): boolean {
    // ONLY escalate for these intents (explicit requests)
    if (intent === Intent.AGENT_REQUEST || intent === Intent.COMPLAINT) {
      return true;
    }

    // FIX: Check ONLY for phrases where AI admits it cannot help
    // NOT for mentions of "agent" as an option
    const cannotHelpKeywords = [
      "i cannot help",
      "i can't help",
      "i don't know",
      "unable to assist",
      "beyond my capabilities",
      'لا أستطيع مساعدتك',
      'لا أعرف',
      'خارج قدراتي',
    ];

    const responseLower = response.toLowerCase();
    return cannotHelpKeywords.some(keyword => responseLower.includes(keyword.toLowerCase()));
  }

  /**
   * Check if intent is about property inquiry
   */
  private isPropertyInquiry(intent: Intent): boolean {
    return [
      Intent.PROPERTY_INQUIRY,
      Intent.PRICE_INQUIRY,
      Intent.COMPARISON,
      Intent.LOCATION_INFO,
    ].includes(intent);
  }

  /**
   * Extract criteria from extracted info for no-results message
   */
  private extractCriteria(extractedInfo?: any): string {
    if (!extractedInfo) {
      return '';
    }

    const parts: string[] = [];

    if (extractedInfo.propertyType) {
      parts.push(`Type: ${extractedInfo.propertyType}`);
    }
    if (extractedInfo.bedrooms) {
      parts.push(`${extractedInfo.bedrooms} bedrooms`);
    }
    if (extractedInfo.location) {
      parts.push(`Location: ${extractedInfo.location}`);
    }
    if (extractedInfo.budget) {
      const formatted = PriceFormatter.formatForLog(extractedInfo.budget);
      parts.push(`Budget: ${formatted}`);
    }

    return parts.join(', ');
  }
}

// Export singleton instance
export const responsePostProcessor = new ResponsePostProcessorService();

