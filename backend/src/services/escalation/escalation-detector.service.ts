/**
 * Escalation Detector Service
 * Task 4.5, Subtask 1: Escalation Triggers (Plan lines 1071-1076)
 * 
 * Detects when conversation should be escalated to human agent:
 * - Customer explicitly asks for agent
 * - AI detects frustration/anger
 * - Complex query AI can't handle
 * - Negotiation or custom deal requests
 * - Complaint handling
 */

import { createServiceLogger } from '../../utils/logger';
import { openaiClient } from '../ai/openai-client';
import { ConversationSession } from '../session/types';

const logger = createServiceLogger('EscalationDetector');

/**
 * Escalation trigger types
 */
export enum EscalationTrigger {
  EXPLICIT_REQUEST = 'EXPLICIT_REQUEST',           // Customer asks for agent
  FRUSTRATION_DETECTED = 'FRUSTRATION_DETECTED',   // AI detects frustration/anger
  COMPLEX_QUERY = 'COMPLEX_QUERY',                 // Query too complex for AI
  NEGOTIATION_REQUEST = 'NEGOTIATION_REQUEST',     // Custom deal/negotiation
  COMPLAINT = 'COMPLAINT',                         // Complaint handling
  REPEATED_QUESTION = 'REPEATED_QUESTION',         // Customer keeps asking same thing
}

/**
 * Escalation detection result
 */
export interface EscalationDetection {
  shouldEscalate: boolean;
  trigger?: EscalationTrigger;
  confidence: number;
  reason: string;
  customerMessage?: string;
}

export class EscalationDetectorService {
  /**
   * Analyze message for escalation triggers
   * Task 4.5, Subtask 1: As per plan lines 1071-1076
   */
  async detectEscalation(
    message: string,
    session: ConversationSession
  ): Promise<EscalationDetection> {
    logger.info('Analyzing message for escalation triggers', {
      sessionId: session.id,
      customerId: session.customerId,
      messageLength: message.length,
    });

    // Check for explicit agent request (highest priority)
    const explicitRequest = this.detectExplicitAgentRequest(message);
    if (explicitRequest.shouldEscalate) {
      return explicitRequest;
    }

    // Check for complaint keywords
    const complaint = this.detectComplaint(message);
    if (complaint.shouldEscalate) {
      return complaint;
    }

    // Check for negotiation/custom deal requests
    const negotiation = this.detectNegotiationRequest(message);
    if (negotiation.shouldEscalate) {
      return negotiation;
    }

    // Check for repeated questions (customer not getting satisfactory answers)
    const repeatedQuestion = this.detectRepeatedQuestion(message, session);
    if (repeatedQuestion.shouldEscalate) {
      return repeatedQuestion;
    }

    // Use LLM for sentiment analysis (frustration/anger detection)
    const sentimentAnalysis = await this.detectFrustrationWithLLM(message, session);
    if (sentimentAnalysis.shouldEscalate) {
      return sentimentAnalysis;
    }

    // Use LLM for complexity analysis
    const complexityAnalysis = await this.detectComplexQueryWithLLM(message, session);
    if (complexityAnalysis.shouldEscalate) {
      return complexityAnalysis;
    }

    logger.info('No escalation triggers detected', { sessionId: session.id });

    return {
      shouldEscalate: false,
      confidence: 0.95,
      reason: 'No escalation triggers detected',
    };
  }

  /**
   * Detect explicit agent request
   * Task 4.5, Subtask 1: Line 1072 - "Customer explicitly asks for agent"
   */
  private detectExplicitAgentRequest(message: string): EscalationDetection {
    const messageLower = message.toLowerCase();

    // English patterns
    const englishPatterns = [
      /\b(talk|speak|contact|connect|reach)\s+(to|with)?\s*(a|an|the)?\s*(human|agent|person|representative|rep|someone|staff|employee)\b/i,
      /\b(i\s+want|i\s+need|can\s+i|may\s+i)\s+(to\s+)?(talk|speak|contact)\s+(to|with)\s+(someone|agent|person)\b/i,
      /\bneed\s+(a\s+)?(real|human)\s+(person|agent)\b/i,
      /\bcan\s+someone\s+help\s+me\b/i,
      /\bget\s+me\s+(a|an)?\s*(human|agent|person)\b/i,
      /\btransfer\s+(me\s+)?to\s+(a|an)?\s*(human|agent)\b/i,
    ];

    // Arabic patterns
    const arabicPatterns = [
      /أريد\s+التحدث\s+مع\s+شخص/,
      /هل\s+يمكنني\s+التحدث\s+مع\s+موظف/,
      /أريد\s+موظف/,
      /محتاج\s+أتكلم\s+مع\s+حد/,
      /عايز\s+أكلم\s+حد/,
      /ممكن\s+موظف/,
    ];

    const allPatterns = [...englishPatterns, ...arabicPatterns];

    for (const pattern of allPatterns) {
      if (pattern.test(message)) {
        logger.info('Explicit agent request detected', { pattern: pattern.source });
        return {
          shouldEscalate: true,
          trigger: EscalationTrigger.EXPLICIT_REQUEST,
          confidence: 0.95,
          reason: 'Customer explicitly requested to speak with an agent',
          customerMessage: message,
        };
      }
    }

    return {
      shouldEscalate: false,
      confidence: 0.95,
      reason: 'No explicit agent request detected',
    };
  }

