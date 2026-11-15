// path: apps/web/src/app/page.tsx
// purpose: Landing page: hero with a live pattern demo, "tick what's true" section, features, steps and the closing call to action.
import { Agree, DownloadSection, Features, FinalCta, Footer, Hero, Nav, Steps } from '@/components/site';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="blob -left-32 -top-40 size-[560px] bg-[#b7a4ff]" />
      <div className="blob -right-40 top-20 size-[480px] bg-[#86e0f0] [animation-delay:-7s]" />
      <div className="blob left-1/4 top-[820px] size-[520px] bg-[#ffb0cf] [animation-delay:-12s]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5">
        <Nav />
        <main>
          <Hero />
          <Agree />
          <Features />
          <Steps />
          <DownloadSection />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </div>
  );
}
