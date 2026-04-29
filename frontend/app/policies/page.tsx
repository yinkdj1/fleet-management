import React from "react";

export default function PoliciesPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Rental Policies</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Rental Policy</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Minimum driver age: 21 years</li>
          <li>Valid driver’s license required at pickup</li>
          <li>All bookings must be made online or through our app</li>
          <li>Payment required to confirm reservation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Cancellation Policy</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Free cancellation up to 24 hours before pickup</li>
          <li>50% fee for cancellations within 24 hours of pickup</li>
          <li>No-shows are non-refundable</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Insurance & Protection</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>All rentals include basic protection plan</li>
          <li>Optional upgrades available at checkout</li>
          <li>See your booking details for coverage specifics</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Other Terms</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Vehicles must be returned with the same fuel level as pickup</li>
          <li>Late returns may incur additional charges</li>
          <li>Contact support for any questions or special requests</li>
        </ul>
      </section>
    </main>
  );
}
