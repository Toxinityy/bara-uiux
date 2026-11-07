# BARA Witness Camera — UX/UI Handoff

Date: 7 November 2026

## 1. Purpose and scope

Give a teammate or implementation agent a complete description of the camera application's screens, interactions, visible states, checklist, and model-generated instructions.

The witness starts an observation session, enables the camera and required sensors, and submits photos with time, witness location, and direction. Another model supplies natural-language instructions telling the witness where to point the camera next. A seven-topic checklist shows how much useful information has been collected during the session.

This document describes the intended experience. Section 12 distinguishes existing behavior from additions that still need implementation. Proposed details below are implementation recommendations unless explicitly identified as agreed behavior.

## 2. Agreed product behavior

- The live camera preview is the main screen.
- Capture is manual: one tap on **Snap** submits one photo.
- A vertical strip of **seven circles** sits along the side of the camera preview.
- Each circle represents one observation topic and reflects assessed information coverage.
- A separate model sends **natural-language camera instructions**, such as “Point your camera toward the base of the smoke plume.”
- The app displays these instructions; it does not invent replacement instructions from checklist labels.
- Users can tap checklist circles to inspect findings. They do not manually check circles complete.
- Taking a photo does not automatically complete an instruction or checklist topic.
- Checklist coverage is not a safety score or a measure of fire severity.

## 3. Screen layout

### Main camera screen

```text
+------------------------------------------------+
| BARA Witness         Controls    Fullscreen   X |
| Session active                                 |
|                                                |
|                                  Flames    ( ) |
|                                  Smoke     ( ) |
|                                  Burning   ( ) |
|             LIVE PREVIEW         Location  ( ) |
|                                  Time      ( ) |
|                                  Change    ( ) |
|                                  Threats   ( ) |
|                                                |
| +--------------------------------------------+ |
| | CAMERA INSTRUCTION                         | |
| | Point your camera toward the base of the    | |
| | smoke plume, from your current position.    | |
| | [Details]             [Can't get this view] | |
| +--------------------------------------------+ |
|                 Ready to snap                  |
|                    [ SNAP ]                    |
|              Submission/result status          |
+------------------------------------------------+
```

The diagram shows content hierarchy, not fixed dimensions. Recommended circle-strip placement is the right side. Expanded panels must not push Snap off-screen.

### Layout requirements

- Give the preview the largest available area.
- Keep the seven circles visible during normal aiming and capture.
- Keep the active model instruction above the capture controls.
- Keep Snap reachable with one hand.
- Put device and session setup in a collapsible Controls panel.
- Show analysis details in a collapsible panel rather than permanently covering the preview.
- Use shaded or solid surfaces behind text so it remains readable over any camera scene.
- Respect phone safe areas and support portrait and landscape.
- Preserve the captured frame's proportions; avoid a preview crop that misrepresents what will be submitted.

## 4. Stage-by-stage flow

### Stage A — Entry and session

**Show**
- BARA Witness identity and a short purpose statement.
- Session status: no session, checking, active, or ended.
- **Start session** and **Open camera** actions.
- Optional app installation action or browser installation instructions.

**Interactions and behavior**
- Start session creates a capture session and displays a loading state while pending.
- Open camera requests camera access and opens the camera view.
- Opening the camera before starting a session is allowed; Snap remains disabled.
- Reloading the same tab checks the saved session and restores it if active.
- A failed session check exposes **Retry session check**.
- Keep full internal session IDs in details rather than making them the main screen title.

### Stage B — Camera and sensor setup

**Show**
- Live rear-camera preview when available.
- Camera loading, permission, or error text when preview is unavailable.
- Controls containing session, location, and compass status and actions.
- The next required setup action whenever capture is blocked.

**Interactive controls**
- Start / End session.
- Enable location / Stop location.
- Start compass / Stop compass.
- Retry camera after camera failure.
- Open / Close Controls.
- Fullscreen / Exit fullscreen, where supported.
- Close camera.

**Behavior**
- Request each device permission after its corresponding user action.
- Show “Waiting for location…” until coordinates arrive, then coordinates and accuracy.
- Show “Waiting for direction…” until a compass heading arrives, then degrees and cardinal direction.
- Explain permission denial and unsupported hardware with an appropriate recovery action.
- Recommended: open Controls automatically on first use when required setup is incomplete.
- Setup guidance takes priority over observation guidance while Snap is blocked. Preserve any received model instruction for when the user is ready.

### Stage C — Ready and aiming

**Show**
- Live preview, seven checklist circles, active instruction, and Snap.
- “Ready to snap” when all capture requirements are met.
- Compact session and sensor status; detailed values stay in Controls.

