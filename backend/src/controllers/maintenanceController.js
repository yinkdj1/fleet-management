const prisma = require("../config/db");

async function getMaintenanceRecords(req, res, next) {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      include: { vehicle: true },
      orderBy: { scheduledDate: "asc" },
    });
    res.json({ data: records });
  } catch (error) {
    next(error);
  }
}

async function getMaintenanceRecordById(req, res, next) {
  try {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: Number(req.params.id) },
      include: { vehicle: true },
    });

    if (!record) {
      const error = new Error("Maintenance record not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ data: record });
  } catch (error) {
    next(error);
  }
}

async function createMaintenanceRecord(req, res, next) {
  try {
    const { vehicleId, serviceType, description, cost, scheduledDate } = req.body;

    if (!vehicleId || !serviceType) {
      const error = new Error("vehicleId and serviceType are required");
      error.statusCode = 400;
      throw error;
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        vehicleId: Number(vehicleId),
        serviceType,
        description: description || null,
        cost: cost !== undefined ? Number(cost) : 0,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      },
    });

    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
}

async function completeMaintenanceRecord(req, res, next) {
  try {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!record) {
      const error = new Error("Maintenance record not found");
      error.statusCode = 404;
      throw error;
    }

    const completedRecord = await prisma.maintenanceRecord.update({
      where: { id: Number(req.params.id) },
      data: {
        status: "completed",
        completedDate: new Date(),
      },
    });

    res.json({ data: completedRecord });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  completeMaintenanceRecord,
};
