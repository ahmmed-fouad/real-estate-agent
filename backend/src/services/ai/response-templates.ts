/**
 * Response Templates
 * Provides pre-defined templates for common scenarios
 * Implements templates from plan (lines 671-676)
 * 
 * FIX: Templates now adapt to detected language (Task 4.2, Subtask 2: line 969)
 */

/**
 * Response templates for common scenarios
 * Supports bilingual (Arabic & English) responses with language adaptation
 */
export class ResponseTemplates {
  /**
   * Greeting template
   * Used when customer first contacts or says hello
   * 
   * FIX: Now adapts to detected language
   * @param customerName - Customer name (optional)
   * @param agentName - Agent name (optional)
   * @param language - Detected language ('ar' | 'en' | 'mixed')
   */
  static getGreetingTemplate(customerName?: string, agentName?: string, language: 'ar' | 'en' | 'mixed' = 'mixed'): string {
    const name = customerName ? ` ${customerName}` : '';
    const agent = agentName || 'our team';

    // Arabic-only version
    if (language === 'ar') {
      return `مرحباً${name}! أهلاً بك 👋

أنا مساعدك الذكي من ${agent}، هنا لمساعدتك في إيجاد العقار المثالي في مصر.

كيف يمكنني مساعدتك اليوم؟`;
    }

    // English-only version
    if (language === 'en') {
      return `Hello${name}! Welcome! 👋

I'm your AI assistant from ${agent}. I'm here to help you find your perfect property in Egypt.

How can I help you today?`;
    }

    // Bilingual version (for mixed or unknown)
    return `مرحباً${name}! أهلاً بك 👋

Hello${name}! Welcome! 👋

I'm your AI assistant from ${agent}. I'm here to help you find your perfect property in Egypt.

أنا مساعدك الذكي من ${agent}، هنا لمساعدتك في إيجاد العقار المثالي في مصر.

How can I help you today? / كيف يمكنني مساعدتك اليوم؟`;
  }

  /**
   * Closing template
   * Used when customer says goodbye or conversation ends
   * 
   * FIX: Now adapts to detected language
   * @param agentName - Agent name (optional)
   * @param language - Detected language ('ar' | 'en' | 'mixed')
   */
  static getClosingTemplate(agentName?: string, language: 'ar' | 'en' | 'mixed' = 'mixed'): string {
    const agent = agentName || 'us';

    // Arabic-only version
    if (language === 'ar') {
      return `شكراً لك! 🙏

إذا كان لديك أي أسئلة أخرى، لا تتردد في مراسلتي في أي وقت. أنا هنا على مدار الساعة لمساعدتك في إيجاد عقارك المثالي!

يومك سعيد! ✨`;
    }

    // English-only version
    if (language === 'en') {
      return `Thank you for contacting ${agent}! 🙏

If you have any more questions, feel free to message me anytime. I'm here 24/7 to help you find your dream property!

Have a great day! ✨`;
    }

    // Bilingual version
    return `شكراً لك! 🙏

Thank you for contacting ${agent}! 🙏

If you have any more questions, feel free to message me anytime. I'm here 24/7 to help you find your dream property!

إذا كان لديك أي أسئلة أخرى، لا تتردد في مراسلتي في أي وقت. أنا هنا على مدار الساعة لمساعدتك في إيجاد عقارك المثالي!

Have a great day! / يومك سعيد! ✨`;
  }

