"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  createSmartAccountClient,
  type SmartAccountClient,
} from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  usePrivy,
  useWallets,
  type ConnectedWallet,
} from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { activeChain } from "@/lib/chain";

type SmartWalletState = {
  address: `0x${string}` | null;
  client: SmartAccountClient | null;
  ready: boolean;
};

const SmartWalletContext = createContext<SmartWalletState>({
  address: null,
  client: null,
  ready: false,
});

export const useSmartWallet = () => useContext(SmartWalletContext);

export function SmartWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const [state, setState] = useState<SmartWalletState>({
    address: null,
    client: null,
    ready: false,
  });

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const bundlerUrl = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL;

  useEffect(() => {
    if (!privyReady || !embeddedWallet || !bundlerUrl) return;
    let cancelled = false;

    async function init(wallet: ConnectedWallet) {
      const provider = await wallet.getEthereumProvider();

      const account = await toKernelSmartAccount({
        client: createPublicClient({ chain: activeChain, transport: http() }),
        entryPoint: { address: entryPoint07Address, version: "0.7" },
        owners: [
          createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: activeChain,
            transport: custom(provider),
          }),
        ],
        version: "0.3.1",
      });

      const pimlico = createPimlicoClient({
        transport: http(bundlerUrl),
        entryPoint: { address: entryPoint07Address, version: "0.7" },
      });

      const client = createSmartAccountClient({
        account,
        chain: activeChain,
        bundlerTransport: http(bundlerUrl),
        paymaster: pimlico,
        userOperation: {
          estimateFeesPerGas: async () =>
            (await pimlico.getUserOperationGasPrice()).fast,
        },
      });

      if (cancelled) return;
      setState({ address: account.address, client, ready: true });
    }

    init(embeddedWallet);

    return () => {
      cancelled = true;
    };
  }, [privyReady, embeddedWallet, bundlerUrl]);

  return (
    <SmartWalletContext.Provider value={state}>
      {children}
    </SmartWalletContext.Provider>
  );
}
