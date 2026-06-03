import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TicketAssist API",
      version: "0.1.0",
      description: "Backend API for sequential multi-agent bug ticket analysis."
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Local development"
      }
    ],
    components: {
      schemas: {
        CreateWorkflowRequest: {
          type: "object",
          required: ["ticket"],
          properties: {
            repositoryId: {
              type: "string",
              description: "Optional uploaded repository id to associate with the workflow"
            },
            ticket: {
              type: "object",
              required: ["title", "description"],
              properties: {
                title: { type: "string", example: "Checkout fails" },
                description: {
                  type: "string",
                  example: "Customer cannot pay with saved card in production."
                },
                reporterName: { type: "string", example: "Acme Retail" },
                source: {
                  type: "string",
                  enum: ["EMAIL", "SLACK", "ZENDESK", "JIRA", "MANUAL"],
                  example: "ZENDESK"
                },
                reporterId: { type: "string" }
              }
            }
          }
        },
        ReviewWorkflowRequest: {
          type: "object",
          required: ["decision", "comment"],
          properties: {
            decision: {
              type: "string",
              enum: ["APPROVED", "REJECTED", "NEED_MORE_INFORMATION"],
              example: "NEED_MORE_INFORMATION"
            },
            comment: {
              type: "string",
              example: "Please confirm affected release version before implementation."
            },
            mentorId: { type: "string" }
          }
        },
        UploadRepositoryRequest: {
          type: "object",
          required: ["name", "files"],
          properties: {
            name: {
              type: "string",
              example: "checkout-service"
            },
            description: {
              type: "string",
              example: "Repository snapshot for checkout bug triage."
            },
            uploadedById: {
              type: "string"
            },
            files: {
              type: "array",
              items: {
                type: "string",
                format: "binary"
              },
              description:
                "Repository files. Preserve folder paths by sending each multipart filename as its relative path."
            }
          }
        }
      }
    }
  },
  apis: ["src/routes/*.ts"]
});
