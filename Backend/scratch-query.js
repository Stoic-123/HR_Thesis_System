import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hrms',
    port: 3306
  });

  console.log('--- 1. Employees and their Roles/Positions/Departments ---');
  const [employees] = await connection.execute(`
    SELECT e.id, e.first_name, e.last_name, e.is_active,
           r.name AS role_name,
           p.name AS position_name,
           d.name AS department_name
    FROM employee e
    LEFT JOIN role r ON e.role_id = r.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN department d ON e.department_id = d.id
  `);
  console.log(JSON.stringify(employees, null, 2));

  console.log('\n--- 2. Leave Records (Count by Employee) ---');
  const [leaves] = await connection.execute(`
    SELECT e.id, e.first_name, e.last_name, COUNT(l.id) AS leave_count
    FROM employee e
    LEFT JOIN leaverecord l ON e.id = l.employee_id
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY leave_count DESC
  `);
  console.log(JSON.stringify(leaves, null, 2));

  console.log('\n--- 3. Late Records (Count by Employee) ---');
  const [lates] = await connection.execute(`
    SELECT e.id, e.first_name, e.last_name, COUNT(a.id) AS late_count
    FROM employee e
    LEFT JOIN attendancerecord a ON e.id = a.employee_id AND a.is_late = 1
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY late_count DESC
  `);
  console.log(JSON.stringify(lates, null, 2));

  await connection.end();
}

main().catch(console.error);
