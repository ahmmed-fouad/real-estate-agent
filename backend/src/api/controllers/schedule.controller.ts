/**
 * Schedule Controller
 * Task 4.3, Subtask 1: Viewing Scheduler
 * As per plan lines 1006-1012
 * 
 * Endpoints:
 * - POST /api/schedule/availability     (Agent sets availability)
 * - GET  /api/schedule/slots           (Get available slots)
 * - POST /api/schedule/book            (Book a viewing)
 * - PUT  /api/schedule/reschedule/:id  (Reschedule)
 * - DELETE /api/schedule/cancel/:id    (Cancel)
 * - GET  /api/schedule/viewings        (List all viewings)
 * - GET  /api/schedule/viewings/:id    (Get viewing by ID)
 */

import { Response } from 'express';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { ErrorResponse } from '../../utils/error-response';
import { schedulingService } from '../../services/schedule';
import {
  AgentAvailability,
  BookViewingRequest,
  RescheduleViewingRequest,
  ViewingStatus,
} from '../../types/schedule';

const logger = createServiceLogger('ScheduleController');

/**
 * Set agent availability
 * POST /api/schedule/availability
 * 
 * @swagger
 * /api/schedule/availability:
 *   post:
 *     summary: Set agent availability for scheduling viewings
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timezone
 *               - slots
 *             properties:
 *               timezone:
 *                 type: string
 *                 example: "Africa/Cairo"
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       example: 1
 *                     startTime:
 *                       type: string
 *                       pattern: "^([0-1][0-9]|2[0-3]):([0-5][0-9])$"
 *                       example: "09:00"
 *                     endTime:
 *                       type: string
 *                       pattern: "^([0-1][0-9]|2[0-3]):([0-5][0-9])$"
 *                       example: "17:00"
 *               bufferMinutes:
 *                 type: integer
 *                 example: 30
 *               viewingDuration:
 *                 type: integer
 *                 example: 60
 *     responses:
 *       200:
 *         description: Availability set successfully
 *       400:
 *         description: Invalid availability data
 */
export const setAvailability = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const availability: AgentAvailability = req.body;

    logger.info('Set availability request', { agentId });

    await schedulingService.setAgentAvailability(agentId, availability);

    res.json({
      success: true,
      message: 'Availability set successfully',
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Set availability failed');
  }
};

/**
 * Get available time slots
 * GET /api/schedule/slots
 * 
 * @swagger
 * /api/schedule/slots:
 *   get:
 *     summary: Get available time slots for scheduling viewings
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for slot search
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for slot search
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional property ID
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid date parameters
 */
export const getAvailableSlots = async (
  req: AuthenticatedRequest<{}, {}, {}, { startDate: string; endDate: string; propertyId?: string }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate, propertyId } = req.query;

    if (!startDate || !endDate) {
      ErrorResponse.badRequest(res, 'startDate and endDate are required');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      ErrorResponse.badRequest(res, 'Invalid date format');
      return;
    }

    if (start >= end) {
      ErrorResponse.badRequest(res, 'startDate must be before endDate');
      return;
    }

    logger.info('Get available slots request', { agentId, startDate, endDate, propertyId });

    const slots = await schedulingService.getAvailableSlots(
      agentId,
      start,
      end,
      propertyId
    );

    res.json({
      success: true,
      slots,
      count: slots.length,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Get available slots failed');
  }
};

/**
 * Book a viewing
 * POST /api/schedule/book
 * 
 * @swagger
 * /api/schedule/book:
 *   post:
 *     summary: Book a property viewing
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - propertyId
 *               - scheduledTime
 *               - customerPhone
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               customerPhone:
 *                 type: string
 *               customerName:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Viewing booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 viewing:
 *                   type: object
 *       400:
 *         description: Invalid booking data or slot not available
 */
