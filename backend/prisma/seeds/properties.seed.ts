/**
 * Seed Properties for Testing
 * Creates sample Egyptian real estate properties
 */

import { prisma } from '../../src/config/prisma-client';
import { embeddingService } from '../../src/services/ai/embedding.service';
import { supabase } from '../../src/config/supabase.config';
import { createServiceLogger } from '../../src/utils/logger';

const logger = createServiceLogger('PropertySeeder');

const SAMPLE_PROPERTIES = [
  {
    projectName: 'Marassi Compound - North Coast',
    developerName: 'Emaar Misr',
    propertyType: 'apartment',
    description: 'Luxurious beachfront apartment in Marassi, North Coast. Modern design with stunning sea views, high-end finishes, and access to world-class amenities including private beach, golf course, and marina.',
    
    // Location
    city: 'North Coast',
    district: 'Sidi Abdel Rahman',
    address: 'Marassi, North Coast',
    latitude: 30.825,
    longitude: 29.238,
    
    // Specifications
    area: 150,
    bedrooms: 3,
    bathrooms: 2,
    floor: 2,
    
    // Pricing
    basePrice: 4500000,
    pricePerMeter: 30000,
    currency: 'EGP',
    
    // Amenities
    amenities: ['Private Beach', 'Swimming Pool', 'Gym', 'Golf Course', 'Marina', 'Security 24/7', 'Landscaped Gardens', 'Kids Area', 'Restaurants'],
    
    // Payment Plans
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 15% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 10,
        installmentYears: 5,
        description: '10% down payment, 5 years installments',
      },
      {
        planName: 'Extended Plan',
        downPaymentPercentage: 5,
        installmentYears: 7,
        description: '5% down payment, 7 years installments',
      },
    ],
    
    // Details
    deliveryDate: new Date('2025-12-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Palm Hills October',
    developerName: 'Palm Hills',
    propertyType: 'villa',
    description: 'Standalone villa in Palm Hills October with private garden and pool. Spacious modern design, premium finishes, and located in a gated community with excellent facilities.',
    
    city: '6th October',
    district: 'Palm Hills',
    address: 'Palm Hills, 6th October City',
    latitude: 29.952,
    longitude: 30.923,
    
    area: 350,
    bedrooms: 4,
    bathrooms: 3,
    floor: 0,
    
    basePrice: 8000000,
    pricePerMeter: 22857,
    currency: 'EGP',
    
    amenities: ['Private Garden', 'Private Pool', 'Garage', 'Security 24/7', 'Club House', 'Sports Facilities', 'Commercial Area', 'Schools Nearby'],
    
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 12% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 15,
        installmentYears: 6,
        description: '15% down payment, 6 years installments',
      },
    ],
    
    deliveryDate: new Date('2026-06-30'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'New Capital - The Waterway',
    developerName: 'Sabbour Consulting',
    propertyType: 'apartment',
    description: 'Modern apartment in New Administrative Capital with stunning views of the Green River. Smart home features, premium finishes, and located in the heart of the new capital.',
    
    city: 'New Administrative Capital',
    district: 'R7',
    address: 'The Waterway, New Capital',
    latitude: 30.033,
    longitude: 31.733,
    
    area: 180,
    bedrooms: 3,
    bathrooms: 2,
    floor: 5,
    
    basePrice: 5400000,
    pricePerMeter: 30000,
    currency: 'EGP',
    
    amenities: ['Green River View', 'Smart Home', 'Swimming Pool', 'Gym', 'Underground Parking', 'Security 24/7', 'Commercial Area', 'Medical Center'],
    
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 10% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 10,
        installmentYears: 8,
        description: '10% down payment, 8 years installments',
      },
      {
        planName: 'Extended Plan',
        downPaymentPercentage: 5,
        installmentYears: 10,
        description: '5% down payment, 10 years installments',
      },
    ],
    
    deliveryDate: new Date('2027-12-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Eastown Residences - New Cairo',
    developerName: 'Sodic',
    propertyType: 'apartment',
    description: 'Contemporary apartment in Sodic Eastown, New Cairo. Open-plan living spaces, high ceilings, and access to vibrant community with retail and dining options.',
    
    city: 'New Cairo',
    district: 'Eastown',
    address: 'Sodic Eastown, New Cairo',
    latitude: 30.013,
    longitude: 31.486,
    
    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    floor: 3,
    
    basePrice: 3600000,
    pricePerMeter: 30000,
    currency: 'EGP',
    
    amenities: ['Swimming Pool', 'Gym', 'Retail Area', 'Restaurants', 'Cafes', 'Security 24/7', 'Landscaped Gardens', 'Jogging Track'],
    
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 10% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 20,
        installmentYears: 5,
        description: '20% down payment, 5 years installments',
      },
    ],
    
    deliveryDate: new Date('2025-06-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Mountain View iCity',
    developerName: 'Mountain View',
    propertyType: 'townhouse',
    description: 'Smart townhouse in Mountain View iCity, New Capital. Innovative design with smart home technology, private garden, and roof terrace.',
    
    city: 'New Administrative Capital',
    district: 'R7',
    address: 'Mountain View iCity, New Capital',
    latitude: 30.028,
    longitude: 31.728,
    
    area: 250,
    bedrooms: 3,
    bathrooms: 3,
    floor: 0,
    
    basePrice: 6500000,
    pricePerMeter: 26000,
    currency: 'EGP',
    
    amenities: ['Private Garden', 'Roof Terrace', 'Smart Home', 'Security 24/7', 'Club House', 'Swimming Pool', 'Sports Facilities', 'Commercial Area'],
    
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 12% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 10,
        installmentYears: 7,
        description: '10% down payment, 7 years installments',
      },
    ],
    
    deliveryDate: new Date('2026-12-31'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Telal El Sokhna',
    developerName: 'Roaya Group',
    propertyType: 'chalet',
    description: 'Beachfront chalet in Ain Sokhna with direct sea access. Perfect for summer getaways with stunning Red Sea views and resort-style amenities.',
    
    city: 'Ain Sokhna',
    district: 'Telal',
    address: 'Telal Resort, Ain Sokhna',
    latitude: 29.602,
    longitude: 32.345,
    
    area: 100,
    bedrooms: 2,
    bathrooms: 1,
    floor: 1,
    
    basePrice: 2500000,
    pricePerMeter: 25000,
    currency: 'EGP',
    
    amenities: ['Beach Access', 'Swimming Pool', 'Gym', 'Restaurants', 'Security 24/7', 'Water Sports', 'Kids Area', 'Parking'],
    
    paymentPlans: [
      {
        planName: 'Cash Payment',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Pay full amount upfront with 15% discount',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 10,
        installmentYears: 4,
        description: '10% down payment, 4 years installments',
      },
    ],
    
    deliveryDate: new Date('2025-03-31'),
    finishingType: 'fully_finished',
    furnished: true,
    status: 'available',
    isActive: true,
  },
];

