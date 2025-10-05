/**
 * Calendar Controller
 * Task 4.3, Subtask 2: Calendar Integration
 * As per plan lines 995-999
 * 
 * Endpoints for calendar integration:
 * - GET /api/schedule/viewings/:id/icalendar (Export viewing as iCal)
 * - POST /api/schedule/google-auth (Initiate Google Calendar OAuth)
 * - POST /api/schedule/google-calendar (Add viewing to Google Calendar)
 */

import { Response } from 'express';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { ErrorResponse } from '../../utils/error-response';
import { schedulingService, calendarService } from '../../services/schedule';

const logger = createServiceLogger('CalendarController');

/**
 * Export viewing as iCalendar file
 * GET /api/schedule/viewings/:id/icalendar
 * 
 * @swagger
 * /api/schedule/viewings/{id}/icalendar:
 *   get:
 *     summary: Export viewing as iCalendar (.ics) file
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Viewing ID
 *     responses:
 *       200:
 *         description: iCalendar file download
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *       404:
 *         description: Viewing not found
 */
export const exportICalendar = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Export iCalendar request', { agentId, viewingId: id });

    // Get viewing details
    const viewing = await schedulingService.getViewingById(id, agentId);

    if (!viewing) {
      ErrorResponse.notFound(res, 'Viewing not found');
      return;
    }

    // Ensure viewing has required property and agent data
    if (!viewing.property || !viewing.agent) {
      ErrorResponse.send(res, new Error('Viewing missing required data'), 'Incomplete viewing data', 500);
      return;
    }

    // Create calendar event from viewing
    const calendarEvent = calendarService.createEventFromViewing(viewing as any);

    // Generate iCal string
    const icalString = calendarService.generateICalEvent(calendarEvent);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="viewing-${id}.ics"`);

    logger.info('iCalendar export successful', {
      agentId,
      viewingId: id,
      fileSize: icalString.length,
    });

    res.send(icalString);
  } catch (error) {
    ErrorResponse.send(res, error, 'Export iCalendar failed', 500);
  }
};

/**
 * Add viewing to Google Calendar
 * POST /api/schedule/viewings/:id/google-calendar
 * 
 * Note: Requires Google Calendar OAuth setup
 * 
 * @swagger
 * /api/schedule/viewings/{id}/google-calendar:
 *   post:
 *     summary: Add viewing to agent's Google Calendar
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Viewing ID
 *     responses:
 *       200:
 *         description: Event added to Google Calendar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 eventId:
 *                   type: string
 *       400:
 *         description: Google Calendar not configured
 *       404:
 *         description: Viewing not found
 */
export const addToGoogleCalendar = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Add to Google Calendar request', { agentId, viewingId: id });

    // Get viewing details
    const viewing = await schedulingService.getViewingById(id, agentId);

    if (!viewing) {
      ErrorResponse.notFound(res, 'Viewing not found');
      return;
    }

    // Ensure viewing has required property and agent data
    if (!viewing.property || !viewing.agent) {
      ErrorResponse.send(res, new Error('Viewing missing required data'), 'Incomplete viewing data', 500);
      return;
    }

    // Create calendar event from viewing
    const calendarEvent = calendarService.createEventFromViewing(viewing as any);

    // Add to Google Calendar
    const result = await calendarService.addToGoogleCalendar(calendarEvent, agentId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to add to Google Calendar',
        message: 'Google Calendar integration not configured. Please use iCal export instead.',
      });
      return;
    }

    logger.info('Added to Google Calendar successfully', {
      agentId,
      viewingId: id,
      eventId: result.eventId,
    });

    res.json({
      success: true,
      message: 'Viewing added to Google Calendar',
      eventId: result.eventId,
    });
  } catch (error) {
    ErrorResponse.send(res, error, 'Add to Google Calendar failed', 500);
  }
};

/**
 * Get Google Calendar OAuth URL
 * GET /api/schedule/google-auth-url
 * 
 * Note: Requires Google Calendar OAuth setup
 * 
 * @swagger
 * /api/schedule/google-auth-url:
 *   get:
 *     summary: Get Google Calendar OAuth authorization URL
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 authUrl:
 *                   type: string
 *       400:
 *         description: Google Calendar not configured
 */
export const getGoogleAuthUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;

    logger.info('Get Google auth URL request', { agentId });

    // TODO: Implement OAuth URL generation
    // This would return a URL for the agent to authorize calendar access

    res.status(400).json({
      success: false,
      error: 'Google Calendar OAuth not configured',
      message: 'Google Calendar integration requires OAuth setup in production. Please use iCal export for now.',
    });
  } catch (error) {
    ErrorResponse.send(res, error, 'Get Google auth URL failed', 500);
  }
};
