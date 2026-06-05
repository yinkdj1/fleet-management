"use client";

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-zinc-500 mb-8">Last Updated: June 5, 2026</p>

        <div className="space-y-8 text-zinc-700">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">1. Agreement to Terms</h2>
            <p className="leading-relaxed">
              By accessing and using Carsgidi's vehicle rental services ("Services"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use our Services. These Terms constitute a legally binding agreement between you and Carsgidi.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">2. Eligibility Requirements</h2>
            <p className="leading-relaxed mb-2">To rent a vehicle from Carsgidi, you must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Be at least 21 years of age</li>
              <li>Possess a valid driver's license issued by a U.S. state or territory</li>
              <li>Have a valid credit or debit card in your name</li>
              <li>Provide accurate and complete personal information</li>
              <li>Not be prohibited from renting vehicles under applicable law</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We reserve the right to verify your identity and driving credentials before releasing any vehicle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">3. Reservation and Booking</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Making a Reservation</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>All reservations must be made through our website or mobile application</li>
                  <li>A valid payment method is required to confirm your reservation</li>
                  <li>Reservation confirmation will be sent to your registered email address</li>
                  <li>Vehicle availability is subject to confirmation</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Modification and Cancellation</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You may modify or cancel your reservation through your booking management link</li>
                  <li>Free cancellation is available up to 24 hours before the scheduled pickup time</li>
                  <li>Cancellations within 24 hours of pickup will incur a 50% cancellation fee</li>
                  <li>No-shows (failure to pick up the vehicle) are non-refundable</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">4. Pricing and Payment</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Rental Rates</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Daily rental rates are displayed during the booking process</li>
                  <li>Rates may vary based on vehicle type, rental duration, and demand</li>
                  <li>Multi-day rentals may qualify for discounted rates</li>
                  <li>All prices are in U.S. dollars (USD)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Additional Fees</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Service/Platform Fee:</strong> Applied per day of rental</li>
                  <li><strong>Protection Plan:</strong> Mandatory coverage included in all rentals</li>
                  <li><strong>Taxes:</strong> Applicable state and local taxes will be added</li>
                  <li><strong>Security Deposit:</strong> Refundable deposit held during rental period</li>
                  <li><strong>Late Return Fee:</strong> Charged for returns beyond scheduled time</li>
                  <li><strong>Fuel Fee:</strong> Charged if vehicle is not returned with same fuel level</li>
                  <li><strong>Cleaning Fee:</strong> Applied if vehicle requires excessive cleaning</li>
                  <li><strong>Damage Fee:</strong> Charged for any damage to the vehicle</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Payment Authorization</h3>
                <p className="leading-relaxed">
                  By providing your payment information, you authorize Carsgidi to charge your payment method for all rental fees, additional charges, and any damages or violations incurred during the rental period.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">5. Vehicle Use and Restrictions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Permitted Use</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Vehicles may only be driven by the authorized renter listed on the reservation</li>
                  <li>Vehicles must be used for lawful purposes only</li>
                  <li>Daily mileage limits apply as specified in your rental agreement</li>
                  <li>Overage charges of $0.25 per mile apply for exceeding mileage limits</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Prohibited Use</h3>
                <p className="leading-relaxed mb-2">You may NOT use the vehicle for:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Racing, speed contests, or any competitive driving events</li>
                  <li>Towing or pushing any vehicle, trailer, or other object</li>
                  <li>Transporting illegal substances or contraband</li>
                  <li>Driving while under the influence of alcohol or drugs</li>
                  <li>Off-road driving or on unpaved roads</li>
                  <li>Transporting more passengers than the vehicle's capacity</li>
                  <li>Subletting or lending the vehicle to others</li>
                  <li>Transporting hazardous materials</li>
                  <li>Any illegal activity</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">6. Insurance and Liability</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Protection Plan</h3>
                <p className="leading-relaxed">
                  All rentals include a basic protection plan that provides limited coverage for vehicle damage. The protection plan does not cover:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Damage caused by prohibited use or negligence</li>
                  <li>Interior damage or stains</li>
                  <li>Lost or stolen keys</li>
                  <li>Towing charges</li>
                  <li>Traffic violations or parking tickets</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Your Responsibility</h3>
                <p className="leading-relaxed">
                  You are responsible for all damage to the vehicle during the rental period, including but not limited to collision damage, theft, vandalism, and weather-related damage. You agree to pay all costs associated with repairing or replacing the vehicle.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">7. Vehicle Condition and Inspection</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Check-Out Inspection</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You must inspect the vehicle before driving it</li>
                  <li>Report any pre-existing damage immediately</li>
                  <li>Photos will be taken during check-out to document vehicle condition</li>
                  <li>Fuel level will be recorded at check-out</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Check-In Inspection</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Vehicle must be returned in the same condition as received</li>
                  <li>Fuel level must match the check-out level</li>
                  <li>Photos will be taken during check-in to document condition</li>
                  <li>Any new damage will be assessed and charged accordingly</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">8. Late Returns and Extensions</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Vehicles must be returned by the scheduled return date and time</li>
              <li>Late returns will incur additional charges at the daily rate plus a late fee</li>
              <li>If you need to extend your rental, contact us before the scheduled return time</li>
              <li>Extensions are subject to vehicle availability and additional charges</li>
              <li>Failure to return the vehicle may result in the vehicle being reported as stolen</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">9. Accidents and Breakdowns</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">In Case of Accident</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Contact emergency services (911) if there are injuries</li>
                  <li>Notify Carsgidi immediately at +1 (470) 238-2358</li>
                  <li>Do not admit fault or liability</li>
                  <li>Obtain contact and insurance information from other parties</li>
                  <li>Take photos of the accident scene and damage</li>
                  <li>File a police report if required by law</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Vehicle Breakdown</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Contact Carsgidi immediately for assistance</li>
                  <li>Do not attempt repairs yourself</li>
                  <li>We will arrange for roadside assistance or a replacement vehicle</li>
                  <li>You are not responsible for mechanical failures due to normal use</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">10. Traffic Violations and Fines</h2>
            <p className="leading-relaxed">
              You are responsible for all traffic violations, parking tickets, toll charges, and other fines incurred during the rental period. If we receive notice of any violation, we will charge your payment method for the fine amount plus an administrative fee.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">11. Personal Property</h2>
            <p className="leading-relaxed">
              Carsgidi is not responsible for any personal property left in the vehicle. Please ensure you remove all belongings before returning the vehicle. Any items found will be held for 30 days before being disposed of.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">12. Termination of Rental</h2>
            <p className="leading-relaxed mb-2">
              We reserve the right to terminate your rental and repossess the vehicle without notice if:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You violate any terms of this agreement</li>
              <li>You provide false information</li>
              <li>The vehicle is used for illegal purposes</li>
              <li>Payment is declined or insufficient</li>
              <li>The vehicle is abandoned or not returned on time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">13. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, Carsgidi shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our Services or rental vehicles. Our total liability shall not exceed the total amount paid for your rental.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">14. Indemnification</h2>
            <p className="leading-relaxed">
              You agree to indemnify, defend, and hold harmless Carsgidi, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney's fees) arising from your use of the vehicle or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">15. Dispute Resolution</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Governing Law</h3>
                <p className="leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to its conflict of law provisions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Arbitration</h3>
                <p className="leading-relaxed">
                  Any dispute arising from these Terms or your use of our Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to a jury trial.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">16. Changes to Terms</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of our Services after changes are posted constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">17. Severability</h2>
            <p className="leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">18. SMS/Text Messaging Program</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Program Description</h3>
                <p className="leading-relaxed">
                  Carsgidi offers an SMS/text messaging program to send you important notifications about your vehicle rental, including:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Booking confirmations and reminders</li>
                  <li>Pickup and return notifications</li>
                  <li>Vehicle status updates</li>
                  <li>Late return alerts</li>
                  <li>Payment confirmations</li>
                  <li>Customer service messages</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Message Frequency</h3>
                <p className="leading-relaxed">
                  Message frequency varies based on your rental activity. You may receive up to 10 messages per rental, including booking confirmation, pickup reminders, midway check-ins, return reminders, and payment notifications.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Message and Data Rates</h3>
                <p className="leading-relaxed">
                  <strong>Message and data rates may apply.</strong> Standard text messaging rates from your mobile carrier will apply to all SMS messages sent and received. Please contact your mobile carrier for details about your messaging plan.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">How to Get Help</h3>
                <p className="leading-relaxed">
                  For help with SMS messages, text <strong>HELP</strong> to the number from which you received the message, or contact us at:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Email: <a href="mailto:support@carsgidi.com" className="text-blue-600 hover:underline">support@carsgidi.com</a></li>
                  <li>Phone: <a href="tel:+14702382358" className="text-blue-600 hover:underline">+1 (470) 238-2358</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">How to Stop Messages</h3>
                <p className="leading-relaxed">
                  To stop receiving SMS messages from Carsgidi, text <strong>STOP</strong> to the number from which you received the message. After texting STOP, you will receive one final confirmation message. You may also opt out by contacting customer support.
                </p>
                <p className="leading-relaxed mt-2">
                  <strong>Important:</strong> Opting out of SMS messages may affect your ability to receive important booking updates and notifications. You will still receive critical messages related to active reservations.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Supported Carriers</h3>
                <p className="leading-relaxed">
                  Our SMS program is supported by all major U.S. carriers including AT&T, T-Mobile, Verizon, Sprint, and others. Carrier message and data rates may apply.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">19. Contact Information</h2>
            <p className="leading-relaxed mb-2">
              For questions about these Terms and Conditions, please contact us:
            </p>
            <div className="bg-zinc-50 rounded-lg p-4 space-y-1">
              <p><strong>Carsgidi</strong></p>
              <p>Email: <a href="mailto:support@carsgidi.com" className="text-blue-600 hover:underline">support@carsgidi.com</a></p>
              <p>Phone: <a href="tel:+14702382358" className="text-blue-600 hover:underline">+1 (470) 238-2358</a></p>
              <p>Legal: <a href="mailto:legal@carsgidi.com" className="text-blue-600 hover:underline">legal@carsgidi.com</a></p>
              <p>SMS Support: Text <strong>HELP</strong> or <strong>STOP</strong> to any message</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200">
          <p className="text-sm text-zinc-500 text-center">
            By making a reservation and using Carsgidi's services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </div>
    </main>
  );
}
