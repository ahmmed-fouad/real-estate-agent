/**
 * Response Templates
 * Provides pre-defined templates for common scenarios
 * Implements templates from plan (lines 671-676)
 */

/**
 * Response templates for common scenarios
 * Supports bilingual (Arabic & English) responses
 */
export class ResponseTemplates {
  /**
   * Greeting template
   * Used when customer first contacts or says hello
   */
  static getGreetingTemplate(customerName?: string, agentName?: string): string {
    const name = customerName ? ` ${customerName}` : '';
    const agent = agentName || 'our team';

    return `مرحباً${name}! أهلاً بك 👋

Hello${name}! Welcome! 👋

I'm your AI assistant from ${agent}. I'm here to help you find your perfect property in Egypt.

أنا مساعدك الذكي من ${agent}، هنا لمساعدتك في إيجاد العقار المثالي في مصر.

How can I help you today? / كيف يمكنني مساعدتك اليوم؟`;
  }

  /**
   * Closing template
   * Used when customer says goodbye or conversation ends
   */
  static getClosingTemplate(agentName?: string): string {
    const agent = agentName || 'us';

    return `شكراً لك! 🙏

Thank you for contacting ${agent}! 🙏

If you have any more questions, feel free to message me anytime. I'm here 24/7 to help you find your dream property!

إذا كان لديك أي أسئلة أخرى، لا تتردد في مراسلتي في أي وقت. أنا هنا على مدار الساعة لمساعدتك في إيجاد عقارك المثالي!

Have a great day! / يومك سعيد! ✨`;
  }

  /**
   * No results found template
   * Used when no properties match customer criteria
   */
  static getNoResultsTemplate(criteria?: string): string {
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
   */
  static getEscalationTemplate(reason?: string): string {
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

