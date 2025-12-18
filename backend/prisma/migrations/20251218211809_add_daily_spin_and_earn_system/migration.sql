-- CreateTable
CREATE TABLE "daily_spins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "points" REAL NOT NULL,
    "spinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_spins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