**Snap is enabled only when**
- The session is active and verified.
- The camera is active and has a usable video frame.
- Location is enabled and coordinates are available.
- Compass is enabled and a heading is available.
- No submission or session action is in progress.

When disabled, explain the next blocking requirement. Do not make the user infer it from a grey button.

The absence of a model instruction does not block capture once device and session requirements are satisfied.

### Stage D — Capture and submission

- One tap captures the current frame and submits it immediately; there is no pre-submission review screen in the baseline flow.
- Capture time, witness location, direction, and session ID are attached to the photo.
- Once instructions are integrated, attach the instruction ID that was visible at capture time.
- Snap changes to **Sending…** and prevents repeated submissions.
- Start / End session actions are disabled while submission is pending.
- Keep the preview and active instruction visible.
- Do not show “Saved” until the server confirms persistence.
- Do not display simulated upload percentages.
- No automatic retries, periodic captures, or offline upload queue are part of the baseline.

### Stage E — Result, checklist update, and next instruction

- Confirm save status when known.
- Associate the response with the submitted photo, not the changing live preview.
- Display available image findings in an expandable result card.
- Update only checklist topics supported by assessed evidence.
- Briefly highlight circles whose state changed.
- Display a new model instruction when received and mark it as new.
- Re-enable Snap when submission is finished and capture requirements still hold.
- Continue within the same session until the user ends it.

### Stage F — Close camera or end session

**Close camera**
- Closes the camera view and releases camera access.
- Preserves the active session.
- Location and compass have separate stop controls in the existing behavior.
- Reopening the camera allows capture to continue in the same active session.

**End session**
- Recommended: show a summary of confirmed submitted photos and checklist coverage.
- Offer **Continue capturing** and **End session**.
- Explain that further captures require a new session.
- Unassessed or incomplete checklist topics must not prevent ending.
- After success, show “Session ended. Start a new session to capture again.”
- Clear active guidance when a new session starts; do not carry instructions or findings across sessions.

## 5. Seven-circle checklist

### Topics and fixed order

| # | Topic | Information sought |
|---|---|---|
| 1 | Visible flames | Whether identifiable flames are visible, not visible, or obscured. |
| 2 | Visible smoke | Whether smoke is visible and whether its apparent source can be seen. |
| 3 | What is burning | The visible material or object involved; unknown is allowed. Suspected peat remains unconfirmed. |
| 4 | Source location | Where the suspected source is relative to the witness. |
| 5 | Observation time | When the observation occurred and whether it describes the current situation. |
| 6 | Change over time | Changes supported by observations at different times; distinguish flame changes from smoke drift. |
| 7 | Immediate threats | Whether people, buildings, or roads are visibly affected. |

### Visual states

| Circle appearance | Label | Meaning |
|---|---|---|
| Empty circle | Not assessed | No usable assessment is available yet. |
| Partially filled circle | Needs more information | Assessment exists but evidence is insufficient or unclear. |
| Circle with checkmark | Information available | Evidence supports a useful finding for this topic. |
| Outer highlighted ring | Current instruction topic | The active model instruction relates to this topic; this is independent of its coverage state. |

Use icons, shape, and text as well as color. The highlighted ring must not hide the underlying status. If an instruction has no related checklist topic, highlight none.

A checked circle does **not** mean the hazard is present, absent, or resolved. “No identifiable flames visible in this image” can be useful information without proving that there is no fire.

Show a summary such as **“3 of 7 topics have information.”** Do not label it “safe,” “risk,” or “incident resolved.”

### Circle interactions

- Each circle is a button with a touch target of at least 44 × 44 px, even if the drawn circle is smaller.
- Use stable ordering and short labels. On compact screens, labels can collapse after introduction, but tapping or keyboard focus must reveal the topic.
- Tapping opens a detail sheet containing topic name, status, finding, assessment time, supporting photo(s), and any limitations.
- Close the detail sheet to return to aiming without losing the active instruction.
- Users cannot manually toggle coverage states.
- Do not require a checklist selection before taking a photo.

### Evidence and aggregation rules

- The side strip represents **session-level coverage**. Label photo-specific findings separately inside details.
- A single photo cannot establish change over time.
- Witness GPS identifies the witness position, not automatically the source location.
- A capture timestamp records capture time; it does not automatically resolve every observation-time question.
- Upload success does not imply checklist completion.
- Analysis failure must not erase earlier findings.
- Later evidence may revise a finding or return a topic to “Needs more information.” Preserve previous evidence and explain the revision.
- Conflicting findings must retain their supporting photos and times rather than silently replacing each other.
- Any future manual answers must be labeled **Witness reported**, separately from image assessments.

