/**
 * Setup Verification Script
 * Checks if all components are properly configured and data is seeded
 *
 * Usage: npm run verify-setup
 */

import { prisma } from '../src/config/prisma-client';
import { createServiceLogger } from '../src/utils/logger';

const logger = createServiceLogger('SetupVerification');

async function verifySetup() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Verifying WhatsApp AI Agent Setup');
  console.log('='.repeat(70) + '\n');

  let allGood = true;
  const issues: string[] = [];

  try {
    // Check 1: Agent exists
    console.log('1️⃣  Checking agents...');
    const agentCount = await prisma.agent.count();
    if (agentCount > 0) {
      const agents = await prisma.agent.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
        },
      });
      console.log(`   ✅ ${agentCount} agent(s) found:`);
      agents.forEach((agent) => {
        console.log(`      - ${agent.fullName} (${agent.email}) - Status: ${agent.status}`);
      });
    } else {
      console.log('   ❌ No agents found!');
      issues.push('No agents in database. Run: npm run create-agent');
      allGood = false;
    }
    console.log('');

    // Check 2: Properties
    console.log('2️⃣  Checking properties...');
    const propertyCount = await prisma.property.count();
    if (propertyCount > 0) {
      console.log(`   ✅ ${propertyCount} properties found`);

      // Check New Zayed properties specifically
      const newZayedCount = await prisma.property.count({
        where: {
          OR: [
            { district: { contains: 'New Zayed', mode: 'insensitive' } },
            { district: { contains: 'Sheikh Zayed', mode: 'insensitive' } },
          ],
        },
      });
      console.log(`   ✅ ${newZayedCount} properties in New Zayed/Sheikh Zayed area`);

      // Check 2-bedroom properties
      const twoBedroomCount = await prisma.property.count({
        where: { bedrooms: 2 },
      });
      console.log(`   ✅ ${twoBedroomCount} properties with 2 bedrooms`);

      // Check embeddings
      const withEmbeddings = await prisma.property.count({
        where: {
          AND: [{ embeddingText: { not: null } }, { embeddingText: { not: '' } }],
        },
      });
      const embeddingPercentage = Math.round((withEmbeddings / propertyCount) * 100);

      if (withEmbeddings === propertyCount) {
        console.log(`   ✅ All properties have embeddings (${withEmbeddings}/${propertyCount})`);
      } else if (withEmbeddings > 0) {
        console.log(
          `   ⚠️  ${withEmbeddings}/${propertyCount} properties have embeddings (${embeddingPercentage}%)`
        );
        issues.push('Some properties missing embeddings. Re-run: npm run seed-properties');
      } else {
        console.log(`   ❌ No properties have embeddings!`);
        issues.push('Properties have no embeddings. AI search will not work!');
        allGood = false;
      }

      // Sample some properties
      const sampleProperties = await prisma.property.findMany({
        take: 3,
        select: {
          projectName: true,
          district: true,
          bedrooms: true,
          basePrice: true,
        },
      });

      if (sampleProperties.length > 0) {
        console.log('   📋 Sample properties:');
        sampleProperties.forEach((prop) => {
          console.log(
            `      - ${prop.projectName} (${prop.district}) - ${prop.bedrooms} bed - ${prop.basePrice.toLocaleString()} EGP`
          );
        });
      }
    } else {
      console.log('   ❌ No properties found!');
      issues.push('No properties in database. Run: npm run seed-properties');
      allGood = false;
    }
    console.log('');

    // Check 3: Documents
    console.log('3️⃣  Checking knowledge base documents...');
    const documentCount = await prisma.document.count();
    if (documentCount > 0) {
      console.log(`   ✅ ${documentCount} documents found`);

      const docTypes = await prisma.document.groupBy({
        by: ['documentType'],
        _count: true,
      });

      console.log('   📄 Document types:');
      docTypes.forEach((type) => {
        console.log(`      - ${type.documentType}: ${type._count} document(s)`);
      });
    } else {
      console.log('   ⚠️  No documents found');
      console.log('      Documents enhance AI responses but are optional');
      console.log('      Run: npm run seed-documents');
    }
    console.log('');

    // Check 4: Payment plans
    console.log('4️⃣  Checking payment plans...');
    const paymentPlanCount = await prisma.paymentPlan.count();
    if (paymentPlanCount > 0) {
      console.log(`   ✅ ${paymentPlanCount} payment plans found`);
    } else {
      console.log('   ⚠️  No payment plans found (should be created with properties)');
    }
    console.log('');

    // Check 5: Conversations (optional)
    console.log('5️⃣  Checking conversations...');
    const conversationCount = await prisma.conversation.count();
    if (conversationCount > 0) {
      console.log(`   📊 ${conversationCount} conversation(s) found`);

      const messageCount = await prisma.message.count();
      console.log(`   💬 ${messageCount} message(s) total`);
    } else {
      console.log('   📊 No conversations yet (this is normal for new setup)');
    }
    console.log('');

    // Final verdict
    console.log('='.repeat(70));
    if (allGood && issues.length === 0) {
      console.log('✅ VERIFICATION PASSED!');
      console.log('='.repeat(70));
      console.log('\n🎉 Your WhatsApp AI Agent is ready to use!');
      console.log('\n📋 Ready for:');
      console.log('   ✅ WhatsApp conversations');
      console.log('   ✅ Property searches');
      console.log('   ✅ Lead qualification');
      console.log('   ✅ Agent portal access');
      console.log('\n🚀 Start the server:');
      console.log('   npm run dev');
      console.log('\n🌐 Start the admin portal:');
      console.log('   cd ../admin-portal && npm run dev');
    } else {
      console.log('⚠️  VERIFICATION COMPLETED WITH ISSUES');
      console.log('='.repeat(70));
      if (issues.length > 0) {
        console.log('\n⚠️  Issues found:');
        issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue}`);
        });
      }
      console.log('\n📝 Please fix the issues above and run verification again:');
      console.log('   npm run verify-setup');
    }
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ Verification failed with error:');
    console.error('   ', error instanceof Error ? error.message : 'Unknown error');
    console.log('\n📝 Common causes:');
    console.log('   1. Database not accessible (check DATABASE_URL)');
    console.log('   2. Migrations not run (run: npm run migrate)');
    console.log('   3. Supabase project paused (check Supabase dashboard)');
    console.log('');
    allGood = false;
  } finally {
    await prisma.$disconnect();
  }

  // Exit with appropriate code
  process.exit(allGood ? 0 : 1);
}

// Run verification
verifySetup().catch((error) => {
  logger.error('Verification script error', { error });
  console.error('\n❌ Fatal error during verification:', error);
  process.exit(1);
});
