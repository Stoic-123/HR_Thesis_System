# Sarana HR System - Feature & Process Flow

This document outlines the complete feature set and step-by-step workflow of the Sarana HR System, from the moment a user logs in, to the processing of their daily activities.

---

## 1. Login & Identity Flow

The system customizes the experience based on who is logging in.

- **Step 1: User Login**: An employee, manager, or HR admin opens the web dashboard or mobile app and enters their credentials.
- **Step 2: Role Identification**: The system identifies the user's role and their associated company.
- **Step 3: Dynamic Branding**: The interface automatically updates its theme and colors to match the specific company's branding.
- **Step 4: Dashboard Access**: The user is securely directed to their personalized dashboard, displaying only the features and data they have permission to see.

---

## 2. Daily Attendance Process

Ensures accurate, secure tracking of employee working hours.

- **Step 1: Clock-In Preparation**: When an employee arrives at work or starts their shift, they open the Attendance module on their phone.
- **Step 2: Biometric Scan**: The employee uses the facial recognition scanner to verify their identity.
- **Step 3: Location Verification**: The system checks the employee's GPS coordinates to ensure they are at an approved office or remote location.
- **Step 4: Record Saved**: Once verified, the time is logged. The same process is repeated at the end of the day for **Clock-Out**.

---

## 3. Leave & Overtime (OT) Request Flow

A multi-tier approval system for time off and extra hours.

- **Step 1: Submission**: An employee selects the dates/times and the type of request (e.g., Sick Leave, Maternity Leave, Overtime) and submits a reason via the app.
- **Step 2: Manager Notification**: The request is instantly routed to the employee's direct manager.
- **Step 3: Manager Review**: The manager views the request details alongside the employee's performance metrics and chooses to **Approve** or **Reject**.
- **Step 4: HR Validation (If Applicable)**: If approved by the manager, it escalates to HR for final sign-off.
- **Step 5: Calendar Sync**: Once fully approved, the system automatically marks the employee as on-leave in the company calendar and logs it for payroll processing.

---

## 4. Asset Request & Management Flow

Tracks the distribution and return of company equipment.

- **Step 1: Asset Request**: An employee requests a specific type of equipment (e.g., Laptop, Monitor) and provides a justification.
- **Step 2: Manager Approval**: The direct manager reviews and approves the necessity of the request.
- **Step 3: HR/IT Assignment**: HR or IT sees the approved request, selects a specific physical asset from the company inventory, and assigns it to the employee.
- **Step 4: Active Tracking**: The asset is marked as "Assigned" to that employee until they officially return it.

---

## 5. Payroll Generation & Distribution

Automated financial calculations based on system data.

- **Step 1: Data Gathering**: At the end of the month, the system automatically pulls the employee's base salary, approved overtime (Allowances), and unpaid leaves (Deductions).
- **Step 2: Automated Calculation**: Net salary and take-home pay are automatically calculated.
- **Step 3: Distribution**: The final payslip is generated and securely distributed to the employee.
- **Step 4: History Review**: Employees can open their mobile app to view a visual breakdown of their current month's salary, track earning trends over time, and browse historical payslips.

---

## 6. KPI & Performance Monitoring

Real-time analytics for management.

- **Step 1: Data Aggregation**: The system continuously monitors attendance consistency, late arrivals, and leave frequencies.
- **Step 2: Dashboard Generation**: Managers and HR view graphical charts tracking overall productivity and individual employee reliability.
- **Step 3: Review**: Managers use this data when conducting performance reviews or approving time-off requests.

---

## 7. Autonomous AI Assistant ("HR System Master")

A built-in AI agent capable of performing automated system actions via chat.

- **Step 1: Command Input**: An Admin or HR user types a request into the chat (e.g., *"Move John Doe to the Marketing Department"* or *"Create a new position called Senior Designer"*).
- **Step 2: Context Analysis**: The AI instantly reviews the company's entire roster of employees, departments, and positions.
- **Step 3: Execution**: The AI automatically executes the requested structural changes in the system.
- **Step 4: Audit Logging**: The AI permanently logs its action in the system's Audit Log for security and transparency. 
- **Step 5: Safety Checks**: The AI is programmed to strictly refuse any commands that involve deleting data or bypassing security rules.

---

## 8. Telegram Integration & Remote Approvals

A powerful integration that allows managers to process critical requests instantly without needing to open the app or dashboard.

- **Step 1: Request Submission**: When an employee submits a sensitive request (like a Remote Online Attendance check-in with a selfie and GPS location, a Leave request, or Overtime), the system formats this data.
- **Step 2: Instant Telegram Notification**: The system bot instantly sends a rich message to a secure Telegram group. For remote attendance, this includes the employee's selfie and a direct link to Google Maps showing their exact coordinates.
- **Step 3: Inline Action Buttons**: The message includes interactive inline buttons (e.g., Approve ✅ / Reject ❌).
- **Step 4: Manager Validation**: The system validates that the person clicking the button in Telegram is actually the authorized department manager by checking their registered Telegram username.
- **Step 5: Remote Execution**: If authorized, the system immediately processes the approval or rejection in the database and updates the original Telegram message to show the final decision.
- **Step 6: Quick Admin Actions**: Authorized HR or Managers can also send direct commands to the bot (like `/resetpassword`) to instantly reset an employee's system password right from their chat app.
