import swaggerUi from "swagger-ui-express";

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "HR Management System (HRMS) API",
    version: "1.0.0",
    description: `
## Enterprise HR Management & Mobile Integration API

Welcome to the official **HR Management System API Documentation**. This API powers the Next.js Web Dashboard and Expo Mobile App, supporting full attendance tracking, automated leave and late approvals, hierarchical management workflows, and Cambodian progressive payroll calculations.

### Authentication
Most endpoints require a **Bearer JWT Token**. 
1. Call \`POST /api/auth/login\` with your credentials.
2. Copy the returned \`token\`.
3. Click the **Authorize** button at the top right and enter: \`Bearer <your_token>\`.
    `,
    contact: {
      name: "HRMS Engineering Team",
      email: "support@bayonhr.shop",
    },
  },
  servers: [
    {
      url: "http://localhost:8080",
      description: "Local Development Server",
    },
    {
      url: "https://api.bayonhr.shop",
      description: "Production Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from `/api/auth/login`",
      },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "password123" },
          client: { type: "string", enum: ["web", "mobile"], example: "web" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          result: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful." },
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          is_default_password: { type: "boolean", example: false },
        },
      },
      LateEarlyRequest: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          employee_id: { type: "integer", example: 12 },
          company_id: { type: "integer", example: 3 },
          request_type: { type: "string", enum: ["LATE", "EARLY"], example: "LATE" },
          time_field: { type: "string", example: "time_in" },
          scheduled_time: { type: "string", example: "08:00" },
          request_date: { type: "string", format: "date-time", example: "2026-08-19T08:00:00.000Z" },
          reason: { type: "string", example: "Motorbike flat tire on the way to office" },
          status: { type: "string", enum: ["pending", "approved", "rejected", "cancelled"], example: "approved" },
          approved_by: { type: "integer", nullable: true, example: 2 },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AttendanceScanRequest: {
        type: "object",
        required: ["time_mode_id", "latitude", "longitude"],
        properties: {
          time_mode_id: { type: "integer", example: 1 },
          latitude: { type: "number", example: 11.5564 },
          longitude: { type: "number", example: 104.9282 },
          photo: { type: "string", format: "binary", description: "Selfie scan photo" },
        },
      },
      AppMenuItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          menu_key: { type: "string", example: "online-attendance" },
          label: { type: "string", example: "Online Attendance" },
          color: { type: "string", example: "blue" },
          icon_url: { type: "string", nullable: true, example: "https://r2.dev/app-menu/icon.png" },
          is_active: { type: "boolean", example: true },
          order: { type: "integer", example: 1 },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user and issue a 14-day JWT token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: { description: "Invalid credentials" },
          403: { description: "Forbidden client login access" },
        },
      },
    },
    "/api/auth/getMe": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated employee / user profile",
        responses: {
          200: { description: "Profile retrieved successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user and invalidate authentication cookie",
        responses: {
          200: { description: "Logout successful" },
        },
      },
    },
    "/api/attendance/report": {
      get: {
        tags: ["Attendance"],
        summary: "Get attendance report with dynamic scans and late request excusals",
        parameters: [
          { name: "start_date", in: "query", schema: { type: "string", format: "date" }, example: "2026-08-01" },
          { name: "end_date", in: "query", schema: { type: "string", format: "date" }, example: "2026-08-31" },
          { name: "department_id", in: "query", schema: { type: "integer" } },
          { name: "employee_id", in: "query", schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: { description: "Attendance report returned" },
        },
      },
    },
    "/api/attendance/clock-in": {
      post: {
        tags: ["Attendance"],
        summary: "Clock attendance scan with geofence validation and photo upload",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/AttendanceScanRequest" },
            },
          },
        },
        responses: {
          200: { description: "Attendance clocked successfully" },
          400: { description: "Geofence violation or invalid time mode" },
        },
      },
    },
    "/api/late-request": {
      get: {
        tags: ["Late & Early Requests"],
        summary: "List late and early leave requests",
        parameters: [
          { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected", "cancelled"] } },
          { name: "employee_id", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Late requests list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LateEarlyRequest" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Late & Early Requests"],
        summary: "Create a new late or early leave request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["request_type", "reason"],
                properties: {
                  request_type: { type: "string", enum: ["LATE", "EARLY"], example: "LATE" },
                  reason: { type: "string", example: "Traffic jam on Russian Blvd" },
                  time_field: { type: "string", example: "time_in" },
                  scheduled_time: { type: "string", example: "08:00" },
                  request_date: { type: "string", format: "date", example: "2026-08-19" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Request created" },
          400: { description: "Validation error or timing deadline exceeded" },
        },
      },
    },
    "/api/late-request/approve/{id}": {
      put: {
        tags: ["Late & Early Requests"],
        summary: "Approve a pending late/early request",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Request approved and attendance status excused" },
        },
      },
    },
    "/api/late-request/reject/{id}": {
      put: {
        tags: ["Late & Early Requests"],
        summary: "Reject a pending late/early request",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Request rejected" },
        },
      },
    },
    "/api/late-request/cancel/{id}": {
      put: {
        tags: ["Late & Early Requests"],
        summary: "Cancel an employee's own pending request",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Request successfully cancelled" },
        },
      },
    },
    "/api/leave/get-all-leaves": {
      get: {
        tags: ["Leave Management"],
        summary: "Get list of employee leave requests",
        responses: {
          200: { description: "Leaves list" },
        },
      },
    },
    "/api/leave/apply": {
      post: {
        tags: ["Leave Management"],
        summary: "Submit a new leave application",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["leave_type_id", "start_date", "end_date", "reason"],
                properties: {
                  leave_type_id: { type: "integer", example: 1 },
                  start_date: { type: "string", format: "date", example: "2026-09-01" },
                  end_date: { type: "string", format: "date", example: "2026-09-03" },
                  reason: { type: "string", example: "Family obligation" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Leave submitted" },
        },
      },
    },
    "/api/overtime": {
      get: {
        tags: ["Overtime"],
        summary: "Get overtime request records",
        responses: {
          200: { description: "Overtime list" },
        },
      },
    },
    "/api/payroll": {
      get: {
        tags: ["Payroll"],
        summary: "List employee payroll records with Cambodia progressive tax calculations and late deduction exemptions",
        parameters: [
          { name: "period_id", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Payroll records" },
        },
      },
    },
    "/api/payroll-periods": {
      get: {
        tags: ["Payroll"],
        summary: "Get payroll periods",
        responses: {
          200: { description: "Payroll periods list" },
        },
      },
    },
    "/api/app-menu": {
      get: {
        tags: ["App Configuration"],
        summary: "Get mobile app home menu configuration",
        responses: {
          200: {
            description: "List of app menu items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppMenuItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/app-menu/{id}": {
      put: {
        tags: ["App Configuration"],
        summary: "Update app menu item color, label, icon upload (R2) and visibility",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  label: { type: "string", example: "Asset Management" },
                  color: { type: "string", example: "orange" },
                  is_active: { type: "boolean", example: true },
                  order: { type: "integer", example: 6 },
                  icon: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "App menu item updated" },
        },
      },
    },
    "/api/employee/get-all-employee": {
      get: {
        tags: ["Employees"],
        summary: "Get paginated employee list",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "department_id", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Employees list" },
        },
      },
    },
    "/api/company/get-company": {
      get: {
        tags: ["Company"],
        summary: "Get company profile, Telegram group IDs, and branding themes",
        responses: {
          200: { description: "Company profile details" },
        },
      },
    },
    "/api/notification": {
      get: {
        tags: ["Notifications"],
        summary: "Get user notifications",
        responses: {
          200: { description: "Notifications list" },
        },
      },
    },
  },
};

export { swaggerUi, swaggerSpec };
