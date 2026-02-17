import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MetaMailLogo } from "@/components/metamail-logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <MetaMailLogo size={24} />
            <span className="font-bold">MetaMail</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 18, 2024</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Welcome to MetaMail, the privacy-focused, end-to-end encrypted email service. MetaMail is dedicated to safeguarding the privacy and security of our users&apos; information. This Privacy Policy explains our practices regarding the collection, use, and sharing of your information when you utilize our Service.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">Legal Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaMail adheres to all applicable laws and regulations regarding data protection and user privacy. This includes compliance with regulations such as the General Data Protection Regulation (GDPR) for our users in the European Union, the California Consumer Privacy Act (CCPA) for our users in California, USA, and any other data protection laws relevant to the regions where we operate.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please be aware that the use of MetaMail is also subject to our <Link href="/terms" className="text-primary underline">Terms of Service</Link>, which outline the eligibility requirements for our users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access our services, you authenticate using your wallet&apos;s signature, which means your blockchain address becomes known to us. Remember that any transactions or information associated with your address are publicly accessible on the blockchain.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Following our protocol, you locally generate a key pair and associated metadata, designed to help with the local decryption of your encrypted private key. You then upload the encrypted key pair and metadata to our servers. Your public key is accessible to anyone to enable encrypted communication, while your encrypted private key is securely stored on our servers. This ensures only you, with your blockchain account&apos;s private key, can decrypt it.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              While your emails are end-to-end encrypted within MetaMail, please be aware that when sending to or receiving emails from external email services, the content of your emails will be transmitted in plain text and not encrypted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Usage Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to improve service functionality and user experience. To achieve this, we use Google Analytics to collect Usage Data. This data includes, but is not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-3">
              <li>Access times</li>
              <li>Device information</li>
              <li>IP addresses</li>
              <li>Browser types</li>
              <li>Language preferences</li>
              <li>Pages viewed</li>
              <li>The order of page views</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Google Analytics employs cookies and similar technologies to collect and analyze this information. You can learn more about how Google collects and processes data on their{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy page</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Opting Out of Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can choose to prevent Google Analytics from collecting your data at any time by:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-3">
              <li>
                <strong>Opting out of Google Analytics cookies:</strong> Install the{" "}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Analytics opt-out browser add-on</a>.
              </li>
              <li>
                <strong>Adjusting your browser settings:</strong> Most browsers allow you to control cookies, including blocking them entirely. Refer to your browser&apos;s help documentation for instructions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>To facilitate secure access to our Service using your wallet signature</li>
              <li>To provide, maintain, and improve the Service</li>
              <li>To communicate with you, including responding to your support needs</li>
              <li>To enforce our terms, conditions, and policies</li>
              <li>To comply with legal requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use advanced security measures to protect your stored personal data, including encryption and secure key management. Our security measures are continually enhanced in response to technological advancements.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please be aware that data transmission over the Internet cannot be guaranteed to be 100% secure. While we strive to protect your information, we cannot warrant the security of any information you transmit to us via the Internet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You maintain the right to control your personal information. Should you wish to access, correct, or delete any personal information we hold, please contact us at{" "}
              <a href="mailto:metamail@mmail.ink" className="text-primary underline">metamail@mmail.ink</a>.
              Please note that as your private key is encrypted, we are unable to decrypt it and access information that you have encrypted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Updates to our Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaMail may update this Privacy Policy from time to time and inform you on the Websites that the policy has been amended. The current version of the Privacy Policy, as published on our Website, is applicable. With each update to our policies, we will note which sections have been updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any inquiries regarding this Privacy Policy, please contact us at{" "}
              <a href="mailto:metamail@mmail.ink" className="text-primary underline">metamail@mmail.ink</a>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By using MetaMail, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
