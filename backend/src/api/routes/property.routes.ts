/**
 * Property Management Routes
 * Defines all property management endpoints with Swagger/OpenAPI documentation
 * As per plan Task 3.1, Subtask 3: Property Management APIs (lines 713-721)
 */

import { Router } from 'express';
import * as propertyController from '../controllers/property.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  CreatePropertySchema,
  UpdatePropertySchema,
  GetPropertySchema,
  DeletePropertySchema,
  ListPropertiesSchema,
} from '../validators/property.validators';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * @swagger
 * /api/properties/bulk-upload:
 *   post:
 *     summary: Bulk upload properties
 *     description: Upload multiple properties via CSV/Excel or JSON
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               properties:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Properties uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     successful:
 *                       type: number
 *                     failed:
 *                       type: number
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bulk-upload', propertyController.bulkUpload as any);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create new property
 *     description: Creates a new property and generates embeddings for vector search
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - propertyType
 *               - city
 *               - district
 *               - area
 *               - bedrooms
 *               - bathrooms
 *               - basePrice
 *               - pricePerMeter
 *             properties:
 *               projectName:
 *                 type: string
 *                 example: Palm Hills
 *               developerName:
 *                 type: string
 *                 example: Palm Hills Developments
 *               propertyType:
 *                 type: string
 *                 example: apartment
 *               city:
 *                 type: string
 *                 example: Cairo
 *               district:
 *                 type: string
 *                 example: New Cairo
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               area:
 *                 type: number
 *                 example: 150
 *               bedrooms:
 *                 type: number
 *                 example: 3
 *               bathrooms:
 *                 type: number
 *                 example: 2
 *               floors:
 *                 type: number
 *               basePrice:
 *                 type: number
 *                 example: 3000000
 *               pricePerMeter:
 *                 type: number
 *                 example: 20000
 *               currency:
 *                 type: string
 *                 default: EGP
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *               videoUrl:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [available, sold, reserved]
 *               paymentPlans:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     property:
 *                       $ref: '#/components/schemas/Property'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/',
  validate(CreatePropertySchema),
  propertyController.createProperty as any
);

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: List all properties
 *     description: Retrieves paginated list of properties with optional filters
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, available, sold, reserved]
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Property'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 */
router.get(
  '/',
  validate(ListPropertiesSchema),
  propertyController.listProperties as any
);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property details
 *     description: Retrieves detailed information for a specific property
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     property:
 *                       $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 */
router.get(
  '/:id',
  validate(GetPropertySchema),
  propertyController.getProperty as any
);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property
 *     description: Updates an existing property and regenerates embeddings
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               propertyType:
 *                 type: string
 *               area:
 *                 type: number
 *               basePrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       404:
 *         description: Property not found
 */
router.put(
  '/:id',
  validate(UpdatePropertySchema),
  propertyController.updateProperty as any
);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property
 *     description: Deletes a property from both SQL and vector database
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *       404:
 *         description: Property not found
 */
router.delete(
  '/:id',
  validate(DeletePropertySchema),
  propertyController.deleteProperty as any
);

export default router;

