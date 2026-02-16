import { Separator } from "@/components/ui/separator";

const steps = [
  {
    step: "1",
    title: "Connect Your Wallet",
    description:
      "Link your Ethereum wallet (MetaMask, WalletConnect, etc.) to create your email identity instantly.",
  },
  {
    step: "2",
    title: "Generate Encryption Keys",
    description:
      "On first login, sign a message to generate your ECDH key pair. Your private key is encrypted and stored securely.",
  },
  {
    step: "3",
    title: "Send & Receive",
    description:
      "Compose encrypted emails to any MetaMail user. Messages are encrypted per-recipient so only they can read them.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in three simple steps.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          {steps.map((item, index) => (
            <div key={item.step}>
              <div className="flex gap-6 py-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
