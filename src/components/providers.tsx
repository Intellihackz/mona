"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletProvider } from "@/hooks/use-smart-wallet";
import { activeChain } from "@/lib/chain";

function MissingConfig() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">MONA</h1>
      <p className="text-white/50">
        Set <code className="font-mono text-white/80">NEXT_PUBLIC_PRIVY_APP_ID</code>{" "}
        in <code className="font-mono text-white/80">.env.local</code> to start. Get one
        at{" "}
        <a
          href="https://dashboard.privy.io"
          className="text-[#836EF9] underline"
          target="_blank"
          rel="noreferrer"
        >
          dashboard.privy.io
        </a>
        .
      </p>
    </main>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <MissingConfig />;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet", "email", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: activeChain,
        supportedChains: [activeChain],
        appearance: {
          theme: "dark",
          accentColor: "#836EF9",
          landingHeader: "Sign in to MONA",
        },
      }}
    >
      <SmartWalletProvider>{children}</SmartWalletProvider>
    </PrivyProvider>
  );
}
