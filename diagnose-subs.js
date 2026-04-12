const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function diagnose() {
  const subs = await prisma.subscription.findMany({
    include: { user: { select: { email: true } }, subscriptionPlan: { select: { planName: true } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n=== SUBSCRIPTION DIAGNOSIS ===\n');
  
  subs.forEach(sub => {
    const now = new Date();
    const isExpired = sub.expiresAt < now;
    const timeUntilExpire = sub.expiresAt - now;
    const minutesLeft = Math.floor(timeUntilExpire / 1000 / 60);
    
    console.log(`User: ${sub.user.email}`);
    console.log(`  Plan: ${sub.subscriptionPlan.planName}`);
    console.log(`  Platform: ${sub.platform}`);
    console.log(`  DB isActive: ${sub.isActive}`);
    console.log(`  Actual isActive (expiry > now): ${!isExpired}`);
    console.log(`  Expires At: ${sub.expiresAt.toISOString()}`);
    console.log(`  MISMATCH: ${sub.isActive !== !isExpired ? 'YES - DB state incorrect' : 'No'}`);
    console.log(`  Status: ${isExpired ? `EXPIRED ${Math.abs(minutesLeft)} mins ago` : `ACTIVE for ${minutesLeft} mins`}`);
    console.log('');
  });

  prisma.$disconnect();
}

diagnose().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
});
