/**
 * Scheduled Reports Service
 * Task 4.4, Critical Issue #2: Automated report delivery
 * 
 * Handles scheduled generation and delivery of reports:
 * - Daily summary emails (every morning)
 * - Weekly performance reports (every Monday)
 * - Monthly analytics reports (1st of every month)
 */

import Queue from 'bull';
import { createServiceLogger } from '../../utils/logger';
import { reportGeneratorService, ReportPeriod } from './report-generator.service';
import { emailService } from '../email/email.service';
import { prisma } from '../../config/prisma-client';
import { getRedisConnection } from '../redis/redis-connection-manager';

const logger = createServiceLogger('ScheduledReportsService');

/**
 * Scheduled report job data
 */
export interface ScheduledReportJob {
  agentId: string;
  period: ReportPeriod;
  deliveryMethod: 'email';
  emailAddress?: string;
}

export class ScheduledReportsService {
  private reportQueue: Queue.Queue<ScheduledReportJob> | null = null;

  /**
   * Initialize scheduled reports service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduled reports service');

    try {
      const redis = getRedisConnection();

      // Create report queue
      this.reportQueue = new Queue<ScheduledReportJob>('scheduled-reports', {
        redis: {
          host: redis.options.host,
          port: redis.options.port || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      });

      // Process jobs
      this.reportQueue.process(async (job) => {
        return this.processReportJob(job.data);
      });

      // Setup recurring jobs
      await this.setupRecurringJobs();

      logger.info('Scheduled reports service initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduled reports service', { error });
      throw error;
    }
  }

  /**
   * Setup recurring report jobs
   */
  private async setupRecurringJobs(): Promise<void> {
    if (!this.reportQueue) {
      throw new Error('Report queue not initialized');
    }

    logger.info('Setting up recurring report jobs');

    // Get all active agents
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      select: { id: true, email: true, settings: true },
    });

    for (const agent of agents) {
      const settings = agent.settings as any;

      // Daily reports (every day at 8 AM)
      if (settings?.reports?.daily !== false) {
        await this.reportQueue.add(
          {
            agentId: agent.id,
            period: 'daily',
            deliveryMethod: 'email',
            emailAddress: agent.email,
          },
          {
            repeat: {
              cron: '0 8 * * *', // Every day at 8:00 AM
            },
            jobId: `daily-report-${agent.id}`,
          }
        );
        logger.info('Scheduled daily report', { agentId: agent.id });
      }

      // Weekly reports (every Monday at 9 AM)
      if (settings?.reports?.weekly !== false) {
        await this.reportQueue.add(
          {
            agentId: agent.id,
            period: 'weekly',
            deliveryMethod: 'email',
            emailAddress: agent.email,
          },
          {
            repeat: {
              cron: '0 9 * * 1', // Every Monday at 9:00 AM
            },
            jobId: `weekly-report-${agent.id}`,
          }
        );
        logger.info('Scheduled weekly report', { agentId: agent.id });
      }

      // Monthly reports (1st of every month at 10 AM)
      if (settings?.reports?.monthly !== false) {
        await this.reportQueue.add(
          {
            agentId: agent.id,
            period: 'monthly',
            deliveryMethod: 'email',
            emailAddress: agent.email,
          },
          {
            repeat: {
              cron: '0 10 1 * *', // 1st of every month at 10:00 AM
            },
            jobId: `monthly-report-${agent.id}`,
          }
        );
        logger.info('Scheduled monthly report', { agentId: agent.id });
      }
    }

    logger.info('Recurring report jobs set up', { agentCount: agents.length });
  }

  /**
   * Process a scheduled report job
   */
  private async processReportJob(job: ScheduledReportJob): Promise<void> {
    logger.info('Processing scheduled report job', { job });

    try {
      // Check if email service is configured
      if (!emailService.isConfigured()) {
        logger.warn('Email service not configured, skipping report delivery', {
          agentId: job.agentId,
        });
        return;
      }

      // Generate report based on period
      let reportData;
      if (job.period === 'daily') {
        reportData = await reportGeneratorService.generateDailySummary(job.agentId);
      } else if (job.period === 'weekly') {
        reportData = await reportGeneratorService.generateWeeklyReport(job.agentId);
      } else if (job.period === 'monthly') {
        reportData = await reportGeneratorService.generateMonthlyReport(job.agentId);
      } else {
        throw new Error(`Unsupported report period: ${job.period}`);
      }

      // Send email
      if (job.deliveryMethod === 'email' && job.emailAddress) {
        const emailHtml = reportGeneratorService.generateEmailSummary(reportData);
        const subject = `${reportData.title} - ${new Date().toLocaleDateString()}`;

        const success = await emailService.sendReportEmail(
          job.emailAddress,
          subject,
          emailHtml
        );

        if (success) {
          logger.info('Report email sent successfully', {
            agentId: job.agentId,
            period: job.period,
            email: job.emailAddress,
          });
        } else {
          throw new Error('Failed to send report email');
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled report job', { error, job });
      throw error;
    }
  }

  /**
   * Schedule an ad-hoc report
   */
  async scheduleAdHocReport(job: ScheduledReportJob, delay?: number): Promise<void> {
    if (!this.reportQueue) {
      throw new Error('Report queue not initialized');
    }

    logger.info('Scheduling ad-hoc report', { job, delay });

    await this.reportQueue.add(job, {
      delay: delay || 0,
    });
  }

  /**
   * Cancel scheduled reports for an agent
   */
  async cancelAgentReports(agentId: string): Promise<void> {
    if (!this.reportQueue) {
      throw new Error('Report queue not initialized');
    }

    logger.info('Canceling scheduled reports for agent', { agentId });

    // Remove repeatable jobs
    const repeatableJobs = await this.reportQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (
        job.id === `daily-report-${agentId}` ||
        job.id === `weekly-report-${agentId}` ||
        job.id === `monthly-report-${agentId}`
      ) {
        await this.reportQueue.removeRepeatableByKey(job.key);
        logger.info('Removed repeatable report job', { jobId: job.id });
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (!this.reportQueue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.reportQueue.getWaitingCount(),
      this.reportQueue.getActiveCount(),
      this.reportQueue.getCompletedCount(),
      this.reportQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    if (this.reportQueue) {
      await this.reportQueue.close();
      logger.info('Scheduled reports service closed');
    }
  }
}

// Export singleton instance
export const scheduledReportsService = new ScheduledReportsService();
