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
    description:
      'Luxurious beachfront apartment in Marassi, North Coast. Modern design with stunning sea views, high-end finishes, and access to world-class amenities including private beach, golf course, and marina.',

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
    amenities: [
      'Private Beach',
      'Swimming Pool',
      'Gym',
      'Golf Course',
      'Marina',
      'Security 24/7',
      'Landscaped Gardens',
      'Kids Area',
      'Restaurants',
    ],

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
    description:
      'Standalone villa in Palm Hills October with private garden and pool. Spacious modern design, premium finishes, and located in a gated community with excellent facilities.',

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

    amenities: [
      'Private Garden',
      'Private Pool',
      'Garage',
      'Security 24/7',
      'Club House',
      'Sports Facilities',
      'Commercial Area',
      'Schools Nearby',
    ],

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
    description:
      'Modern apartment in New Administrative Capital with stunning views of the Green River. Smart home features, premium finishes, and located in the heart of the new capital.',

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

    amenities: [
      'Green River View',
      'Smart Home',
      'Swimming Pool',
      'Gym',
      'Underground Parking',
      'Security 24/7',
      'Commercial Area',
      'Medical Center',
    ],

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
    description:
      'Contemporary apartment in Sodic Eastown, New Cairo. Open-plan living spaces, high ceilings, and access to vibrant community with retail and dining options.',

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

    amenities: [
      'Swimming Pool',
      'Gym',
      'Retail Area',
      'Restaurants',
      'Cafes',
      'Security 24/7',
      'Landscaped Gardens',
      'Jogging Track',
    ],

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
    description:
      'Smart townhouse in Mountain View iCity, New Capital. Innovative design with smart home technology, private garden, and roof terrace.',

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

    amenities: [
      'Private Garden',
      'Roof Terrace',
      'Smart Home',
      'Security 24/7',
      'Club House',
      'Swimming Pool',
      'Sports Facilities',
      'Commercial Area',
    ],

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
    description:
      'Beachfront chalet in Ain Sokhna with direct sea access. Perfect for summer getaways with stunning Red Sea views and resort-style amenities.',

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

    amenities: [
      'Beach Access',
      'Swimming Pool',
      'Gym',
      'Restaurants',
      'Security 24/7',
      'Water Sports',
      'Kids Area',
      'Parking',
    ],

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
  // NEW ZAYED AND SHEIKH ZAYED PROPERTIES
  {
    projectName: 'Aeon Towers - New Zayed',
    developerName: 'Aeon Developments',
    propertyType: 'apartment',
    description:
      'Modern 2-bedroom apartment in the heart of New Zayed City. Features contemporary design, smart home systems, and stunning city views. Close to major roads, schools, and shopping centers.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Aeon Towers, Central New Zayed',
    latitude: 30.021,
    longitude: 30.971,

    area: 130,
    bedrooms: 2,
    bathrooms: 2,
    floor: 8,

    basePrice: 2800000,
    pricePerMeter: 21538,
    currency: 'EGP',

    amenities: [
      'Swimming Pool',
      'Gym',
      'Smart Home',
      'Security 24/7',
      'Underground Parking',
      'Landscaped Gardens',
      'Kids Area',
      'Retail Area',
    ],

    paymentPlans: [
      {
        planName: 'Cash Discount',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Full payment with 10% discount - Final price: 2,520,000 EGP',
      },
      {
        planName: 'Standard Plan',
        downPaymentPercentage: 15,
        installmentYears: 5,
        description: '15% down payment (420,000 EGP), 5 years installments',
      },
      {
        planName: 'Extended Plan',
        downPaymentPercentage: 10,
        installmentYears: 7,
        description: '10% down payment (280,000 EGP), 7 years installments',
      },
    ],

    deliveryDate: new Date('2025-09-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Green Square - New Zayed',
    developerName: 'Hassan Allam Properties',
    propertyType: 'apartment',
    description:
      'Spacious 2-bedroom apartment in Green Square compound, New Zayed. Family-friendly community with excellent amenities and green spaces. Perfect for young families.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Green Square, New Zayed City',
    latitude: 30.018,
    longitude: 30.968,

    area: 145,
    bedrooms: 2,
    bathrooms: 2,
    floor: 4,

    basePrice: 3200000,
    pricePerMeter: 22069,
    currency: 'EGP',

    amenities: [
      'Swimming Pool',
      'Gym',
      'Kids Area',
      'Security 24/7',
      'Parking',
      'Green Spaces',
      'Playground',
      'Cafes',
      'Supermarket',
    ],

    paymentPlans: [
      {
        planName: 'Quick Buy',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Full cash payment with 12% discount',
      },
      {
        planName: 'Standard',
        downPaymentPercentage: 20,
        installmentYears: 6,
        description: '20% down, 6 years installments',
      },
    ],

    deliveryDate: new Date('2025-12-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'The Address Sheikh Zayed',
    developerName: 'Emaar Misr',
    propertyType: 'apartment',
    description:
      'Luxury 3-bedroom apartment in The Address, Sheikh Zayed. Premium finishes, hotel-like amenities, and prestigious location. Ready to move.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'The Address, Sheikh Zayed City',
    latitude: 30.026,
    longitude: 30.978,

    area: 180,
    bedrooms: 3,
    bathrooms: 2,
    floor: 12,

    basePrice: 5400000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Concierge Service',
      'Swimming Pool',
      'Spa',
      'Gym',
      'Security 24/7',
      'Valet Parking',
      'Business Center',
      'Restaurants',
      'Hotel Management',
    ],

    paymentPlans: [
      {
        planName: 'Premium Cash',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Full payment with 8% discount',
      },
      {
        planName: 'Flexible Plan',
        downPaymentPercentage: 25,
        installmentYears: 4,
        description: '25% down payment, 4 years installments',
      },
    ],

    deliveryDate: new Date('2025-03-31'),
    finishingType: 'fully_finished',
    furnished: true,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Zed Towers - Sheikh Zayed',
    developerName: 'Ora Developers',
    propertyType: 'apartment',
    description:
      'Ultra-modern 2-bedroom apartment in iconic Zed Towers. Smart home features, breathtaking views, and world-class amenities in Sheikh Zayed.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'Zed Towers, Sheikh Zayed',
    latitude: 30.029,
    longitude: 30.981,

    area: 140,
    bedrooms: 2,
    bathrooms: 2,
    floor: 15,

    basePrice: 4200000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Smart Home',
      'Infinity Pool',
      'Sky Lounge',
      'Gym',
      'Spa',
      'Security 24/7',
      'Valet Parking',
      'Shopping Mall',
      'Cinema',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 10,
        installmentYears: 8,
        description: '10% down payment, 8 years installments',
      },
      {
        planName: 'Premium',
        downPaymentPercentage: 30,
        installmentYears: 5,
        description: '30% down payment, 5 years installments with lower interest',
      },
    ],

    deliveryDate: new Date('2026-06-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Allegria Residence - Sheikh Zayed',
    developerName: 'Sodic',
    propertyType: 'apartment',
    description:
      "Elegant 2-bedroom apartment in Allegria, one of Sheikh Zayed's most prestigious compounds. Golf course views and luxury lifestyle.",

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'Allegria, Sheikh Zayed',
    latitude: 30.024,
    longitude: 30.975,

    area: 155,
    bedrooms: 2,
    bathrooms: 2,
    floor: 6,

    basePrice: 4650000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Golf Course',
      'Swimming Pool',
      'Gym',
      'Tennis Courts',
      'Security 24/7',
      'Club House',
      'Restaurants',
      'Retail Area',
      'Medical Center',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 20,
        installmentYears: 5,
        description: '20% down payment, 5 years installments',
      },
    ],

    deliveryDate: new Date('2025-08-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Westown Residences - Sheikh Zayed',
    developerName: 'Sodic',
    propertyType: 'apartment',
    description:
      'Contemporary 2-bedroom apartment in Westown, Sheikh Zayed. Modern living with vibrant community atmosphere, retail outlets, and dining options.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'Westown, Sheikh Zayed',
    latitude: 30.022,
    longitude: 30.973,

    area: 135,
    bedrooms: 2,
    bathrooms: 2,
    floor: 7,

    basePrice: 3900000,
    pricePerMeter: 28889,
    currency: 'EGP',

    amenities: [
      'Swimming Pool',
      'Gym',
      'Retail Area',
      'Restaurants',
      'Cafes',
      'Security 24/7',
      'Underground Parking',
      'Kids Area',
    ],

    paymentPlans: [
      {
        planName: 'Cash',
        downPaymentPercentage: 100,
        installmentYears: 0,
        description: 'Full cash payment with 10% discount',
      },
      {
        planName: 'Standard',
        downPaymentPercentage: 15,
        installmentYears: 6,
        description: '15% down, 6 years installments',
      },
    ],

    deliveryDate: new Date('2025-11-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Hyde Park New Zayed',
    developerName: 'Hyde Park Developments',
    propertyType: 'apartment',
    description:
      'Luxurious 3-bedroom apartment in Hyde Park New Zayed. Green living concept with extensive parks, lakes, and premium amenities.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Hyde Park, New Zayed',
    latitude: 30.019,
    longitude: 30.969,

    area: 200,
    bedrooms: 3,
    bathrooms: 3,
    floor: 10,

    basePrice: 6000000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Central Park',
      'Lakes',
      'Swimming Pool',
      'Gym',
      'Sports Club',
      'Security 24/7',
      'Shopping Mall',
      'International Schools',
      'Medical Center',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 10,
        installmentYears: 8,
        description: '10% down payment, 8 years installments',
      },
      {
        planName: 'Premium',
        downPaymentPercentage: 20,
        installmentYears: 6,
        description: '20% down payment, 6 years installments',
      },
    ],

    deliveryDate: new Date('2026-12-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Zizinia New Zayed',
    developerName: 'Al Ahly Sabbour',
    propertyType: 'townhouse',
    description:
      'Elegant 3-bedroom townhouse in Zizinia New Zayed. Mediterranean-inspired architecture with private garden and modern finishing.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Zizinia, New Zayed',
    latitude: 30.016,
    longitude: 30.966,

    area: 220,
    bedrooms: 3,
    bathrooms: 3,
    floor: 0,

    basePrice: 5500000,
    pricePerMeter: 25000,
    currency: 'EGP',

    amenities: [
      'Private Garden',
      'Swimming Pool',
      'Gym',
      'Club House',
      'Security 24/7',
      'Commercial Area',
      'Kids Area',
      'Landscaped Gardens',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 15,
        installmentYears: 7,
        description: '15% down payment, 7 years installments',
      },
    ],

    deliveryDate: new Date('2026-09-30'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'The Axis New Zayed',
    developerName: 'Better Home',
    propertyType: 'apartment',
    description:
      'Affordable 2-bedroom apartment in The Axis, New Zayed. Great value for money with good amenities and prime location on the main axis.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'The Axis, New Zayed',
    latitude: 30.02,
    longitude: 30.97,

    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    floor: 5,

    basePrice: 2400000,
    pricePerMeter: 20000,
    currency: 'EGP',

    amenities: ['Swimming Pool', 'Gym', 'Security 24/7', 'Parking', 'Kids Area', 'Retail Shops'],

    paymentPlans: [
      {
        planName: 'Easy Payment',
        downPaymentPercentage: 5,
        installmentYears: 8,
        description: '5% down payment, 8 years installments',
      },
      {
        planName: 'Standard',
        downPaymentPercentage: 10,
        installmentYears: 6,
        description: '10% down payment, 6 years installments',
      },
    ],

    deliveryDate: new Date('2026-03-31'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Beverly Hills Sheikh Zayed',
    developerName: 'Sodic',
    propertyType: 'villa',
    description:
      'Standalone villa in Beverly Hills, Sheikh Zayed. Luxurious living with private pool, garden, and access to prestigious golf course.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'Beverly Hills, Sheikh Zayed',
    latitude: 30.025,
    longitude: 30.976,

    area: 400,
    bedrooms: 4,
    bathrooms: 4,
    floor: 0,

    basePrice: 12000000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Private Pool',
      'Private Garden',
      'Golf Course',
      'Club House',
      'Security 24/7',
      'Sports Facilities',
      'Commercial Area',
      'International Schools',
    ],

    paymentPlans: [
      {
        planName: 'Premium',
        downPaymentPercentage: 20,
        installmentYears: 5,
        description: '20% down payment, 5 years installments',
      },
    ],

    deliveryDate: new Date('2026-06-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Gardenia Springs Sheikh Zayed',
    developerName: 'Palm Hills',
    propertyType: 'apartment',
    description:
      'Garden apartment in Gardenia Springs, Sheikh Zayed. 2 bedrooms with private garden access, perfect for nature lovers.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'Gardenia Springs, Sheikh Zayed',
    latitude: 30.023,
    longitude: 30.974,

    area: 150,
    bedrooms: 2,
    bathrooms: 2,
    floor: 0,

    basePrice: 3800000,
    pricePerMeter: 25333,
    currency: 'EGP',

    amenities: [
      'Garden Access',
      'Swimming Pool',
      'Gym',
      'Security 24/7',
      'Club House',
      'Kids Area',
      'Jogging Track',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 15,
        installmentYears: 6,
        description: '15% down payment, 6 years installments',
      },
    ],

    deliveryDate: new Date('2025-07-31'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Sky Condos New Zayed',
    developerName: 'New Plan Developments',
    propertyType: 'apartment',
    description:
      'High-rise 2-bedroom apartment in Sky Condos, New Zayed. Panoramic views, modern design, and excellent value for investment.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Sky Condos, New Zayed',
    latitude: 30.017,
    longitude: 30.967,

    area: 125,
    bedrooms: 2,
    bathrooms: 2,
    floor: 18,

    basePrice: 2700000,
    pricePerMeter: 21600,
    currency: 'EGP',

    amenities: [
      'Panoramic Views',
      'Swimming Pool',
      'Gym',
      'Security 24/7',
      'High Speed Elevators',
      'Underground Parking',
      'Retail Area',
    ],

    paymentPlans: [
      {
        planName: 'Investor Plan',
        downPaymentPercentage: 20,
        installmentYears: 5,
        description: '20% down payment, 5 years installments',
      },
    ],

    deliveryDate: new Date('2026-12-31'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'O West Sheikh Zayed',
    developerName: 'Orascom Development',
    propertyType: 'apartment',
    description:
      'Smart apartment in O West, Sheikh Zayed. 2 bedrooms with cutting-edge technology, sustainable design, and resort-style amenities.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'O West, Sheikh Zayed',
    latitude: 30.027,
    longitude: 30.979,

    area: 142,
    bedrooms: 2,
    bathrooms: 2,
    floor: 9,

    basePrice: 4100000,
    pricePerMeter: 28873,
    currency: 'EGP',

    amenities: [
      'Smart Home',
      'Swimming Pool',
      'Gym',
      'Spa',
      'Security 24/7',
      'Commercial Hub',
      'International Schools',
      'Medical Center',
      'Bike Paths',
    ],

    paymentPlans: [
      {
        planName: 'Standard',
        downPaymentPercentage: 10,
        installmentYears: 7,
        description: '10% down payment, 7 years installments',
      },
    ],

    deliveryDate: new Date('2027-06-30'),
    finishingType: 'fully_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'Compound 1 New Zayed',
    developerName: 'Wadi Degla Developments',
    propertyType: 'apartment',
    description:
      'Spacious 3-bedroom apartment in prime location, New Zayed. Family-friendly compound with sports facilities and green spaces.',

    city: 'Giza',
    district: 'New Zayed',
    address: 'Compound 1, New Zayed',
    latitude: 30.019,
    longitude: 30.969,

    area: 170,
    bedrooms: 3,
    bathrooms: 2,
    floor: 6,

    basePrice: 4200000,
    pricePerMeter: 24706,
    currency: 'EGP',

    amenities: [
      'Swimming Pool',
      'Gym',
      'Sports Club',
      'Security 24/7',
      'Kids Area',
      'Green Spaces',
      'Retail Shops',
      'Parking',
    ],

    paymentPlans: [
      {
        planName: 'Flexible',
        downPaymentPercentage: 10,
        installmentYears: 7,
        description: '10% down payment, 7 years installments',
      },
    ],

    deliveryDate: new Date('2026-03-31'),
    finishingType: 'semi_finished',
    furnished: false,
    status: 'available',
    isActive: true,
  },
  {
    projectName: 'The Grand Heights Sheikh Zayed',
    developerName: 'Grand Plaza',
    propertyType: 'penthouse',
    description:
      'Luxury penthouse in Sheikh Zayed with private rooftop terrace. 3 bedrooms, stunning views, and premium finishing.',

    city: 'Giza',
    district: 'Sheikh Zayed',
    address: 'The Grand Heights, Sheikh Zayed',
    latitude: 30.028,
    longitude: 30.98,

    area: 280,
    bedrooms: 3,
    bathrooms: 3,
    floor: 20,

    basePrice: 8400000,
    pricePerMeter: 30000,
    currency: 'EGP',

    amenities: [
      'Private Terrace',
      'Jacuzzi',
      'Swimming Pool',
      'Gym',
      'Spa',
      'Security 24/7',
      'Concierge',
      'Valet Parking',
      'Sky Lounge',
    ],

    paymentPlans: [
      {
        planName: 'Premium',
        downPaymentPercentage: 25,
        installmentYears: 5,
        description: '25% down payment, 5 years installments',
      },
    ],

    deliveryDate: new Date('2025-10-31'),
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
        const paymentPlansWithMonthly = propertyData.paymentPlans.map((plan) => {
          const downPayment = (propertyData.basePrice * plan.downPaymentPercentage) / 100;
          const remainingAmount = propertyData.basePrice - downPayment;
          const monthlyPayment =
            plan.installmentYears > 0 ? remainingAmount / (plan.installmentYears * 12) : 0;

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