async function seedProperties() {
  try {
    logger.info('Starting property seeding...');
    
    // Get the first agent from the database
    const agent = await prisma.agent.findFirst();
    
    if (!agent) {
      logger.error('No agent found in database. Please create an agent first.');
      return;
    }
    
    logger.info(`Using agent: ${agent.fullName} (${agent.id})`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const propertyData of SAMPLE_PROPERTIES) {
      try {
        logger.info(`Processing property: ${propertyData.projectName}`);
        
        // Create embedding text for vector search
        const embeddingText = `${propertyData.projectName} ${propertyData.developerName} ${propertyData.propertyType} ${propertyData.city} ${propertyData.district} ${propertyData.description} ${propertyData.amenities.join(' ')}`;
        
        logger.info('Generating embedding...');
        const embeddingArray = await embeddingService.generateEmbedding(embeddingText);
        const embeddingString = `[${embeddingArray.join(',')}]`;
        
        logger.info('Creating property in database...');
        
        // Calculate monthly payments for each plan
        const paymentPlansWithMonthly = propertyData.paymentPlans.map(plan => {
          const downPayment = (propertyData.basePrice * plan.downPaymentPercentage) / 100;
          const remainingAmount = propertyData.basePrice - downPayment;
          const monthlyPayment = plan.installmentYears > 0 
            ? remainingAmount / (plan.installmentYears * 12)
            : 0;
          
          return {
            planName: plan.planName,
            downPaymentPercentage: plan.downPaymentPercentage,
            installmentYears: plan.installmentYears,
            monthlyPayment: monthlyPayment,
            description: plan.description,
          };
        });
        
        const property = await prisma.property.create({
          data: {
            agentId: agent.id,
            projectName: propertyData.projectName,
            developerName: propertyData.developerName,
            propertyType: propertyData.propertyType,
            description: propertyData.description,
            city: propertyData.city,
            district: propertyData.district,
            address: propertyData.address,
            latitude: propertyData.latitude,
            longitude: propertyData.longitude,
            area: propertyData.area,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            floors: propertyData.floor,
            basePrice: propertyData.basePrice,
            pricePerMeter: propertyData.pricePerMeter,
            currency: propertyData.currency,
            amenities: propertyData.amenities,
            paymentPlans: {
              create: paymentPlansWithMonthly,
            },
            deliveryDate: propertyData.deliveryDate,
            status: propertyData.status,
            embeddingText: embeddingText,
            images: [],
            documents: [],
          },
        });
        
        logger.info('Storing embedding in Supabase...');
        const { error } = await supabase
          .from('properties')
          .update({ embedding: embeddingString })
          .eq('id', property.id);
        
        if (error) {
          logger.error('Supabase embedding error', { error });
        } else {
          logger.info('Property ingested successfully', {
            id: property.id,
            name: property.projectName,
          });
          successCount++;
        }
        
      } catch (error) {
        logger.error(`Failed to ingest property: ${propertyData.projectName}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failureCount++;
      }
    }
    
    logger.info('Property seeding completed', {
      total: SAMPLE_PROPERTIES.length,
      successCount,
      failureCount,
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('PROPERTY SEEDING COMPLETED');
    console.log('='.repeat(60));
    console.log(`✅ Successfully seeded: ${successCount} properties`);
    console.log(`❌ Failed: ${failureCount} properties`);
    console.log('='.repeat(60));
    
  } catch (error) {
    logger.error('Fatal error during property seeding', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedProperties();

