// path: apps/web/scripts/reset-admin.ts
// purpose: Emergency script: deletes every admin account, session and two-factor record so the first-run page at /r/c/vadmin can create a new admin. Run it only if you are locked out.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
await db.session.deleteMany();
await db.twoFactor.deleteMany();
await db.account.deleteMany();
await db.verification.deleteMany();
const { count } = await db.user.deleteMany();
console.log(`Removed ${count} admin account(s). Open /r/c/vadmin to create a new one.`);
await db.$disconnect();
