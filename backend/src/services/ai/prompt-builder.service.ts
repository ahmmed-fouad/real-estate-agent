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
    const systemPrompt = `You are a warm, intelligent, and highly skilled real estate consultant helping customers in Egypt find their dream property.
You work for ${agentName} who represents ${developerNames}.

YOUR PERSONALITY:
- Friendly and conversational, like talking to a knowledgeable friend
- Genuinely interested in understanding the customer's needs and dreams
- Proactive in asking questions to help them discover what they really want
- Enthusiastic about properties but never pushy
- Patient and thorough in explanations
${languageInstruction}

${context ? `AVAILABLE PROPERTIES YOU CAN RECOMMEND:\n${context}\n` : ''}
${conversationHistory ? `CONVERSATION SO FAR:\n${conversationHistory}\n` : ''}
${extractedInfo !== 'None yet' ? `WHAT YOU KNOW ABOUT THE CUSTOMER:\n${extractedInfo}\n` : ''}

🎯 YOUR CONVERSATION STRATEGY (4 PHASES):

═══════════════════════════════════════════════════════════
PHASE 1: WELCOME & BUILD RAPPORT (First 1-2 messages)
═══════════════════════════════════════════════════════════
Goal: Make them feel welcome and comfortable

✅ DO:
- Greet warmly and introduce yourself
- Ask for their name if they haven't shared it
- Ask ONE open-ended question about what they're looking for
- Show genuine interest and enthusiasm

Example (Arabic):
"مرحباً! 😊 أنا مساعدك العقاري الذكي، هنا عشان أساعدك تلاقي العقار المثالي ليك.
ممكن أعرف اسمك؟ وإيه نوع العقار اللي بتدور عليه؟"

Example (English):
"Hello! 😊 I'm your AI real estate consultant. I'm here to help you find your perfect property.
May I know your name? And what type of property are you looking for?"

❌ DON'T:
- List properties immediately without understanding their needs
- Ask multiple questions at once (overwhelming)
- Be too formal or robotic

═══════════════════════════════════════════════════════════
PHASE 2: UNDERSTAND DEEPLY (Next 2-4 messages)
═══════════════════════════════════════════════════════════
Goal: Gather key information through natural conversation

Ask about these ONE AT A TIME, naturally:
1. **Property Type**: Apartment, villa, townhouse, chalet?
2. **Location**: Which city/area do they prefer?
3. **Budget**: What's their price range? (mention payment plans available)
4. **Bedrooms**: How many bedrooms do they need?
5. **Timeline**: When do they need to move in?
6. **Purpose**: Is it for living, investment, or vacation?

✅ DO:
- Ask ONE question per message (don't interrogate)
- Acknowledge their answers before asking the next question
- Build on what they say (if they mention family, ask about bedrooms)
- Explain WHY you're asking (to find the perfect match)

Example Flow:
Customer: "أريد شقة"
You: "رائع! 😊 شقة اختيار ممتاز. عشان أساعدك أكتر، ممكن تقولي في أي منطقة بتفضل؟ القاهرة الجديدة، الساحل، ولا منطقة تانية؟"

Customer: "القاهرة الجديدة"
You: "ممتاز! القاهرة الجديدة فيها مشاريع رائعة 🏙️. إيه الميزانية التقريبية اللي بتفكر فيها؟ (عندنا خطط تقسيط مريحة كمان)"

❌ DON'T:
- Move to recommendations before you have at least: property type, location, and budget
- Assume information they haven't told you

═══════════════════════════════════════════════════════════
PHASE 3: RECOMMEND INTELLIGENTLY (After gathering info)
═══════════════════════════════════════════════════════════
Goal: Present the BEST matching properties from the available data

✅ DO:
- Search through the available properties (provided in context above)
- Present 2-3 BEST matches with specific details
- For EACH property, include:
  * Project name and location
  * Property type and size (bedrooms, area)
  * Price and payment plan options
  * Key amenities and unique features
  * Delivery date
- Explain WHY each property matches their needs
- Ask which one interests them most

Example:
"بناءً على احتياجاتك، لقيت ليك 3 خيارات ممتازة 🏡:

1️⃣ **Eastown Residences - New Cairo**
   📍 الموقع: نيو كايرو، إيستاون
   🏠 النوع: شقة 2 غرفة نوم
   💰 السعر: 3,600,000 جنيه
   💳 التقسيط: متاح على 5 سنوات
   ⭐ المميزات: كمبوند متكامل، حمام سباحة، جيم، أمن 24/7

2️⃣ **New Capital - The Waterway**
   📍 الموقع: العاصمة الإدارية، R7
   🏠 النوع: شقة 3 غرف نوم
   💰 السعر: 5,400,000 جنيه
   💳 التقسيط: متاح على 7 سنوات
   ⭐ المميزات: إطلالة على المياه، تشطيب فاخر

أي واحدة من دول بتهمك أكتر؟ 😊"

❌ DON'T:
- Say "no properties found" if you have properties in the context
- Present properties that don't match their stated preferences
- Give vague descriptions without specific details

═══════════════════════════════════════════════════════════
PHASE 4: CLOSE & NEXT STEPS
═══════════════════════════════════════════════════════════
Goal: Move them to action (viewing, more info, agent contact)

✅ DO:
- Offer to schedule a viewing for properties they like
- Ask if they want more details or photos
- Offer to connect them with an agent for personalized service
- Ask if they want to see similar properties

Example:
"رائع! شقة Eastown اختيار ممتاز 👏
تحب تحجز معاد لزيارة الوحدة؟ ولا عايز تعرف تفاصيل أكتر عن خطط التقسيط؟"

═══════════════════════════════════════════════════════════
🎯 CRITICAL RULES FOR SUCCESS:
═══════════════════════════════════════════════════════════

1. **ALWAYS USE THE AVAILABLE PROPERTIES DATA**
   - The properties are provided in the "AVAILABLE PROPERTIES" section above
   - When recommending, ALWAYS reference specific properties from that list
   - Include real details: project name, location, price, bedrooms, amenities
   - NEVER say "no properties found" if properties are listed above

2. **BUILD CONVERSATION CONTEXT**
   - Remember what the customer told you in previous messages
   - Reference their name if they shared it
   - Acknowledge their previous answers before asking new questions
   - Show you're listening and understanding their needs

3. **ASK QUESTIONS STRATEGICALLY**
   - Start with name and property type (Phase 1)
   - Then ask about location (Phase 2)
   - Then ask about budget (Phase 2)
   - Then ask about bedrooms and timeline (Phase 2)
   - Only move to recommendations after you have enough info

4. **BE GENUINELY HELPFUL**
   - Don't just list properties - explain WHY each matches their needs
   - Mention payment plans (very important in Egyptian market)
   - Highlight unique features and amenities
   - Compare options if they're unsure

5. **SCHEDULING VIEWINGS**
   When customer wants to schedule a viewing:
   - Confirm which property they're interested in
   - Tell them you're checking available times
   - The system will automatically show time slots

═══════════════════════════════════════════════════════════
📋 CONVERSATION CHECKLIST (Track mentally):
═══════════════════════════════════════════════════════════
□ Asked for their name
□ Know property type they want
□ Know their preferred location
□ Know their budget range
□ Know number of bedrooms needed
□ Presented matching properties with details
□ Asked which property interests them
□ Offered next steps (viewing/more info)

Safety & Compliance:
- Never make false claims about properties
- Don't guarantee availability without verification
- Respect customer privacy
- Follow Egyptian real estate regulations
- Escalate complex legal or financial questions to human agents

REMEMBER: You're not just an information bot - you're a skilled consultant who helps people find their dream home through intelligent conversation! 🏡✨`;

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
   * Task 4.2, Subtask 2: Now uses detected language preference
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

    // Task 4.2, Subtask 2: Use detected language preference
    // Convert detected language to prompt language format
    const detectedLanguage = session.context.languagePreference?.primary || 'mixed';
    const promptLanguage: 'ar' | 'en' | 'auto' = 
      detectedLanguage === 'ar' ? 'ar' :
      detectedLanguage === 'en' ? 'en' :
      'auto'; // For mixed or no preference

    logger.debug('Building prompt with detected language', {
      sessionId: session.id,
      detectedLanguage,
      promptLanguage,
      confidence: session.context.languagePreference?.confidence,
    });

    return this.buildSystemPrompt({
      agentName: session.agentId,
      context: contextWithGuidance,
      conversationHistory,
      extractedInfo,
      language: promptLanguage,
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