export const bookViewing = async (
  req: AuthenticatedRequest<{}, {}, BookViewingRequest>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const bookingRequest: BookViewingRequest = req.body;

    // Validate required fields
    if (!bookingRequest.conversationId || !bookingRequest.propertyId || 
        !bookingRequest.scheduledTime || !bookingRequest.customerPhone) {
      ErrorResponse.badRequest(res, 'Missing required fields');
      return;
    }

    // Parse scheduled time
    const scheduledTime = new Date(bookingRequest.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      ErrorResponse.badRequest(res, 'Invalid scheduledTime format');
      return;
    }

    logger.info('Book viewing request', {
      agentId,
      propertyId: bookingRequest.propertyId,
      scheduledTime,
    });

    const viewing = await schedulingService.bookViewing(agentId, {
      ...bookingRequest,
      scheduledTime,
    });

    res.status(201).json({
      success: true,
      message: 'Viewing booked successfully',
      viewing,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Book viewing failed');
  }
};

/**
 * Reschedule a viewing
 * PUT /api/schedule/reschedule/:id
 * 
 * @swagger
 * /api/schedule/reschedule/{id}:
 *   put:
 *     summary: Reschedule an existing viewing
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newScheduledTime
 *             properties:
 *               newScheduledTime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viewing rescheduled successfully
 *       400:
 *         description: Invalid request or slot not available
 *       404:
 *         description: Viewing not found
 */
export const rescheduleViewing = async (
  req: AuthenticatedRequest<{ id: string }, {}, RescheduleViewingRequest>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const rescheduleRequest: RescheduleViewingRequest = req.body;

    if (!rescheduleRequest.newScheduledTime) {
      ErrorResponse.badRequest(res, 'newScheduledTime is required');
      return;
    }

    const newScheduledTime = new Date(rescheduleRequest.newScheduledTime);
    if (isNaN(newScheduledTime.getTime())) {
      ErrorResponse.badRequest(res, 'Invalid newScheduledTime format');
      return;
    }

    logger.info('Reschedule viewing request', {
      agentId,
      viewingId: id,
      newScheduledTime,
    });

    const viewing = await schedulingService.rescheduleViewing(id, agentId, {
      ...rescheduleRequest,
      newScheduledTime,
    });

    res.json({
      success: true,
      message: 'Viewing rescheduled successfully',
      viewing,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Reschedule viewing failed');
  }
};

/**
 * Cancel a viewing
 * DELETE /api/schedule/cancel/:id
 * 
 * @swagger
 * /api/schedule/cancel/{id}:
 *   delete:
 *     summary: Cancel a scheduled viewing
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viewing cancelled successfully
 *       404:
 *         description: Viewing not found
 */
export const cancelViewing = async (
  req: AuthenticatedRequest<{ id: string }, {}, { reason?: string }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    logger.info('Cancel viewing request', { agentId, viewingId: id });

    const viewing = await schedulingService.cancelViewing(id, agentId, reason);

    res.json({
      success: true,
      message: 'Viewing cancelled successfully',
      viewing,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Cancel viewing failed');
  }
};

/**
 * Get viewing by ID
 * GET /api/schedule/viewings/:id
 * 
 * @swagger
 * /api/schedule/viewings/{id}:
 *   get:
 *     summary: Get a viewing by ID
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
 *         description: Viewing retrieved successfully
 *       404:
 *         description: Viewing not found
 */
export const getViewingById = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Get viewing by ID request', { agentId, viewingId: id });

    const viewing = await schedulingService.getViewingById(id, agentId);

    if (!viewing) {
      ErrorResponse.notFound(res, 'Viewing not found');
      return;
    }

    res.json({
      success: true,
      viewing,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Get viewing failed');
  }
};

/**
 * Get all viewings for agent
 * GET /api/schedule/viewings
 * 
 * @swagger
 * /api/schedule/viewings:
 *   get:
 *     summary: Get all viewings for the authenticated agent
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, cancelled, completed, no_show]
 *         description: Filter by viewing status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter viewings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter viewings until this date
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by property ID
 *     responses:
 *       200:
 *         description: Viewings retrieved successfully
 */
export const getAgentViewings = async (
  req: AuthenticatedRequest<{}, {}, {}, {
    status?: ViewingStatus;
    startDate?: string;
    endDate?: string;
    propertyId?: string;
  }>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { status, startDate, endDate, propertyId } = req.query;

    logger.info('Get agent viewings request', { agentId, status, startDate, endDate, propertyId });

    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        filters.startDate = start;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        filters.endDate = end;
      }
    }

    if (propertyId) {
      filters.propertyId = propertyId;
    }

    const viewings = await schedulingService.getAgentViewings(agentId, filters);

    res.json({
      success: true,
      viewings,
      count: viewings.length,
    });
  } catch (error) {
    ErrorResponse.handleError(res, error, 'Get agent viewings failed');
  }
};
