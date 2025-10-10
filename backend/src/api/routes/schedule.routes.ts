/**
 * Schedule Routes
 * Task 4.3, Subtask 1: Viewing Scheduler
 * As per plan lines 1006-1012
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as scheduleController from '../controllers/schedule.controller';
import * as calendarController from '../controllers/calendar.controller';

const router = express.Router();

/**
 * All routes require authentication
 */

/**
 * POST /api/schedule/availability
 * Set agent availability for scheduling viewings
 */
router.post('/availability', authenticate as any, scheduleController.setAvailability as any);

/**
 * GET /api/schedule/slots
 * Get available time slots for scheduling viewings
 */
router.get('/slots', authenticate as any, scheduleController.getAvailableSlots as any);

/**
 * POST /api/schedule/book
 * Book a property viewing
 */
router.post('/book', authenticate as any, scheduleController.bookViewing as any);

/**
 * PUT /api/schedule/reschedule/:id
 * Reschedule an existing viewing
 */
router.put('/reschedule/:id', authenticate as any, scheduleController.rescheduleViewing as any);

/**
 * DELETE /api/schedule/cancel/:id
 * Cancel a scheduled viewing
 */
router.delete('/cancel/:id', authenticate as any, scheduleController.cancelViewing as any);

/**
 * GET /api/schedule/viewings
 * Get all viewings for the authenticated agent
 */
router.get('/viewings', authenticate as any, scheduleController.getAgentViewings as any);

/**
 * GET /api/schedule/viewings/:id
 * Get a viewing by ID
 */
router.get('/viewings/:id', authenticate as any, scheduleController.getViewingById as any);

/**
 * GET /api/schedule/viewings/:id/icalendar
 * Export viewing as iCalendar file
 */
router.get('/viewings/:id/icalendar', authenticate as any, calendarController.exportICalendar as any);

/**
 * POST /api/schedule/viewings/:id/google-calendar
 * Add viewing to Google Calendar
 */
router.post('/viewings/:id/google-calendar', authenticate as any, calendarController.addToGoogleCalendar as any);

/**
 * GET /api/schedule/google-auth-url
 * Get Google Calendar OAuth authorization URL
 */
router.get('/google-auth-url', authenticate as any, calendarController.getGoogleAuthUrl as any);

export default router;
