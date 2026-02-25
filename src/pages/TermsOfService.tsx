import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <Layout>
      <article className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-10">Last updated: February 25, 2026</p>

          <div className="space-y-10 text-foreground leading-relaxed">
            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using StoatBridge ("the Service"), available at{" "}
                <a href="https://stoatbridge.com" className="text-primary hover:underline">
                  stoatbridge.com
                </a>
                , you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Service. We reserve the right to update these Terms at any time; continued use of the Service after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground">
                StoatBridge is a free, web-based migration tool that transfers Discord server structures, including channels, categories, roles, permissions, and custom emojis, to the Stoat platform. The Service does not transfer messages, direct messages, user-generated content, or member lists. StoatBridge reads your Discord server structure via its Discord bot, which you add to your server, allows you to review and customize the mapping, and then creates the corresponding structure on Stoat using your Stoat session credentials.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Eligibility and Account Requirements</h2>
              <p className="mb-2 text-muted-foreground">To use StoatBridge, you must:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Be at least 13 years of age (or the minimum age required by Discord and Stoat in your jurisdiction)</li>
                <li>Have administrative or ownership privileges on the Discord server you intend to migrate</li>
                <li>Have a valid Stoat account with permission to create servers</li>
                <li>Have added the StoatBridge bot to the Discord server you intend to migrate</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                You are solely responsible for maintaining the confidentiality of your Stoat session credentials. You agree not to share these credentials or use them in a manner that violates Discord's or Stoat's terms of service.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
              <p className="mb-2 text-muted-foreground">When using StoatBridge, you agree to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Only migrate servers that you own or have explicit permission to migrate</li>
                <li>Review the migration preview carefully before confirming any transfer</li>
                <li>Comply with Discord's Terms of Service and Developer Terms of Service</li>
                <li>Comply with Stoat's Terms of Service and Acceptable Use Policy</li>
                <li>Not use the Service for any unlawful purpose or in violation of any applicable laws or regulations</li>
                <li>Not attempt to reverse-engineer, decompile, or disassemble the Service</li>
                <li>Not use the Service to harass, abuse, or harm others or their communities</li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Prohibited Uses</h2>
              <p className="mb-2 text-muted-foreground">You may not use StoatBridge to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Migrate servers without the server owner's authorization</li>
                <li>Automate mass migrations or use the Service in a way that places undue load on Discord or Stoat APIs</li>
                <li>Circumvent rate limits, access controls, or security measures of the Service or any third-party API</li>
                <li>Collect, store, or transmit personal data of Discord server members through the Service</li>
                <li>Use the Service in connection with any illegal activity, fraud, or intellectual property infringement</li>
                <li>Introduce malicious code, bots, or scripts that interfere with the Service's operation</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The StoatBridge name, logo, user interface design, and underlying code are the intellectual property of the StoatBridge project. You retain full ownership of your Discord server structure data and any content you migrate. By using the Service, you grant us a limited, temporary license to process your server structure data solely for the purpose of completing your migration. This license terminates when your session ends.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">
                StoatBridge relies on and interacts with third-party services including Discord and Stoat. Your use of these services is governed by their respective terms:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>
                  <a href="https://discord.com/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Discord Terms of Service</a>
                </li>
                <li>
                  <a href="https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Discord Developer Terms of Service</a>
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                We are not responsible for the availability, reliability, or actions of any third-party service. Changes to third-party APIs may affect the Service's functionality without notice.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT GUARANTEE THAT ANY MIGRATION WILL BE COMPLETE, ACCURATE, OR SUCCESSFUL.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL STOATBRIDGE, ITS CREATORS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF REVENUE, LOSS OF COMMUNITY MEMBERS, SERVER DISRUPTION, OR DAMAGE TO YOUR DISCORD OR STOAT ACCOUNTS, ARISING OUT OF OR RELATED TO YOUR USE OR INABILITY TO USE THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE (WHICH IS ZERO, AS THE SERVICE IS FREE).
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify, defend, and hold harmless StoatBridge and its creators from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party (including Discord, Stoat, or members of your server community).
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Data and Privacy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. Please review our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
                for detailed information about what data we collect, how we use it, and how we protect it. By using the Service, you consent to the data practices described in the Privacy Policy.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Service Modifications and Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time, with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service. We may also restrict or terminate your access to the Service if we believe you are violating these Terms or using the Service in a harmful manner.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">13. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through good-faith negotiation. If a resolution cannot be reached, disputes shall be submitted to the courts of the applicable jurisdiction.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">14. Severability</h2>
              <p className="text-muted-foreground">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">15. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please reach out to us through our{" "}
                <a href="https://ko-fi.com/stoatbridge" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Ko-fi page
                </a>{" "}
                or open an issue on our project page.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/privacy" className="text-primary hover:underline text-sm">
              View Privacy Policy →
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default TermsOfService;
