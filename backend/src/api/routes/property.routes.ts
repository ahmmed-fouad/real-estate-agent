/**
 * Property Management Routes
 * Defines all property management endpoints with Swagger/OpenAPI documentation
 * As per plan Task 3.1, Subtask 3: Property Management APIs (lines 713-721)
 */

import { Router } from 'express';
import * as propertyController from '../controllers/property.controller';

// Optional multer import - install with: npm install multer @types/multer
let multer: any;
try {
  multer = require('multer');
} catch (error) {
  // Multer not installed
  multer = null;
}
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

// Configure multer for file uploads (Fix #3: CSV/Excel upload + images/documents)
// Note: Install with: npm install multer @types/multer
let upload: any;
if (multer) {
  // CSV/Excel upload (for bulk property upload)
  upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    },
  });
} else {
  // Multer not installed - upload endpoint will fail gracefully
  upload = {
    single: () => (_req: any, _res: any, next: any) => {
      next(new Error('Multer not installed. Run: npm install multer @types/multer'));
    },
    array: () => (_req: any, _res: any, next: any) => {
      next(new Error('Multer not installed. Run: npm install multer @types/multer'));
    },
  };
}

// All routes require authentication
router.use(authenticate as any);

/**
 * @swagger
 * /api/properties/upload-images:
 *   post:
 *     summary: Upload property images
 *     description: Upload multiple images for properties (multipart/form-data)
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
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
 *                     urls:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: No images uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/upload-images', upload.array('images', 10), propertyController.uploadImages as any);

/**
 * @swagger
 * /api/properties/upload-documents:
 *   post:
 *     summary: Upload property documents
 *     description: Upload multiple documents for properties (multipart/form-data)
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
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
 *                     urls:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: No documents uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/upload-documents', upload.array('documents', 5), propertyController.uploadDocuments as any);

/**
 * @swagger
 * /api/properties/template:
 *   get:
 *     summary: Download property upload template
 *     description: Download Excel template for bulk property upload with instructions and examples
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/template', propertyController.downloadTemplate as any);

/**
 * @swagger
 * /api/properties/upload-file:
 *   post:
 *     summary: Upload CSV/Excel file for bulk property import
 *     description: Upload and process CSV or Excel file containing property data
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: File processed and queued for import
 *       400:
 *         description: Invalid file or validation errors
 *       401:
 *         description: Unauthorized
 */
router.post('/upload-file', upload.single('file'), propertyController.uploadFile as any);

/**
 * @swagger
 * /api/properties/batch/{batchId}/progress:
 *   get:
 *     summary: Get batch upload progress
 *     description: Retrieve real-time progress for a batch upload
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       404:
 *         description: Batch not found
 */
router.get('/batch/:batchId/progress', propertyController.getBatchProgress as any);

/**
 * @swagger
 * /api/properties/batch/{batchId}/result:
 *   get:
 *     summary: Get batch upload result
 *     description: Retrieve final results for a completed batch upload
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Results retrieved successfully
 *       404:
 *         description: Batch not found
 */
router.get('/batch/:batchId/result', propertyController.getBatchResult as any);

/**
 * @swagger
 * /api/properties/batch/stats:
 *   get:
 *     summary: Get batch queue statistics
 *     description: Retrieve statistics about the batch processing queue
 *     tags: [Property Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/batch/stats', propertyController.getBatchStats as any);

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

