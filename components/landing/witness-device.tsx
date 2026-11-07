import { Eye } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { copy, sample } from "../../lib/content";

export function WitnessDevice() {
  return (
    <div className="bl-device-wrap">
      <article
        className="bl-device"
        aria-label="BARA Witness read-only concept preview"
      >
        <div className="bl-device-island" aria-hidden="true" />
        <div className="bl-device-screen">
          <div className="bl-device-brand">
            <BrandLogo />
            <span>Witness</span>
          </div>
          <span className="bl-device-step">An observation, in context</span>
          <h2>
            What did
            <br />
            you observe?
          </h2>
          <div className="bl-device-observation">
            <Eye size={23} strokeWidth={1.5} aria-hidden="true" />
            <span>{copy.witness.fields[0].value}</span>
          </div>
          <div className="bl-device-question">
            <p>Are flames or glowing embers visible from where you are?</p>
            <span className="bl-static-answer">Not sure</span>
          </div>
          <div className="bl-device-provenance">
            <div>
              <span>Evidence source</span>
              <strong>{sample.source}</strong>
            </div>
            <div>
              <span>Verification state</span>
              <strong className="bl-status">{sample.review}</strong>
            </div>
          </div>
          <p className="bl-device-note">
            Uncertainty is part of the observation.
          </p>
        </div>
        <div className="bl-home-indicator" aria-hidden="true" />
      </article>
    </div>
  );
}
