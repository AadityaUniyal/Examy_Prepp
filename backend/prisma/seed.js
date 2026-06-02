import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'student@exameve.com' },
    update: {},
    create: {
      id: 'mock-student-123',
      name: 'Demo Student',
      email: 'student@exameve.com',
      role: 'STUDENT'
    }
  })
  console.log('Seeded default mock user:', user)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
