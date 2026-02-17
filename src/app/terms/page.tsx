import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MetaMailLogo } from "@/components/metamail-logo";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 2, 2024</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <p className="font-semibold">
            PLEASE READ THESE TERMS OF SERVICE BEFORE USING THE WEBSITES.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">Acceptance of the Terms of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to MetaMail! Please read the Terms of Service carefully before you start to use the Websites. These terms of service are entered into by and between you and MetaMail (the &ldquo;MMail&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;). The following terms and conditions, together with any documents they expressly incorporate by reference (collectively, these &ldquo;Terms of Service&rdquo;), govern your access to and use of any website published by MetaMail, including, but not limited to, any content, functionality, and services offered on or through metamail.ink, mmail-test.ink (the &ldquo;Websites&rdquo;).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By using the Websites or by clicking to accept or agree to the Terms of Service when this option is made available to you, you accept and agree to be bound and abide by these Terms of Service in addition to our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              If you do not agree to these Terms of Service, you must not access or use the Websites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Definitions</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong>&ldquo;Service&rdquo;</strong> refers to the MetaMail platform, including any associated websites, applications, services, and features provided to you.</li>
              <li><strong>&ldquo;User&rdquo;</strong> refers to any individual or entity that uses the Service.</li>
              <li><strong>&ldquo;Content&rdquo;</strong> includes all forms of data, text, software, music, sound, photographs, graphics, video, messages, or other materials.</li>
              <li><strong>&ldquo;Law&rdquo;</strong> or <strong>&ldquo;Laws&rdquo;</strong> refers to any local, state, federal, national, or international statutes, regulations, ordinances, and other legal requirements that apply to the use of the Service and the conduct of the User.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaMail is an email communication platform that allows users to send, receive, and manage email messages. The Service may also include additional features such as file attachments, calendar integration, and contact management.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Who May Use the Websites</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Websites are offered and available to users who are 13 years of age or older. By using the Websites, you represent and warrant that you (i) are 13 years of age or older, (ii) are not barred to use the Websites under any applicable law, and (iii) are using the Websites only for your own personal use.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              If you are in a location where end-to-end encryption is not allowed, you are prohibited from accessing or using the Site and the Services. Additionally, the use of virtual private networks (VPNs) or any other methods to circumvent geographical restrictions is strictly forbidden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to the Terms of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may revise and update these Terms of Service from time to time in our sole discretion. All changes are effective immediately when we post them. Your continued use of the Websites following the posting of revised Terms of Service means that you accept and agree to the changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Accessing the Websites and Account Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to withdraw or amend the Websites, and any service or material we provide on the Websites, in our sole discretion without notice. We will not be liable if for any reason all or any part of the Websites are unavailable at any time or for any period.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
              <li>Making all arrangements necessary for you to have access to the Websites</li>
              <li>Ensuring that all persons who access the Websites through your internet connection are aware of these Terms of Service and comply with them</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Websites and their entire contents, features, and functionality are owned by MetaMail, its licensors or other providers of such material and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">User Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of any content that you submit, post, or transmit through the Service. By submitting User Content, you grant MetaMail a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, distribute, and display the User Content for the purpose of providing the Service. MetaMail does not claim ownership over any User Content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You may use the Websites only for lawful purposes and in accordance with these Terms of Service. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Violate any applicable federal, state, local, or international law or regulation</li>
              <li>Exploit, harm, or attempt to exploit or harm minors in any way</li>
              <li>Transmit any advertising or promotional material without our prior written consent</li>
              <li>Impersonate or attempt to impersonate MetaMail or any other person or entity</li>
              <li>Use any robot, spider, or other automatic device to access the Websites</li>
              <li>Introduce any viruses, trojan horses, worms, logic bombs, or other harmful material</li>
              <li>Attempt to gain unauthorized access to any parts of the Websites</li>
              <li>Attack the Websites via a denial-of-service attack</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaMail takes your privacy seriously. The collection, use, and disclosure of your personal information are governed by our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>. By using the Service, you consent to the collection and use of your personal information as described therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaMail reserves the right to suspend or terminate your access to the Service, with or without cause, at any time and without notice. Upon termination, your right to use the Service will cease, and any User Content associated with your account may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-xs">
              Your use of the Websites, their content and any services or items obtained through the Websites is at your own risk. The Websites, their content and any services or items obtained through the Websites are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without any warranties of any kind, either express or implied. MetaMail hereby disclaims all warranties of any kind, whether express or implied, statutory, or otherwise, including but not limited to any warranties of merchantability, non-infringement, and fitness for particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Limitation on Liability</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-xs">
              In no event will MetaMail, its affiliates or their licensors, service providers, employees, agents, officers, or directors be liable for damages of any kind, under any legal theory, arising out of or in connection with your use, or inability to use, the Websites, including any direct, indirect, special, incidental, consequential or punitive damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to defend, indemnify, and hold harmless MetaMail, its affiliates, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms of Service or your use of the Websites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              All feedback, comments, requests for technical support and other communications relating to the Websites should be directed to:{" "}
              <a href="mailto:metamail@mmail.ink" className="text-primary underline">metamail@mmail.ink</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
