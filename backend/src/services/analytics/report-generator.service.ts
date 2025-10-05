/**
 * Report Generator Service
 * Task 4.4, Subtask 2: Report Generation (Plan lines 1046-1051)
 * 
 * Generates analytics reports:
 * - Daily summary reports
 * - Weekly performance reports
 * - Monthly analytics reports
 * - Custom date range reports
 * - Export to PDF/Excel formats
 */

import { createServiceLogger } from '../../utils/logger';
import { analyticsService } from './analytics.service';
import { prisma } from '../../config/prisma-client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const logger = createServiceLogger('ReportGenerator');

/**
 * Report period types
 */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Report format types
 */
export type ReportFormat = 'json' | 'excel' | 'pdf';

/**
 * Report request interface
 */
export interface ReportRequest {
  agentId: string;
  period: ReportPeriod;
  format: ReportFormat;
  startDate?: Date;
  endDate?: Date;
  email?: string; // For email delivery
}

/**
 * Property metrics interface
 * Task 4.4, Minor Issue #7: Proper TypeScript typing
 */
export interface PropertyMetrics {
  mostInquiredProperties: Array<{
    id: string;
    projectName: string;
    inquiries: number;
  }>;
  propertiesWithNoInquiries: number;
  inquiryToViewingRatio: number;
}

/**
 * Report data interface
 */
export interface ReportData {
  title: string;
  period: {
    type: ReportPeriod;
    startDate: string;
    endDate: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
  };
  conversationMetrics: {
    totalConversations: number;
    averageResponseTime: number;
    conversationLength: number;
    resolutionRate: number;
    escalationRate: number;
  };
  leadMetrics: {
    newLeads: number;
    leadQualityDistribution: {
      hot?: number;
      warm?: number;
      cold?: number;
    };
    leadToViewingConversionRate: number;
    leadSource: Record<string, number>;
  };
  propertyMetrics: PropertyMetrics;
  customerMetrics: {
    uniqueCustomers: number;
    returnCustomers: number;
    customerResponseRate: number;
    responseRate: number;
    dropOffPoints: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
  };
  summary: {
    totalConversations: number;
    totalLeads: number;
    totalViewings: number;
    conversionRate: number;
    avgResponseTime: number;
  };
  generatedAt: string;
}

export class ReportGeneratorService {
  /**
   * Generate a report
   * Task 4.4, Subtask 2: As per plan lines 1047-1051
   */
  async generateReport(request: ReportRequest): Promise<ReportData> {
    logger.info('Generating report', {
      agentId: request.agentId,
      period: request.period,
      format: request.format,
    });

    // Calculate date range based on period
    const dateRange = this.calculateDateRange(request.period, request.startDate, request.endDate);

    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: request.agentId },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get comprehensive analytics
    const analytics = await analyticsService.getComprehensiveAnalytics(
      request.agentId,
      dateRange
    );

    // Build report data
    const reportData: ReportData = {
      title: this.getReportTitle(request.period, dateRange),
      period: {
        type: request.period,
        startDate: dateRange.startDate?.toISOString() || '',
        endDate: dateRange.endDate?.toISOString() || '',
      },
      agent: {
        id: agent.id,
        name: agent.fullName,
        email: agent.email,
      },
      conversationMetrics: analytics.conversationMetrics,
      leadMetrics: analytics.leadMetrics,
      propertyMetrics: analytics.propertyMetrics,
      customerMetrics: analytics.customerMetrics,
      summary: {
        totalConversations: analytics.conversationMetrics.totalConversations,
        totalLeads: analytics.leadMetrics.newLeads,
        totalViewings: await this.getViewingsCount(request.agentId, dateRange),
        conversionRate: analytics.leadMetrics.leadToViewingConversionRate,
        avgResponseTime: analytics.conversationMetrics.averageResponseTime,
      },
      generatedAt: new Date().toISOString(),
    };

    logger.info('Report generated successfully', {
      agentId: request.agentId,
      period: request.period,
    });

