/**
 * Analytics Services Export
 * Task 4.4: Analytics & Reporting
 */

export { analyticsService } from './analytics.service';
export { reportGeneratorService } from './report-generator.service';
export { visualizationService } from './visualization.service';
export { scheduledReportsService } from './scheduled-reports.service';

// Re-export types explicitly to avoid conflicts
export type {
  DateRange,
  ConversationMetrics,
  LeadMetrics,
  CustomerMetrics,
} from './analytics.service';

export type {
  ReportFormat,
  ReportData,
} from './report-generator.service';
