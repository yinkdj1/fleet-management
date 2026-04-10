"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import AppShell from "../components/AppShell";
import Link from "next/link";

type Customer = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customers");
    }
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return customers.filter((customer) => {
      return (
        (customer.firstName || "").toLowerCase().includes(search) ||
        (customer.lastName || "").toLowerCase().includes(search) ||
        (customer.email || "").toLowerCase().includes(search) ||
        (customer.phone || "").toLowerCase().includes(search)
      );
    });
  }, [customers, searchTerm]);

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Customers</h1>

        <Link
          href="/customers/new"
          className="bg-black text-white px-4 py-2 rounded w-fit"
        >
          + Add Customer
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full md:w-80"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">First Name</th>
              <th className="text-left p-4">Last Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Phone</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="p-4">{customer.firstName || "-"}</td>
                  <td className="p-4">{customer.lastName || "-"}</td>
                  <td className="p-4">{customer.email || "-"}</td>
                  <td className="p-4">{customer.phone || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-500">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}