import localFont from "next/font/local";
import Image from "next/image";
import intelligenceScreenshot from "../public/images/intelligence-dashboard.png";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { ThemeControl, LandingMotion } from "../components/landing/experience";
import { WitnessDevice } from "../components/landing/witness-device";
import { BrandLogo } from "../components/landing/brand-logo";
import { copy } from "../lib/content";
import { destinations } from "../lib/destinations";
import "./landing.css";

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line) => <span key={line}>{line}</span>);
}
function Explore({
  witness = false,
  quiet = false,
}: {
  witness?: boolean;
  quiet?: boolean;
}) {
  return (
    <a
      className={`bl-button ${quiet ? "bl-button-outline" : ""}`}
      href={witness ? "#witness" : "#intelligence"}
    >
      Explore {witness ? "Witness" : "Intelligence"}
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  );
}

export default function Home() {
  return (
    <div
      className={`bl ${inter.variable}`}
      id="bara-landing"
      data-theme="system"
      suppressHydrationWarning
    >
      <a className="bl-skip" href="#main">
        Skip to content
      </a>
      <LandingMotion />
      <div className="bl-header-shell bl-dark">
        <header className="bl-header bl-container">
          <a className="bl-wordmark" href="#top" aria-label="BARA home">
            <BrandLogo />
          </a>
          <nav aria-label="Main navigation">
            {copy.nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="bl-header-actions">
            <ThemeControl />
            <Explore />
          </div>
        </header>
      </div>
      <main id="main">
        <div className="bl-hero" id="top">
          <section className="bl-opening" aria-labelledby="hero-title">
            <div className="bl-container">
              <p className="bl-overline bl-hero-overline">
                {copy.hero.overline}
              </p>
              <div className="bl-hero-copy">
                <h1 id="hero-title" className="bl-hero-title">
                  <Lines lines={copy.hero.lines} />
                </h1>
                <div className="bl-hero-aside">
                  <p>{copy.hero.body}</p>
                  <div className="bl-hero-links">
                    <Explore />
                    <a className="bl-subtle-link" href="#how-it-works">
                      How BARA works
                      <ArrowDown size={17} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="bl-product-stage">
              <span className="bl-giant-wordmark" aria-hidden="true">
                <BrandLogo large />
              </span>
              <div className="bl-stage-note bl-stage-left">
                <span>01 — Witness</span>
                <p>{copy.hero.stageLeft}</p>
              </div>
              <WitnessDevice />
              <div className="bl-stage-note bl-stage-right">
                <span>02 — Intelligence</span>
                <p>{copy.hero.stageRight}</p>
              </div>
              <p className="bl-stage-caption">{copy.hero.caption}</p>
            </div>
          </section>
        </div>
        <div className="bl-main-sections">
          <section className="bl-editorial bl-dark">
            <div className="bl-container bl-editorial-grid">
              <p className="bl-overline">{copy.editorial.label}</p>
              <div>
                <h2 className="bl-editorial-title" data-reveal>
                  <Lines lines={copy.editorial.lines} />
                </h2>
                <p className="bl-editorial-body">{copy.editorial.body}</p>
                <p className="bl-principle-words">{copy.editorial.principle}</p>
                <div className="bl-excerpt">
                  <span className="bl-label">
                    Illustrative evidence excerpt
                  </span>
                  <p>{copy.editorial.excerpt}</p>
                </div>
              </div>
            </div>
          </section>
          <section id="intelligence" className="bl-section bl-container">
            <div className="bl-section-top">
              <p className="bl-overline">{copy.intelligence.label}</p>
              <span className="bl-section-type">The desktop experience</span>
            </div>
            <div className="bl-section-heading" data-reveal>
              <h2>
                <Lines lines={copy.intelligence.lines} />
              </h2>
              <p>{copy.intelligence.body}</p>
            </div>
            <figure className="bl-dashboard-screenshot" data-reveal>
              <Image
                src={intelligenceScreenshot}
                alt="BARA Intelligence Normal dashboard: report filters, evidence summary, report list and observation map using synthetic demo data."
                sizes="(max-width: 760px) 90vw, (max-width: 1568px) calc(100vw - 128px), 1440px"
              />
              <figcaption>Intelligence / Normal view. Screenshot of synthetic demo data.</figcaption>
            </figure>
            {!destinations.intelligence.href.startsWith("#") && (
              <a
                className="bl-text-action bl-app-link"
                href={destinations.intelligence.href}
              >
                Open Intelligence demo
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            )}
          </section>
          <section id="witness" className="bl-witness-section">
            <div className="bl-container">
              <div className="bl-section-top">
                <p className="bl-overline">{copy.witness.label}</p>
                <span className="bl-section-type">
                  The reporting experience
                </span>
              </div>
              <div className="bl-witness-grid">
                <div className="bl-readonly-preview" data-reveal>
                  <div className="bl-form-header">
                    <span className="bl-form-brand">BARA Witness</span>
                    <span>Read-only example</span>
                  </div>
                  <div className="bl-form-body">
                    <div className="bl-form-title">
                      <Eye size={24} strokeWidth={1.4} aria-hidden="true" />
                      <h3>
                        An observation.
                        <br />
                        With its limits.
                      </h3>
                    </div>
                    <dl>
                      {copy.witness.fields.map((field) => (
                        <div className="bl-form-field" key={field.label}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="bl-form-helper">
                      {copy.witness.clarification}
                    </p>
                  </div>
                  <p className="bl-form-caption">{copy.hero.caption}</p>
                </div>
                <div className="bl-witness-copy" data-reveal>
                  <h2>
                    <Lines lines={copy.witness.lines} />
                  </h2>
                  <p>{copy.witness.body}</p>
                  <div className="bl-safety">
                    <ShieldCheck
                      size={22}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <p>{copy.witness.safety}</p>
                  </div>
                  <a className="bl-text-action" href="#how-it-works">
                    See the intended workflow
                    <ArrowRight size={17} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </section>
          <section id="how-it-works" className="bl-section bl-container">
            <div className="bl-section-top">
              <p className="bl-overline">{copy.workflow.label}</p>
              <span className="bl-section-type">{copy.workflow.intro}</span>
            </div>
            <h2 className="bl-workflow-title" data-reveal>
              <Lines lines={copy.workflow.lines} />
            </h2>
            <ol className="bl-workflow">
              {copy.workflow.steps.map((step, index) => (
                <li key={step.title} data-reveal>
                  <span className="bl-step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <ArrowUpRight
                    size={24}
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ol>
            <div className="bl-evidence-principle" data-reveal>
              <h3>{copy.workflow.principle}</h3>
              <p>{copy.workflow.body}</p>
            </div>
          </section>
          <section className="bl-closing bl-dark">
            <div className="bl-container">
              <h2 data-reveal>
                <Lines lines={copy.closing.lines} />
              </h2>
              <div className="bl-closing-bottom">
                <p>{copy.closing.body}</p>
                <div className="bl-actions">
                  <Explore />
                  <Explore witness quiet />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="bl-footer bl-dark">
        <div className="bl-container">
          <div className="bl-footer-top">
            <div>
              <a className="bl-wordmark" href="#top" aria-label="BARA home">
                <BrandLogo />
              </a>
              <p>{copy.descriptor}</p>
            </div>
            <nav aria-label="Footer navigation">
              {copy.nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
            <ThemeControl />
          </div>
          <div className="bl-footer-bottom">
            <p>{copy.footer.status}</p>
            <p>{copy.footer.boundary}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
