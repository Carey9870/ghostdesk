// path: apps/web/src/app/privacy/page.tsx
// purpose: Privacy Policy. Describes exactly what the website, license server and app collect (and that your files are never collected).
import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { legal } from '@/lib/legal';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Privacy Policy | GhostDesk' };

export default function Privacy() {
  const { company, email } = legal();
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what {company} (“we”, “us”) collects when you use the GhostDesk website and app, why, and what your rights are. You can reach us at <a href={`mailto:${email}`}>{email}</a>.</p>

      <h2>Your files stay on your device</h2>
      <p>GhostDesk is designed so that we never receive your files. Documents, photos, videos, section names, file names, passphrases, patterns and recovery keys are stored and encrypted on your own computer. They are never uploaded to us, and the app contains no analytics or tracking. Because we never hold your passphrase or recovery key, we cannot open your vault or recover it for you.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Purchase details:</b> your email address, your Paystack customer code, transaction references, the plan you chose, amounts, dates and subscription status. Your card details are entered into Paystack and are never seen or stored by us.</li>
        <li><b>License details:</b> your license key and a random device identifier that the app creates for itself (it is not derived from your hardware or personal information), with the dates each device first and last contacted us. This lets us enforce the three-device limit.</li>
        <li><b>Technical data:</b> your IP address and basic request information in our server logs and rate limiting, used to keep the service secure and to troubleshoot problems.</li>
        <li><b>Website analytics:</b> when you visit our website we record the pages you view, the website you came from, an approximate location (country and city, derived from your IP address at the edge and not stored with it), your device type, browser and system, and how long you stay on a page. We do not store your IP address and we use no cookies for this. A salted hash that changes every day lets us count visitors within one day and cannot be reversed. We honour your browser’s Do Not Track setting. The GhostDesk app itself sends us no analytics.</li>
        <li><b>Messages you send us:</b> if you contact support, we keep the correspondence.</li>
      </ul>
      <p>The website does not use advertising or tracking cookies.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide GhostDesk: take payment, issue and verify your license key, email you the key and manage your subscription (performance of our contract with you).</li>
        <li>To protect the service against abuse and fraud and to keep it running (our legitimate interests).</li>
        <li>To meet tax, accounting and other legal obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We use service providers to run GhostDesk: Paystack (payment processing and subscription billing), Resend (sending your license key email), and our hosting and database providers. They process data only to provide their service to us and under their own privacy terms. We do not sell your data and we do not share it for advertising.</p>
      <p>Some providers operate outside Kenya. Where data is transferred abroad, we rely on appropriate safeguards required by applicable data protection law.</p>

      <h2>How long we keep it</h2>
      <p>We keep license and purchase records for as long as your subscription is active and afterwards for as long as tax, accounting or legal requirements oblige us to. Server logs are kept only for the limited period needed for security and troubleshooting. You can ask us to delete your license record at any time, which ends your access to the subscription.</p>

      <h2>Your rights</h2>
      <p>Under the Kenya Data Protection Act, 2019 and, where it applies to you, the GDPR, you can ask us to give you access to your personal data, correct it, delete it, restrict or object to its use, or give you a portable copy. Write to <a href={`mailto:${email}`}>{email}</a> and we will respond within the time the law requires. You also have the right to complain to the Office of the Data Protection Commissioner in Kenya or your local data protection authority.</p>

      <h2>Security</h2>
      <p>We protect the data we hold with encryption in transit, access controls and signed license tokens. No system is perfectly secure, so please keep your license key private.</p>

      <h2>Children</h2>
      <p>GhostDesk is not intended for anyone under 18, and we do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date above and, for significant changes, tell you by email or on the website.</p>
    </LegalPage>
  );
}