  /**
   * Detect complaint
   * Task 4.5, Subtask 1: Line 1076 - "Complaint handling"
   */
  private detectComplaint(message: string): EscalationDetection {
    const messageLower = message.toLowerCase();

    // English complaint patterns
    const englishPatterns = [
      /\b(not\s+satisfied|unsatisfied|unhappy|disappointed|frustrated|angry|upset)\b/i,
      /\b(terrible|horrible|awful|worst|bad)\s+(service|experience|support)\b/i,
      /\b(file|make|submit)\s+(a\s+)?(complaint|report)\b/i,
      /\bwaste\s+of\s+time\b/i,
      /\buseless|pointless|ridiculous\b/i,
      /\bnot\s+(helping|useful|working)\b/i,
      /\bthis\s+is\s+(unacceptable|ridiculous)\b/i,
    ];

    // Arabic complaint patterns
    const arabicPatterns = [
      /غير\s+راضي/,
      /مش\s+راضي/,
      /خدمة\s+سيئة/,
      /مضيعة\s+وقت/,
      /مش\s+نافع/,
      /شكوى/,
    ];

    const allPatterns = [...englishPatterns, ...arabicPatterns];

    for (const pattern of allPatterns) {
      if (pattern.test(message)) {
        logger.info('Complaint detected', { pattern: pattern.source });
        return {
          shouldEscalate: true,
          trigger: EscalationTrigger.COMPLAINT,
          confidence: 0.85,
          reason: 'Customer complaint detected - requires human attention',
          customerMessage: message,
        };
      }
    }

    return {
      shouldEscalate: false,
      confidence: 0.85,
      reason: 'No complaint detected',
    };
  }

  /**
   * Detect negotiation/custom deal request
   * Task 4.5, Subtask 1: Line 1075 - "Negotiation or custom deal requests"
   */
  private detectNegotiationRequest(message: string): EscalationDetection {
    const messageLower = message.toLowerCase();

    // English negotiation patterns
    const englishPatterns = [
      /\b(negotiate|bargain|deal|discount|offer|better\s+price)\b/i,
      /\b(can\s+you|could\s+you)\s+(lower|reduce|decrease)\s+(the\s+)?price\b/i,
      /\b(special|custom|personalized)\s+(deal|offer|package|arrangement)\b/i,
      /\bpayment\s+(plan|terms|schedule)\b/i,
      /\binstallment\s+(plan|options)\b/i,
      /\bmake\s+(me\s+)?(a|an)\s+(better\s+)?deal\b/i,
      /\bflexible\s+payment/i,
    ];

    // Arabic negotiation patterns
    const arabicPatterns = [
      /تفاوض|مفاوضة/,
      /خصم|تخفيض/,
      /عرض\s+خاص/,
      /تقسيط/,
      /سعر\s+أفضل/,
    ];

    const allPatterns = [...englishPatterns, ...arabicPatterns];

    for (const pattern of allPatterns) {
      if (pattern.test(message)) {
        logger.info('Negotiation request detected', { pattern: pattern.source });
        return {
          shouldEscalate: true,
          trigger: EscalationTrigger.NEGOTIATION_REQUEST,
          confidence: 0.80,
          reason: 'Customer requesting negotiation or custom deal - requires agent approval',
          customerMessage: message,
        };
      }
    }

    return {
      shouldEscalate: false,
      confidence: 0.80,
      reason: 'No negotiation request detected',
    };
  }

