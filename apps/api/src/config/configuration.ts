export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtStudentSecret: string;
  jwtAdminSecret: string;
  jwtAccessTokenTtl: string;
  jwtResetTokenTtl: string;
  allowedEmailDomains: string;
  corsOrigins: string[];
  emailMode: "smtp" | "mock";
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  media: {
    maxImageBytes: number;
    uploadRoot: string;
  };
  seed: {
    mode: "offline" | "off";
    force: boolean;
    activateDemoList: boolean;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwtStudentSecret: required("JWT_STUDENT_SECRET"),
  jwtAdminSecret: required("JWT_ADMIN_SECRET"),
  jwtAccessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? "1h",
  jwtResetTokenTtl: process.env.JWT_RESET_TOKEN_TTL ?? "15m",
  allowedEmailDomains: required("ALLOWED_EMAIL_DOMAINS"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  emailMode: (process.env.EMAIL_MODE as "smtp" | "mock") ?? "mock",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.SMTP_FROM ?? "School Voting <no-reply@school.edu>",
  },
  media: {
    maxImageBytes: parseInt(process.env.MEDIA_MAX_IMAGE_BYTES ?? "5242880", 10),
    uploadRoot: process.env.MEDIA_UPLOAD_ROOT ?? "./uploads",
  },
  seed: {
    mode: (process.env.SEED_MODE as "offline" | "off") ?? "off",
    force: process.env.SEED_FORCE === "true",
    activateDemoList: process.env.SEED_ACTIVATE_DEMO_LIST === "true",
  },
});
