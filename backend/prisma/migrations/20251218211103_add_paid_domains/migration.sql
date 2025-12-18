-- AlterTable
ALTER TABLE "instances" ADD COLUMN "vpnConfig" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_domains" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subdomain" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "instanceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domains_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_domains" ("createdAt", "id", "instanceId", "port", "subdomain") SELECT "createdAt", "id", "instanceId", "port", "subdomain" FROM "domains";
DROP TABLE "domains";
ALTER TABLE "new_domains" RENAME TO "domains";
CREATE UNIQUE INDEX "domains_subdomain_key" ON "domains"("subdomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
