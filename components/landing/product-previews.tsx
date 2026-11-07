"use client";

import { useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowRight, FileText, MapPinOff } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { copy, sample } from "../../lib/content";

export function SpatialContext() {
  return (
    <div className="bl-spatial">
      <MapPinOff size={30} strokeWidth={1.25} aria-hidden="true" />
      <strong>No location shared in this demo.</strong>
      <p>A witness position would not establish the fire location.</p>
      <span>Spatial context unavailable</span>
    </div>
  );
}

export function IntelligencePreview() {
  const [mode, setMode] = useState("normal");
  const pro = useRef<HTMLButtonElement>(null);
  return (
    <Tabs.Root value={mode} onValueChange={setMode} className="bl-intelligence">
      <div className="bl-preview-controls">
        <p>
          {mode === "normal" ? copy.intelligence.normal : copy.intelligence.pro}
        </p>
        <Tabs.List aria-label="Intelligence preview detail" className="bl-tabs">
          <Tabs.Trigger value="normal">Normal</Tabs.Trigger>
          <Tabs.Trigger value="pro" ref={pro}>
            Pro
          </Tabs.Trigger>
        </Tabs.List>
      </div>
      <div className="bl-browser">
        <div className="bl-browser-bar">
          <span className="bl-browser-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>BARA Intelligence</span>
          <span className="bl-browser-note">Local concept preview</span>
        </div>
        <div className="bl-app-heading">
          <span>
            <BrandLogo />
            <span className="bl-app-title">Intelligence</span>
          </span>
          <span className="bl-status">{sample.review}</span>
        </div>
        <Tabs.Content className="bl-preview-content" value="normal">
          <div className="bl-overview-title">
            <h3>Situation overview</h3>
            <p>One illustrative report. Its uncertainty stays in view.</p>
          </div>
          <div className="bl-summary">
            <span className="bl-label">Reported observation</span>
            <p>{sample.summary}</p>
          </div>
          <div className="bl-normal-grid">
            <div className="bl-report-list">
              <div className="bl-panel-label">
                <FileText size={16} aria-hidden="true" /> Sample report
              </div>
              <div className="bl-report-body">
                <span className="bl-report-id">{sample.id}</span>
                <h4>{sample.observation}</h4>
                <div className="bl-source-line">
                  <span>{sample.source}</span>
                  <span>{sample.review}</span>
                </div>
                <p className="bl-helper">Observation time: {sample.time}</p>
                <div className="bl-unknown">
                  <span>Still uncertain</span>
                  <p>{sample.unknown}</p>
                </div>
                <button
                  className="bl-text-action"
                  onClick={() => {
                    setMode("pro");
                    pro.current?.focus();
                  }}
                >
                  Inspect sample evidence
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <SpatialContext />
          </div>
        </Tabs.Content>
        <Tabs.Content className="bl-preview-content bl-pro-content" value="pro">
          <div className="bl-context-bar">
            <span>{sample.id}</span>
            <span>Independent corroboration: not provided</span>
          </div>
          <div className="bl-pro-grid">
            <aside className="bl-evidence-queue">
              <span className="bl-label">Evidence entry</span>
              <FileText size={23} strokeWidth={1.4} aria-hidden="true" />
              <strong>{sample.observation}</strong>
              <p>{sample.source}</p>
              <span className="bl-status">{sample.review}</span>
              <hr />
              <span className="bl-label">Supporting reference</span>
              <p>Not provided in this demo.</p>
            </aside>
            <div className="bl-inspector">
              <h3>Evidence & open questions</h3>
              <p>{sample.summary}</p>
              <div className="bl-claims-table">
                <table>
                  <caption className="sr-only">
                    Claims in the synthetic report and their evidence
                  </caption>
                  <thead>
                    <tr>
                      <th>Claim</th>
                      <th>Evidence state</th>
                      <th>Source / basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.claims.map((claim) => (
                      <tr key={claim.claim}>
                        <th scope="row">{claim.claim}</th>
                        <td>{claim.state}</td>
                        <td>{claim.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="bl-detail-fields">
                <div>
                  <dt>Observation time</dt>
                  <dd>{sample.time}</dd>
                </div>
                <div>
                  <dt>Location basis</dt>
                  <dd>{sample.locationBasis}</dd>
                </div>
                <div>
                  <dt>Observer coordinates</dt>
                  <dd>{sample.coordinates}</dd>
                </div>
              </dl>
              <div className="bl-pro-spatial">
                <MapPinOff size={18} aria-hidden="true" />
                <p>
                  No spatial source connected. This report remains available for
                  review.
                </p>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </div>
      <p className="bl-preview-caption">
        <span aria-hidden="true" />
        {copy.intelligence.caption}
      </p>
    </Tabs.Root>
  );
}
