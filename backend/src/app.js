const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/public", publicRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? err.statusCode || 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

module.exports = app;
