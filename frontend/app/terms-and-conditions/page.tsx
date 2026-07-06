export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Carsgidi Terms &amp; Conditions</h1>
        <p className="text-sm text-zinc-500 mb-8">Last Updated: July 6, 2026</p>

        <div className="space-y-8 text-zinc-700">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using Carsgidi&apos;s website or services, you agree to these Terms &amp; Conditions. If making a reservation, you also agree to the Georgia Vehicle Rental Terms applicable to your booking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">2. Reservations</h2>
            <p className="leading-relaxed">
              Reservations are subject to vehicle availability and successful identity verification. You agree that all information you provide is accurate and current.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">3. Vehicle Rental Terms</h2>
            <p className="leading-relaxed">
              For Georgia rentals, the Georgia Vehicle Rental Terms displayed during checkout form part of this agreement. Electronic acceptance by checking the required acknowledgment boxes constitutes your electronic signature.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">4. Payments</h2>
            <p className="leading-relaxed">
              You authorize Carsgidi to charge applicable rental fees, taxes, deposits, tolls, fuel charges, citations, cleaning fees, damage-related costs, and any other lawful charges disclosed during your reservation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">5. Driver Eligibility</h2>
            <p className="leading-relaxed">
              Drivers must satisfy Carsgidi&apos;s eligibility requirements, possess a valid driver&apos;s license, and comply with all applicable laws. Only authorized drivers may operate the vehicle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">6. Prohibited Use</h2>
            <p className="leading-relaxed">
              Vehicles may not be used for unlawful purposes, racing, towing unless authorized, off-road use where prohibited, or by unauthorized drivers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">7. Privacy</h2>
            <p className="leading-relaxed">
              Your use of Carsgidi is also governed by our Privacy Policy. Personal information is collected, used, and protected as described there.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">8. SMS Communications</h2>
            <p className="leading-relaxed mb-3">
              If you voluntarily opt in by selecting the unchecked SMS consent checkbox during registration or checkout, you agree to receive transactional SMS messages from Carsgidi regarding account verification, reservation confirmations, pickup instructions, rental updates, return reminders, payment notifications, and customer support.
            </p>
            <div className="space-y-2 leading-relaxed">
              <p>Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for assistance. SMS consent is not a condition of purchase.</p>
              <p>Mobile phone numbers and SMS opt-in consent are not shared with third parties or affiliates for marketing purposes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">9. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by law, Carsgidi shall not be liable for indirect, incidental, special, or consequential damages arising from use of the website or rental services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">10. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms are governed by the laws of the State of Georgia without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">11. Changes</h2>
            <p className="leading-relaxed">
              Carsgidi may update these Terms at any time by posting the revised version on its website. Continued use constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">12. Contact</h2>
            <div className="bg-zinc-50 rounded-lg p-4 space-y-1">
              <p><strong>Carsgidi</strong></p>
              <p>Website: <a href="https://www.carsgidi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.carsgidi.com</a></p>
              <p>Email: <a href="mailto:support@carsgidi.com" className="text-blue-600 hover:underline">support@carsgidi.com</a></p>
              <p>Privacy: <a href="mailto:privacy@carsgidi.com" className="text-blue-600 hover:underline">privacy@carsgidi.com</a></p>
              <p>Phone: <a href="tel:+14702382358" className="text-blue-600 hover:underline">+1 (470) 238-2358</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Georgia Vehicle Rental Terms</h2>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Parties and Booking: This agreement is between Carsgidi and the guest named in the reservation.</li>
              <li>Rental Period: The vehicle is rented only for the confirmed reservation period. Late returns may incur additional charges.</li>
              <li>Charges: You authorize all applicable rental charges, taxes, deposits, tolls, fuel, citations, cleaning fees, and damage-related costs.</li>
              <li>Driver Requirements: Only authorized, licensed drivers meeting Carsgidi&apos;s requirements may operate the vehicle.</li>
              <li>Insurance and Responsibility: Responsibility for loss or damage applies as permitted by Georgia law and applicable insurance.</li>
              <li>Accidents: Report accidents, theft, or damage immediately to appropriate authorities when required and to Carsgidi.</li>
              <li>Return Condition: Return the vehicle with keys and accessories in substantially the same condition, ordinary wear excepted.</li>
              <li>Communications: Contact information may be used for reservation administration, payment notices, legal communications, and, if separately opted in, transactional SMS messages.</li>
              <li>Electronic Signature: Your acceptance of the required checkboxes during checkout constitutes your electronic signature.</li>
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
