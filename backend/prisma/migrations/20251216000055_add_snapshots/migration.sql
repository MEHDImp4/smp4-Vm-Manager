-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proxmoxSnapName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "snapshots_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
