const { prisma } = require('../db');
const proxmoxService = require('../services/proxmox.service');

const MAX_SNAPSHOTS = 3;

// Create a snapshot for an instance (POST /instances/:id/snapshots)
const createSnapshot = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.userId;

        // Find instance and verify ownership
        const instance = await prisma.instance.findFirst({
            where: { id, userId },
            include: { snapshots: { orderBy: { createdAt: 'asc' } } }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        if (!instance.vmid) {
            return res.status(400).json({ error: 'Instance has no VMID assigned' });
        }

        // Check if max snapshots reached, delete oldest if needed
        if (instance.snapshots.length >= MAX_SNAPSHOTS) {
            const oldest = instance.snapshots[0];

            // Delete from Proxmox
            try {
                const deleteUpid = await proxmoxService.deleteLXCSnapshot(instance.vmid, oldest.proxmoxSnapName);
                await proxmoxService.waitForTask(deleteUpid);
            } catch (err) {
                console.error('Failed to delete oldest snapshot from Proxmox:', err.message);
                // Continue anyway, might already be deleted
            }

            // Delete from database
            await prisma.snapshot.delete({ where: { id: oldest.id } });
        }

        // Generate unique snapshot name for Proxmox
        const timestamp = Date.now();
        const proxmoxSnapName = `snap_${timestamp}`;
        const displayName = name || `Snapshot ${new Date().toLocaleDateString('fr-FR')}`;

        // Create snapshot in Proxmox
        const upid = await proxmoxService.createLXCSnapshot(
            instance.vmid,
            proxmoxSnapName,
            description || displayName
        );

        // Wait for task to complete
        await proxmoxService.waitForTask(upid);

        // Save to database
        const snapshot = await prisma.snapshot.create({
            data: {
                instanceId: id,
                name: displayName,
                proxmoxSnapName,
                description: description || null
            }
        });

        res.status(201).json({
            message: 'Snapshot created successfully',
            snapshot
        });

    } catch (error) {
        console.error('Create snapshot error:', error);
        res.status(500).json({ error: 'Failed to create snapshot' });
    }
};

