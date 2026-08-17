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
}

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
        programme: "Bachelor Of Computer Engineering Technology (Networking System) With Honours",
        semester: "Semester 6",
        instagram: "@zidane_rhmn",
        phoneNumber: "+6012 345 6001",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      {
        name: "Yamal Hakim",
        programme: "Bachelor In Information Technology (Hons.) In Computer System Security",
        semester: "Semester 5",
        instagram: "@yamal_hkm",
        phoneNumber: "+6012 345 6002",
      },
      {
        name: "Xerah Wong",
        programme: "Bachelor Of Multimedia Technology (Hons) In Interactive Multimedia Design",
        semester: "Semester 4",
        instagram: "@xerah_wng",
        phoneNumber: "+6012 345 6003",
      },
      {
        name: "Weera Sundaram",
        programme: "Diploma In Information Technology",
        semester: "Semester 3",
        instagram: "@weera_sndrm",
        phoneNumber: "+6012 345 6004",
      },
      {
        name: "Vikram Nair",
        programme: "Bachelor Of Computer System Engineering Technology (Networking System) With Honours",
        semester: "Semester 6",
        instagram: "@vikram_nr",
        phoneNumber: "+6012 345 6005",
      },
    ],
    uploadRoot,
    placeholderWebp,
  );
  const voteCounts = await castDemoVotes(students, zCandidates, listZ.id, [15, 12, 9, 6, 3]);
  const winners = [...zCandidates]
    .sort((a, b) => (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0))
    .slice(0, 2);
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
    `Seeded closed 2025 List Z with 5 candidates, ${[...voteCounts.values()].reduce((a, b) => a + b, 0)} real votes cast, and 2 published winners (${winners.map((w) => w.fullName).join(", ")})`,
  );

  const listA = await prisma.candidateList.create({
    data: { electionYearId: year2026.id, name: "List A", status: ListStatus.DRAFT },
  });
  await seedCandidates(
    listA.id,
    [
      {
        name: "Albert Chua",
        programme: "Bachelor In Information Technology (Honours) Internet Of Things",
        semester: "Semester 5",
        instagram: "@albert_chua",
        phoneNumber: "+6013 456 7001",
      },
      {
        name: "Bixby Tan",
        programme: "Bachelor Of Multimedia Technology (Hons) In Interactive Multimedia Design",
        semester: "Semester 4",
        instagram: "@bixby_tan",
        phoneNumber: "+6013 456 7002",
      },
      {
        name: "Charles Lim",
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
        programme: "Diploma In Multimedia",
        semester: "Semester 2",
        instagram: "@danny_yeoh",
        phoneNumber: "+6013 456 7004",
      },
      {
        name: "Elisa Wong",
        programme: "Bachelor In Information Technology (Hons.) In Computer System Security",
        semester: "Semester 5",
        instagram: "@elisa_wng",
        phoneNumber: "+6013 456 7005",
      },
      {
        name: "Fiona Raj",
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

async function seedCandidates(candidateListId: string, defs: CandidateDef[], uploadRoot: string, placeholderWebp: Buffer) {
  const candidates = [];
  for (const def of defs) {
    const emailLocal = def.name.toLowerCase().replace(/[^a-z]+/g, ".");
    const candidate = await prisma.candidate.create({
      data: {
        candidateListId,
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

/**
 * Casts real Vote rows so a closed list's tally/results aren't just
 * fabricated winners — `targetCounts[i]` is how many of the 25 demo
 * students vote for `candidates[i]`. Students are assigned front-to-back
 * across candidates (highest-target candidate first) so nobody exceeds the
 * real 2-votes-per-student cap, and returns the actual per-candidate count.
 */
async function castDemoVotes(
  students: { id: string }[],
  candidates: { id: string; fullName: string }[],
  candidateListId: string,
  targetCounts: number[],
) {
  const voteCounts = new Map<string, number>();
  const votesPerStudent = new Map<string, number>();
  let cursor = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const target = targetCounts[i] ?? 0;
    let cast = 0;
    let studentIndex = i === 0 ? 0 : cursor;
    while (cast < target && studentIndex < students.length) {
      const student = students[studentIndex];
      const used = votesPerStudent.get(student.id) ?? 0;
      if (used < 2) {
        await prisma.vote.create({
          data: { studentId: student.id, candidateId: candidate.id, candidateListId },
        });
        votesPerStudent.set(student.id, used + 1);
        voteCounts.set(candidate.id, (voteCounts.get(candidate.id) ?? 0) + 1);
        cast++;
      }
      studentIndex++;
    }
    // Next candidate starts overlapping the tail of this one so students
    // pick up a plausible second choice instead of voting only once.
    cursor = Math.max(0, studentIndex - Math.min(target, 6));
  }

  return voteCounts;
}

async function wipe() {
  await prisma.winner.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.candidate.deleteMany();
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
