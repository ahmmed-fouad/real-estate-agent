/**
 * Lead Scoring Types
 * Task 4.1, Subtask 1: Lead Scoring Algorithm (lines 914-925)
 * 
 * Defines the structure for lead scoring as per plan specification
 */

/**
 * Lead quality classification
 * As per plan line 924
 */
export type LeadQuality = 'hot' | 'warm' | 'cold';

/**
 * Individual scoring factors
 * As per plan lines 916-922
 */
export interface LeadScoreFactors {
  budgetClarity: number;       // Has clear budget (0-100)
  locationSpecific: number;    // Specific location in mind (0-100)
  urgency: number;            // Timeline mentioned (0-100)
  engagement: number;         // Response rate (0-100)
  informationProvided: number; // Personal details shared (0-100)
  propertyTypeClarity: number; // Knows what they want (0-100)
}

/**
 * Complete lead score
 * As per plan lines 914-925
 */
export interface LeadScore {
  total: number; // 0-100
  factors: LeadScoreFactors;
  quality: LeadQuality;
}

/**
 * Scoring weights for each factor
 * Used to calculate total score
 */
export interface LeadScoringWeights {
  budgetClarity: number;       // Weight for budget factor
  locationSpecific: number;    // Weight for location factor
  urgency: number;            // Weight for urgency factor
  engagement: number;         // Weight for engagement factor
  informationProvided: number; // Weight for information factor
  propertyTypeClarity: number; // Weight for property type factor
}

/**
 * Default weights (must sum to 1.0)
 */
export const DEFAULT_SCORING_WEIGHTS: LeadScoringWeights = {
  budgetClarity: 0.25,       // 25% - Most important
  locationSpecific: 0.20,    // 20%
  urgency: 0.20,            // 20%
  engagement: 0.15,         // 15%
  informationProvided: 0.10, // 10%
  propertyTypeClarity: 0.10, // 10%
};
