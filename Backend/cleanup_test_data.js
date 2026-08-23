import prisma from "./lib/prisma.js";

async function main() {
  console.log("=== Scanning for test asset requests and test records ===");

  // 1. Find and delete asset requests with 'test' or specific test reasons
  const testAssetRequests = await prisma.assetrequest.findMany({
    where: {
      OR: [
        { reason: { contains: "test" } },
        { reason: { contains: "Testing" } },
        { reason: { contains: "ទុកលេងហ្គេម" } },
        { reason: { contains: "អត់ទូរស័ព្ទប្រើ" } },
      ],
    },
  });

  console.log(`Found ${testAssetRequests.length} test asset requests.`);
  for (const r of testAssetRequests) {
    console.log(`- Deleting Request ID: ${r.id}, Reason: "${r.reason}", Status: ${r.status}`);
    await prisma.assetrequest.delete({ where: { id: r.id } });
  }

  // 2. Scan and delete test leave records
  const testLeaves = await prisma.leaverecord.findMany({
    where: {
      OR: [
        { reason: { contains: "test" } },
        { reason: { contains: "testing" } },
      ],
    },
  });
  console.log(`Found ${testLeaves.length} test leave records.`);
  for (const l of testLeaves) {
    console.log(`- Deleting Leave ID: ${l.id}, Reason: "${l.reason}"`);
    await prisma.leaverecord.delete({ where: { id: l.id } });
  }

  // 3. Scan and delete test overtime records
  const testOTs = await prisma.overtime.findMany({
    where: {
      OR: [
        { reason: { contains: "test" } },
        { reason: { contains: "testing" } },
      ],
    },
  });
  console.log(`Found ${testOTs.length} test overtime records.`);
  for (const ot of testOTs) {
    console.log(`- Deleting OT ID: ${ot.id}, Reason: "${ot.reason}"`);
    await prisma.overtime.delete({ where: { id: ot.id } });
  }

  // 4. Scan and delete test announcements
  const testAnnouncements = await prisma.announcement.findMany({
    where: {
      OR: [
        { title: { contains: "test" } },
        { content: { contains: "test" } },
      ],
    },
  });
  console.log(`Found ${testAnnouncements.length} test announcements.`);
  for (const a of testAnnouncements) {
    console.log(`- Deleting Announcement ID: ${a.id}, Title: "${a.title}"`);
    await prisma.announcement.delete({ where: { id: a.id } });
  }

  console.log("=== Clean up completed successfully! ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
