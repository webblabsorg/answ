const { PrismaClient } = require('@prisma/client');

try {
  const prisma = new PrismaClient();
  const delegates = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  
  console.log('✅ Prisma Client loaded successfully');
  console.log('📋 Available models:', delegates.join(', '));
  
  if (!delegates.includes('peerReview')) {
    console.error('❌ ERROR: peerReview model not found!');
    process.exit(1);
  }
  
  console.log('✅ All required models present');
  process.exit(0);
} catch (error) {
  console.error('❌ Prisma Client failed to load:', error.message);
  process.exit(1);
}
