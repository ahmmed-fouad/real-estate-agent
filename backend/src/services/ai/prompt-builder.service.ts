/**
 * Prompt Builder Service
 * Manages prompt templates for the real estate AI assistant
 * As per plan lines 375-406: "Prompt Engineering"
 */

import { createServiceLogger } from '../../utils/logger';
import { PriceFormatter } from '../../utils/price-formatter';
import { PromptVariables } from './types';
import { ConversationSession } from '../session/types';

const logger = createServiceLogger('PromptBuilder');

/**
 * Prompt Builder Service
 * Creates and manages system prompts for the LLM
 * 
 * Implements plan requirements (lines 376-380):
 * - Create system prompt template for real estate
 * - Include Egyptian market context
 * - Support Arabic and English
 * - Define response tone and style
 * - Add safety guidelines
 */
export class PromptBuilderService {
  /**
   * Build the main system prompt for the real estate assistant
   * Based on plan example (lines 383-406)
   */
  buildSystemPrompt(variables: PromptVariables): string {
    const {
      agentName = 'our team',
      developerNames = 'leading developers in Egypt',
      context = '',
      conversationHistory = '',
      extractedInfo = 'None yet',
      language = 'auto',
    } = variables;

    // Determine language instruction
    const languageInstruction = this.getLanguageInstruction(language);

    // Build the system prompt as per plan template
    const systemPrompt = `You are a professional real estate assistant helping customers in Egypt find their perfect property.
You work for ${agentName} who represents ${developerNames}.

Your responsibilities:
- Answer questions about available properties clearly and accurately
- Provide information on pricing, payment plans, locations, and amenities
- Help customers compare properties
- Qualify leads by understanding their needs and budget
- Schedule viewings when appropriate
- Maintain a professional, friendly, and helpful tone
${languageInstruction}

${context ? `Context about available properties:\n${context}\n` : ''}
${conversationHistory ? `Current conversation:\n${conversationHistory}\n` : ''}
${extractedInfo !== 'None yet' ? `Customer's extracted preferences:\n${extractedInfo}\n` : ''}

Guidelines:
- Respond naturally to the customer's inquiry
- If you don't have specific information, say so and offer to connect them with the agent
- Always be helpful, professional, and courteous
- Focus on understanding the customer's needs before recommending properties
- Ask clarifying questions when necessary
- Use clear, simple language
- For pricing, always mention payment plans when available

Safety & Compliance:
- Never make false claims about properties
- Don't guarantee property availability without verification
- Respect customer privacy
- Follow Egyptian real estate regulations
- Escalate complex legal or financial questions to human agents`;

    logger.debug('System prompt built', {
      agentName,
      hasContext: !!context,
      hasHistory: !!conversationHistory,
      language,
    });

    return systemPrompt;
  }

  /**
   * Build system prompt from conversation session
   * Convenience method to extract data from session
   * 
   * Task 4.1, Subtask 2: Now includes lead qualification guidance
   */
  buildSystemPromptFromSession(
    session: ConversationSession,
    additionalContext?: string
  ): string {
    // Extract conversation history (last 5 messages for context)
    const recentMessages = session.context.messageHistory.slice(-5);
    const conversationHistory = recentMessages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Customer' : 'Assistant';
        return `${role}: ${typeof msg.content === 'string' ? msg.content : '[Media]'}`;
      })
      .join('\n');

    // Format extracted information
    const extractedInfo = this.formatExtractedInfo(session);

    // Task 4.1, Subtask 2: Add lead qualification guidance
    const qualificationGuidance = this.generateQualificationGuidance(session);
    const contextWithGuidance = additionalContext
      ? `${additionalContext}\n\n${qualificationGuidance}`
      : qualificationGuidance;

    return this.buildSystemPrompt({
      agentName: session.agentId,
      context: contextWithGuidance,
      conversationHistory,
      extractedInfo,
      language: 'auto', // Auto-detect based on customer messages
    });
  }

  /**
   * Format extracted information into readable text
   */
  private formatExtractedInfo(session: ConversationSession): string {
    const info = session.context.extractedInfo;
    const parts: string[] = [];

    if (info.budget) {
      parts.push(`Budget: ${PriceFormatter.formatForContext(info.budget)}`);
    }
    if (info.location) {
      parts.push(`Preferred Location: ${info.location}`);
    }
    if (info.propertyType) {
      parts.push(`Property Type: ${info.propertyType}`);
    }
    if (info.bedrooms) {
      parts.push(`Bedrooms: ${info.bedrooms}`);
    }
    if (info.area) {
      parts.push(`Area: ${info.area} m²`);
    }
    if (info.urgency) {
      parts.push(`Urgency: ${info.urgency}`);
    }
    if (info.purpose) {
      parts.push(`Purpose: ${info.purpose}`);
    }
    if (info.paymentMethod) {
      parts.push(`Payment Method: ${info.paymentMethod}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'None yet';
  }

