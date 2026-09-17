"use client";

import { usePrivy } from "@privy-io/react-auth";
import { VideoBackground } from "@/components/video-background";
import { CursorDrivenParticleTypography } from "@/components/ui/cursor-driven-particles-typography";
import { CyberButton } from "@/components/ui/cyber-button";
import { ArrowRight } from "lucide-react";

function CornerFrame() {
  const arm = "absolute h-10 w-10 border-white/60 lg:h-14 lg:w-14";
  return (
    <div className="pointer-events-none absolute inset-3 z-30">
      <span className={`${arm} left-0 top-0 border-l border-t`} />
      <span className={`${arm} right-0 top-0 border-r border-t`} />
      <span className={`${arm} bottom-0 left-0 border-b border-l`} />
      <span className={`${arm} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

export default function Home() {
  const { ready, authenticated, user, login } = usePrivy();

  const address = user?.wallet?.address;
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="min-h-screen w-full bg-black p-5 text-white lg:p-8">
      <div className="relative flex min-h-[calc(100vh-2.5rem)] w-full overflow-hidden lg:min-h-[calc(100vh-4rem)]">
        <CornerFrame />

        {/* Full-bleed behind the content on mobile, right-hand panel from lg up. */}
        <div className="absolute inset-0 lg:left-[42%]">
          <VideoBackground />
          <div className="absolute inset-0 bg-black/60 lg:hidden" />
        </div>

        <section className="relative z-20 flex w-full flex-col justify-center px-8 py-16 sm:px-12 lg:w-[42%] lg:bg-black lg:px-12 lg:py-24 xl:px-20 2xl:px-24">
        <h1 className="sr-only">MONA</h1>
        <div className="h-[110px] w-full max-w-[440px] lg:h-[150px]">
          <CursorDrivenParticleTypography
            text="MONA"
            fontSize={400}
            particleDensity={4}
            particleSize={1.6}
            dispersionStrength={22}
            color="#ffffff"
            widthRatio={1}
            align="left"
          />
        </div>

        <p className="mt-5 max-w-[440px] text-lg leading-snug text-white/55">
          Copy the traders who are actually winning.
        </p>

        <div className="mt-10 w-full max-w-[440px]">
          {authenticated && short ? (
            <div className="flex items-center justify-between border border-accent/60 px-5 py-3.5">
              <span className="text-sm text-white/50">Signed in</span>
              <span className="font-mono text-sm">{short}</span>
            </div>
          ) : (
            <CyberButton onClick={login} disabled={!ready} size="lg">
              Trade on MONA
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </CyberButton>
          )}
        </div>
        </section>
      </div>
    </div>
  );
}
