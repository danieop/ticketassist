import { prisma } from './src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  await prisma.user.upsert({
    where: { email: 'dev@test.com' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Dev',
      email: 'dev@test.com',
      passwordHash: hash,
      role: 'DEVELOPER'
    }
  });

  await prisma.user.upsert({
    where: { email: 'mentor@test.com' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Mentor',
      email: 'mentor@test.com',
      passwordHash: hash,
      role: 'MENTOR'
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash: hash,
      role: 'ADMIN'
    }
  });
  
  console.log('Test users seeded');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
