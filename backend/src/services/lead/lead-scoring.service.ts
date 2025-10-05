/**
 * Lead Scoring Service
 * Task 4.1, Subtask 1: Lead Scoring Algorithm (lines 927-933)
 * 
 * Implements lead qualification and scoring based on conversation analysis
 * As per plan: "Analyze conversation, Score based on factors, Return lead score"
 */

import { createServiceLogger } from '../../utils/logger';
import { ConversationSession } from '../session/types';
import { Intent } from '../ai/intent-types';
import {
  LeadScore,
  LeadScoreFactors,
  LeadQuality,
  LeadScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
} from './lead-scoring-types';

const logger = createServiceLogger('LeadScoringService');

/**
 * Lead Scoring Service
 * As per plan line 927: class LeadScoringService
 */
export class LeadScoringService {
  private weights: LeadScoringWeights;

  constructor(weights?: LeadScoringWeights) {
    this.weights = weights || DEFAULT_SCORING_WEIGHTS;
    
    // Validate weights sum to 1.0
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      logger.warn('Scoring weights do not sum to 1.0', { sum, weights: this.weights });
    }

    logger.info('LeadScoringService initialized', { weights: this.weights });
  }

  /**
   * Calculate lead score from conversation session
   * As per plan line 928: calculateScore(session: ConversationSession): LeadScore
   * 
   * @param session - Conversation session to analyze
   * @returns Complete lead score with factors and quality
   */
  calculateScore(session: ConversationSession): LeadScore {
    logger.debug('Calculating lead score', {
      sessionId: session.id,
      customerId: session.customerId,
      messageCount: session.context.messageHistory.length,
    });

    // Calculate individual factors
    const factors: LeadScoreFactors = {
      budgetClarity: this.calculateBudgetClarity(session),
      locationSpecific: this.calculateLocationSpecificity(session),
      urgency: this.calculateUrgency(session),
      engagement: this.calculateEngagement(session),
      informationProvided: this.calculateInformationProvided(session),
      propertyTypeClarity: this.calculatePropertyTypeClarity(session),
    };

    // Calculate weighted total score (0-100)
    const total = Math.round(
      factors.budgetClarity * this.weights.budgetClarity +
      factors.locationSpecific * this.weights.locationSpecific +
      factors.urgency * this.weights.urgency +
      factors.engagement * this.weights.engagement +
      factors.informationProvided * this.weights.informationProvided +
      factors.propertyTypeClarity * this.weights.propertyTypeClarity
    );

    // Classify lead quality based on total score
    const quality = this.classifyLeadQuality(total);

    const score: LeadScore = {
      total,
      factors,
      quality,
    };

    logger.info('Lead score calculated', {
      sessionId: session.id,
      customerId: session.customerId,
      total,
      quality,
      factors,
    });

    return score;
  }

  /**
   * Calculate budget clarity score (0-100)
   * As per plan line 917: "Has clear budget"
   * 
   * Scoring:
   * - No budget info: 0
   * - Budget range mentioned: 40
   * - Exact budget specified: 80
   * - Budget + financing discussed: 100
   */
  private calculateBudgetClarity(session: ConversationSession): number {
    const { extractedInfo } = session.context;
    let score = 0;

    // Check if budget exists
    if (extractedInfo.budget) {
      score = 40; // Base score for having budget info

      // Check if it's a specific number vs range
      const budgetStr = String(extractedInfo.budget);
      if (budgetStr.includes('-') || budgetStr.includes('to')) {
        score = 40; // Range
      } else if (!isNaN(Number(budgetStr))) {
        score = 80; // Specific number
      }

      // Bonus if financing preferences mentioned
      if (extractedInfo.paymentMethod) {
        score = Math.min(100, score + 20);
      }
    }

    return score;
  }

  /**
   * Calculate location specificity score (0-100)
   * As per plan line 918: "Specific location in mind"
   * 
   * Scoring:
   * - No location: 0
   * - City mentioned: 40
   * - District/area mentioned: 70
   * - Specific neighborhood or compound: 100
   */
  private calculateLocationSpecificity(session: ConversationSession): number {
    const { extractedInfo } = session.context;
    let score = 0;

    if (extractedInfo.location) {
      const location = extractedInfo.location.toLowerCase();
      
      // Check specificity level
      if (location.includes('compound') || location.includes('neighborhood') || 
          location.includes('street') || location.includes('near')) {
        score = 100; // Very specific
      } else if (location.length > 20 || location.split(' ').length >= 3) {
        score = 70; // District/area level
      } else {
        score = 40; // Just city level
      }
    }

    return score;
  }

  /**
   * Calculate urgency score (0-100)
   * As per plan line 919: "Timeline mentioned"
   * 
   * Scoring:
   * - No timeline: 0
   * - "Soon" or vague: 30
   * - Within 6+ months: 50
   * - Within 3 months: 70
   * - Immediate/ASAP: 100
   */
  private calculateUrgency(session: ConversationSession): number {
    const { extractedInfo, messageHistory } = session.context;
    let score = 0;

    // Check explicit urgency field
    if (extractedInfo.urgency) {
      const urgency = extractedInfo.urgency.toLowerCase();
      
      if (urgency.includes('immediate') || urgency.includes('asap') || 
          urgency.includes('now') || urgency.includes('urgent')) {
        score = 100;
      } else if (urgency.includes('month') && !urgency.includes('6')) {
        score = 70; // Within few months
      } else if (urgency.includes('soon')) {
        score = 50;
      } else {
        score = 30; // Vague timeline
      }
    }

    // Check message history for urgency keywords
    if (score === 0) {
      const allMessages = messageHistory
        .filter(m => m.role === 'user')
        .map(m => typeof m.content === 'string' ? m.content.toLowerCase() : '')
        .join(' ');

      if (allMessages.includes('urgent') || allMessages.includes('asap')) {
        score = 100;
      } else if (allMessages.includes('soon') || allMessages.includes('quickly')) {
        score = 50;
      }
    }

    return score;
  }

  /**
   * Calculate engagement score (0-100)
   * As per plan line 920: "Response rate"
   * 
   * Scoring based on:
   * - Number of messages exchanged
   * - Response consistency
   * - Question asking (shows interest)
   */
  private calculateEngagement(session: ConversationSession): number {
    const { messageHistory } = session.context;
    const userMessages = messageHistory.filter(m => m.role === 'user');
    const totalMessages = messageHistory.length;

    // Base score on message count
    let score = 0;
    const userMessageCount = userMessages.length;

    if (userMessageCount >= 10) {
      score = 100; // Highly engaged
    } else if (userMessageCount >= 5) {
      score = 70; // Good engagement
    } else if (userMessageCount >= 3) {
      score = 40; // Moderate engagement
    } else if (userMessageCount >= 1) {
      score = 20; // Initial contact
    }

    // Bonus for asking questions (shows interest)
    const questionsAsked = userMessages.filter(m => 
      typeof m.content === 'string' && m.content.includes('?')
    ).length;

    if (questionsAsked >= 3) {
      score = Math.min(100, score + 15);
    } else if (questionsAsked >= 1) {
      score = Math.min(100, score + 5);
    }

    return score;
  }

  /**
   * Calculate information provided score (0-100)
   * As per plan line 921: "Personal details shared"
   * 
   * Scoring based on:
   * - Number of extracted entities
   * - Contact information shared
   * - Personal details mentioned
   */
  private calculateInformationProvided(session: ConversationSession): number {
    const { extractedInfo } = session.context;
    let score = 0;
    let detailsCount = 0;

    // Count filled fields in extracted info
    if (extractedInfo.budget) detailsCount++;
    if (extractedInfo.location) detailsCount++;
    if (extractedInfo.propertyType) detailsCount++;
    if (extractedInfo.bedrooms) detailsCount++;
    if (extractedInfo.minArea || extractedInfo.maxArea) detailsCount++;
    if (extractedInfo.deliveryTimeline) detailsCount++;
    if (extractedInfo.paymentMethod) detailsCount++;
    if (extractedInfo.urgency) detailsCount++;
    if (extractedInfo.purpose) detailsCount++;

    // Calculate score based on details provided
    if (detailsCount >= 7) {
      score = 100; // Comprehensive information
    } else if (detailsCount >= 5) {
      score = 75; // Good information
    } else if (detailsCount >= 3) {
      score = 50; // Moderate information
    } else if (detailsCount >= 1) {
      score = 25; // Some information
    }

    return score;
  }

  /**
   * Calculate property type clarity score (0-100)
   * As per plan line 922: "Knows what they want"
   * 
   * Scoring based on:
   * - Property type specified
   * - Size requirements (bedrooms, area)
   * - Specific features mentioned
   */
  private calculatePropertyTypeClarity(session: ConversationSession): number {
    const { extractedInfo } = session.context;
    let score = 0;

    // Property type specified
    if (extractedInfo.propertyType) {
      score = 50; // Base score for knowing property type
    }

    // Size requirements
    if (extractedInfo.bedrooms) {
      score += 20;
    }

    if (extractedInfo.minArea || extractedInfo.maxArea) {
      score += 20;
    }

    // Additional features (amenities, floors, etc.)
    if (extractedInfo.amenities && extractedInfo.amenities.length > 0) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Classify lead quality based on total score
   * As per plan line 924: quality: 'hot' | 'warm' | 'cold'
   * 
   * Classification:
   * - 70-100: Hot lead (immediate follow-up)
   * - 40-69: Warm lead (daily digest)
   * - 0-39: Cold lead (nurture campaign)
   */
  private classifyLeadQuality(totalScore: number): LeadQuality {
    if (totalScore >= 70) {
      return 'hot';
    } else if (totalScore >= 40) {
      return 'warm';
    } else {
      return 'cold';
    }
  }

  /**
   * Get human-readable explanation of lead score
   * Useful for agent dashboard and notifications
   */
  getScoreExplanation(score: LeadScore): string {
    const explanations: string[] = [];

    if (score.factors.budgetClarity >= 70) {
      explanations.push('Clear budget defined');
    } else if (score.factors.budgetClarity >= 40) {
      explanations.push('Budget range mentioned');
    }

    if (score.factors.locationSpecific >= 70) {
      explanations.push('Specific location in mind');
    }

    if (score.factors.urgency >= 70) {
      explanations.push('High urgency');
    }

    if (score.factors.engagement >= 70) {
      explanations.push('Highly engaged');
    }

    if (score.factors.informationProvided >= 70) {
      explanations.push('Detailed information provided');
    }

    if (score.factors.propertyTypeClarity >= 70) {
      explanations.push('Clear property requirements');
    }

    if (explanations.length === 0) {
      return 'Lead needs more qualification';
    }

    return explanations.join(', ');
  }
}

// Export singleton instance
export const leadScoringService = new LeadScoringService();
