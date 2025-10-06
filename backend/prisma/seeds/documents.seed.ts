/**
 * Document Seeder
 * Seeds the database with test documents for RAG knowledge base
 */

import { prisma } from '../../src/config/prisma-client';
import { documentService, DocumentMetadata } from '../../src/services/document';
import { createServiceLogger } from '../../src/utils/logger';

const logger = createServiceLogger('DocumentSeeder');

// Sample document contents for testing
const TEST_DOCUMENTS: Omit<DocumentMetadata, 'agentId'>[] = [
  {
    title: 'Company Overview - Real Estate Solutions',
    description: 'Comprehensive company overview including services, values, and contact information',
    documentType: 'guide',
    category: 'company_info',
    fileUrl: 'https://example.com/documents/company-overview.pdf',
    fileName: 'company-overview.pdf',
    fileType: 'pdf',
    fileSize: 524288, // 512KB
    language: 'mixed',
    tags: ['company', 'overview', 'services'],
    contentText: `
# Real Estate Solutions - Company Overview

## About Us
Real Estate Solutions is a leading property development and sales company in Egypt, specializing in residential and commercial properties. Founded in 2010, we have successfully delivered over 50 projects across Cairo, New Cairo, and the North Coast.

## Our Services
- Property Development: We develop high-quality residential and commercial properties
- Property Sales: Expert guidance in buying and selling properties
- Property Management: Comprehensive property management services
- Investment Consulting: Professional advice for real estate investments

## Our Values
- Transparency: We believe in honest and open communication
- Quality: We never compromise on quality in our developments
- Customer Service: Our customers are at the heart of everything we do
- Innovation: We embrace new technologies and methods

## Contact Information
- Phone: +20 123 456 7890
- Email: info@realestate-solutions.com
- Address: 123 Main Street, New Cairo, Egypt
- Working Hours: Sunday to Thursday, 9:00 AM - 6:00 PM

## Why Choose Us
- 10+ years of experience in the Egyptian real estate market
- Over 50 successful projects delivered
- 5,000+ satisfied customers
- Award-winning customer service
- Competitive pricing and flexible payment plans
`,
  },
  {
    title: 'Payment Plans Guide',
    description: 'Detailed information about available payment plans and financing options',
    documentType: 'guide',
    category: 'financial',
    fileUrl: 'https://example.com/documents/payment-plans.pdf',
    fileName: 'payment-plans.pdf',
    fileType: 'pdf',
    fileSize: 327680, // 320KB
    language: 'mixed',
    tags: ['payment', 'financing', 'installments'],
    contentText: `
# Payment Plans and Financing Options

## Available Payment Plans

### Plan A: Quick Purchase
- Down Payment: 30%
- Installment Period: 3 years
- Monthly Payment: Calculated based on property price
- Interest Rate: 8% per annum
- Best for: Customers who want to own their property quickly

### Plan B: Standard Plan
- Down Payment: 20%
- Installment Period: 5 years
- Monthly Payment: Flexible based on income
- Interest Rate: 10% per annum
- Best for: Most customers, balanced payment structure

### Plan C: Extended Plan
- Down Payment: 10%
- Installment Period: 7 years
- Monthly Payment: Lower monthly payments
- Interest Rate: 12% per annum
- Best for: Customers who prefer lower monthly commitments

### Plan D: Premium Plan
- Down Payment: 50%
- Installment Period: 2 years
- Monthly Payment: Higher monthly payments
- Interest Rate: 6% per annum
- Best for: Customers with higher budget looking for best rates

## Additional Information

### Early Payment Discount
Customers who pay off their installments before the scheduled time receive a 3% discount on remaining balance.

### Payment Methods
- Bank Transfer
- Credit Card
- Cash Payment at Office
- Post-Dated Checks

### Required Documents
- National ID or Passport
- Proof of Income (salary certificate or bank statement)
- Utility Bill (proof of address)
- Bank Reference Letter

### Mortgage Options
We partner with leading banks to offer mortgage solutions:
- National Bank of Egypt
- Commercial International Bank (CIB)
- Bank Misr
- HSBC Egypt

Contact our financial advisors for personalized payment plans.
`,
  },
  {
    title: 'Frequently Asked Questions (FAQ)',
    description: 'Common questions and answers about our properties and services',
    documentType: 'faq',
    category: 'company_info',
    fileUrl: 'https://example.com/documents/faq.pdf',
    fileName: 'faq.pdf',
    fileType: 'pdf',
    fileSize: 245760, // 240KB
    language: 'mixed',
    tags: ['faq', 'help', 'questions'],
    contentText: `
# Frequently Asked Questions

## General Questions

### What areas do you cover?
We primarily operate in Cairo, New Cairo, 6th of October City, Sheikh Zayed, and the North Coast. We are expanding to other cities.

### Are your properties ready to move in?
We offer both ready-to-move properties and off-plan properties under construction. Each property listing clearly indicates the status.

### Can foreigners buy property in Egypt?
Yes, foreigners can buy property in Egypt. However, there are some restrictions on agricultural land and certain areas. Our legal team can guide you through the process.

## Buying Process

### What is the typical buying process?
1. Property Selection: Browse our listings and select a property
2. Site Visit: Schedule a viewing with our agent
3. Reservation: Pay a reservation fee to secure the property
4. Contract: Sign the purchase contract
5. Payment: Make payments according to chosen plan
6. Handover: Receive your property keys

### How long does the buying process take?
For ready properties: 2-4 weeks
For off-plan properties: Until project completion (typically 18-36 months)

### What fees should I expect?
- Property Price
- Registration Fees (2.5% of property value)
- Administrative Fees
- Maintenance Deposit (varies by property)

## Property Viewings

### How do I schedule a viewing?
You can schedule a viewing through:
- WhatsApp: Message us at +20 123 456 7890
- Phone: Call our customer service
- Website: Fill out the viewing request form
- In Person: Visit our office

### Can I do a virtual tour?
Yes! We offer virtual tours for most of our properties. Contact us to arrange one.

## After-Sales

### What if I want to sell my property later?
We offer resale services to help you sell your property when you're ready. We also have a network of buyers.

### Is there property management available?
Yes, we offer comprehensive property management services including maintenance, tenant management, and more.

### What about maintenance issues?
All our properties come with a warranty period. After that, we offer maintenance services through our dedicated team.

## Contact Us

For more questions, please contact:
- WhatsApp: +20 123 456 7890
- Email: info@realestate-solutions.com
- Phone: +20 123 456 7890
- Office Hours: Sunday to Thursday, 9:00 AM - 6:00 PM
`,
  },
  {
    title: 'Property Purchase Contract Terms',
    description: 'Standard terms and conditions for property purchase contracts',
    documentType: 'contract',
    category: 'legal',
    fileUrl: 'https://example.com/documents/contract-terms.pdf',
    fileName: 'contract-terms.pdf',
    fileType: 'pdf',
    fileSize: 419430, // 410KB
    language: 'mixed',
    tags: ['contract', 'legal', 'terms'],
    contentText: `
# Property Purchase Contract - Standard Terms and Conditions

## Article 1: Parties
This contract is between:
- The Seller: Real Estate Solutions Company
- The Buyer: As specified in the contract

## Article 2: Property Description
The property sold under this contract includes:
- Property unit as per the specifications
- Common areas and facilities
- Parking space (if applicable)

## Article 3: Purchase Price and Payment
- Total Purchase Price: As specified in contract
- Payment Method: As per selected payment plan
- Currency: Egyptian Pounds (EGP)

## Article 4: Delivery Terms
- Delivery Date: As specified in contract or project timeline
- Condition: Property will be delivered in finished condition as per specifications
- Delay Penalties: Seller is responsible for delays beyond control

## Article 5: Buyer Obligations
- Pay all installments on time
- Provide required documentation
- Pay registration fees and taxes
- Maintain property in good condition

## Article 6: Seller Obligations
- Deliver property on agreed date
- Provide clear property title
- Complete all finishing work as specified
- Provide warranty as per contract

## Article 7: Warranties
- Structural Warranty: 10 years
- Finishing Warranty: 2 years
- Electrical and Plumbing: 1 year

## Article 8: Cancellation Policy
- Before 25% payment: 100% refund minus administrative fees
- Between 25-50% payment: 90% refund
- Between 50-75% payment: 80% refund
- After 75% payment: Subject to negotiation

## Article 9: Dispute Resolution
Any disputes will be resolved through:
1. Amicable negotiation
2. Mediation
3. Egyptian courts if necessary

## Article 10: Force Majeure
Neither party is liable for delays due to circumstances beyond their control including natural disasters, government actions, or war.

## Article 11: Contract Language
This contract is written in both Arabic and English. In case of discrepancy, the Arabic version prevails.

For full contract details, please consult with our legal team.
`,
  },
  {
    title: 'New Cairo Properties Brochure',
    description: 'Detailed brochure for properties available in New Cairo',
    documentType: 'brochure',
    category: 'property_info',
    fileUrl: 'https://example.com/documents/new-cairo-brochure.pdf',
    fileName: 'new-cairo-brochure.pdf',
    fileType: 'pdf',
    fileSize: 1048576, // 1MB
    language: 'mixed',
    tags: ['new cairo', 'properties', 'apartments'],
    contentText: `
# New Cairo Luxury Residences

## Location
New Cairo is one of Egypt's most prestigious residential areas, offering modern lifestyle and excellent amenities.

## Available Properties

### Type A: 2-Bedroom Apartments
- Area: 120-140 sqm
- Bedrooms: 2
- Bathrooms: 2
- Living Room: Spacious
- Kitchen: Fully equipped
- Balcony: Large balcony with city view
- Price Range: 2,500,000 - 3,000,000 EGP

### Type B: 3-Bedroom Apartments
- Area: 160-180 sqm
- Bedrooms: 3
- Bathrooms: 2-3
- Living Room: Open plan
- Kitchen: Modern design
- Balcony: 2 balconies
- Price Range: 3,500,000 - 4,200,000 EGP

### Type C: 4-Bedroom Penthouses
- Area: 250-300 sqm
- Bedrooms: 4
- Bathrooms: 3-4
- Living Room: Extra large
- Kitchen: Premium finish
- Terrace: Private rooftop terrace
- Price Range: 6,000,000 - 8,000,000 EGP

## Amenities
- 24/7 Security
- Swimming Pool
- Gym and Fitness Center
- Children's Playground
- Landscaped Gardens
- Shopping Mall nearby
- International Schools
- Medical Centers
- Mosque
- Underground Parking

## Delivery
- Phase 1: Ready to move
- Phase 2: 12 months
- Phase 3: 24 months

## Payment Plans
Multiple flexible payment plans available starting from 10% down payment.

Visit our sales office or contact us for more information.
`,
  },
  {
    title: 'Investment Guide for Foreign Buyers',
    description: 'Complete guide for foreign investors interested in Egyptian real estate',
    documentType: 'guide',
    category: 'company_info',
    fileUrl: 'https://example.com/documents/foreign-investor-guide.pdf',
    fileName: 'foreign-investor-guide.pdf',
    fileType: 'pdf',
    fileSize: 655360, // 640KB
    language: 'en',
    tags: ['investment', 'foreign', 'guide'],
    contentText: `
# Investment Guide for Foreign Buyers

## Why Invest in Egyptian Real Estate?

### Market Advantages
- Growing population and urbanization
- Government support for real estate sector
- Attractive prices compared to regional markets
- High rental yields (6-10% annually)
- Strong capital appreciation potential
- Strategic location connecting Africa, Asia, and Europe

### Legal Framework
Foreign individuals and companies can own property in Egypt with certain conditions:
- Unlimited ownership for residential properties
- Maximum 2 properties per person
- Property must be used for residence, not left vacant
- Cannot exceed 4,000 sqm total area

## Investment Options

### Residential Properties
- Apartments in luxury compounds
- Villas in gated communities
- Penthouses with prime views
- Townhouses for family living

### Commercial Properties
- Office spaces in business districts
- Retail units in shopping centers
- Hotel apartments for rental income

### Off-Plan Investments
- Lower entry prices
- Payment plans during construction
- Capital appreciation upon completion

## Expected Returns

### Rental Yields
- New Cairo: 6-8% annually
- North Coast: 8-10% annually (seasonal)
- Downtown Cairo: 7-9% annually
- 6th of October: 6-7% annually

### Capital Appreciation
Historical appreciation rates: 8-15% per year depending on location

## Process for Foreign Buyers

### Step 1: Property Selection
Work with our team to identify suitable properties based on your budget and goals.

### Step 2: Legal Due Diligence
Our legal team will:
- Verify property ownership
- Check for liens or encumbrances
- Ensure compliance with foreign ownership rules

### Step 3: Purchase Agreement
Sign preliminary purchase agreement and pay deposit.

### Step 4: Contract Signing
Sign final contract with all terms and conditions.

### Step 5: Payment
Make payment according to agreed schedule.

### Step 6: Registration
Register property with Egyptian Real Estate Registry.

## Required Documents
- Valid passport
- Proof of funds (bank statement)
- Address proof from home country
- Marriage certificate (if applicable)
- Company documents (for corporate buyers)

## Taxes and Fees
- Registration Fee: 2.5% of property value
- Stamp Duty: 1.5% of property value
- Real Estate Tax: 10% of annual rental value
- Capital Gains Tax: 2.5% on profit (if sold within 5 years)

## Property Management
We offer comprehensive property management services:
- Tenant finding and screening
- Rent collection
- Maintenance and repairs
- Financial reporting
- Utility management

## Currency and Payments
- All payments in Egyptian Pounds (EGP)
- Currency exchange available through banks
- International bank transfers accepted

## Our Support Services
- Free consultation
- Property tours and inspections
- Legal assistance
- Mortgage facilitation
- After-sales support

Contact our international sales team:
- Email: international@realestate-solutions.com
- Phone: +20 123 456 7890
- WhatsApp: +20 123 456 7890
`,
  },
];

