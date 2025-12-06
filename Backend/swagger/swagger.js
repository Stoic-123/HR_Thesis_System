import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HR System API",
      version: "1.0.0",
      description: "API documentation for HR System Backend",
    },
  },
  apis: ["./routes/*.js"], // <-- point to your routes folder
};

const swaggerSpec = swaggerJsDoc(options);

export { swaggerUi, swaggerSpec };
