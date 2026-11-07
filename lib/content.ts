export const sample = {
  demo: true,
  id: "BARA-DEMO-0042",
  observation: "Smoke reported near a forested area.",
  source: "Witness reported",
  review: "Unverified",
  time: "Not provided in this demo.",
  coordinates: "Not provided",
  locationBasis: "Witness position; suspected fire location unverified.",
  summary:
    "Smoke was reported near a forested area. The source and fire location have not been verified.",
  unknown: "The source and exact fire location are not yet confirmed.",
  claims: [
    { claim: "Smoke", state: "Reported", source: "Witness observation" },
    {
      claim: "Fire presence",
      state: "Insufficient evidence",
      source: "No independent corroboration provided",
    },
    {
      claim: "Source location",
      state: "Insufficient evidence",
      source: "Suspected fire location unverified",
    },
  ],
};

export const copy = {
  descriptor: "Forest & land fire intelligence",
  nav: [
    { label: "Intelligence", href: "#intelligence" },
    { label: "Witness", href: "#witness" },
    { label: "How it works", href: "#how-it-works" },
  ],
  hero: {
    overline: "Karhutla / Forest & land fire intelligence",
    lines: ["See the signal.", "Understand the", "uncertainty."],
    body: "BARA is designed to help people report what they see and understand forest and land fire evidence—with its source, context, and unanswered questions kept together.",
    caption: "Concept preview · Synthetic content",
    stageLeft: "A witness observation.",
    stageRight: "A clearer starting point.",
  },
  editorial: {
    label: "01 / The idea",
    lines: ["A report is a beginning.", "Not the whole picture."],
    body: "BARA’s approach keeps the original observation alongside its supporting evidence, source, and uncertainty—so a report can be understood without treating every claim as a confirmed fact.",
    principle: "Observation. Context. Evidence. Uncertainty.",
    excerpt:
      "Smoke was reported. Its source and exact location are not yet confirmed.",
  },
  intelligence: {
    label: "02 / BARA Intelligence",
    lines: ["One platform.", "Two levels of detail."],
    body: "Start with a clear overview. Move into the evidence when you need more context.",
    normal:
      "A readable overview of reports, locations, and the details that still need attention.",
    pro: "Inspect the original evidence, compare its context, and see how each claim is supported.",
    caption: "Illustrative product preview · Not live incident data",
  },
  witness: {
    label: "03 / BARA Witness",
    lines: ["Report what you see.", "Keep the context."],
    body: "The proposed Witness flow combines an observation, optional supporting imagery, and useful follow-up questions. Uncertainty stays visible instead of being forced into a confident answer.",
    safety:
      "Your safety comes first. Do not approach a fire or enter smoke to make a report.",
    clarification: "This records a witness observation, not a verified fire.",
    fields: [
      { label: "What did you observe?", value: "Smoke visible" },
      { label: "Are flames visible?", value: "Not sure" },
      { label: "Your location", value: "Not shared in this preview" },
      { label: "Suspected fire location", value: "Unknown" },
    ],
  },
  workflow: {
    label: "04 / The approach",
    lines: ["From observation", "to clearer context."],
    intro: "The intended product workflow",
    steps: [
      {
        title: "Observe",
        body: "Record what is visible from a safe position. “Not sure” remains a valid answer.",
      },
      {
        title: "Add context",
        body: "Keep supporting imagery, available location context, and follow-up answers connected to the observation.",
      },
      {
        title: "Review evidence",
        body: "Present the report with its source, supporting material, and unresolved questions in Intelligence.",
      },
    ],
    principle: "A report is not automatically a confirmed incident.",
    body: "Successful submission, model observations, review priority, and independent corroboration describe different things. BARA keeps those distinctions visible.",
  },
  closing: {
    lines: ["Fire is urgent.", "Clarity is essential."],
    body: "Explore BARA’s approach to community reporting and evidence-led understanding of forest and land fires.",
  },
  footer: {
    status:
      "Product concept previews are illustrative and do not represent live incident data.",
    boundary: "BARA is not an emergency dispatch service.",
  },
};
