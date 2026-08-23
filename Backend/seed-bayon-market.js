import prisma from "./lib/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("================================================================================");
  console.log("=== [Seeder] Starting HR Data Seeding (Jan 2026 - Present)                   ===");
  console.log("================================================================================");

  // 1. Password Hashes
  const adminPasswordHash = await bcrypt.hash("Admin12345@", 10);
  const userPasswordHash = await bcrypt.hash("User12345@", 10);

  // 2. Fetch Existing Company (READ ONLY - Never Overwrite Company Profile)
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("❌ Error: No existing company found in database. Please configure your company first.");
    process.exit(1);
  }
  console.log(`[1/11] Using existing company: "${company.name}" (ID: ${company.id}) [Profile untouched]`);

  // 3. Time Modes (TimeIn, LunchOut, LunchIn, TimeOut)
  const timeModeNames = ["TimeIn", "LunchOut", "LunchIn", "TimeOut"];
  const timeModeMap = new Map();
  for (const tmName of timeModeNames) {
    let mode = await prisma.timemode.findFirst({
      where: { company_id: company.id, name: tmName },
    });
    if (!mode) {
      mode = await prisma.timemode.create({
        data: { name: tmName, company_id: company.id },
      });
    }
    timeModeMap.set(tmName.toLowerCase(), mode.id);
  }
  console.log(`[2/11] Time Modes verified (TimeIn, LunchOut, LunchIn, TimeOut).`);

  // 4. Locations (Ensure default branch locations exist)
  const locationsData = [
    {
      name: "Main Branch (សាខាធំ)",
      latitude: "11.5683",
      longitude: "104.9189",
      radius: 150,
    },
    {
      name: "Toul Kork Branch (សាខា ទួលគោក)",
      latitude: "11.5835",
      longitude: "104.8967",
      radius: 150,
    },
    {
      name: "Central Warehouse (ឃ្លាំងកណ្តាល)",
      latitude: "11.6020",
      longitude: "104.8723",
      radius: 200,
    },
  ];

  const locationMap = new Map();
  for (const loc of locationsData) {
    let existing = await prisma.location.findFirst({
      where: { company_id: company.id, name: loc.name },
    });
    if (!existing) {
      existing = await prisma.location.create({
        data: { ...loc, company_id: company.id },
      });
    }
    locationMap.set(loc.name, existing.id);
  }
  // Also map any existing location to fallback
  const firstLocation = await prisma.location.findFirst({ where: { company_id: company.id } });
  const defaultLocationId = firstLocation ? firstLocation.id : null;
  console.log(`[3/11] Locations verified.`);

  // 5. Official Cambodian Public Holidays 2026 (ប្រតិទិនឈប់សម្រាកបុណ្យជាតិ-អន្តរជាតិ ឆ្នាំ២០២៦)
  const cambodiaHolidays2026 = [
    { name: "International New Year Day (ទិវាចូលឆ្នាំសកល)", start: "2026-01-01", end: "2026-01-01" },
    { name: "Victory over Genocide Day (ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍)", start: "2026-01-07", end: "2026-01-07" },
    { name: "International Women's Day (ទិវាអន្តរជាតិនារី)", start: "2026-03-08", end: "2026-03-08" },
    { name: "Khmer New Year (ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ)", start: "2026-04-13", end: "2026-04-16" },
    { name: "International Labor Day (ទិវាពលកម្មអន្តរជាតិ)", start: "2026-05-01", end: "2026-05-01" },
    { name: "Visak Bochea Day (ពិធីបុណ្យវិសាខបូជា)", start: "2026-05-02", end: "2026-05-02" },
    { name: "Royal Ploughing Ceremony (ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល)", start: "2026-05-06", end: "2026-05-06" },
    { name: "King Sihamoni's Birthday (ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ)", start: "2026-05-14", end: "2026-05-14" },
    { name: "Queen Mother's Birthday (ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចម៉ែ)", start: "2026-06-18", end: "2026-06-18" },
    { name: "Constitutional Day (ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ)", start: "2026-09-24", end: "2026-09-24" },
    { name: "Pchum Ben Festival (ពិធីបុណ្យភ្ជុំបិណ្ឌ)", start: "2026-10-10", end: "2026-10-12" },
    { name: "Commemoration of Late King Father (ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ)", start: "2026-10-15", end: "2026-10-15" },
    { name: "King's Coronation Day (ព្រះរាជពិធីគ្រងរាជសម្បត្តិ)", start: "2026-10-29", end: "2026-10-29" },
    { name: "National Independence Day (ទិវាបុណ្យឯករាជ្យជាតិ)", start: "2026-11-09", end: "2026-11-09" },
    { name: "Water Festival (ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប)", start: "2026-11-23", end: "2026-11-25" },
  ];

  const holidayDateSet = new Set();
  for (const h of cambodiaHolidays2026) {
    const sDate = new Date(`${h.start}T00:00:00Z`);
    const eDate = new Date(`${h.end}T23:59:59Z`);

    const existingH = await prisma.holiday.findFirst({
      where: { company_id: company.id, name: h.name, start_date: sDate },
    });
    if (!existingH) {
      await prisma.holiday.create({
        data: {
          company_id: company.id,
          name: h.name,
          start_date: sDate,
          end_date: eDate,
        },
      });
    }

    let d = new Date(sDate);
    while (d <= eDate) {
      holidayDateSet.add(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
  }
  console.log(`[4/11] Cambodian Public Holidays verified (${cambodiaHolidays2026.length} holidays / ${holidayDateSet.size} official off-days).`);

  // 6. Roles & RBAC Permissions
  const ALL_PERMISSIONS = [
    { path: "app:web_login", path_name: "Web Dashboard Access" },
    { path: "app:mobile_login", path_name: "Mobile App Access" },
    { path: "announcement:manage", path_name: "Manage Announcements" },
    { path: "recruitment:manage", path_name: "Manage Recruitment & Candidates" },
    { path: "leave:approve", path_name: "Approve Leave Requests" },
    { path: "overtime:approve", path_name: "Approve Overtime Requests" },
    { path: "asset:approve", path_name: "Approve Asset Requests" },
    { path: "payroll:view", path_name: "View Payroll Records" },
    { path: "payroll:manage", path_name: "Generate & Manage Payroll" },
    { path: "role:manage", path_name: "Manage Roles & Permissions" },
    { path: "employee:manage", path_name: "Manage Employees List" },
    { path: "department:manage", path_name: "Manage Departments" },
    { path: "kpi:manage", path_name: "Manage Monthly KPI & Reviews" },
    { path: "chatbot:access", path_name: "Access & Use HR AI Chatbot" },
  ];

  const roleDefinitions = [
    { name: "Admin", perms: ALL_PERMISSIONS.map((p) => p.path) },
    {
      name: "HR Manager",
      perms: [
        "app:web_login",
        "app:mobile_login",
        "announcement:manage",
        "recruitment:manage",
        "leave:approve",
        "overtime:approve",
        "asset:approve",
        "payroll:view",
        "payroll:manage",
        "employee:manage",
        "department:manage",
        "kpi:manage",
        "chatbot:access",
      ],
    },
    {
      name: "Supervisor",
      perms: [
        "app:web_login",
        "app:mobile_login",
        "leave:approve",
        "overtime:approve",
        "asset:approve",
        "kpi:manage",
      ],
    },
    {
      name: "IT Administrator",
      perms: [
        "app:web_login",
        "role:manage",
        "chatbot:access",
      ],
    },
    {
      name: "Employee",
      perms: ["app:mobile_login"],
    },
  ];

  const roleMap = new Map();
  for (const rDef of roleDefinitions) {
    let role = await prisma.role.findFirst({
      where: { company_id: company.id, name: rDef.name },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { name: rDef.name, company_id: company.id },
      });
    }
    roleMap.set(rDef.name, role.id);

    // Sync RBAC
    await prisma.rolebaseaccess.deleteMany({ where: { role_id: role.id } });
    for (const pPath of rDef.perms) {
      const pFound = ALL_PERMISSIONS.find((ap) => ap.path === pPath);
      await prisma.rolebaseaccess.create({
        data: {
          role_id: role.id,
          path: pPath,
          path_name: pFound ? pFound.path_name : pPath,
        },
      });
    }
  }
  console.log(`[5/11] Roles & RBAC Permissions synced (${roleMap.size} roles).`);

  // 7. Departments & Positions (No Duplicates)
  const departmentNames = [
    "General Management",
    "Information Technology",
    "Human Resources & Admin",
    "Store Operations & Sales",
    "Cashier & POS Management",
    "Fresh Food & Butchery",
    "Bakery & Delicatessen",
    "Warehouse & Inventory",
    "Security & Maintenance",
  ];

  const deptMap = new Map();
  for (const dName of departmentNames) {
    let dept = await prisma.department.findFirst({
      where: { company_id: company.id, name: dName },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: dName, company_id: company.id, is_active: true },
      });
    }
    deptMap.set(dName, dept.id);
  }

  const positionsData = [
    { dept: "General Management", name: "General Store Manager" },
    { dept: "Information Technology", name: "IT System Administrator" },
    { dept: "Human Resources & Admin", name: "HR & Payroll Manager" },
    { dept: "Human Resources & Admin", name: "HR & Recruitment Officer" },
    { dept: "Store Operations & Sales", name: "Floor Operations Supervisor" },
    { dept: "Store Operations & Sales", name: "Sales & Customer Assistant" },
    { dept: "Cashier & POS Management", name: "Head Cashier Supervisor" },
    { dept: "Cashier & POS Management", name: "Cashier Staff" },
    { dept: "Fresh Food & Butchery", name: "Fresh Produce & Meat Supervisor" },
    { dept: "Fresh Food & Butchery", name: "Butcher & Meat Cutter" },
    { dept: "Fresh Food & Butchery", name: "Fresh Produce Associate" },
    { dept: "Bakery & Delicatessen", name: "Head Baker / Pastry Supervisor" },
    { dept: "Bakery & Delicatessen", name: "Assistant Baker" },
    { dept: "Warehouse & Inventory", name: "Warehouse & Stock Controller" },
    { dept: "Warehouse & Inventory", name: "Warehouse & Forklift Handler" },
    { dept: "Security & Maintenance", name: "Chief Security Supervisor" },
    { dept: "Security & Maintenance", name: "Security Guard" },
    { dept: "Security & Maintenance", name: "Store Housekeeper / Cleaner" },
  ];

  const posMap = new Map();
  for (const p of positionsData) {
    const dId = deptMap.get(p.dept);
    let pos = await prisma.positions.findFirst({
      where: { department_id: dId, name: p.name },
    });
    if (!pos) {
      pos = await prisma.positions.create({
        data: { name: p.name, department_id: dId, is_active: true },
      });
    }
    posMap.set(p.name, pos.id);
  }
  console.log(`[6/11] Departments and Positions verified.`);

  // 8. Leave Types
  const leaveTypesData = [
    { name: "Annual Leave", code: "AL", default_balance: 18 },
    { name: "Sick Leave", code: "SL", default_balance: 7 },
    { name: "Maternity Leave", code: "ML", default_balance: 90 },
    { name: "Special Leave", code: "SPL", default_balance: 3 },
  ];

  const leaveTypeMap = new Map();
  for (const lt of leaveTypesData) {
    let existing = await prisma.leavetype.findFirst({
      where: { company_id: company.id, name: lt.name },
    });
    if (!existing) {
      existing = await prisma.leavetype.create({
        data: {
          company_id: company.id,
          name: lt.name,
          code: lt.code,
          default_balance: lt.default_balance,
        },
      });
    }
    leaveTypeMap.set(lt.name, existing);
  }

  // 9. Employees Dataset
  const employeesDataset = [
    // 1. General Manager (Admin / Owner - No Salary, Exempt Attendance)
    {
      firstName: "Chantha",
      lastName: "Sok",
      gender: "male",
      age: 38,
      phone: "012888111",
      email: "chantha.sok@company.com.kh",
      address: "#12, St. 118, Sangkat Mittapheap, Khan 7 Makara, Phnom Penh",
      dept: "General Management",
      pos: "General Store Manager",
      role: "Admin",
      baseSalary: "0",
      username: "Chantha Sok",
      passwordHash: adminPasswordHash,
      isManagerOfDept: "General Management",
      location: "Main Branch (សាខាធំ)",
    },
    // 2. HR & Payroll Manager (HR)
    {
      firstName: "Sreypov",
      lastName: "Chea",
      gender: "female",
      age: 32,
      phone: "012888222",
      email: "sreypov.chea@company.com.kh",
      address: "#45, St. 271, Sangkat Teuk Thla, Khan Sen Sok, Phnom Penh",
      dept: "Human Resources & Admin",
      pos: "HR & Payroll Manager",
      role: "HR Manager",
      baseSalary: "750",
      username: "Sreypov Chea",
      passwordHash: adminPasswordHash,
      isManagerOfDept: "Human Resources & Admin",
      location: "Main Branch (សាខាធំ)",
    },
    // 3. IT System Administrator (IT)
    {
      firstName: "Vireak",
      lastName: "Som",
      gender: "male",
      age: 29,
      phone: "012888999",
      email: "vireak.som@company.com.kh",
      address: "#33, St. 2004, Sangkat Kakab, Khan Por Senchey, Phnom Penh",
      dept: "Information Technology",
      pos: "IT System Administrator",
      role: "IT Administrator",
      baseSalary: "650",
      username: "Vireak Som",
      passwordHash: adminPasswordHash,
      isManagerOfDept: "Information Technology",
      location: "Main Branch (សាខាធំ)",
    },
    // 4. HR Officer
    {
      firstName: "Moniroth",
      lastName: "Keo",
      gender: "female",
      age: 26,
      phone: "010777123",
      email: "moniroth.keo@company.com.kh",
      address: "#88, St. 315, Sangkat Boeung Kak 1, Khan Toul Kork, Phnom Penh",
      dept: "Human Resources & Admin",
      pos: "HR & Recruitment Officer",
      role: "HR Manager",
      baseSalary: "450",
      username: "Moniroth Keo",
      passwordHash: adminPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    // 4. Floor Operations Supervisor
    {
      firstName: "Piseth",
      lastName: "Heng",
      gender: "male",
      age: 31,
      phone: "097888333",
      email: "piseth.heng@company.com.kh",
      address: "#19, St. 598, Sangkat Chrang Chamreh, Khan Russey Keo, Phnom Penh",
      dept: "Store Operations & Sales",
      pos: "Floor Operations Supervisor",
      role: "Supervisor",
      baseSalary: "500",
      username: "Piseth Heng",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Store Operations & Sales",
      location: "Main Branch (សាខាធំ)",
    },
    // 5. Head Cashier Supervisor
    {
      firstName: "Sophea",
      lastName: "Meas",
      gender: "female",
      age: 29,
      phone: "011999444",
      email: "sophea.meas@company.com.kh",
      address: "#24, St. 134, Sangkat Veal Vong, Khan 7 Makara, Phnom Penh",
      dept: "Cashier & POS Management",
      pos: "Head Cashier Supervisor",
      role: "Supervisor",
      baseSalary: "420",
      username: "Sophea Meas",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Cashier & POS Management",
      location: "Main Branch (សាខាធំ)",
    },
    // 6. Fresh Produce Supervisor
    {
      firstName: "Visal",
      lastName: "Rith",
      gender: "male",
      age: 34,
      phone: "015222555",
      email: "visal.rith@company.com.kh",
      address: "#56, St. 2004, Sangkat Kakab, Khan Por Senchey, Phnom Penh",
      dept: "Fresh Food & Butchery",
      pos: "Fresh Produce & Meat Supervisor",
      role: "Supervisor",
      baseSalary: "450",
      username: "Visal Rith",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Fresh Food & Butchery",
      location: "Main Branch (សាខាធំ)",
    },
    // 7. Head Baker Supervisor
    {
      firstName: "Seyha",
      lastName: "Vuthy",
      gender: "male",
      age: 33,
      phone: "089666777",
      email: "seyha.vuthy@company.com.kh",
      address: "#102, St. 150, Sangkat Toek Laak 2, Khan Toul Kork, Phnom Penh",
      dept: "Bakery & Delicatessen",
      pos: "Head Baker / Pastry Supervisor",
      role: "Supervisor",
      baseSalary: "480",
      username: "Seyha Vuthy",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Bakery & Delicatessen",
      location: "Toul Kork Branch (សាខា ទួលគោក)",
    },
    // 8. Warehouse Supervisor
    {
      firstName: "Ratana",
      lastName: "Keo",
      gender: "male",
      age: 35,
      phone: "012333888",
      email: "ratana.keo@company.com.kh",
      address: "#77, St. Hanoi, Sangkat Phnom Penh Thmey, Khan Sen Sok, Phnom Penh",
      dept: "Warehouse & Inventory",
      pos: "Warehouse & Stock Controller",
      role: "Supervisor",
      baseSalary: "450",
      username: "Ratana Keo",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Warehouse & Inventory",
      location: "Central Warehouse (ឃ្លាំងកណ្តាល)",
    },
    // 9. Chief Security Supervisor
    {
      firstName: "Sambath",
      lastName: "Mom",
      gender: "male",
      age: 42,
      phone: "017444999",
      email: "sambath.mom@company.com.kh",
      address: "#30, St. 217, Sangkat Orussey 1, Khan 7 Makara, Phnom Penh",
      dept: "Security & Maintenance",
      pos: "Chief Security Supervisor",
      role: "Supervisor",
      baseSalary: "380",
      username: "Sambath Mom",
      passwordHash: userPasswordHash,
      isManagerOfDept: "Security & Maintenance",
      location: "Main Branch (សាខាធំ)",
    },
    // 10 - 20: Staff / Cashiers / Operators / Workers
    {
      firstName: "Sothea",
      lastName: "Nhem",
      gender: "female",
      age: 22,
      phone: "086111222",
      email: "sothea.nhem@company.com.kh",
      address: "#15, St. 289, Sangkat Boeung Kak 2, Khan Toul Kork, Phnom Penh",
      dept: "Cashier & POS Management",
      pos: "Cashier Staff",
      role: "Employee",
      baseSalary: "250",
      username: "Sothea Nhem",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Bopha",
      lastName: "Chhorn",
      gender: "female",
      age: 23,
      phone: "093444555",
      email: "bopha.chhorn@company.com.kh",
      address: "#67, St. 146, Sangkat Phsar Depo 2, Khan Toul Kork, Phnom Penh",
      dept: "Cashier & POS Management",
      pos: "Cashier Staff",
      role: "Employee",
      baseSalary: "250",
      username: "Bopha Chhorn",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Theara",
      lastName: "Ly",
      gender: "female",
      age: 21,
      phone: "070666777",
      email: "theara.ly@company.com.kh",
      address: "#89, St. 182, Sangkat Teuk Laak 1, Khan Toul Kork, Phnom Penh",
      dept: "Cashier & POS Management",
      pos: "Cashier Staff",
      role: "Employee",
      baseSalary: "240",
      username: "Theara Ly",
      passwordHash: userPasswordHash,
      location: "Toul Kork Branch (សាខា ទួលគោក)",
    },
    {
      firstName: "Dara",
      lastName: "Samnang",
      gender: "male",
      age: 24,
      phone: "010333444",
      email: "dara.samnang@company.com.kh",
      address: "#101, St. 110, Sangkat Phsar Chas, Khan Daun Penh, Phnom Penh",
      dept: "Store Operations & Sales",
      pos: "Sales & Customer Assistant",
      role: "Employee",
      baseSalary: "260",
      username: "Dara Samnang",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Chanthy",
      lastName: "Tep",
      gender: "female",
      age: 25,
      phone: "012555666",
      email: "chanthy.tep@company.com.kh",
      address: "#44, St. 130, Sangkat Phsar Kandal 1, Khan Daun Penh, Phnom Penh",
      dept: "Store Operations & Sales",
      pos: "Sales & Customer Assistant",
      role: "Employee",
      baseSalary: "260",
      username: "Chanthy Tep",
      passwordHash: userPasswordHash,
      location: "Toul Kork Branch (សាខា ទួលគោក)",
    },
    {
      firstName: "Sovann",
      lastName: "Chan",
      gender: "male",
      age: 28,
      phone: "077888999",
      email: "sovann.chan@company.com.kh",
      address: "#12, St. 336, Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh",
      dept: "Fresh Food & Butchery",
      pos: "Butcher & Meat Cutter",
      role: "Employee",
      baseSalary: "300",
      username: "Sovann Chan",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Sinath",
      lastName: "Long",
      gender: "female",
      age: 26,
      phone: "096222333",
      email: "sinath.long@company.com.kh",
      address: "#50, St. 215, Sangkat Mittapheap, Khan 7 Makara, Phnom Penh",
      dept: "Fresh Food & Butchery",
      pos: "Fresh Produce Associate",
      role: "Employee",
      baseSalary: "240",
      username: "Sinath Long",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Kimsour",
      lastName: "Phan",
      gender: "male",
      age: 24,
      phone: "098444333",
      email: "kimsour.phan@company.com.kh",
      address: "#73, St. 261, Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh",
      dept: "Bakery & Delicatessen",
      pos: "Assistant Baker",
      role: "Employee",
      baseSalary: "270",
      username: "Kimsour Phan",
      passwordHash: userPasswordHash,
      location: "Toul Kork Branch (សាខា ទួលគោក)",
    },
    {
      firstName: "Vannak",
      lastName: "Kruy",
      gender: "male",
      age: 27,
      phone: "017999888",
      email: "vannak.kruy@company.com.kh",
      address: "#18, St. 1986, Sangkat Phnom Penh Thmey, Khan Sen Sok, Phnom Penh",
      dept: "Warehouse & Inventory",
      pos: "Warehouse & Forklift Handler",
      role: "Employee",
      baseSalary: "260",
      username: "Vannak Kruy",
      passwordHash: userPasswordHash,
      location: "Central Warehouse (ឃ្លាំងកណ្តាល)",
    },
    {
      firstName: "Ratha",
      lastName: "Un",
      gender: "male",
      age: 36,
      phone: "088777666",
      email: "ratha.un@company.com.kh",
      address: "#99, St. 118, Sangkat Mittapheap, Khan 7 Makara, Phnom Penh",
      dept: "Security & Maintenance",
      pos: "Security Guard",
      role: "Employee",
      baseSalary: "220",
      username: "Ratha Un",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
    {
      firstName: "Kolap",
      lastName: "Prak",
      gender: "female",
      age: 39,
      phone: "097555444",
      email: "kolap.prak@company.com.kh",
      address: "#35, St. 164, Sangkat Orussey 3, Khan 7 Makara, Phnom Penh",
      dept: "Security & Maintenance",
      pos: "Store Housekeeper / Cleaner",
      role: "Employee",
      baseSalary: "200",
      username: "Kolap Prak",
      passwordHash: userPasswordHash,
      location: "Main Branch (សាខាធំ)",
    },
  ];

  console.log(`[7/11] Upserting 20 Employees and User Accounts...`);
  const createdEmployees = [];
  const managerDeptAssignments = [];

  for (const empData of employeesDataset) {
    // If this entry is for Admin, check if company already has an Admin account
    if (empData.role === "Admin" || empData.role === "SuperAdmin") {
      const existingCompanyAdmin = await prisma.employee.findFirst({
        where: {
          company_id: company.id,
          role: { name: { in: ["Admin", "SuperAdmin"] } },
        },
      });

      if (existingCompanyAdmin) {
        console.log(`  + Existing Admin "${existingCompanyAdmin.first_name} ${existingCompanyAdmin.last_name || ''}" found (kept completely untouched).`);
        createdEmployees.push({ ...existingCompanyAdmin, origData: empData });
        if (empData.isManagerOfDept) {
          managerDeptAssignments.push({
            deptName: empData.isManagerOfDept,
            managerId: existingCompanyAdmin.id,
          });
        }
        continue;
      }
    }

    const dId = deptMap.get(empData.dept);
    const pId = posMap.get(empData.pos);
    const rId = roleMap.get(empData.role);
    const lId = locationMap.get(empData.location) || defaultLocationId;

    let emp = await prisma.employee.findFirst({
      where: {
        company_id: company.id,
        first_name: empData.firstName,
        last_name: empData.lastName,
      },
    });

    if (emp) {
      emp = await prisma.employee.update({
        where: { id: emp.id },
        data: {
          department_id: dId,
          position_id: pId,
          role_id: rId,
          location_id: lId,
          phone_number1: empData.phone,
          email: empData.email,
          address: empData.address,
          gender: empData.gender,
          age: empData.age,
          base_salary: empData.baseSalary,
          joined_at: emp.joined_at || empData.joinedAt || new Date("2026-01-15T00:00:00Z"),
          is_active: "active",
        },
      });
    } else {
      emp = await prisma.employee.create({
        data: {
          company_id: company.id,
          first_name: empData.firstName,
          last_name: empData.lastName,
          department_id: dId,
          position_id: pId,
          role_id: rId,
          location_id: lId,
          phone_number1: empData.phone,
          email: empData.email,
          address: empData.address,
          gender: empData.gender,
          age: empData.age,
          base_salary: empData.baseSalary,
          joined_at: empData.joinedAt || new Date("2026-01-15T00:00:00Z"),
          is_active: "active",
        },
      });
    }

    createdEmployees.push({ ...emp, origData: empData });

    if (empData.isManagerOfDept) {
      managerDeptAssignments.push({
        deptName: empData.isManagerOfDept,
        managerId: emp.id,
      });
    }

    // Upsert User Account
    let user = await prisma.user.findFirst({
      where: { employee_id: emp.id },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: empData.username,
          password: empData.passwordHash,
          is_default_password: false,
        },
      });
    } else {
      const userByName = await prisma.user.findUnique({
        where: { username: empData.username },
      });
      if (userByName) {
        await prisma.user.update({
          where: { id: userByName.id },
          data: {
            employee_id: emp.id,
            password: empData.passwordHash,
            is_default_password: false,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            username: empData.username,
            password: empData.passwordHash,
            employee_id: emp.id,
            is_default_password: false,
          },
        });
      }
    }

    // Initialize leave profile balances (Exempt Admin / Boss)
    if (empData.role !== "Admin" && empData.role !== "SuperAdmin") {
      for (const lt of leaveTypesData) {
        if (lt.code === "ML" && empData.gender !== "female") continue;
        const dbLt = leaveTypeMap.get(lt.name);
        if (dbLt) {
          await prisma.leaveprofile.upsert({
            where: {
              employee_id_leave_type_id: {
                employee_id: emp.id,
                leave_type_id: dbLt.id,
              },
            },
            update: {
              assignment: lt.default_balance,
              balance: lt.default_balance,
              used: 0,
            },
            create: {
              employee_id: emp.id,
              leave_type_id: dbLt.id,
              assignment: lt.default_balance,
              balance: lt.default_balance,
              used: 0,
            },
          });
        }
      }
    } else {
      // Clean up any old leave profiles for Admin
      await prisma.leaveprofile.deleteMany({
        where: { employee_id: emp.id },
      });
    }
  }

  // Ensure every employee in the company has a valid, realistically distributed joined_at date
  const allCompanyEmps = await prisma.employee.findMany({
    where: { company_id: company.id },
    orderBy: { id: "asc" },
  });
  
  const sampleJoinDates = [
    new Date("2025-10-01T00:00:00Z"),
    new Date("2025-11-01T00:00:00Z"),
    new Date("2025-11-15T00:00:00Z"),
    new Date("2025-12-01T00:00:00Z"),
    new Date("2025-12-05T00:00:00Z"),
    new Date("2025-12-10T00:00:00Z"),
    new Date("2025-12-15T00:00:00Z"),
    new Date("2025-12-20T00:00:00Z"),
    new Date("2026-01-02T00:00:00Z"),
    new Date("2026-01-10T00:00:00Z"),
    new Date("2026-01-15T00:00:00Z"),
    new Date("2026-02-01T00:00:00Z"),
    new Date("2026-02-15T00:00:00Z"),
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-03-15T00:00:00Z"),
    new Date("2026-04-01T00:00:00Z"),
    new Date("2026-04-20T00:00:00Z"),
    new Date("2026-05-05T00:00:00Z"),
    new Date("2026-06-01T00:00:00Z"),
    new Date("2026-06-15T00:00:00Z"),
    new Date("2026-07-01T00:00:00Z"),
    new Date("2026-07-15T00:00:00Z"),
    new Date("2026-08-01T00:00:00Z"),
  ];

  for (let i = 0; i < allCompanyEmps.length; i++) {
    const assignedDate = sampleJoinDates[i % sampleJoinDates.length];
    await prisma.employee.update({
      where: { id: allCompanyEmps[i].id },
      data: { joined_at: allCompanyEmps[i].joined_at || assignedDate },
    });
  }

  // Assign Department Managers (ONLY if no manager is currently set, preserving existing managers)
  for (const assign of managerDeptAssignments) {
    const deptId = deptMap.get(assign.deptName);
    if (deptId) {
      const existingDept = await prisma.department.findUnique({
        where: { id: deptId },
        select: { manager_id: true },
      });
      if (!existingDept?.manager_id) {
        await prisma.department.update({
          where: { id: deptId },
          data: { manager_id: assign.managerId },
        });
      }
    }
  }
  console.log(`[8/11] Verified Department Managers (preserved existing assignments).`);

  // 10. Seed Attendance Records (Jan 1, 2026 to Present, Skipping Sundays & Cambodian Holidays)
  console.log(`[9/11] Generating daily attendance records from Jan 1, 2026 to Present (skipping holidays)...`);
  const startDate = new Date("2026-01-01T00:00:00Z");
  const endDate = new Date(); // Today
  endDate.setHours(23, 59, 59, 999);

  // Clean up any existing attendance & payroll records for Admin / Owner (exempt from time-clock & payroll)
  const adminEmployees = await prisma.employee.findMany({
    where: { company_id: company.id, role: { name: "Admin" } },
    select: { id: true },
  });
  const adminIds = adminEmployees.map((a) => a.id);
  if (adminIds.length > 0) {
    await prisma.attendancerecord.deleteMany({
      where: { employee_id: { in: adminIds } },
    });
    await prisma.payroll.deleteMany({
      where: { employee_id: { in: adminIds } },
    });
    console.log(`  + Cleaned up attendance & payroll records for Admin (exempt).`);
  }

  const existingAttendance = await prisma.attendancerecord.findMany({
    where: {
      work_at: { gte: startDate, lte: endDate },
    },
    select: { employee_id: true, work_at: true },
  });

  const attendanceCache = new Set();
  for (const rec of existingAttendance) {
    const dateKey = rec.work_at.toISOString().split("T")[0];
    attendanceCache.add(`${rec.employee_id}-${dateKey}`);
  }

  const pad = (n) => String(n).padStart(2, "0");
  const dateList = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const year = curr.getFullYear();
    const month = curr.getMonth();
    const dateVal = curr.getDate();
    const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

    // Skip Sundays (0) and Cambodian Official Holidays
    if (curr.getDay() !== 0 && !holidayDateSet.has(dateKey)) {
      dateList.push(new Date(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }

  const timeInId = timeModeMap.get("timein");
  const lunchOutId = timeModeMap.get("lunchout");
  const lunchInId = timeModeMap.get("lunchin");
  const timeOutId = timeModeMap.get("timeout");

  const attendanceInserts = [];

  for (const emp of createdEmployees) {
    // Skip Admin / Owner from attendance punch generation (Boss is exempt from time-clock)
    if (emp.origData?.role === "Admin" || emp.role?.name === "Admin") {
      continue;
    }

    for (const dateObj of dateList) {
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const dateVal = dateObj.getDate();
      const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

      if (attendanceCache.has(`${emp.id}-${dateKey}`)) continue;

      // 1. TimeIn (~08:00 AM)
      const inMins = Math.floor(Math.random() * 30) - 15;
      const finalInMin = inMins < 0 ? 60 + inMins : inMins;
      const finalInHour = inMins < 0 ? 7 : 8;
      const isLate = finalInHour > 8 || (finalInHour === 8 && finalInMin > 5);
      const checkInDate = new Date(Date.UTC(year, month, dateVal, finalInHour - 7, finalInMin, Math.floor(Math.random() * 59)));

      attendanceInserts.push({
        employee_id: emp.id,
        time_mode_id: timeInId,
        status: isLate ? "late" : "present",
        type: "FINGER",
        work_at: checkInDate,
        is_late: isLate,
        is_early: false,
        created_at: checkInDate,
        updated_at: checkInDate,
      });

      // 2. LunchOut (~12:00 PM)
      const loMins = Math.floor(Math.random() * 15);
      const checkLODate = new Date(Date.UTC(year, month, dateVal, 12 - 7, loMins, Math.floor(Math.random() * 59)));
      attendanceInserts.push({
        employee_id: emp.id,
        time_mode_id: lunchOutId,
        status: "present",
        type: "FINGER",
        work_at: checkLODate,
        is_late: false,
        is_early: false,
        created_at: checkLODate,
        updated_at: checkLODate,
      });

      // 3. LunchIn (~13:00 PM)
      const liMins = Math.floor(Math.random() * 10);
      const checkLIDate = new Date(Date.UTC(year, month, dateVal, 13 - 7, liMins, Math.floor(Math.random() * 59)));
      attendanceInserts.push({
        employee_id: emp.id,
        time_mode_id: lunchInId,
        status: "present",
        type: "FINGER",
        work_at: checkLIDate,
        is_late: false,
        is_early: false,
        created_at: checkLIDate,
        updated_at: checkLIDate,
      });

      // 4. TimeOut (~17:00 PM)
      const outMins = Math.floor(Math.random() * 25);
      const checkOutDate = new Date(Date.UTC(year, month, dateVal, 17 - 7, outMins, Math.floor(Math.random() * 59)));
      attendanceInserts.push({
        employee_id: emp.id,
        time_mode_id: timeOutId,
        status: "present",
        type: "FINGER",
        work_at: checkOutDate,
        is_late: false,
        is_early: false,
        created_at: checkOutDate,
        updated_at: checkOutDate,
      });
    }
  }

  if (attendanceInserts.length > 0) {
    for (let i = 0; i < attendanceInserts.length; i += 500) {
      const chunk = attendanceInserts.slice(i, i + 500);
      await prisma.attendancerecord.createMany({ data: chunk });
    }
    console.log(`[9/11] Created ${attendanceInserts.length} attendance punch records.`);
  } else {
    console.log(`[9/11] Attendance records are already up to date.`);
  }

  // 11. Seed Leave Requests & Overtime (Jan 2026 - Present)
  console.log(`[10/11] Seeding Leave & Overtime records from Jan 2026 to Present...`);
  const annualLeave = leaveTypeMap.get("Annual Leave");
  const sickLeave = leaveTypeMap.get("Sick Leave");
  const alId = annualLeave ? annualLeave.id : 1;
  const slId = sickLeave ? sickLeave.id : 2;

  for (const emp of createdEmployees) {
    const dept = await prisma.department.findUnique({
      where: { id: emp.department_id },
    });
    const approverId = dept?.manager_id || createdEmployees[0].id;

    // Seed 1-2 realistic leave records across months
    const leaveMonths = [2, 7]; // Feb, Jul
    for (const lm of leaveMonths) {
      const startDay = (emp.id % 20) + 1;
      const lStart = new Date(Date.UTC(2026, lm - 1, startDay, 1, 0, 0));
      const lEnd = new Date(Date.UTC(2026, lm - 1, startDay + 1, 10, 0, 0));

      const existingLeave = await prisma.leaverecord.findFirst({
        where: { employee_id: emp.id, start_date: lStart },
      });

      if (!existingLeave) {
        await prisma.leaverecord.create({
          data: {
            employee_id: emp.id,
            leave_type_id: lm === 2 ? slId : alId,
            start_date: lStart,
            end_date: lEnd,
            reason: lm === 2 ? "Flu and high fever" : "Personal family trip & rest",
            status: "approved",
            approved_by: approverId,
            request_at: new Date(Date.UTC(2026, lm - 1, startDay - 2, 2, 0, 0)),
          },
        });
      }
    }

    // Seed Overtime records (Months 1 to 8) - Skip Admin/Owner (exempt)
    if (emp.origData?.role !== "Admin" && emp.role?.name !== "Admin") {
      const otMonths = [1, 3, 5, 8];
      for (const om of otMonths) {
        const otDay = (emp.id % 22) + 2;
        const otStart = new Date(Date.UTC(2026, om - 1, otDay, 10, 0, 0)); // 17:00 local time
        const otEnd = new Date(Date.UTC(2026, om - 1, otDay, 13, 0, 0)); // 20:00 local time

        const existingOT = await prisma.overtime.findFirst({
          where: { employee_id: emp.id, start_date: otStart },
        });

        if (!existingOT) {
          await prisma.overtime.create({
            data: {
              employee_id: emp.id,
              start_date: otStart,
              end_date: otEnd,
              reason: "Monthly store stock count and inventory shelf restocking",
              status: "approved",
              approved_by: approverId,
              created_at: otStart,
              updated_at: otStart,
            },
          });
        }
      }
    }
  }
  console.log(`[10/11] Leaves and Overtime records seeded.`);

  // 12. Seed Monthly KPI History (All Months: Jan to Aug 2026)
  console.log(`[11/11] Seeding Monthly KPI Reviews from Jan 2026 to Aug 2026...`);
  const kpiMonths = [1, 2, 3, 4, 5, 6, 7, 8];
  const ratingsPool = [
    { d: "good", o: "good", a: "good", comment: "Outstanding team contribution and punctual attendance." },
    { d: "good", o: "good", a: "average", comment: "High output. Keep working on active communication with peers." },
    { d: "average", o: "good", a: "good", comment: "Fast and reliable execution. Keep up the high energy!" },
    { d: "good", o: "average", a: "good", comment: "Polite customer handling and strong work ethic." },
    { d: "average", o: "average", a: "good", comment: "Steady monthly performance, met all expectations." },
    { d: "good", o: "good", a: "good", comment: "Proactive and helpful across department tasks." },
  ];

  const R_MAP = { good: 3, average: 2, needs_improvement: 1 };

  for (const emp of createdEmployees) {
    const dept = await prisma.department.findUnique({
      where: { id: emp.department_id },
    });
    const evaluatorId = dept?.manager_id || createdEmployees[0].id;

    for (const m of kpiMonths) {
      const rIdx = (emp.id * 5 + m * 2) % ratingsPool.length;
      const rItem = ratingsPool[rIdx];

      const dScore = R_MAP[rItem.d];
      const oScore = R_MAP[rItem.o];
      const aScore = R_MAP[rItem.a];
      const tot = Number(((dScore + oScore + aScore) / 3).toFixed(2));
      const grade = tot >= 2.5 ? "GOOD" : tot >= 1.7 ? "AVERAGE" : "NEEDS_IMPROVEMENT";

      await prisma.kpievaluation.upsert({
        where: {
          employee_id_month_year: {
            employee_id: emp.id,
            month: m,
            year: 2026,
          },
        },
        create: {
          company_id: company.id,
          evaluator_id: evaluatorId,
          employee_id: emp.id,
          month: m,
          year: 2026,
          discipline_rating: rItem.d,
          output_rating: rItem.o,
          attitude_rating: rItem.a,
          total_score: tot,
          overall_grade: grade,
          manager_comment: rItem.comment,
          status: "approved",
        },
        update: {
          evaluator_id: evaluatorId,
          discipline_rating: rItem.d,
          output_rating: rItem.o,
          attitude_rating: rItem.a,
          total_score: tot,
          overall_grade: grade,
          manager_comment: rItem.comment,
          status: "approved",
        },
      });
    }
  }

  // 13. Seed Assets, Categories, and Sample Asset Requests
  console.log(`[12/12] Seeding Company Assets, Categories, and Assignments...`);
  const assetCategoriesData = [
    { name: "Laptops & Computers (កុំព្យូទ័រ)", description: "Office laptops, desktops, and monitors" },
    { name: "POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)", description: "Cashier touchscreens, receipt printers, barcode scanners" },
    { name: "Communication & Security (វិទ្យុទាក់ទង)", description: "Two-way radios, walkie-talkies, security gear" },
    { name: "Warehouse & Store Equipment (សម្ភារៈឃ្លាំង)", description: "Hand pallet jacks, price tag printers, carts" },
    { name: "Bakery & Kitchen Tools (ឧបករណ៍ចម្អិន/ដុតនំ)", description: "Commercial dough mixers, slicers, scales" },
  ];

  const assetCatMap = new Map();
  for (const cat of assetCategoriesData) {
    let dbCat = await prisma.assetcategory.findFirst({
      where: { company_id: company.id, name: cat.name },
    });
    if (!dbCat) {
      dbCat = await prisma.assetcategory.create({
        data: {
          company_id: company.id,
          name: cat.name,
          description: cat.description,
        },
      });
    }
    assetCatMap.set(cat.name, dbCat.id);
  }

  const assetsData = [
    {
      catName: "Laptops & Computers (កុំព្យូទ័រ)",
      name: "Dell Latitude 5420 Laptop (Core i7, 16GB RAM)",
      serial: "DELL-LAT-2026-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 0, // Chantha Sok (GM)
      assignedDate: new Date("2026-01-05T08:00:00Z"),
    },
    {
      catName: "Laptops & Computers (កុំព្យូទ័រ)",
      name: "Lenovo ThinkPad T14 (Core i5, 16GB RAM)",
      serial: "LEN-TP-2026-002",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 1, // Sreypov Chea (HR Manager)
      assignedDate: new Date("2026-01-05T08:00:00Z"),
    },
    {
      catName: "Laptops & Computers (កុំព្យូទ័រ)",
      name: "HP ProDesk 400 G7 Desktop PC",
      serial: "HP-PD-2026-003",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 2, // Moniroth Keo (HR Officer)
      assignedDate: new Date("2026-01-10T08:00:00Z"),
    },
    {
      catName: "POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)",
      name: "Sunmi T2 Dual Screen POS Terminal (Counter 1)",
      serial: "SUNMI-T2-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 4, // Sophea Meas (Head Cashier)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)",
      name: "Zebra 2D Barcode Scanner DS2208 (Counter 1)",
      serial: "ZEB-DS22-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 9, // Sothea Nhem (Cashier)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)",
      name: "Zebra 2D Barcode Scanner DS2208 (Counter 2)",
      serial: "ZEB-DS22-002",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 10, // Bopha Chhorn (Cashier)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "Communication & Security (វិទ្យុទាក់ទង)",
      name: "Motorola GP328 Walkie-Talkie (Unit 1)",
      serial: "MOTO-GP-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 8, // Sambath Mom (Security Chief)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "Communication & Security (វិទ្យុទាក់ទង)",
      name: "Motorola GP328 Walkie-Talkie (Unit 2)",
      serial: "MOTO-GP-002",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 18, // Ratha Un (Security Guard)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "Warehouse & Store Equipment (សម្ភារៈឃ្លាំង)",
      name: "Toyota Manual Hand Pallet Jack 2.5T",
      serial: "TOY-HPJ-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 7, // Ratana Keo (Warehouse Mgr)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "Warehouse & Store Equipment (សម្ភារៈឃ្លាំង)",
      name: "Zebra ZD220 Mobile Barcode & Price Tag Printer",
      serial: "ZEB-ZD22-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 12, // Dara Samnang (Sales Assistant)
      assignedDate: new Date("2026-01-08T08:00:00Z"),
    },
    {
      catName: "Bakery & Kitchen Tools (ឧបករណ៍ចម្អិន/ដុតនំ)",
      name: "Commercial Spiral Dough Mixer 20L",
      serial: "MIXER-20L-001",
      condition: "good",
      status: "assigned",
      assignedEmpIdx: 6, // Seyha Vuthy (Head Baker)
      assignedDate: new Date("2026-01-02T08:00:00Z"),
    },
    {
      catName: "Laptops & Computers (កុំព្យូទ័រ)",
      name: "Asus ExpertBook B1 (Core i5, 8GB RAM) - Spare",
      serial: "ASUS-EXP-2026-004",
      condition: "good",
      status: "available",
    },
    {
      catName: "POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)",
      name: "Zebra 2D Barcode Scanner DS2208 (Backup)",
      serial: "ZEB-DS22-003",
      condition: "good",
      status: "available",
    },
  ];

  for (const ast of assetsData) {
    const catId = assetCatMap.get(ast.catName);
    const assignedEmpId =
      ast.assignedEmpIdx !== undefined && createdEmployees[ast.assignedEmpIdx]
        ? createdEmployees[ast.assignedEmpIdx].id
        : null;

    let existingAsset = await prisma.asset.findFirst({
      where: { company_id: company.id, serial_number: ast.serial },
    });

    if (!existingAsset) {
      await prisma.asset.create({
        data: {
          company_id: company.id,
          category_id: catId,
          name: ast.name,
          serial_number: ast.serial,
          condition: ast.condition,
          status: ast.status,
          assigned_to: assignedEmpId,
          assigned_date: ast.assignedDate || null,
        },
      });
    }
  }

  // Seed sample asset request
  if (createdEmployees.length > 10) {
    const requestingEmp = createdEmployees[10]; // Bopha Chhorn
    const cashierCatId = assetCatMap.get("POS Terminals & Scanners (ម៉ាស៊ីនគិតលុយ)");
    const managerId = createdEmployees[4]?.id; // Sophea Meas

    const existingReq = await prisma.assetrequest.findFirst({
      where: { company_id: company.id, requested_by: requestingEmp.id },
    });

    if (!existingReq) {
      await prisma.assetrequest.create({
        data: {
          company_id: company.id,
          requested_by: requestingEmp.id,
          category_id: cashierCatId,
          type: "assignment",
          reason: "Requesting additional handheld barcode scanner for fast weekend checkout queue.",
          status: "pending_manager",
          manager_id: managerId,
          created_at: new Date("2026-08-15T09:00:00Z"),
          updated_at: new Date("2026-08-15T09:00:00Z"),
        },
      });
    }
  }
  console.log(`[12/12] Company Assets, Categories, and Requests seeded.`);

  console.log("\n================================================================================");
  console.log("✨ ALL DATA (HOLIDAYS, EMPLOYEES, ATTENDANCE, LEAVE, OT, KPI, ASSETS) SEEDED! ✨");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
