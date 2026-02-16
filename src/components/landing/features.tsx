import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, ShieldCheck, Lock, FileSignature } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Wallet-Based Identity",
    description:
      "Use your Ethereum wallet or ENS name as your email address. No sign-up forms, no passwords to remember.",
  },
  {
    icon: Lock,
    title: "P2P Encryption",
    description:
      "Emails are encrypted end-to-end using ECDH key exchange. Only you and your recipient can read the content.",
  },
  {
    icon: FileSignature,
    title: "Digital Signatures",
    description:
      "Every email is cryptographically signed with your wallet, proving authenticity and preventing forgery.",
  },
  {
    icon: ShieldCheck,
    title: "You Own Your Keys",
    description:
      "Your encryption keys are generated in your browser and stored encrypted. Only your wallet can unlock them.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Email, reimagined for Web3
          </h2>
          <p className="text-lg text-muted-foreground">
            Combining the simplicity of email with the security of blockchain
            cryptography.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 bg-background shadow-sm"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