## 6. Model-generated camera instructions

### Source and purpose

Another model supplies natural-language text telling the witness **where to point their camera next**. The camera app receives and displays that text. It must not imply that aiming guidance is already available from the current flame-analysis endpoint.

Example instruction:

> Point your camera toward the base of the smoke plume. Include the surrounding ground if visible from your current position.

The checklist describes information coverage. The instruction supplies the next aiming request. These are related but separate pieces of UI.

### Instruction card

**Show**
- Heading: **Camera instruction**.
- The supplied natural-language text.
- A **New instruction** marker on arrival.
- Optional received time in expanded details.
- The instruction remains readable while aiming and capturing.

**Interactions**
- **Details / Collapse** expands long text; show full text in a scrollable sheet when necessary.
- **Can't get this view** reports inability to comply and can collect a reason: obstructed, subject unavailable, unsafe, or other.
- If feedback submission fails, say so and allow retry without blocking Snap.

Do not require an “Instruction complete” checkbox. The next photo is evidence for the model to assess; it is not proof that the requested view was obtained.

### Instruction states

| State | UI behavior |
|---|---|
| None received | “Camera guidance will appear here.” Capture remains available when ready. |
| Received | Show instruction text and a New instruction marker. |
| Aiming | Keep instruction visible alongside Snap. |
| Submitting | Keep instruction visible with submission status. |
| Waiting for next guidance | Show “Waiting for the next camera instruction…” as a separate status; retain the previous instruction labeled as previous. |
| New instruction | Replace the active text and announce the update without moving controls. |
| Connection unavailable | Retain the last received text, labeled “Last received instruction—updates unavailable.” |
| Expired or withdrawn | Mark it inactive; do not present it as a current request. |
| Session ended | Stop presenting actionable guidance for that session. |

Prevent older, delayed instructions from overwriting newer ones. Ignore instructions for another session. If an update arrives during submission, the photo retains the instruction association recorded at capture time.

Instructions must not require the witness to approach the suspected fire. The user can decline a view and continue or end the session. This capability does not establish an emergency-response or dispatch workflow.

## 7. Photo result display

The existing analysis concerns visible flames. Present outcomes with their actual limits:

| Outcome | Meaning |
|---|---|
| Visible flames | Identifiable flames appear in the photo. |
| No visible flames | No identifiable flames appear; this does not establish absence of fire. |
| Uncertain | The image does not support a reliable determination. |
| Analysis unavailable | No classification was made. If persistence was confirmed, state that the photo was saved. |

Completed flame analysis can include visual evidence, location in the image, and visibility limitations. Do not invent numerical confidence, severity, or assessments for the other six topics.

Keep save status, analysis status, checklist coverage, and instruction status distinct so one failure does not appear to invalidate all other results.

## 8. Errors and recovery

| Condition | Visible behavior and recovery |
|---|---|
| Camera permission denied | Explain how to restore permission and offer Retry camera. |
| Camera unavailable or interrupted | Show the problem, disable Snap, and offer restart. |
| Location denied or unavailable | Explain the problem and keep Snap disabled under the current capture requirements. |
| Compass unsupported or no heading | Explain the limitation and keep Snap disabled under the current capture requirements. |
| Session cannot be verified | Offer Retry session check; block capture until verified. |
| Session ended elsewhere | Require a new session after the ended status is confirmed. |
| Upload fails | Show the error. Allow a new capture when ready; do not imply the failed photo is queued. |
| Request times out | Say the submission could not be confirmed; a timed-out request may still have saved the photo. |
| Analysis fails after confirmed save | Preserve save confirmation and prior checklist findings; mark analysis unavailable. |
| Checklist update fails | Preserve the last known checklist and mark it as not updated. |
| Instruction connection fails | Preserve and label the last instruction; do not invent new guidance. |
| Offline | Explain that submission and live guidance are unavailable. Do not promise automatic sending. |

Retries of an uncertain upload need server-side deduplication before they can safely resend the same photo automatically. The baseline offers no automatic retry.

## 9. Integration requirements for the other agent

These are proposed data requirements, not existing API contracts. Agree transport and exact field names before implementing them. Instruction delivery may use polling, server events, or another supported mechanism; the UX must work independently of that choice.

### Incoming instruction

- Instruction ID and session ID.
- Natural-language text.
- Creation time and monotonic sequence/version for ordering.
- Related checklist topic IDs, if any.
- Related snapshot ID, if any.
- Explicit lifecycle state, such as active, withdrawn, or expired; expiry time if supported.

