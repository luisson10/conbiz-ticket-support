import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function buildUrlFromPgEnv(): string | undefined {
  const host = process.env["PGHOST"];
  const port = process.env["PGPORT"] ?? "5432";
  const user = process.env["PGUSER"];
  const password = process.env["PGPASSWORD"];
  const database = process.env["PGDATABASE"];

  if (!host || !user || !password || !database) {
    return undefined;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const query = new URLSearchParams({
    sslmode: process.env["PGSSLMODE"] ?? "require",
  });

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?${query.toString()}`;
}

function resolveDatasourceUrl(): string | undefined {
  return (
    process.env["DATABASE_URL"] ??
    process.env["DATABASE_PRIVATE_URL"] ??
    process.env["DATABASE_PUBLIC_URL"] ??
    process.env["POSTGRES_URL"] ??
    process.env["POSTGRES_PRISMA_URL"] ??
    buildUrlFromPgEnv()
  );
}

const prismaClientSingleton = () => {
  const datasourceUrl = resolveDatasourceUrl();
  if (!datasourceUrl) {
    throw new Error(
      "Missing database URL. Set DATABASE_URL (or DATABASE_PRIVATE_URL / POSTGRES_URL) in Railway."
    );
  }

  const adapter = new PrismaPg({ connectionString: datasourceUrl });
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