    return reportData;
  }

  /**
   * Generate daily summary report
   * Plan line 1047
   */
  async generateDailySummary(agentId: string): Promise<ReportData> {
    logger.info('Generating daily summary', { agentId });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.generateReport({
      agentId,
      period: 'daily',
      format: 'json',
      startDate: yesterday,
      endDate: today,
    });
  }

  /**
   * Generate weekly performance report
   * Plan line 1048
   */
  async generateWeeklyReport(agentId: string): Promise<ReportData> {
    logger.info('Generating weekly report', { agentId });

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    return this.generateReport({
      agentId,
      period: 'weekly',
      format: 'json',
      startDate: weekAgo,
      endDate: today,
    });
  }

  /**
   * Generate monthly analytics report
   * Plan line 1049
   */
  async generateMonthlyReport(agentId: string): Promise<ReportData> {
    logger.info('Generating monthly report', { agentId });

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return this.generateReport({
      agentId,
      period: 'monthly',
      format: 'json',
      startDate: monthStart,
      endDate: monthEnd,
    });
  }

  /**
   * Export report to Excel
   * Plan line 1051: Export to Excel
   */
  async exportToExcel(reportData: ReportData): Promise<Buffer> {
    logger.info('Exporting report to Excel', {
      agentId: reportData.agent.id,
      period: reportData.period.type,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WhatsApp Real Estate AI';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    // Add report header
    summarySheet.addRow({ metric: 'Report Title', value: reportData.title });
    summarySheet.addRow({ metric: 'Agent', value: reportData.agent.name });
    summarySheet.addRow({ metric: 'Period', value: reportData.period.type });
    summarySheet.addRow({
      metric: 'Date Range',
      value: `${new Date(reportData.period.startDate).toLocaleDateString()} - ${new Date(reportData.period.endDate).toLocaleDateString()}`,
    });
    summarySheet.addRow({ metric: '', value: '' }); // Empty row

    // Add summary metrics
    summarySheet.addRow({ metric: 'Total Conversations', value: reportData.summary.totalConversations });
    summarySheet.addRow({ metric: 'Total Leads', value: reportData.summary.totalLeads });
    summarySheet.addRow({ metric: 'Total Viewings', value: reportData.summary.totalViewings });
    summarySheet.addRow({ metric: 'Conversion Rate (%)', value: reportData.summary.conversionRate });
    summarySheet.addRow({ metric: 'Avg Response Time (sec)', value: reportData.summary.avgResponseTime });

    // Style header rows
    summarySheet.getRow(1).font = { bold: true, size: 14 };
    summarySheet.getRow(6).font = { bold: true };

    // Conversation Metrics Sheet
    const conversationSheet = workbook.addWorksheet('Conversations');
    conversationSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    conversationSheet.addRow({ metric: 'Total Conversations', value: reportData.conversationMetrics.totalConversations });
    conversationSheet.addRow({ metric: 'Avg Response Time (sec)', value: reportData.conversationMetrics.averageResponseTime });
    conversationSheet.addRow({ metric: 'Avg Messages per Conversation', value: reportData.conversationMetrics.conversationLength });
    conversationSheet.addRow({ metric: 'Resolution Rate (%)', value: reportData.conversationMetrics.resolutionRate });
    conversationSheet.addRow({ metric: 'Escalation Rate (%)', value: reportData.conversationMetrics.escalationRate });

    conversationSheet.getRow(1).font = { bold: true };

    // Lead Metrics Sheet
    const leadSheet = workbook.addWorksheet('Leads');
    leadSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    leadSheet.addRow({ metric: 'New Leads', value: reportData.leadMetrics.newLeads });
    leadSheet.addRow({ metric: 'Hot Leads', value: reportData.leadMetrics.leadQualityDistribution.hot || 0 });
    leadSheet.addRow({ metric: 'Warm Leads', value: reportData.leadMetrics.leadQualityDistribution.warm || 0 });
    leadSheet.addRow({ metric: 'Cold Leads', value: reportData.leadMetrics.leadQualityDistribution.cold || 0 });
    leadSheet.addRow({ metric: 'Lead to Viewing Conversion Rate (%)', value: reportData.leadMetrics.leadToViewingConversionRate });

    leadSheet.getRow(1).font = { bold: true };

    // Property Metrics Sheet
    const propertySheet = workbook.addWorksheet('Properties');
    propertySheet.columns = [
      { header: 'Property Name', key: 'name', width: 40 },
      { header: 'Inquiries', key: 'inquiries', width: 15 },
    ];

    propertySheet.getRow(1).font = { bold: true };
    reportData.propertyMetrics.mostInquiredProperties.forEach((prop) => {
      propertySheet.addRow({
        name: prop.projectName,
        inquiries: prop.inquiries,
      });
    });

    // Customer Metrics Sheet
    const customerSheet = workbook.addWorksheet('Customers');
    customerSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    customerSheet.addRow({ metric: 'Unique Customers', value: reportData.customerMetrics.uniqueCustomers });
    customerSheet.addRow({ metric: 'Return Customers', value: reportData.customerMetrics.returnCustomers });
    customerSheet.addRow({ metric: 'Customer Response Rate (%)', value: reportData.customerMetrics.customerResponseRate });

    customerSheet.getRow(1).font = { bold: true };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    logger.info('Excel export completed', {
      agentId: reportData.agent.id,
      size: buffer.length,
    });

    return Buffer.from(buffer);
  }

  /**
   * Export report to PDF
   * Task 4.4, Critical Issue #1: PDF export functionality
   * Plan line 1051: Export to PDF
   */
  async exportToPDF(reportData: ReportData): Promise<Buffer> {
    logger.info('Exporting report to PDF', {
      agentId: reportData.agent.id,
      period: reportData.period.type,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        // Header
        doc
          .fontSize(24)
          .fillColor('#4F46E5')
          .text(reportData.title, { align: 'center' });

        doc.moveDown(0.5);

        // Agent and period info
        doc
          .fontSize(12)
          .fillColor('#6B7280')
          .text(`Agent: ${reportData.agent.name}`, { align: 'center' });
        doc.text(
          `Period: ${new Date(reportData.period.startDate).toLocaleDateString()} - ${new Date(reportData.period.endDate).toLocaleDateString()}`,
          { align: 'center' }
        );

        doc.moveDown(1);

        // Summary Section
        doc
          .fontSize(18)
          .fillColor('#1F2937')
          .text('Executive Summary', { underline: true });
        doc.moveDown(0.5);

        const summary = reportData.summary;
        doc.fontSize(12).fillColor('#374151');

        this.addPDFMetricRow(doc, 'Total Conversations', summary.totalConversations.toString());
        this.addPDFMetricRow(doc, 'New Leads', summary.totalLeads.toString());
        this.addPDFMetricRow(doc, 'Scheduled Viewings', summary.totalViewings.toString());
        this.addPDFMetricRow(doc, 'Conversion Rate', `${summary.conversionRate}%`);
        this.addPDFMetricRow(
          doc,
          'Avg Response Time',
          `${summary.avgResponseTime} seconds`
        );

        doc.moveDown(1);

        // Conversation Metrics Section
        doc
          .fontSize(16)
          .fillColor('#1F2937')
          .text('Conversation Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');

        const convMetrics = reportData.conversationMetrics;
        this.addPDFMetricRow(
          doc,
          'Total Conversations',
          convMetrics.totalConversations.toString()
        );
        this.addPDFMetricRow(
          doc,
          'Avg Response Time',
          `${convMetrics.averageResponseTime} seconds`
        );
        this.addPDFMetricRow(
          doc,
          'Avg Messages per Conversation',
          convMetrics.conversationLength.toFixed(2)
        );
        this.addPDFMetricRow(doc, 'Resolution Rate', `${convMetrics.resolutionRate}%`);
        this.addPDFMetricRow(doc, 'Escalation Rate', `${convMetrics.escalationRate}%`);

        doc.moveDown(1);

        // Lead Metrics Section
        doc.fontSize(16).fillColor('#1F2937').text('Lead Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');

        const leadMetrics = reportData.leadMetrics;
        this.addPDFMetricRow(doc, 'New Leads', leadMetrics.newLeads.toString());
        this.addPDFMetricRow(
          doc,
          'Hot Leads',
          (leadMetrics.leadQualityDistribution.hot || 0).toString()
        );
        this.addPDFMetricRow(
          doc,
          'Warm Leads',
          (leadMetrics.leadQualityDistribution.warm || 0).toString()
        );
        this.addPDFMetricRow(
          doc,
          'Cold Leads',
          (leadMetrics.leadQualityDistribution.cold || 0).toString()
        );
        this.addPDFMetricRow(
          doc,
          'Lead to Viewing Conversion',
          `${leadMetrics.leadToViewingConversionRate}%`
        );

        // Add new page for property metrics if needed
        doc.addPage();

        // Property Metrics Section
        doc.fontSize(16).fillColor('#1F2937').text('Property Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');

        const propMetrics = reportData.propertyMetrics;
        this.addPDFMetricRow(
          doc,
          'Properties with No Inquiries',
          propMetrics.propertiesWithNoInquiries.toString()
        );
        this.addPDFMetricRow(
          doc,
          'Inquiry to Viewing Ratio',
          propMetrics.inquiryToViewingRatio.toFixed(2)
        );

        doc.moveDown(0.5);
        doc.fontSize(12).text('Top Inquired Properties:', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10);

        propMetrics.mostInquiredProperties.slice(0, 10).forEach((prop, index) => {
          doc.text(
            `${index + 1}. ${prop.projectName}: ${prop.inquiries} inquiries`,
            { indent: 20 }
          );
        });

        doc.moveDown(1);

        // Customer Metrics Section
        doc.fontSize(16).fillColor('#1F2937').text('Customer Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');

        const custMetrics = reportData.customerMetrics;
        this.addPDFMetricRow(
          doc,
          'Unique Customers',
          custMetrics.uniqueCustomers.toString()
        );
        this.addPDFMetricRow(
          doc,
          'Return Customers',
          custMetrics.returnCustomers.toString()
        );
        this.addPDFMetricRow(
          doc,
          'Customer Response Rate',
          `${custMetrics.customerResponseRate}%`
        );

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(9)
          .fillColor('#9CA3AF')
          .text(`Generated on ${new Date(reportData.generatedAt).toLocaleString()}`, {
            align: 'center',
          });
        doc.text('WhatsApp Real Estate AI - Analytics Report', { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error('Failed to generate PDF', { error, agentId: reportData.agent.id });
        reject(error);
      }
    });
  }

  /**
   * Helper: Add a metric row to PDF
   */
  private addPDFMetricRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
    const currentY = doc.y;
    doc.fontSize(11).fillColor('#6B7280').text(label, 50, currentY, { width: 200 });
    doc
      .fontSize(11)
      .fillColor('#1F2937')
      .text(value, 250, currentY, { width: 300, align: 'right' });
    doc.moveDown(0.5);
  }

  /**
   * Generate report summary for email
   * Used for daily/weekly email reports
   */
  generateEmailSummary(reportData: ReportData): string {
    const { conversationMetrics, leadMetrics, summary } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .metric-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-title { font-size: 14px; color: #6B7280; margin-bottom: 5px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1F2937; }
    .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #1F2937; }
    .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${reportData.title}</h1>
      <p>${new Date(reportData.period.startDate).toLocaleDateString()} - ${new Date(reportData.period.endDate).toLocaleDateString()}</p>
    </div>
    <div class="content">
      <div class="section-title">📊 Key Metrics</div>
      
      <div class="metric-box">
        <div class="metric-title">Total Conversations</div>
        <div class="metric-value">${summary.totalConversations}</div>
      </div>
      
      <div class="metric-box">
        <div class="metric-title">New Leads</div>
        <div class="metric-value">${summary.totalLeads}</div>
      </div>
      
      <div class="metric-box">
        <div class="metric-title">Scheduled Viewings</div>
        <div class="metric-value">${summary.totalViewings}</div>
      </div>
      
      <div class="metric-box">
        <div class="metric-title">Conversion Rate</div>
        <div class="metric-value">${summary.conversionRate}%</div>
      </div>
      
      <div class="metric-box">
        <div class="metric-title">Average Response Time</div>
        <div class="metric-value">${summary.avgResponseTime}s</div>
      </div>

      <div class="section-title">💬 Conversation Insights</div>
      <div class="metric-box">
        <p>📈 Resolution Rate: <strong>${conversationMetrics.resolutionRate}%</strong></p>
        <p>⚠️ Escalation Rate: <strong>${conversationMetrics.escalationRate}%</strong></p>
        <p>💬 Avg Messages: <strong>${conversationMetrics.conversationLength}</strong></p>
      </div>

      <div class="section-title">🎯 Lead Quality</div>
      <div class="metric-box">
        <p>🔥 Hot: <strong>${leadMetrics.leadQualityDistribution.hot || 0}</strong></p>
        <p>🌡️ Warm: <strong>${leadMetrics.leadQualityDistribution.warm || 0}</strong></p>
        <p>❄️ Cold: <strong>${leadMetrics.leadQualityDistribution.cold || 0}</strong></p>
      </div>

      <div class="footer">
        <p>Generated on ${new Date(reportData.generatedAt).toLocaleString()}</p>
        <p>WhatsApp Real Estate AI - Analytics Report</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Helper: Calculate date range based on period
   */
  private calculateDateRange(
    period: ReportPeriod,
    customStart?: Date,
    customEnd?: Date
  ): { startDate?: Date; endDate?: Date } {
    if (period === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }

    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (period) {
      case 'daily':
        startDate = new Date();
        startDate.setDate(today.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        break;

      case 'weekly':
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
        break;

      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;

      default:
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Get report title
   */
  private getReportTitle(period: ReportPeriod, dateRange: any): string {
    const periodNames = {
      daily: 'Daily Summary Report',
      weekly: 'Weekly Performance Report',
      monthly: 'Monthly Analytics Report',
      custom: 'Custom Analytics Report',
    };

    return periodNames[period];
  }

  /**
   * Helper: Get viewings count for date range
   */
  private async getViewingsCount(
    agentId: string,
    dateRange: { startDate?: Date; endDate?: Date }
  ): Promise<number> {
    return prisma.scheduledViewing.count({
      where: {
        agentId,
        ...(dateRange.startDate || dateRange.endDate
          ? {
              createdAt: {
                ...(dateRange.startDate && { gte: dateRange.startDate }),
                ...(dateRange.endDate && { lte: dateRange.endDate }),
              },
            }
          : {}),
      },
    });
  }
}

// Export singleton instance
export const reportGeneratorService = new ReportGeneratorService();