  /**
   * No results found template
   * Used when no properties match customer criteria
   * 
   * FIX: Now adapts to detected language
   * @param criteria - Search criteria (optional)
   * @param language - Detected language ('ar' | 'en' | 'mixed')
   */
  static getNoResultsTemplate(criteria?: string, language: 'ar' | 'en' | 'mixed' = 'mixed'): string {
    // Arabic-only version
    if (language === 'ar') {
      const criteriaText = criteria ? `\n\nمعاييرك: ${criteria}` : '';
      return `عذراً، لم أجد عقارات تطابق معاييرك تماماً حالياً. 😔${criteriaText}

لكن لا تقلق! إليك ما يمكنني فعله:

✅ أريك عقارات مشابهة قد تهمك
✅ أخطرك عندما تتوفر عقارات جديدة تطابق معاييرك
✅ أوصلك بمندوبنا لمزيد من الخيارات

هل تريد مني أن أريك عقارات مشابهة أو أوصلك بمندوبنا؟`;
    }

    // English-only version
    if (language === 'en') {
      const criteriaText = criteria ? `\n\nYour criteria: ${criteria}` : '';
      return `Sorry, I couldn't find properties that exactly match your criteria at the moment. 😔${criteriaText}

But don't worry! Here's what I can do:

✅ Show you similar properties that might interest you
✅ Notify you when new properties matching your criteria become available
✅ Connect you with our agent for more options

Would you like me to show you similar properties or connect you with our agent?`;
    }

    // Bilingual version
    const criteriaText = criteria ? `\n\nYour criteria: ${criteria}\nمعاييرك: ${criteria}` : '';
    return `عذراً، لم أجد عقارات تطابق معاييرك تماماً حالياً. 😔

Sorry, I couldn't find properties that exactly match your criteria at the moment. 😔${criteriaText}

But don't worry! Here's what I can do:
لكن لا تقلق! إليك ما يمكنني فعله:

✅ Show you similar properties that might interest you
✅ أريك عقارات مشابهة قد تهمك

✅ Notify you when new properties matching your criteria become available
✅ أخطرك عندما تتوفر عقارات جديدة تطابق معاييرك

✅ Connect you with our agent for more options
✅ أوصلك بمندوبنا لمزيد من الخيارات

Would you like me to show you similar properties or connect you with our agent?
هل تريد مني أن أريك عقارات مشابهة أو أوصلك بمندوبنا؟`;
  }

  /**
   * Escalation template
   * Used when conversation needs to be escalated to human agent
   * 
   * FIX: Now adapts to detected language
   * @param reason - Reason for escalation (optional)
   * @param language - Detected language ('ar' | 'en' | 'mixed')
   */
  static getEscalationTemplate(reason?: string, language: 'ar' | 'en' | 'mixed' = 'mixed'): string {
    // Arabic-only version
    if (language === 'ar') {
      const reasonText = reason ? `\n\nالسبب: ${reason}` : '';
      return `سأقوم بتحويلك إلى أحد مندوبينا الآن. 👤${reasonText}

سيكون مندوبنا معك قريباً لتقديم المساعدة الشخصية. لديهم إمكانية الوصول إلى جميع عقاراتنا ويمكنهم مساعدتك في:

✅ معلومات تفصيلية عن العقارات
✅ معاينات العقارات
✅ التفاوض والعروض الخاصة
✅ خطط الدفع والتمويل

يرجى الانتظار لحظة...`;
    }

    // English-only version
    if (language === 'en') {
      const reasonText = reason ? `\n\nReason: ${reason}` : '';
      return `I'm connecting you with one of our agents now. 👤${reasonText}

Our agent will be with you shortly to provide personalized assistance. They have access to all our properties and can help you with:

✅ Detailed property information
✅ Property viewings
✅ Negotiation and special offers
✅ Payment plans and financing

Please wait a moment...`;
    }

    // Bilingual version
    const reasonText = reason ? `\n\nReason: ${reason}` : '';
    return `سأقوم بتحويلك إلى أحد مندوبينا الآن. 👤

I'm connecting you with one of our agents now. 👤${reasonText}

Our agent will be with you shortly to provide personalized assistance. They have access to all our properties and can help you with:

سيكون مندوبنا معك قريباً لتقديم المساعدة الشخصية. لديهم إمكانية الوصول إلى جميع عقاراتنا ويمكنهم مساعدتك في:

✅ Detailed property information / معلومات تفصيلية عن العقارات
✅ Property viewings / معاينات العقارات
✅ Negotiation and special offers / التفاوض والعروض الخاصة
✅ Payment plans and financing / خطط الدفع والتمويل

Please wait a moment... / يرجى الانتظار لحظة...`;
  }
}

