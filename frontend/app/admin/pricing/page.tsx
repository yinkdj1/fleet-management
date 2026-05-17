"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import api from "../../../lib/api";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
  pricingType: string;
  hourlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  peakMultiplier: number;
  offPeakMultiplier: number;
  weekendMultiplier: number;
};

type PricingRule = {
  id: number;
  vehicleId: number | null;
  ruleType: string;
  multiplier: number;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  priority: number;
  description: string | null;
  vehicle?: {
    id: number;
    make: string;
    model: string;
    plateNumber: string;
  } | null;
};

export default function PricingManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Vehicle pricing form
  const [pricingType, setPricingType] = useState("flat");
  const [dailyRate, setDailyRate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [peakMultiplier, setPeakMultiplier] = useState("1.0");
  const [offPeakMultiplier, setOffPeakMultiplier] = useState("1.0");
  const [weekendMultiplier, setWeekendMultiplier] = useState("1.0");

  // Rule form
  const [ruleVehicleId, setRuleVehicleId] = useState("");
  const [ruleType, setRuleType] = useState("peak_hours");
  const [multiplier, setMultiplier] = useState("1.2");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState("0");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [vehiclesRes, rulesRes] = await Promise.all([
        api.get("/vehicles"),
        api.get("/pricing/rules"),
      ]);
      // Handle different response formats
      setVehicles(vehiclesRes.data?.data || vehiclesRes.data || []);
      setRules(rulesRes.data?.data || rulesRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function openVehicleModal(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setPricingType(vehicle.pricingType || "flat");
    setDailyRate(vehicle.dailyRate.toString());
    setHourlyRate(vehicle.hourlyRate?.toString() || "");
    setWeeklyRate(vehicle.weeklyRate?.toString() || "");
    setMonthlyRate(vehicle.monthlyRate?.toString() || "");
    setPeakMultiplier(vehicle.peakMultiplier?.toString() || "1.0");
    setOffPeakMultiplier(vehicle.offPeakMultiplier?.toString() || "1.0");
    setWeekendMultiplier(vehicle.weekendMultiplier?.toString() || "1.0");
    setShowVehicleModal(true);
  }

  function openRuleModal(rule?: PricingRule) {
    if (rule) {
      setEditingRule(rule);
      setRuleVehicleId(rule.vehicleId?.toString() || "");
      setRuleType(rule.ruleType);
      setMultiplier(rule.multiplier.toString());
      setStartDate(rule.startDate ? rule.startDate.split("T")[0] : "");
      setEndDate(rule.endDate ? rule.endDate.split("T")[0] : "");
      setDaysOfWeek(rule.daysOfWeek ? JSON.parse(rule.daysOfWeek) : []);
      setStartTime(rule.startTime || "");
      setEndTime(rule.endTime || "");
      setPriority(rule.priority.toString());
      setDescription(rule.description || "");
      setIsActive(rule.isActive);
    } else {
      setEditingRule(null);
      setRuleVehicleId("");
      setRuleType("peak_hours");
      setMultiplier("1.2");
      setStartDate("");
      setEndDate("");
      setDaysOfWeek([]);
      setStartTime("");
      setEndTime("");
      setPriority("0");
      setDescription("");
      setIsActive(true);
    }
    setShowRuleModal(true);
  }

  async function handleUpdateVehiclePricing(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setError("");
      setSuccess("");
      await api.put(`/pricing/vehicles/${selectedVehicle.id}`, {
        pricingType,
        dailyRate: parseFloat(dailyRate),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        weeklyRate: weeklyRate ? parseFloat(weeklyRate) : null,
        monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
        peakMultiplier: parseFloat(peakMultiplier),
        offPeakMultiplier: parseFloat(offPeakMultiplier),
        weekendMultiplier: parseFloat(weekendMultiplier),
      });
      setSuccess("Vehicle pricing updated successfully");
      setShowVehicleModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update pricing");
    }
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      const ruleData = {
        vehicleId: ruleVehicleId ? parseInt(ruleVehicleId) : null,
        ruleType,
        multiplier: parseFloat(multiplier),
        startDate: startDate || null,
        endDate: endDate || null,
        daysOfWeek: daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        priority: parseInt(priority),
        description: description || null,
        isActive,
      };

      if (editingRule) {
        await api.put(`/pricing/rules/${editingRule.id}`, ruleData);
        setSuccess("Pricing rule updated successfully");
      } else {
        await api.post("/pricing/rules", ruleData);
        setSuccess("Pricing rule created successfully");
      }

      setShowRuleModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save rule");
    }
  }

  async function handleDeleteRule(id: number) {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/pricing/rules/${id}`);
      setSuccess("Pricing rule deleted successfully");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete rule");
    }
  }

  function toggleDayOfWeek(day: string) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-6">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dynamic Pricing Management</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Vehicle Pricing Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Vehicle Pricing Configuration</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-lg mb-2">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{vehicle.plateNumber}</p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">Type:</span>{" "}
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        vehicle.pricingType === "dynamic"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {vehicle.pricingType}
                    </span>
                  </p>
                  <p className="text-sm mb-3">
                    <span className="font-medium">Daily Rate:</span> ${vehicle.dailyRate}
                  </p>
                  <button
                    onClick={() => openVehicleModal(vehicle)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Configure Pricing
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Rules Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Pricing Rules</h2>
            <button
              onClick={() => openRuleModal()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Add Rule
            </button>
          </div>
          <div className="p-6">
            {rules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No pricing rules configured. Click "Add Rule" to create one.
              </p>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {rule.description || rule.ruleType}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {rule.vehicle
                            ? `${rule.vehicle.make} ${rule.vehicle.model} (${rule.vehicle.plateNumber})`
                            : "Global Rule"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rule.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <p>
                        <span className="font-medium">Type:</span> {rule.ruleType}
                      </p>
                      <p>
                        <span className="font-medium">Multiplier:</span> {rule.multiplier}x
                      </p>
                      <p>
                        <span className="font-medium">Priority:</span> {rule.priority}
                      </p>
                      {rule.daysOfWeek && (
                        <p>
                          <span className="font-medium">Days:</span>{" "}
                          {JSON.parse(rule.daysOfWeek).join(", ")}
                        </p>
                      )}
                      {rule.startTime && rule.endTime && (
                        <p>
                          <span className="font-medium">Time:</span> {rule.startTime} -{" "}
                          {rule.endTime}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRuleModal(rule)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Pricing Modal */}
        {showVehicleModal && selectedVehicle && (
          <div className="fixed inset-0 left-64 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Configure Pricing - {selectedVehicle.make} {selectedVehicle.model}
                </h2>
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateVehiclePricing} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pricing Type</label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="dynamic">Dynamic Pricing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Daily Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>

                {pricingType === "dynamic" && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Hourly Rate ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Weekly Rate ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={weeklyRate}
                          onChange={(e) => setWeeklyRate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Monthly Rate ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={monthlyRate}
                          onChange={(e) => setMonthlyRate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Peak Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={peakMultiplier}
                          onChange={(e) => setPeakMultiplier(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Off-Peak Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={offPeakMultiplier}
                          onChange={(e) => setOffPeakMultiplier(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Weekend Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={weekendMultiplier}
                          onChange={(e) => setWeekendMultiplier(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pricing Rule Modal */}
        {showRuleModal && (
          <div className="fixed inset-0 left-64 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {editingRule ? "Edit Pricing Rule" : "Create Pricing Rule"}
                </h2>
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveRule} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle (Optional)</label>
                  <select
                    value={ruleVehicleId}
                    onChange={(e) => setRuleVehicleId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Global Rule (All Vehicles)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="peak_hours">Peak Hours</option>
                    <option value="weekend">Weekend</option>
                    <option value="holiday">Holiday</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="demand">Demand-Based</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price Multiplier (e.g., 1.2 = 20% increase)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., Summer peak pricing"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                      (day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDayOfWeek(day)}
                          className={`px-3 py-1 rounded text-sm ${
                            daysOfWeek.includes(day)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Priority (higher = applied first)
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRuleModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {editingRule ? "Update Rule" : "Create Rule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