### Photo association

- Existing image, session ID, capture time, witness coordinates, and compass direction.
- Visible instruction ID at the moment of capture, or null if no active instruction exists.
- Confirmed snapshot ID from the server for linking subsequent findings and instructions.

### Checklist update

- Session ID and update version/time.
- Stable topic ID for each of the seven topics.
- Coverage state, finding text, limitations, and supporting snapshot IDs.
- Assessment scope: snapshot or session.
- Evidence source, such as model assessment or witness report.

### Outgoing instruction feedback

- Session ID and instruction ID.
- “Can't get this view” event.
- Optional reason and free-text explanation.
- Feedback time and acknowledgement/error status.

Persist instruction/photo associations and checklist evidence if the experience must survive reloads or be reviewed in the Intelligence dashboard. Session restoration alone does not restore this new information.

## 10. Accessibility and responsive behavior

- All controls work with touch and keyboard and have visible focus.
- Give each circle an accessible name, for example “Smoke: needs more information; current instruction topic.”
- Announce new instructions and submission results politely; avoid repeatedly announcing every sensor reading.
- Do not rely on color or hover for meaning.
- Use at least 44 × 44 px touch targets.
- Keep text readable and support enlarged text.
- In landscape or short viewports, allow instruction/details sheets to scroll while preserving access to capture controls.
- Do not shrink seven touch targets below usable size to fit the rail; provide a scrollable rail in constrained layouts.
- Opening Controls or a checklist sheet must have an obvious close action and restore focus on close.
- Instructions and checklist updates must not unexpectedly move Snap beneath the user's finger.

## 11. Acceptance criteria

- [ ] The user can start a session, enable required devices, and submit a photo without leaving the camera flow.
- [ ] Disabled Snap always has a visible explanation of the next blocking requirement.
- [ ] Seven checklist circles appear in a fixed order along the side of the preview.
- [ ] Each circle supports all coverage states and opens its evidence details.
- [ ] The active instruction topic is distinguishable from checklist completion.
- [ ] Checklist findings are assessed, not manually checked or inferred from upload success.
- [ ] An incoming model instruction is readable while aiming and capturing.
- [ ] No instruction is required to take an otherwise valid capture.
- [ ] Older or wrong-session instructions never replace the active instruction.
- [ ] Captured photos retain the instruction ID visible at capture time.
- [ ] “Can't get this view” sends feedback and handles failure visibly.
- [ ] Save, analysis, checklist, and guidance status are distinguished.
- [ ] Failures preserve prior findings and clearly identify stale information.
- [ ] Ending a session is possible with incomplete checklist coverage.
- [ ] Closing the camera releases its stream while preserving the session.
- [ ] Portrait, landscape, enlarged text, keyboard use, and permission/error states remain usable.

## 12. Existing implementation versus required additions

### Existing baseline in source

- Start, restore/check, and end capture sessions.
- Screen-filling camera view with manual Snap, Controls, Fullscreen, and Close camera.
- Camera, location, and compass permission/status controls.
- Capture gating on session, camera, location, and heading.
- JPEG upload with capture metadata; sending state and response/error text.
- Backend visible-flame analysis with completed or unavailable response.
- Seven-topic placeholder checklist in the separate Intelligence dashboard, currently entirely Not assessed.

### Additions required for this handoff

- Camera-side seven-circle session checklist with detail panels.
- Real assessment and aggregation for the seven topics.
- Persisted findings and supporting evidence for historical review.
- External model instruction delivery, ordering, and lifecycle handling.
- Visible natural-language instruction card and inability feedback.
- Snapshot-to-instruction association.
- Structured save, analysis, checklist, and instruction states.
- Proposed first-use guidance, end-session summary, and responsive/accessibility refinements.

The existing flame-analysis message does not implement the seven-topic assessment or next-camera-instruction service. Until those services are connected, show honest unavailable/unassessed states rather than simulated progress.

### Outside the agreed baseline

Camera switching, flash, zoom controls, gallery upload, periodic capture, offline queues, user accounts, emergency dispatch, and full photo-history browsing are separate scope decisions.

## 13. Source references

- `bara-web/src/app/page.tsx` — current camera, sensor, session, and submission flow.
- `bara-web/src/lib/snapshot.ts` — image capture and upload behavior.
- `bara-api/src/snapshots/flame-analysis.ts` — current visible-flame assessment.
- `bara-intelligence/src/components/data-checklist.tsx` — seven existing checklist topics and placeholder states.
- `PROJECT_STATUS.md` — project status and current limitations.

This handoff is grounded in source inspection, not a new runtime verification of the application.
