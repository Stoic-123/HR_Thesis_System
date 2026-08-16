import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Recruitment (ATS) sample data...");

  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found.");
    return;
  }

  const depts = await prisma.department.findMany({ where: { company_id: company.id } });
  const positions = await prisma.positions.findMany();

  if (!depts.length || !positions.length) {
    console.error("No departments or positions found.");
    return;
  }

  const dept1 = depts[0];
  const pos1 = positions.find(p => p.department_id === dept1.id) || positions[0];

  const dept2 = depts[1] || depts[0];
  const pos2 = positions.find(p => p.department_id === dept2.id) || positions[1] || positions[0];

  // 1. Create Job Postings
  const job1 = await prisma.jobposting.create({
    data: {
      company_id: company.id,
      department_id: dept1.id,
      position_id: pos1.id,
      title: `${pos1.name} (Full-Stack)`,
      description: "We are seeking a talented full-stack engineer proficient in modern web applications, REST APIs, and relational databases.",
      requirements: "• 2+ years experience with Next.js/React & Node.js\n• Strong SQL skills (MySQL/PostgreSQL)\n• Good communication & teamwork",
      employment_type: "FULL_TIME",
      salary_min: 700,
      salary_max: 1400,
      openings_count: 2,
      status: "OPEN",
    }
  });

  const job2 = await prisma.jobposting.create({
    data: {
      company_id: company.id,
      department_id: dept2.id,
      position_id: pos2.id,
      title: `${pos2.name} Specialist`,
      description: "Responsible for core operational workflows, departmental coordination, and stakeholder reporting.",
      requirements: "• Relevant bachelor's degree or equivalent experience\n• Experience in organizational scheduling\n• Fluent in Khmer and English",
      employment_type: "FULL_TIME",
      salary_min: 500,
      salary_max: 950,
      openings_count: 1,
      status: "OPEN",
    }
  });

  console.log("Created Job Postings:", job1.title, ",", job2.title);

  // 2. Create Candidates across various stages
  const sampleCandidates = [
    {
      first_name: "Sokha",
      last_name: "Chan",
      email: "sokha.chan.candidate@example.com",
      phone: "012 345 678",
      job_posting_id: job1.id,
      status: "APPLIED",
      rating: 4,
      notes: "Strong portfolio with 3 GitHub projects in React & Node.js.",
      offered_salary: 800,
    },
    {
      first_name: "Dara",
      last_name: "Vann",
      email: "dara.vann.candidate@example.com",
      phone: "070 998 877",
      job_posting_id: job1.id,
      status: "SCREENING",
      rating: 4,
      notes: "Resume passed initial HR review. Scheduled for technical quiz.",
      offered_salary: 850,
    },
    {
      first_name: "Bopha",
      last_name: "Rath",
      email: "bopha.rath.candidate@example.com",
      phone: "096 112 233",
      job_posting_id: job1.id,
      status: "INTERVIEW",
      rating: 5,
      notes: "Passed coding challenge with 95% score. Technical interview with Team Lead scheduled.",
      interview_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      offered_salary: 950,
    },
    {
      first_name: "Rithy",
      last_name: "Keo",
      email: "rithy.keo.candidate@example.com",
      phone: "088 445 566",
      job_posting_id: job2.id,
      status: "OFFER",
      rating: 5,
      notes: "Final offer letter sent. Awaiting candidate signature.",
      offered_salary: 800,
    },
    {
      first_name: "Monita",
      last_name: "Srun",
      email: "monita.srun.candidate@example.com",
      phone: "077 554 433",
      job_posting_id: job1.id,
      status: "HIRED",
      rating: 5,
      notes: "Offer accepted! Ready for 1-Click Convert to Employee onboarding.",
      offered_salary: 900,
    },
    {
      first_name: "Chanthy",
      last_name: "Ngo",
      email: "chanthy.ngo.candidate@example.com",
      phone: "015 667 788",
      job_posting_id: job2.id,
      status: "REJECTED",
      rating: 2,
      notes: "Did not meet required language proficiency.",
    },
  ];

  for (const c of sampleCandidates) {
    await prisma.candidate.create({
      data: {
        ...c,
        company_id: company.id,
      }
    });
  }

  console.log(`Created ${sampleCandidates.length} sample candidates.`);
  console.log("Recruitment seeding completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
