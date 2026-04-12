
const { PrismaClient } = require('../generated/prisma');
const fs = require('fs');

async function backup() {
  const prisma = new PrismaClient();
  try {
    const plans = await prisma.subscriptionPlan.findMany();
    fs.writeFileSync('subscription_plans_backup.json', JSON.stringify(plans, null, 2));
    console.log('Backup successful: subscription_plans_backup.json');
  } catch (error) {
    if (error.code === 'P2022') {
      console.log('Column does not exist yet. Assuming no data to backup for NEW columns, but will backup existing ones.');
      // If the NEW column doesn't exist, we can't fetch it. 
      // We should probably try to fetch only existing columns to be safe.
      // But PrismaClient is already generated with the NEW column.
      // A workaround is to use raw SQL to fetch existing columns.
      try {
        const rawPlans = await prisma.$queryRaw`SELECT * FROM "SubscriptionPlan"`;
        fs.writeFileSync('subscription_plans_backup.json', JSON.stringify(rawPlans, null, 2));
        console.log('Raw Backup successful: subscription_plans_backup.json');
      } catch (sqlError) {
        console.error('Failed to backup via SQL:', sqlError);
      }
    } else {
      console.error('Backup failed:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

backup();
