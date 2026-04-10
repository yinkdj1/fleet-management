const prisma = require("../config/db");

async function getCustomers(req, res, next) {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const where = {};

    if (search) {
      const term = String(search);
      where.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getCustomerById(req, res, next) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: { bookings: true },
    });

    if (!customer) {
      const error = new Error("Customer not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ data: customer });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const { firstName, lastName, email, phone, driversLicenseNo, dateOfBirth, licenseExpiry } = req.body;

    if (!firstName || !lastName) {
      const error = new Error("First name and last name are required");
      error.statusCode = 400;
      throw error;
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        driversLicenseNo: driversLicenseNo || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
    });

    res.status(201).json({ data: customer });
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 400;
      error.message = "Duplicate customer data already exists";
    }
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const { firstName, lastName, email, phone, driversLicenseNo, dateOfBirth, licenseExpiry } = req.body;

    const customer = await prisma.customer.update({
      where: { id: Number(req.params.id) },
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        driversLicenseNo: driversLicenseNo || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
    });

    res.json({ data: customer });
  } catch (error) {
    if (error.code === "P2002") {
      error.statusCode = 400;
      error.message = "Duplicate customer data already exists";
    }
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    await prisma.customer.delete({
      where: { id: Number(req.params.id) },
    });
    res.status(204).end();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 404;
      error.message = "Customer not found";
    }
    next(error);
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
