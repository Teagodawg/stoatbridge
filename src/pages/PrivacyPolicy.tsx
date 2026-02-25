import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <article className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10">Last updated: February 25, 2026</p>

          <div className="space-y-10 text-foreground leading-relaxed">
            {/* Intro */}
            <section>
              <p>
                StoatBridge ("we," "us," or "our") operates the website at{" "}
                <a href="https://stoatbridge.com" className="text-primary hover:underline">
                  stoatbridge.com
                </a>{" "}
                (the "Service"). This Privacy Policy explains what information we collect, how we use it, and the choices you have regarding your data when you use StoatBridge to migrate your Discord server structure to the Stoat platform.
              </p>
            </section>

            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">1.1 Discord Server Structure Data</h3>
              <p className="mb-2">
                When you add the StoatBridge bot to your Discord server and provide your server ID, we read the following data from the Discord API on your behalf:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Server name, icon, and banner image</li>
                <li>Channel names, types (text, voice, announcement), topics, NSFW flags, and ordering</li>
                <li>Category names and their nested channel structure</li>
                <li>Role names, colors, hierarchy positions, and associated permissions</li>
                <li>Per-channel permission overrides for each role</li>
                <li>Custom emoji names and images</li>
                
              </ul>
              <p className="mt-2 text-muted-foreground">
                <strong>Note:</strong> StoatBridge uses its own Discord bot with a server-side bot token. You do not provide a bot token — you simply add the bot to your server and provide your server ID.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">1.2 Stoat Login Credentials &amp; Session Token</h3>
              <p className="text-muted-foreground">
                When you log in to your Stoat account through StoatBridge, your email and password are transmitted over HTTPS to our backend function, which forwards them to the Stoat API to obtain a session token. Your credentials are not stored, logged, or persisted at any point. The resulting session token is used exclusively to authenticate API requests to Stoat on your behalf during the migration process and is held only in your browser's memory.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">1.3 IP Addresses</h3>
              <p className="text-muted-foreground">
                All of our backend functions (including Discord API, Stoat API, Embed Sender, and Bot Advisor) read your IP address from request headers (<code className="text-xs bg-muted px-1 py-0.5 rounded">x-forwarded-for</code>) solely for rate-limiting purposes. IP addresses are held in ephemeral in-memory storage on the server and are not persisted to any database or log file.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Do NOT Collect</h2>
              <p className="mb-2">StoatBridge is a structure-only migration tool. We explicitly do not collect, access, read, or store:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Messages, message content, or message history</li>
                <li>Direct messages (DMs) or group DMs</li>
                <li>User-generated content such as files, images, or attachments (other than server icons/banners during transfer)</li>
                <li>Member lists, user profiles, or personal information of server members</li>
                <li>Voice chat data or activity</li>
                <li>Payment or financial information</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p className="mb-2">The data we collect is used solely for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Migration execution:</strong> Reading your Discord server structure and recreating it on the Stoat platform</li>
                <li><strong>Preview and mapping:</strong> Displaying your server structure so you can review, rename, and customize it before transferring</li>
                <li><strong>Ownership verification:</strong> Confirming that you have administrative access to the Discord server being migrated</li>
                <li><strong>Error reporting:</strong> Providing you with transfer status updates and error details during the migration process</li>
                <li><strong>Rate limiting:</strong> Using IP addresses to enforce fair-use rate limits across all backend functions</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                We do not use your data for advertising, analytics, profiling, or any purpose other than facilitating your migration.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Retention and Deletion</h2>
              <p className="text-muted-foreground mb-2">
                StoatBridge is designed as a transient migration tool. Your data is handled as follows:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Session data:</strong> Stoat session tokens are held in memory during your active browser session and are not persisted to any database.</li>
                <li><strong>Server structure data:</strong> Scanned server data exists only within your browser session (in-memory state). It is not saved to our servers and is lost when you close the tab or navigate away.</li>
                <li><strong>File storage:</strong> During the transfer process, server icon and banner images may be temporarily uploaded to a file storage bucket (<code className="text-xs bg-muted px-1 py-0.5 rounded">migration-assets</code>) to facilitate the migration. These files are not automatically deleted and may persist in storage. We do not use them for any purpose beyond the migration.</li>
                <li><strong>No user database:</strong> We do not maintain a database of user accounts, migration history, or server structures.</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                If you believe any of your data has been retained in error, please contact us and we will promptly investigate.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Services</h2>
              <p className="mb-2 text-muted-foreground">StoatBridge integrates with or loads resources from the following third-party services:</p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.1 Discord API</h3>
              <p className="text-muted-foreground">
                We use the Discord API to read your server structure. Our bot requests only the permissions necessary to read server information (no message reading, no posting, no moderation actions). Discord's own privacy policy applies to data held by Discord:{" "}
                <a href="https://discord.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  discord.com/privacy
                </a>.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.2 Stoat API</h3>
              <p className="text-muted-foreground">
                We use the Stoat API to create servers, channels, roles, and emojis on the Stoat platform on your behalf. Your Stoat session token is used to authenticate these requests. Stoat's own privacy policy governs data stored on their platform.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.3 Hosting &amp; Backend</h3>
              <p className="text-muted-foreground">
                StoatBridge is hosted on Lovable's infrastructure. Backend functions run on Lovable Cloud's secure, isolated serverless environments. Standard web server logs (such as request timestamps and URLs) may be retained by the hosting provider as part of normal operations.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.4 Ko-fi Widget</h3>
              <p className="text-muted-foreground">
                We embed a donation widget from{" "}
                <a href="https://ko-fi.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Ko-fi</a>.
                {" "}This widget loads a script from <code className="text-xs bg-muted px-1 py-0.5 rounded">ko-fi.com</code> which may set its own cookies and collect usage analytics. Ko-fi's privacy policy applies:{" "}
                <a href="https://more.ko-fi.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  more.ko-fi.com/privacy
                </a>.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.5 Google Fonts</h3>
              <p className="text-muted-foreground">
                We load font files via <code className="text-xs bg-muted px-1 py-0.5 rounded">fonts.googleapis.com</code>. When your browser requests these fonts, Google may log the request (including your IP address). Google's privacy policy applies:{" "}
                <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  policies.google.com/privacy
                </a>.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.6 AI Gateway (Bot Advisor)</h3>
              <p className="text-muted-foreground">
                The Bot Advisor feature sends bot names and publicly scraped bot directory data to an AI service (currently Google Gemini, via Lovable's AI gateway) to generate setup suggestions. No personal data (such as your email, IP address, or tokens) is included in these AI requests. The AI service processes the request and returns suggestions; we do not store the AI responses.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies and Local Storage</h2>
              <p className="text-muted-foreground mb-2">
                StoatBridge does not use tracking cookies, advertising cookies, or third-party analytics cookies. We use the following browser storage mechanisms:
              </p>
              <p className="mb-2 text-muted-foreground">
                StoatBridge does not set any first-party cookies. We use your browser's localStorage for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Embed Studio templates:</strong> Saved embed configurations so they persist between visits.</li>
                <li><strong>Sender profile:</strong> Your webhook display name and avatar URL for the Embed Sender.</li>
                <li><strong>Last-used destination:</strong> The most recently used server ID and channel ID in the Embed Sender.</li>
                <li><strong>Backend session:</strong> Authentication session data used by the backend client library to maintain your connection.</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                All localStorage data remains entirely on your device and is not transmitted to any server.
              </p>
              <p className="mt-2 text-muted-foreground">
                Third-party scripts (such as the Ko-fi widget) may set their own cookies as described in Section 5.4 above.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Security</h2>
              <p className="text-muted-foreground">
                We take reasonable measures to protect your data during transmission and processing. All API communications between your browser, our backend, Discord, and Stoat occur over HTTPS/TLS encrypted connections. Tokens are handled server-side and are never exposed in client-side code or URLs. Backend functions perform server-side validation on incoming requests to guard against misuse. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                StoatBridge is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal data, please contact us and we will take steps to delete such information. Use of Discord and Stoat is subject to their respective age requirements and terms of service.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Your Rights</h2>
              <p className="mb-2 text-muted-foreground">Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Request access to any personal data we hold about you</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Withdraw consent at any time (by removing the bot from your server or ending your session)</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Since we do not persistently store personal data (beyond migration-assets files), most of these rights are satisfied by default. If you have any concerns, please contact us.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Your continued use of StoatBridge after any changes constitutes your acceptance of the revised policy. We encourage you to review this page periodically.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us through our{" "}
                <a href="https://ko-fi.com/stoatbridge" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Ko-fi page
                </a>{" "}
                or open an issue on our project page.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/terms" className="text-primary hover:underline text-sm">
              View Terms of Service →
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default PrivacyPolicy;