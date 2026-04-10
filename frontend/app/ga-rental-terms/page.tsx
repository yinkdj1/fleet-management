export default function GaRentalTermsPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">Georgia Vehicle Rental Terms</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This page contains the full rental terms for Georgia bookings. Review these terms before accepting the checkboxes on the reservation form.
        </p>

        <div className="mt-6 space-y-5 text-sm text-zinc-700">
          <section>
            <h2 className="font-semibold text-zinc-900">1. Parties and Booking</h2>
            <p>
              This agreement is between the rental company and the guest listed on the booking. The guest confirms all submitted details are accurate.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">2. Vehicle and Rental Period</h2>
            <p>
              The listed vehicle is rented for the pickup and return times shown in the booking. Late returns may result in additional charges.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">3. Charges and Authorization</h2>
            <p>
              Guest authorizes rental rates, taxes, fees, deposits, and lawful additional charges including tolls, fuel, citations, cleaning, and damage-related costs.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">4. Driver Eligibility and Use Restrictions</h2>
            <p>
              The guest must hold a valid license, meet age requirements, and ensure only authorized drivers operate the vehicle. Vehicle use for unlawful acts or prohibited use is not allowed.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">5. Insurance and Responsibility</h2>
            <p>
              Guest responsibility for loss or damage applies to the extent permitted by Georgia law and any applicable insurance terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">6. Accidents and Reporting</h2>
            <p>
              Accidents, theft, and damage must be reported immediately to authorities when required and to the rental company as soon as possible.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">7. Return Condition</h2>
            <p>
              Vehicle must be returned with keys/accessories and in reasonable condition subject to normal wear, with fuel/cleanliness requirements as specified.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">8. Privacy and Communications</h2>
            <p>
              Contact details may be used for booking administration, support, payment notices, and required legal communications.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-900">9. Governing Law and Electronic Acceptance</h2>
            <p>
              This agreement is governed by Georgia law. Checkmark acceptance on the reservation page is treated as the guest electronic signature.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
