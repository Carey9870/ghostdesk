// path: apps/web/src/app/terms/page.tsx
// purpose: Terms of Service for GhostDesk: license, subscriptions, responsibilities, disclaimers and governing law.
import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { legal } from '@/lib/legal';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terms of Service | GhostDesk' };

export default function Terms() {
  const { company, email } = legal();
  return (
    <LegalPage title="Terms of Service">
      <p>These terms are an agreement between you and {company} (“we”, “us”) covering your use of the GhostDesk app and website. By buying a subscription or using GhostDesk you agree to them and to our <a href="/privacy">Privacy Policy</a>.</p>

      <h2>1. The service</h2>
      <p>GhostDesk is software that stores files in an encrypted vault on your own computer. We grant you a personal, non-exclusive, non-transferable license to use it on up to three of your devices while you have an active subscription. You must be at least 18 years old. Without a subscription you can create folders and add one file; adding more files requires an active subscription.</p>

      <h2>2. Subscriptions and payment</h2>
      <ul>
        <li>Plans are USD 5 per week or USD 20 per year, charged in US dollars through Paystack. Prices shown at checkout apply to your purchase.</li>
        <li>Subscriptions renew automatically at the end of each period until you cancel. By subscribing you authorise recurring charges to your card.</li>
        <li>You can cancel at any time from “Manage subscription” in the app. Cancellation stops future charges and your access continues until the end of the period you have paid for.</li>
        <li>Except where the law requires otherwise, payments already made are not refunded.</li>
        <li>We may change prices for future periods and will tell you in advance. Taxes may apply where required.</li>
      </ul>

      <h2>3. When a subscription ends</h2>
      <p>If your subscription lapses, GhostDesk switches to read-only mode: you can still unlock your vault, view your files and export them, but you cannot add new files or sections until you renew.</p>

      <h2>4. Your responsibilities</h2>
      <ul>
        <li><b>Your passphrase, pattern and recovery key are yours alone.</b> We do not have them and cannot reset or recover them. If you lose all of them, your files cannot be opened by anyone, including us.</li>
        <li>Keep your license key and recovery key private, and keep your own backups. Renew your recovery key if you think it has been exposed.</li>
        <li>You are responsible for the files you store and must have the right to store them. Do not use GhostDesk for anything unlawful.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You may not share or resell license keys, exceed the device limit, copy, modify or reverse engineer GhostDesk except where the law allows it, circumvent licensing or security features, or interfere with our servers.</p>

      <h2>6. Security limits</h2>
      <p>GhostDesk uses strong, standard encryption and is designed to protect your files from casual access, shared devices and lost or stolen computers. It cannot protect files that are open or visible on screen, and it cannot defend against malware, keyloggers or someone with full control of your computer. Using a decoy vault does not guarantee protection in every situation.</p>

      <h2>7. Intellectual property</h2>
      <p>GhostDesk, its code and branding belong to {company} or its licensors. You keep all rights in your own files. We claim no rights in them and never access them.</p>

      <h2>8. Disclaimers</h2>
      <p>GhostDesk is provided “as is” and “as available”. To the extent the law allows, we make no warranties of any kind, including that it will be uninterrupted, error-free or that it will fit your particular purpose. Keep backups of anything important.</p>

      <h2>9. Limitation of liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential loss, or for loss of data, profits or opportunity, including loss caused by forgotten credentials, lost devices or malware. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim arose. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>10. Suspension and termination</h2>
      <p>We may suspend or end a license if you breach these terms or misuse the service. You may stop using GhostDesk at any time. Your vault stays on your device and remains yours.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of Kenya, and the courts of Kenya have jurisdiction, without affecting any mandatory consumer rights you have where you live.</p>

      <h2>12. Changes and contact</h2>
      <p>We may update these terms and will change the date above when we do. Continuing to use GhostDesk after a change means you accept it. Questions: <a href={`mailto:${email}`}>{email}</a>.</p>
    </LegalPage>
  );
}
