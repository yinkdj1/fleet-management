require("dotenv").config();
const app = require("./app");
const bookingService = require("./services/bookingService");

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be defined in production");
  }

  process.env.JWT_SECRET = "dev-jwt-secret-change-me";
  console.warn(
    "JWT_SECRET was not set. Using a development fallback secret."
  );
}

const PORT = process.env.PORT || 5000;
const AUTO_PRECHECKOUT_ENABLED = process.env.PRECHECKOUT_AUTO_ENABLED !== "false";
const AUTO_PRECHECKOUT_INTERVAL_MS =
  Number(process.env.PRECHECKOUT_AUTO_INTERVAL_MINUTES || 15) * 60 * 1000;

function startPrecheckoutAutoScheduler() {
  if (!AUTO_PRECHECKOUT_ENABLED) {
    console.log("Automatic pre-checkout scheduler disabled.");
    return;
  }

  const runJob = async () => {
    try {
      const summary = await bookingService.processAutomaticPrecheckoutPrompts();
      if (summary.scanned > 0) {
        console.log(
          `Pre-checkout auto job: scanned=${summary.scanned}, sent=${summary.sent}, skipped=${summary.skipped}`
        );
      }
    } catch (error) {
      console.error("Pre-checkout auto job failed:", error.message || error);
    }
  };

  runJob();
  setInterval(runJob, AUTO_PRECHECKOUT_INTERVAL_MS);
  console.log(
    `Automatic pre-checkout scheduler started (${AUTO_PRECHECKOUT_INTERVAL_MS / 60000} min interval).`
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPrecheckoutAutoScheduler();
});