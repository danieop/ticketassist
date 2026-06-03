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
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Nguyen Van A" },
            email: { type: "string", format: "email", example: "developer@example.com" },
            password: { type: "string", minLength: 8, example: "Password123" },
            role: {
              type: "string",
              enum: ["DEVELOPER", "MENTOR", "ADMIN"],
              example: "DEVELOPER"
            }
          }
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "developer@example.com" },
            password: { type: "string", example: "Password123" }
          }
        },
        GoogleAuthRequest: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: { type: "string", description: "Google Identity Services ID token" },
            role: {
              type: "string",
              enum: ["DEVELOPER", "MENTOR", "ADMIN"],
              example: "DEVELOPER"
            }
          }
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" }
          }
        },
        LogoutRequest: {
          type: "object",
          properties: {
            refreshToken: { type: "string" }
          }
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "email"],
          properties: {
            name: { type: "string", example: "Nguyen Van A" },
            email: { type: "string", format: "email", example: "developer@example.com" },
            password: { type: "string", minLength: 8, example: "Password123" },
            googleId: { type: "string" },
            avatarUrl: { type: "string", format: "uri" },
            role: {
              type: "string",
              enum: ["DEVELOPER", "MENTOR", "ADMIN"],
              example: "DEVELOPER"
            }
          }
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Nguyen Van B" },
            email: { type: "string", format: "email", example: "mentor@example.com" },
            password: { type: "string", minLength: 8, example: "Password123" },
            googleId: { type: "string", nullable: true },
            avatarUrl: { type: "string", format: "uri", nullable: true },
            role: {
              type: "string",
              enum: ["DEVELOPER", "MENTOR", "ADMIN"],
              example: "MENTOR"
            }
          }
        },
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