// Get all snapshots for an instance (GET /instances/:id/snapshots)
// Get all snapshots for an instance (GET /instances/:id/snapshots)
const getSnapshots = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Verify instance ownership
        const instance = await prisma.instance.findFirst({
            where: { id, userId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Sync with Proxmox if VMID exists
        if (instance.vmid) {
            try {
                // 1. Fetch from Proxmox
                const proxmoxSnapshots = await proxmoxService.listLXCSnapshots(instance.vmid);

                // 2. Fetch from DB
                const dbSnapshots = await prisma.snapshot.findMany({
                    where: { instanceId: id }
                });

                // 3. Identify missing in DB (Add)
                const dbSnapNames = new Set(dbSnapshots.map(s => s.proxmoxSnapName));
                const missingInDb = proxmoxSnapshots.filter(p => !dbSnapNames.has(p.name));

                for (const pSnap of missingInDb) {
                    await prisma.snapshot.create({
                        data: {
                            instanceId: id,
                            name: pSnap.description || `Snapshot ${new Date(pSnap.snaptime * 1000).toLocaleString('fr-FR')}`,
                            proxmoxSnapName: pSnap.name,
                            description: pSnap.description || null,
                            createdAt: new Date(pSnap.snaptime * 1000)
                        }
                    });
                }

                // 4. Identify missing in Proxmox (Delete from DB)
                const proxmoxSnapNames = new Set(proxmoxSnapshots.map(p => p.name));
                const missingInProxmox = dbSnapshots.filter(d => !proxmoxSnapNames.has(d.proxmoxSnapName));

                for (const dSnap of missingInProxmox) {
                    await prisma.snapshot.delete({ where: { id: dSnap.id } });
                }

            } catch (syncError) {
                console.error('Snapshot sync warning:', syncError.message);
                // Non-fatal, continue with DB data if Proxmox fails (e.g. VM stopped/offline?)
                // Actually listLXCSnapshots works even if stopped usually, but if VM deleted?
            }
        }

        // Return fresh list from DB
        const finalSnapshots = await prisma.snapshot.findMany({
            where: { instanceId: id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            snapshots: finalSnapshots,
            maxSnapshots: MAX_SNAPSHOTS,
            remaining: Math.max(0, MAX_SNAPSHOTS - finalSnapshots.length)
        });

    } catch (error) {
        console.error('Get snapshots error:', error);
        res.status(500).json({ error: 'Failed to get snapshots' });
    }
};

// Restore an instance to a snapshot (POST /instances/:id/snapshots/:snapId/restore)
const restoreSnapshot = async (req, res) => {
    try {
        const { id, snapId } = req.params;
        const userId = req.userId;

        // Find instance and snapshot
        const instance = await prisma.instance.findFirst({
            where: { id, userId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const snapshot = await prisma.snapshot.findFirst({
            where: { id: snapId, instanceId: id }
        });

        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        if (!instance.vmid) {
            return res.status(400).json({ error: 'Instance has no VMID assigned' });
        }

        // Check if container is running, stop it first
        const status = await proxmoxService.getLXCStatus(instance.vmid);
        const wasRunning = status.status === 'running';

        if (wasRunning) {
            const stopUpid = await proxmoxService.stopLXC(instance.vmid);
            await proxmoxService.waitForTask(stopUpid);
        }

        // Rollback to snapshot
        const upid = await proxmoxService.rollbackLXCSnapshot(instance.vmid, snapshot.proxmoxSnapName);
        await proxmoxService.waitForTask(upid);

        // Restart if it was running
        if (wasRunning) {
            const startUpid = await proxmoxService.startLXC(instance.vmid);
            await proxmoxService.waitForTask(startUpid);
        }

        res.json({
            message: 'Snapshot restored successfully',
            snapshot,
            wasRunning
        });

    } catch (error) {
        console.error('Restore snapshot error:', error);
        res.status(500).json({ error: 'Failed to restore snapshot' });
    }
};

// Delete a snapshot (DELETE /instances/:id/snapshots/:snapId)
const deleteSnapshot = async (req, res) => {
    try {
        const { id, snapId } = req.params;
        const userId = req.userId;

        // Find instance and snapshot
        const instance = await prisma.instance.findFirst({
            where: { id, userId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const snapshot = await prisma.snapshot.findFirst({
            where: { id: snapId, instanceId: id }
        });

        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        // Delete from Proxmox
        if (instance.vmid) {
            try {
                const upid = await proxmoxService.deleteLXCSnapshot(instance.vmid, snapshot.proxmoxSnapName);
                await proxmoxService.waitForTask(upid);
            } catch (err) {
                console.error('Failed to delete from Proxmox (continuing):', err.message);
            }
        }

        // Delete from database
        await prisma.snapshot.delete({ where: { id: snapId } });

        res.json({ message: 'Snapshot deleted successfully' });

    } catch (error) {
        console.error('Delete snapshot error:', error);
        res.status(500).json({ error: 'Failed to delete snapshot' });
    }
};

// Download a snapshot: create backup and return metadata (GET /instances/:id/snapshots/:snapId/download)
const downloadSnapshot = async (req, res) => {
    try {
        const { id, snapId } = req.params;
        const userId = req.userId;

        // Find instance and snapshot
        const instance = await prisma.instance.findFirst({
            where: { id, userId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const snapshot = await prisma.snapshot.findFirst({
            where: { id: snapId, instanceId: id }
        });

        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        if (!instance.vmid) {
            return res.status(400).json({ error: 'Instance has no VMID assigned' });
        }

        // For now, we'll create a backup of the current state
        // In a production setup, you would restore to snapshot first, backup, then restore back
        // This is a simplified version that backs up current state

        // Create backup
        const upid = await proxmoxService.createLXCBackup(instance.vmid, 'local', 'snapshot');
        await proxmoxService.waitForTask(upid);

        // Get the backup file info
        const backups = await proxmoxService.listBackups('local', instance.vmid);
        const latestBackup = backups.sort((a, b) => b.ctime - a.ctime)[0];

        if (!latestBackup) {
            return res.status(500).json({ error: 'Backup creation failed' });
        }

        // Return download info
        // Note: Direct file download requires Proxmox file server access
        // In production, you might stream the file or provide a signed URL
        res.json({
            message: 'Backup created successfully',
            backup: {
                volid: latestBackup.volid,
                size: latestBackup.size,
                filename: latestBackup.volid.split('/').pop(),
                // Download URL would be proxmox server based
                downloadUrl: `${process.env.PROXMOX_URL}/api2/json/nodes/${process.env.PROXMOX_NODE || 'pve'}/storage/local/content/${encodeURIComponent(latestBackup.volid)}`
            },
            note: 'To download, use the Proxmox web interface or access the file directly on the server.'
        });

    } catch (error) {
        console.error('Download snapshot error:', error);
        res.status(500).json({ error: 'Failed to prepare download' });
    }
};

module.exports = {
    createSnapshot,
    getSnapshots,
    restoreSnapshot,
    deleteSnapshot,
    downloadSnapshot
};
