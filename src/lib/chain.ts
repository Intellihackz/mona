import { monad, monadTestnet } from "viem/chains";

export const activeChain =
  process.env.NEXT_PUBLIC_MONAD_NETWORK === "mainnet" ? monad : monadTestnet;
