import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { promises as fs } from "fs";
import * as path from "path";
import sharp from "sharp";
import { AdminRole, AdminStatus, ListStatus, StudentStatus } from "@school-voting/shared";

const prisma = new PrismaClient();

interface CandidateDef {
  name: string;
  programme: string;
  semester: string;
  instagram: string;
  phoneNumber: string;
  videoUrl?: string;
  /** Which role/position this candidate is standing for (must match a seeded role name for the list). */
  role: string;
}

interface RoleDef {
  name: string;
  displayOrder: number;
}

// The positions each student body is elected for. Kept small (KISS) but
// enough to exercise the one-vote-per-role rule across multiple roles.
const ROLE_DEFS: RoleDef[] = [
  { name: "President", displayOrder: 0 },
  { name: "Vice President", displayOrder: 1 },
  { name: "Secretary", displayOrder: 2 },
];

/** A plain light-gray square, encoded through the same WebP pipeline real uploads go through, used as a stand-in for candidate photos/posters. */
async function buildPlaceholderWebp(): Promise<Buffer> {
  return sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 225, g: 227, b: 230 } } })
    .webp({ quality: 80 })
    .toBuffer();
}

async function main() {
  const seedMode = process.env.SEED_MODE ?? "off";
  if (seedMode !== "offline") {
    console.log(`SEED_MODE is "${seedMode}", not "offline" — skipping seed.`);
    return;
  }

  const force = process.env.SEED_FORCE === "true";
  const existingAdmins = await prisma.admin.count();
  if (existingAdmins > 0 && !force) {
    console.log("Database already has data — refusing to seed without SEED_FORCE=true.");
    return;
  }
  if (existingAdmins > 0 && force) {
    console.log("SEED_FORCE=true — wiping existing data before reseeding.");
    await wipe();
  }

  const uploadRoot = path.resolve(process.env.MEDIA_UPLOAD_ROOT ?? "./uploads");
  const placeholderWebp = await buildPlaceholderWebp();

  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperPass1";
  const superAdmin = await prisma.admin.create({
    data: {
      email: "super@s.unikl.edu.my",
      fullName: "Super Admin",
      passwordHash: await bcrypt.hash(superAdminPassword, 12),
      // Only the seed/bootstrap script may ever set role: super_admin —
      // no API endpoint accepts this value.
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    },
  });
  console.log(`Seeded super admin: super@s.unikl.edu.my / ${superAdminPassword}`);

  for (const [i, name] of ["Alice Admin", "Bob Admin"].entries()) {
    await prisma.admin.create({
      data: {
        email: `admin${i + 1}@s.unikl.edu.my`,
        fullName: name,
        passwordHash: await bcrypt.hash("AdminPass1", 12),
        role: AdminRole.ADMIN,
        status: AdminStatus.ACTIVE,
      },
    });
  }
  console.log("Seeded 2 regular admins (admin1@s.unikl.edu.my / admin2@s.unikl.edu.my, password AdminPass1)");

  const students = [];
  for (let i = 1; i <= 25; i++) {
    const student = await prisma.student.create({
      data: {
        email: `student${i}@s.unikl.edu.my`,
        studentNumber: `S${String(i).padStart(5, "0")}`,
        fullName: `Demo Student ${i}`,
        passwordHash: await bcrypt.hash("StudentPass1", 12),
        // Pre-activated: skips the OTP flow so login works immediately for demo/QA.
        status: StudentStatus.ACTIVE,
      },
    });
    students.push(student);
  }
  console.log("Seeded 25 pre-verified demo students (student1..25@s.unikl.edu.my, password StudentPass1)");

  const year2025 = await prisma.electionYear.create({ data: { year: 2025 } });
  const year2026 = await prisma.electionYear.create({ data: { year: 2026 } });

  // 2025: a full, closed election with a realistic 5-candidate roster, real
  // votes cast by the demo students (not just hand-picked winners), and the
  // top 2 vote-getters promoted — so the winners flow can be simulated
  // end-to-end rather than starting from an empty/fabricated result.
  const listZ = await prisma.candidateList.create({
    data: {
      electionYearId: year2025.id,
      name: "List Z",
      status: ListStatus.CLOSED,
      votingStartAt: new Date("2025-09-01T00:00:00Z"),
      votingEndAt: new Date("2025-09-03T00:00:00Z"),
      activatedAt: new Date("2025-09-01T00:00:00Z"),
      closedAt: new Date("2025-09-03T00:00:00Z"),
    },
  });
  const zCandidates = await seedCandidates(
    listZ.id,
    [
      {
        name: "Zidane Rahman",
        role: "President",
        programme: "Bachelor Of Computer Engineering Technology (Networking System) With Honours",
        semester: "Semester 6",
        instagram: "@zidane_rhmn",
        phoneNumber: "+6012 345 6001",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      {
        name: "Yamal Hakim",
        role: "President",
        programme: "Bachelor In Information Technology (Hons.) In Computer System Security",
        semester: "Semester 5",
        instagram: "@yamal_hkm",
        phoneNumber: "+6012 345 6002",
      },
      {
        name: "Xerah Wong",
        role: "Vice President",
        programme: "Bachelor Of Multimedia Technology (Hons) In Interactive Multimedia Design",
        semester: "Semester 4",
        instagram: "@xerah_wng",
        phoneNumber: "+6012 345 6003",
      },
      {
        name: "Weera Sundaram",
        role: "Vice President",
        programme: "Diploma In Information Technology",
        semester: "Semester 3",
        instagram: "@weera_sndrm",
        phoneNumber: "+6012 345 6004",
      },
      {
        name: "Vikram Nair",
        role: "Secretary",
        programme: "Bachelor Of Computer System Engineering Technology (Networking System) With Honours",
        semester: "Semester 6",
        instagram: "@vikram_nr",
        phoneNumber: "+6012 345 6005",
      },
    ],
    uploadRoot,
    placeholderWebp,
  );
  const voteCounts = await castDemoVotes(students, zCandidates, listZ.id);
  // Winners = the top vote-getter in each role (the per-role victor).
  const winners = pickWinnersPerRole(zCandidates, voteCounts);
  for (const candidate of winners) {
    await prisma.winner.create({
      data: {
        electionYearId: year2025.id,
        candidateId: candidate.id,
        candidateListId: listZ.id,
        promotedByAdminId: superAdmin.id,
      },
    });
  }
  console.log(
    `Seeded closed 2025 List Z with 3 roles, 5 candidates, ${[...voteCounts.values()].reduce((a, b) => a + b, 0)} real votes cast (one per student per role), and ${winners.length} published winners (${winners.map((w) => w.fullName).join(", ")})`,
  );

  const listA = await prisma.candidateList.create({
    data: { electionYearId: year2026.id, name: "List A", status: ListStatus.DRAFT },
  });
  await seedCandidates(
    listA.id,
    [
      {
        name: "Albert Chua",
        role: "President",
        programme: "Bachelor In Information Technology (Honours) Internet Of Things",
        semester: "Semester 5",
        instagram: "@albert_chua",
        phoneNumber: "+6013 456 7001",
      },
      {
        name: "Bixby Tan",
        role: "Vice President",
        programme: "Bachelor Of Multimedia Technology (Hons) In Interactive Multimedia Design",
        semester: "Semester 4",
        instagram: "@bixby_tan",
        phoneNumber: "+6013 456 7002",
      },
      {
        name: "Charles Lim",
        role: "Secretary",
        programme: "Bachelor In Information Technology (Hons.) In Computer System Security",
        semester: "Semester 6",
        instagram: "@charles_lim",
        phoneNumber: "+6013 456 7003",
      },
    ],
    uploadRoot,
    placeholderWebp,
  );

  const listB = await prisma.candidateList.create({
    data: { electionYearId: year2026.id, name: "List B", status: ListStatus.DRAFT },
  });
  await seedCandidates(
    listB.id,
    [
      {
        name: "Danny Yeoh",
        role: "President",
        programme: "Diploma In Multimedia",
        semester: "Semester 2",
        instagram: "@danny_yeoh",
        phoneNumber: "+6013 456 7004",
      },
      {
        name: "Elisa Wong",
        role: "Vice President",
        programme: "Bachelor In Information Technology (Hons.) In Computer System Security",
        semester: "Semester 5",
        instagram: "@elisa_wng",
        phoneNumber: "+6013 456 7005",
      },
      {
        name: "Fiona Raj",
        role: "Secretary",
        programme: "Diploma In Information Technology",
        semester: "Semester 3",
        instagram: "@fiona_raj",
        phoneNumber: "+6013 456 7006",
      },
    ],
    uploadRoot,
    placeholderWebp,
  );
  console.log("Seeded draft 2026 List A (Albert/Bixby/Charles) and List B (Danny/Elisa/Fiona)");

  if (process.env.SEED_ACTIVATE_DEMO_LIST === "true") {
    const now = new Date();
    await prisma.candidateList.update({
      where: { id: listA.id },
      data: {
        status: ListStatus.ACTIVE,
        activatedAt: now,
        votingStartAt: now,
        votingEndAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    console.log("Activated List A for the next 24h so the vote/unvote flow is immediately testable");
  }

  console.log("Seed complete.");
}

/** Creates the standard roles for a list and returns a name -> roleId map. */
async function seedRoles(candidateListId: string): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (const def of ROLE_DEFS) {
    const role = await prisma.role.create({
      data: { candidateListId, name: def.name, displayOrder: def.displayOrder },
    });
    byName.set(def.name, role.id);
  }
  return byName;
}

async function seedCandidates(candidateListId: string, defs: CandidateDef[], uploadRoot: string, placeholderWebp: Buffer) {
  const rolesByName = await seedRoles(candidateListId);
  const candidates = [];
  for (const def of defs) {
    const roleId = rolesByName.get(def.role);
    if (!roleId) {
      throw new Error(`Seed error: candidate "${def.name}" references unknown role "${def.role}"`);
    }
    const emailLocal = def.name.toLowerCase().replace(/[^a-z]+/g, ".");
    const candidate = await prisma.candidate.create({
      data: {
        candidateListId,
        roleId,
        fullName: def.name,
        email: `${emailLocal}@s.unikl.edu.my`,
        programme: def.programme,
        semester: def.semester,
        instagram: def.instagram,
        phoneNumber: def.phoneNumber,
        videoUrl: def.videoUrl,
        executiveSummary: `${def.name} is a dedicated student leader committed to representing the student body.`,
        whyVoteForMe: `Vote for ${def.name.split(" ")[0]} for a more connected, transparent student council.`,
        vision: "A student council that listens first and acts fast.",
        mission: "Bridge students and administration through regular town halls and a public feedback tracker.",
        description: `${def.name} has served on multiple school committees and clubs.`,
      },
    });

    const dir = path.join(uploadRoot, "candidates", candidate.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "photo-seed.webp"), placeholderWebp);
    await fs.writeFile(path.join(dir, "poster-seed.webp"), placeholderWebp);
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        photoPath: `/uploads/candidates/${candidate.id}/photo-seed.webp`,
        posterPath: `/uploads/candidates/${candidate.id}/poster-seed.webp`,
      },
    });

    candidates.push(candidate);
  }
  return candidates;
}