/**
 * Seed documents for testing
 */
export async function seedDocuments() {
  try {
    logger.info('Starting document seeding...');

    // Get first agent from database (or create test agent)
    let agent = await prisma.agent.findFirst();

    if (!agent) {
      logger.info('No agent found, creating test agent...');
      agent = await prisma.agent.create({
        data: {
          email: 'test@realestate.com',
          passwordHash: 'test_hash',
          fullName: 'Test Agent',
          whatsappNumber: '+201234567890',
          status: 'active',
        },
      });
      logger.info('Test agent created', { agentId: agent.id });
    }

    // Clear existing test documents
    const deletedCount = await prisma.document.deleteMany({
      where: { agentId: agent.id },
    });
    logger.info('Cleared existing documents', { count: deletedCount.count });

    // Ingest test documents
    logger.info('Ingesting test documents', { count: TEST_DOCUMENTS.length });

    const results = await documentService.batchIngestDocuments(
      TEST_DOCUMENTS.map(doc => ({
        ...doc,
        agentId: agent!.id,
      }))
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Document seeding completed', {
      total: TEST_DOCUMENTS.length,
      success: successCount,
      failed: failureCount,
    });

    if (failureCount > 0) {
      logger.warn('Some documents failed to ingest', {
        failures: results.filter(r => !r.success).map(r => r.error),
      });
    }

    return { success: true, successCount, failureCount };
  } catch (error) {
    logger.error('Document seeding failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDocuments()
    .then(() => {
      logger.info('Document seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Document seeding failed', { error });
      process.exit(1);
    });
}

