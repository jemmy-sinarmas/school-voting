import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AdminRole } from "@school-voting/shared";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const key = arg("key");
  const newPassword = arg("password");
  const expectedKey = process.env.SUPER_ADMIN_RESET_KEY;

  if (!expectedKey) {
    throw new Error("SUPER_ADMIN_RESET_KEY is not set in the environment — refusing to run.");
  }
  if (key !== expectedKey) {
    throw new Error("--key did not match SUPER_ADMIN_RESET_KEY — refusing to reset.");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error(
      "Usage: pnpm reset-super-admin-password --key=<SUPER_ADMIN_RESET_KEY> --password=<newPassword, min 8 chars>",
    );
  }

  const superAdmin = await prisma.admin.findFirst({ where: { role: AdminRole.SUPER_ADMIN } });
  if (!superAdmin) {
    throw new Error("No super admin account exists.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: superAdmin.id }, data: { passwordHash } });
  console.log(`Password reset for super admin ${superAdmin.email}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