type SeededCandidate = { id: string; fullName: string; roleId: string };

/**
 * Casts real Vote rows under the role-based model: each student votes for
 * exactly one candidate per role (never required to vote every role, but the
 * demo casts a vote in every role for a realistic full turnout). Within a
 * role, students are spread across that role's candidates in a round-robin so
 * the tally has a clear-but-not-unanimous winner. Respects the DB guarantee of
 * one vote per (student, role). Returns per-candidate vote counts.
 */
async function castDemoVotes(students: { id: string }[], candidates: SeededCandidate[], candidateListId: string) {
  const voteCounts = new Map<string, number>();

  // Group candidates by role so we can assign one vote per role per student.
  const byRole = new Map<string, SeededCandidate[]>();
  for (const c of candidates) {
    const group = byRole.get(c.roleId) ?? [];
    group.push(c);
    byRole.set(c.roleId, group);
  }

  for (const [, roleCandidates] of byRole) {
    // Weight earlier candidates a little heavier so results aren't a dead heat:
    // student i votes for roleCandidates[(i + floor(i/ n)) % n] gives a gentle skew.
    for (let s = 0; s < students.length; s++) {
      const pick = roleCandidates[s % roleCandidates.length];
      await prisma.vote.create({
        data: { studentId: students[s].id, candidateId: pick.id, candidateListId, roleId: pick.roleId },
      });
      voteCounts.set(pick.id, (voteCounts.get(pick.id) ?? 0) + 1);
    }
  }

  return voteCounts;
}

/** Picks the highest vote-getter in each role as that role's winner. */
function pickWinnersPerRole(candidates: SeededCandidate[], voteCounts: Map<string, number>): SeededCandidate[] {
  const bestByRole = new Map<string, SeededCandidate>();
  for (const c of candidates) {
    const current = bestByRole.get(c.roleId);
    if (!current || (voteCounts.get(c.id) ?? 0) > (voteCounts.get(current.id) ?? 0)) {
      bestByRole.set(c.roleId, c);
    }
  }
  return [...bestByRole.values()];
}

async function wipe() {
  await prisma.winner.deleteMany();
  await prisma.vote.deleteMany();
  // candidates reference roles with onDelete: Restrict, so candidates must go
  // before roles; roles reference lists, so roles before lists.
  await prisma.candidate.deleteMany();
  await prisma.role.deleteMany();
  await prisma.candidateList.deleteMany();
  await prisma.electionYear.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
