/*
  Seed script: creates test users for local/dev environments.
  Usage:
    DATABASE_URL=postgres://... npm run seed:test-users
  Optional:
    SEED_TEST_PASSWORD=YourPass123! npm run seed:test-users
*/

import { PrismaClient, SubscriptionTier, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  tier?: SubscriptionTier;
};

const SEED_PLAIN = process.env.SEED_TEST_CREDENTIAL ||
  crypto.randomBytes(12).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16);

const USERS: SeedUser[] = [
  { email: 'admin@answly.test', name: 'Admin User', role: 'ADMIN', tier: 'SCALE' },
  { email: 'teacher@answly.test', name: 'Teacher User', role: 'INSTRUCTOR', tier: 'GROW' },
  { email: 'student1@answly.test', name: 'Student One', role: 'TEST_TAKER', tier: 'STARTER' },
  { email: 'student2@answly.test', name: 'Student Two', role: 'TEST_TAKER', tier: 'STARTER' },
  { email: 'reviewer@answly.test', name: 'Reviewer User', role: 'REVIEWER', tier: 'GROW' },
];

async function main() {
  console.log('Seeding test users...');
  const passwordHash = await bcrypt.hash(SEED_PLAIN, 12);

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        // Ensure account stays active and verified; keep existing password if present
        is_active: true,
        is_verified: true,
        role: u.role,
        tier: u.tier || 'STARTER',
      },
      create: {
        email: u.email,
        name: u.name,
        password_hash: passwordHash,
        role: u.role,
        tier: u.tier || 'STARTER',
        is_verified: true,
        is_active: true,
      },
      select: { id: true, email: true, role: true, tier: true },
    });
    console.log(`✔ ${user.email} (${user.role})`);
  }

  console.log('\nLogin test credentials');
  console.log('----------------------');
  console.log(`Email: admin@answly.test  Credential: ${SEED_PLAIN}`);
  console.log(`Email: teacher@answly.test Credential: ${SEED_PLAIN}`);
  console.log(`Email: student1@answly.test Credential: ${SEED_PLAIN}`);
  console.log(`Email: student2@answly.test Credential: ${SEED_PLAIN}`);
  console.log(`Email: reviewer@answly.test Credential: ${SEED_PLAIN}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
