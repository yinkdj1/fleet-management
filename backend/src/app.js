const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const notificationTemplateRoutes = require("./routes/notificationTemplateRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const publicRoutes = require("./routes/publicRoutes");
const aiRoutes = require("./routes/aiRoutes");
const couponRoutes = require("./routes/couponRoutes");
const tripMonitoringRoutes = require("./routes/tripMonitoringRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api", (req, res) => {
  res.json({ message: "Fleet Management API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/notifications", notificationTemplateRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/monitor", tripMonitoringRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/public", publicRoutes);
app.use("/public", publicRoutes);

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