  /**
   * Generate lead qualification guidance for the AI
   * Task 4.1, Subtask 2: Lead Qualification Questions (lines 936-943)
   * 
   * Analyzes missing information and guides AI to ask qualifying questions naturally
   */
  private generateQualificationGuidance(session: ConversationSession): string {
    const info = session.context.extractedInfo;
    const missingInfo: string[] = [];

    // Identify missing critical information (as per plan lines 938-943)
    if (!info.budget) {
      missingInfo.push('budget range');
    }
    if (!info.location) {
      missingInfo.push('preferred location');
    }
    if (!info.urgency) {
      missingInfo.push('timeline to purchase');
    }
    if (!info.propertyType || !info.bedrooms) {
      missingInfo.push('property type and size requirements');
    }
    if (!info.purpose) {
      missingInfo.push('purpose (investment or personal residence)');
    }
    if (!info.paymentMethod) {
      missingInfo.push('financing needs and payment preferences');
    }

    // If we have all information, no guidance needed
    if (missingInfo.length === 0) {
      return 'Lead Qualification Status: Complete - All key information collected. Focus on property recommendations.';
    }

    // Generate guidance for AI to ask questions naturally
    const guidance = `Lead Qualification Guidance:
You need to understand the customer better to provide the best recommendations. 
The following information is still missing: ${missingInfo.join(', ')}.

IMPORTANT: Ask these questions naturally during the conversation, not all at once.
- Pick ONE or TWO most relevant missing details based on the current conversation flow
- Ask in a friendly, conversational manner
- Frame questions as helping to find the perfect property
- Don't make it feel like an interrogation

Example natural ways to ask:
- Budget: "To help find the best options, what budget range are you considering?" / "ما الميزانية التقريبية المتاحة لك؟"
- Location: "Which area or district do you prefer?" / "أي منطقة تفضل؟"
- Timeline: "When are you planning to make a purchase?" / "متى تخطط للشراء؟"
- Property Type: "Are you looking for an apartment, villa, or townhouse?" / "هل تبحث عن شقة أم فيلا؟"
- Size: "How many bedrooms do you need?" / "كم عدد غرف النوم المطلوبة؟"
- Purpose: "Is this for investment or for living?" / "هل هذا للاستثمار أم للسكن؟"
- Financing: "Are you paying cash or would you like to explore payment plans?" / "هل الدفع كاش أم تفضل التقسيط؟"

Priority: Focus on the most critical missing information first (budget and location are most important).`;

    return guidance;
  }

  /**
   * Get language-specific instruction
   * Supports Arabic and English as per plan (line 377)
   */
  private getLanguageInstruction(language: 'ar' | 'en' | 'auto'): string {
    switch (language) {
      case 'ar':
        return '- Communicate in Arabic only';
      case 'en':
        return '- Communicate in English only';
      case 'auto':
      default:
        return '- Communicate in Arabic or English based on customer preference';
    }
  }

  /**
   * Build a simple prompt for quick responses
   * Used for greetings, simple questions, etc.
   */
  buildSimplePrompt(
    userMessage: string,
    conversationContext?: string
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are a friendly real estate assistant in Egypt. 
Be helpful, professional, and concise.
${conversationContext ? `\nContext: ${conversationContext}` : ''}`;

    return {
      systemPrompt,
      userPrompt: userMessage,
    };
  }

  /**
   * Detect language from message
   * Simple detection based on Unicode ranges
   */
  detectLanguage(text: string): 'ar' | 'en' {
    // Check for Arabic Unicode range (U+0600 to U+06FF)
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) ? 'ar' : 'en';
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilderService();

