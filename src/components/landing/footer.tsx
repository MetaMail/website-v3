import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-5 w-5" />
            <span className="font-medium">MetaMail</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Encrypted email for the decentralized web.
          </p>
        </div>
      </div>
    </footer>
  );
}