  /**
   * Detect repeated questions
   * Task 4.5, Subtask 1: Indicator of AI not being helpful
   */
  private detectRepeatedQuestion(
    message: string,
    session: ConversationSession
  ): EscalationDetection {
    // Check if customer has asked similar questions multiple times
    const recentUserMessages = session.context.messageHistory
      .filter((msg) => msg.role === 'user')
      .slice(-5)
      .map((msg) => typeof msg.content === 'string' ? msg.content.toLowerCase() : '');

    const currentMessageLower = message.toLowerCase();

    // Count how many recent messages are very similar
    let similarCount = 0;
    for (const prevMessage of recentUserMessages) {
      if (this.calculateSimilarity(currentMessageLower, prevMessage) > 0.7) {
        similarCount++;
      }
    }

    if (similarCount >= 2) {
      logger.info('Repeated question detected', {
        sessionId: session.id,
        similarCount,
      });
      return {
        shouldEscalate: true,
        trigger: EscalationTrigger.REPEATED_QUESTION,
        confidence: 0.75,
        reason: 'Customer keeps asking similar questions - may need human assistance',
        customerMessage: message,
      };
    }

    return {
      shouldEscalate: false,
      confidence: 0.75,
      reason: 'No repeated questions detected',
    };
  }

  /**
   * Detect frustration/anger using LLM
   * Task 4.5, Subtask 1: Line 1073 - "AI detects frustration/anger"
   */
  private async detectFrustrationWithLLM(
    message: string,
    session: ConversationSession
  ): Promise<EscalationDetection> {
    try {
      const conversationContext = session.context.messageHistory
        .slice(-5)
        .map((msg) => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : '[Media]'}`)
        .join('\n');

      const prompt = `Analyze the following customer message for signs of frustration or anger.

Recent conversation:
${conversationContext}

Current customer message:
"${message}"

Determine if the customer shows signs of:
- Frustration with the service
- Anger or hostile tone
- Impatience
- Dissatisfaction

Respond in JSON format:
{
  "isFrustrated": boolean,
  "confidence": number (0-1),
  "reason": "brief explanation"
}`;

      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at detecting customer emotions and sentiment. Be accurate and conservative in your assessments.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.isFrustrated && result.confidence >= 0.7) {
        logger.info('Frustration detected by LLM', {
          sessionId: session.id,
          confidence: result.confidence,
          reason: result.reason,
        });

        return {
          shouldEscalate: true,
          trigger: EscalationTrigger.FRUSTRATION_DETECTED,
          confidence: result.confidence,
          reason: `Customer frustration detected: ${result.reason}`,
          customerMessage: message,
        };
      }

      return {
        shouldEscalate: false,
        confidence: result.confidence || 0.7,
        reason: 'No frustration detected',
      };
    } catch (error) {
      logger.error('Failed to detect frustration with LLM', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to not escalating if LLM fails
      return {
        shouldEscalate: false,
        confidence: 0.5,
        reason: 'LLM analysis failed - defaulting to no escalation',
      };
    }
  }

  /**
   * Detect complex query using LLM
   * Task 4.5, Subtask 1: Line 1074 - "Complex query AI can't handle"
   */
  private async detectComplexQueryWithLLM(
    message: string,
    session: ConversationSession
  ): Promise<EscalationDetection> {
    try {
      const prompt = `Analyze if the following customer query is too complex for an AI assistant to handle and requires human intervention.

Customer message:
"${message}"

Queries that typically need human agents:
- Legal or contractual questions
- Complex financial arrangements beyond standard options
- Specific exceptions or special circumstances
- Questions requiring authority to make decisions
- Multi-party negotiations
- Questions about very specific or unusual situations

Respond in JSON format:
{
  "isComplex": boolean,
  "confidence": number (0-1),
  "reason": "brief explanation"
}`;

      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at assessing query complexity and determining if human intervention is needed.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.isComplex && result.confidence >= 0.7) {
        logger.info('Complex query detected by LLM', {
          sessionId: session.id,
          confidence: result.confidence,
          reason: result.reason,
        });

        return {
          shouldEscalate: true,
          trigger: EscalationTrigger.COMPLEX_QUERY,
          confidence: result.confidence,
          reason: `Complex query requiring human expertise: ${result.reason}`,
          customerMessage: message,
        };
      }

      return {
        shouldEscalate: false,
        confidence: result.confidence || 0.7,
        reason: 'Query complexity is within AI capabilities',
      };
    } catch (error) {
      logger.error('Failed to detect complex query with LLM', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to not escalating if LLM fails
      return {
        shouldEscalate: false,
        confidence: 0.5,
        reason: 'LLM analysis failed - defaulting to no escalation',
      };
    }
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   * Used for detecting repeated questions
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

// Export singleton instance
export const escalationDetectorService = new EscalationDetectorService();
