/**
 * Property Template Generation Service
 * Task 3.3, Subtask 3: Template Generation (lines 882-886)
 * 
 * Creates Excel template for agents with:
 * - Property data sheet with headers
 * - Example data sheet
 * - Instructions sheet
 */

import * as XLSX from 'xlsx';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('PropertyTemplate');

/**
 * Property Template Service
 * As per plan lines 882-886
 */
export class PropertyTemplateService {
  /**
   * Generate Excel template for property bulk upload
   * 
   * Creates a workbook with 3 sheets:
   * 1. Template - Empty template with headers
   * 2. Example - Sample data for reference
   * 3. Instructions - Guide for filling the template
   * 
   * @returns Buffer containing Excel file
   */
  generateTemplate(): Buffer {
    logger.info('Generating property template');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 1. Create Template sheet (empty with headers)
    const templateSheet = this.createTemplateSheet();
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');

    // 2. Create Example sheet (with sample data)
    const exampleSheet = this.createExampleSheet();
    XLSX.utils.book_append_sheet(workbook, exampleSheet, 'Example');

    // 3. Create Instructions sheet
    const instructionsSheet = this.createInstructionsSheet();
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Convert workbook to buffer
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    });

    logger.info('Property template generated successfully');

    return buffer;
  }

  /**
   * Create template sheet with headers only
   * Task 3.3, Subtask 3: Template with headers
   */
  private createTemplateSheet(): XLSX.WorkSheet {
    const headers = [
      'projectName',
      'developerName',
      'propertyType',
      'city',
      'district',
      'address',
      'latitude',
      'longitude',
      'area',
      'bedrooms',
      'bathrooms',
      'floors',
      'basePrice',
      'pricePerMeter',
      'currency',
      'amenities',
      'description',
      'deliveryDate',
      'images',
      'documents',
      'videoUrl',
      'status',
      'paymentPlans',
    ];

    // Create worksheet with just headers
    const data = [headers];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // projectName
      { wch: 20 }, // developerName
      { wch: 15 }, // propertyType
      { wch: 15 }, // city
      { wch: 15 }, // district
      { wch: 30 }, // address
      { wch: 12 }, // latitude
      { wch: 12 }, // longitude
      { wch: 10 }, // area
      { wch: 10 }, // bedrooms
      { wch: 10 }, // bathrooms
      { wch: 10 }, // floors
      { wch: 15 }, // basePrice
      { wch: 15 }, // pricePerMeter
      { wch: 10 }, // currency
      { wch: 30 }, // amenities
      { wch: 40 }, // description
      { wch: 15 }, // deliveryDate
      { wch: 40 }, // images
      { wch: 40 }, // documents
      { wch: 40 }, // videoUrl
      { wch: 12 }, // status
      { wch: 50 }, // paymentPlans
    ];

    return worksheet;
  }

  /**
   * Create example sheet with sample data
   * Task 3.3, Subtask 3: Include example data
   */
  private createExampleSheet(): XLSX.WorkSheet {
    const data = [
      // Headers
      [
        'projectName',
        'developerName',
        'propertyType',
        'city',
        'district',
        'address',
        'latitude',
        'longitude',
        'area',
        'bedrooms',
        'bathrooms',
        'floors',
        'basePrice',
        'pricePerMeter',
        'currency',
        'amenities',
        'description',
        'deliveryDate',
        'images',
        'documents',
        'videoUrl',
        'status',
        'paymentPlans',
      ],
      // Example 1: Apartment
      [
        'Palm Hills New Cairo',
        'Palm Hills Developments',
        'apartment',
        'Cairo',
        'New Cairo',
        '90th Street, Fifth Settlement',
        30.0331,
        31.4787,
        150,
        3,
        2,
        null,
        4500000,
        30000,
        'EGP',
        'Swimming Pool, Gym, Security, Parking, Garden',
        'Luxurious 3-bedroom apartment in the heart of New Cairo with stunning views and modern amenities. Features spacious living areas, high-quality finishes, and access to world-class facilities.',
        '2025-12-31',
        'https://example.com/image1.jpg, https://example.com/image2.jpg',
        'https://example.com/brochure.pdf',
        'https://example.com/video.mp4',
        'available',
        '[{"planName":"10% Down Payment","downPaymentPercentage":10,"installmentYears":5,"monthlyPayment":75000,"description":"Pay 10% upfront, rest over 5 years"}]',
      ],
      // Example 2: Villa
      [
        'Mountain View Hyde Park',
        'Mountain View',
        'villa',
        'Cairo',
        '6th of October',
        'Central Axis, 6th of October City',
        29.9511,
        30.9382,
        350,
        4,
        4,
        2,
        12000000,
        34285,
        'EGP',
        'Private Pool, Garden, Smart Home, Garage, Security',
        'Elegant standalone villa with private pool and garden. Perfect for families seeking luxury and comfort in a gated community with 24/7 security.',
        '2026-06-30',
        'https://example.com/villa1.jpg, https://example.com/villa2.jpg, https://example.com/villa3.jpg',
        'https://example.com/villa-brochure.pdf, https://example.com/floor-plans.pdf',
        'https://example.com/villa-tour.mp4',
        'available',
        '[{"planName":"5% Down Payment","downPaymentPercentage":5,"installmentYears":7,"monthlyPayment":142857,"description":"Minimal upfront, extended payment period"}]',
      ],
      // Example 3: Townhouse
      [
        'Sodic West',
        'SODIC',
        'townhouse',
        'Giza',
        'Sheikh Zayed',
        'Sodic West Compound, Sheikh Zayed',
        30.0735,
        30.9699,
        220,
        3,
        3,
        2,
        7500000,
        34090,
        'EGP',
        'Community Club, Playground, Shopping Mall, Medical Center',
        'Modern townhouse in prestigious Sodic West development. Ideal for families wanting space and community amenities.',
        '2025-09-30',
        'https://example.com/townhouse1.jpg',
        'https://example.com/townhouse-specs.pdf',
        null,
        'reserved',
        '[{"planName":"15% Down Payment","downPaymentPercentage":15,"installmentYears":6,"monthlyPayment":106250,"description":"Standard payment plan"}]',
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths (same as template)
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 40 }, { wch: 40 },
      { wch: 40 }, { wch: 12 }, { wch: 50 },
    ];

    return worksheet;
  }

  /**
   * Create instructions sheet
   * Task 3.3, Subtask 3: Add instructions sheet
   */
  private createInstructionsSheet(): XLSX.WorkSheet {
    const instructions = [
      ['Property Upload Template - Instructions'],
      [''],
      ['📋 OVERVIEW'],
      ['This template helps you bulk upload property data to the WhatsApp AI Sales Agent platform.'],
      ['Please follow the instructions carefully to ensure successful data import.'],
      [''],
      ['📝 HOW TO USE'],
      ['1. Go to the "Template" sheet'],
      ['2. Fill in your property data starting from row 2 (row 1 contains headers)'],
      ['3. Refer to the "Example" sheet for sample data format'],
      ['4. Save the file as .xlsx or .csv format'],
      ['5. Upload through the agent portal'],
      [''],
      ['✅ REQUIRED FIELDS (marked with *)'],
      ['* projectName - Name of the property project'],
      ['* propertyType - Type: apartment, villa, townhouse, penthouse, studio, duplex, chalet, land'],
      ['* city - City name (e.g., Cairo, Giza, Alexandria)'],
      ['* district - District/neighborhood name'],
      ['* area - Property area in square meters (number)'],
      ['* basePrice - Base price of property (number)'],
      ['* pricePerMeter - Price per square meter (number)'],
      [''],
      ['📊 OPTIONAL FIELDS'],
      ['- developerName - Developer company name'],
      ['- address - Full address'],
      ['- latitude, longitude - GPS coordinates (both required if using)'],
      ['- bedrooms - Number of bedrooms (default: 0)'],
      ['- bathrooms - Number of bathrooms (default: 0)'],
      ['- floors - Number of floors'],
      ['- currency - Currency code (default: EGP). Options: EGP, USD, EUR, GBP, SAR, AED'],
      ['- amenities - Comma-separated list (e.g., "Pool, Gym, Security")'],
      ['- description - Detailed property description'],
      ['- deliveryDate - Expected delivery date (format: YYYY-MM-DD)'],
      ['- images - Comma-separated image URLs'],
      ['- documents - Comma-separated document URLs'],
      ['- videoUrl - Property video URL'],
      ['- status - Status: available, sold, reserved, under_construction (default: available)'],
      ['- paymentPlans - JSON array of payment plan objects (see example)'],
      [''],
      ['💡 TIPS & BEST PRACTICES'],
      ['1. Property Type: Use lowercase (apartment, villa, townhouse, etc.)'],
      ['2. Numbers: Don\'t use commas in numbers (use 5000000 not 5,000,000)'],
      ['3. Dates: Use format YYYY-MM-DD (e.g., 2025-12-31)'],
      ['4. Amenities: Separate multiple items with commas'],
      ['5. Images/Documents: Provide full URLs, comma-separated'],
      ['6. Payment Plans: Use JSON format as shown in example sheet'],
      ['7. Coordinates: Use decimal format (e.g., 30.0444, 31.2357)'],
      ['8. Currency: Use 3-letter ISO codes only'],
      ['9. Empty Fields: Leave optional fields blank if not applicable'],
      ['10. Validation: System will validate all data before importing'],
      [''],
      ['🔍 PAYMENT PLANS FORMAT'],
      ['Payment plans should be in JSON array format:'],
      ['[{'],
      ['  "planName": "10% Down Payment",'],
      ['  "downPaymentPercentage": 10,'],
      ['  "installmentYears": 5,'],
      ['  "monthlyPayment": 75000,'],
      ['  "description": "Pay 10% upfront, rest over 5 years"'],
      ['}]'],
      [''],
      ['Multiple plans can be added by separating with commas in the array.'],
      [''],
      ['❌ COMMON ERRORS TO AVOID'],
      ['1. Missing required fields (marked with *)'],
      ['2. Using text in number fields'],
      ['3. Invalid property type (must be from allowed list)'],
      ['4. Negative numbers for area, bedrooms, bathrooms'],
      ['5. Invalid currency codes'],
      ['6. Wrong date format'],
      ['7. Invalid URLs for images/videos'],
      ['8. Malformed JSON in payment plans'],
      ['9. Coordinates outside valid range (latitude: -90 to 90, longitude: -180 to 180)'],
      [''],
      ['📞 SUPPORT'],
      ['If you encounter any issues:'],
      ['1. Check the validation errors in the upload results'],
      ['2. Refer to the example sheet for correct format'],
      ['3. Contact support at: support@yourplatform.com'],
      [''],
      ['🎉 GOOD LUCK!'],
      ['Your property data will be automatically processed and integrated with the AI agent.'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(instructions);

    // Set column width
    worksheet['!cols'] = [{ wch: 100 }];

    // Make title row bold (would need additional styling library for full formatting)
    // For now, content is clear enough

    return worksheet;
  }

  /**
   * Get template filename
   */
  getTemplateFilename(): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `property-upload-template-${timestamp}.xlsx`;
  }
}

// Export singleton instance
export const propertyTemplateService = new PropertyTemplateService();

