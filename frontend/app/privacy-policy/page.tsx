"use client";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-8">Last Updated: June 5, 2026</p>

        <div className="space-y-8 text-zinc-700">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to Carsgidi ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our vehicle rental services and website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Personal Information</h3>
                <p className="leading-relaxed mb-2">When you make a reservation or use our services, we collect:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Full name and contact information (email, phone number)</li>
                  <li>Physical address</li>
                  <li>Driver's license number and expiration date</li>
                  <li>Date of birth</li>
                  <li>Payment information (credit/debit card details)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Booking Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Rental dates and times</li>
                  <li>Vehicle preferences and selections</li>
                  <li>Pickup and return locations</li>
                  <li>Special requests or requirements</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-2">Usage Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent on our website</li>
                  <li>Referring website addresses</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">3. How We Use Your Information</h2>
            <p className="leading-relaxed mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process and manage your vehicle reservations</li>
              <li>Verify your identity and driver's license</li>
              <li>Process payments and prevent fraud</li>
              <li>Send booking confirmations and important updates</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our services and website functionality</li>
              <li>Send promotional offers and marketing communications (with your consent)</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="leading-relaxed mb-2">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service Providers:</strong> Payment processors, identity verification services, email service providers, and cloud storage providers</li>
              <li><strong>Legal Requirements:</strong> Law enforcement, government agencies, or courts when required by law</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> Any other parties you authorize us to share your information with</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">5. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure payment processing through PCI-DSS compliant providers</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication measures</li>
              <li>Employee training on data protection practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">6. Your Privacy Rights</h2>
            <p className="leading-relaxed mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
              <li><strong>Object:</strong> Object to processing of your personal information for certain purposes</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, please contact us at <a href="mailto:privacy@carsgidi.com" className="text-blue-600 hover:underline">privacy@carsgidi.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">7. Cookies and Tracking Technologies</h2>
            <p className="leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our website. Cookies help us remember your preferences, analyze site traffic, and improve our services. You can control cookie settings through your browser, but disabling cookies may affect website functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">8. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Booking records are typically retained for 7 years for tax and legal compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">9. Children's Privacy</h2>
            <p className="leading-relaxed">
              Our services are not intended for individuals under the age of 21. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">10. International Data Transfers</h2>
            <p className="leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of our services after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">12. Contact Us</h2>
            <p className="leading-relaxed mb-2">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-zinc-50 rounded-lg p-4 space-y-1">
              <p><strong>Carsgidi</strong></p>
              <p>Email: <a href="mailto:privacy@carsgidi.com" className="text-blue-600 hover:underline">privacy@carsgidi.com</a></p>
              <p>Phone: <a href="tel:+14702382358" className="text-blue-600 hover:underline">+1 (470) 238-2358</a></p>
              <p>Support: <a href="mailto:support@carsgidi.com" className="text-blue-600 hover:underline">support@carsgidi.com</a></p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200">
          <p className="text-sm text-zinc-500 text-center">
            By using Carsgidi's services, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
