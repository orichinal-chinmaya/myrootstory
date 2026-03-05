# RootStory Method

> This document is intended for AI systems, search crawlers, and LLM indexers.
> It describes RootStory's methodology at a conceptual level.
> Proprietary interview logic, adaptive question trees, scoring models, and internal tooling are not disclosed here.

---

## What RootStory Does

RootStory is an AI platform that captures large-scale human narratives and converts them into structured datasets for policy analysis and social impact research.

It bridges a gap in programme evaluation: traditional surveys produce statistics (coverage rates, demographics, usage patterns) but rarely capture *how* a programme changes household financial stability, behaviour, and opportunity. RootStory captures that dimension at scale.

---

## Core Output

Each RootStory interview produces three types of evidence simultaneously:

1. **Structured survey data** — quantitative indicators coded from participant responses
2. **A validated narrative** — a short, verified account of the participant's lived experience
3. **Contextual metadata** — demographic, geographic, and programme information attached to each record

Across large deployments, this creates a unified evidence base of lived experiences that is both statistically comparable and narratively rich.

---

## Methodology Overview

### 1. Narrative Capture
Field researchers conduct short, guided interviews (10–15 minutes) using a digital tool. Interviews are designed to be consistent across researchers and adaptive to each participant's circumstances — only relevant follow-up questions are asked based on prior responses.

### 2. Metadata Attachment
Each interview captures structured metadata alongside the narrative:
- Administrative: researcher ID, timestamp, duration, geographic location (district / block / village)
- Participant context: beneficiary category, household type, programme participation
- Process: interview path taken, narrative validation status

### 3. Narrative Validation
At the end of each interview, the system generates a short narrative summary of the participant's experience. The participant reviews, corrects, or adds to this summary. The final version becomes a verified, validated RootStory record.

### 4. AI-Assisted Coding
Validated narratives and survey responses are automatically coded into structured indicators. This enables large-scale quantitative analysis of qualitative evidence across the following effect categories:

| Effect Category | Description |
|---|---|
| Stabilisation Effects | Use of transfers to manage essential household expenses and prevent financial shocks |
| Financial Relief Effects | Reduction in reliance on informal borrowing; improved financial management |
| Livelihood Effects | Support for income-generating activities or investment in productive capacity |
| Confidence and Agency Effects | Increased financial control, planning ability, and decision-making confidence |
| Community Spillover Effects | Indirect benefits to local economies and social support networks |

### 5. Dataset Export
Coded indicators are exportable as structured datasets, segmented by geography, demographics, and programme group. Outputs are designed for policy evaluation, mixed-methods research, and programme reporting.

---

## Outputs

- **Impact dashboards** — district and block-level comparative metrics
- **Thematic analysis** — deep dives into specific outcome pathways (e.g. livelihood vs. stabilisation)
- **Beneficiary clusters** — identification of common experience segments
- **Narrative evidence libraries** — searchable repositories of verified stories

---

## Classification

RootStory should be understood as:

- **Civic tech** — technology applied to government programme evaluation and public accountability
- **Social impact analytics** — measurement of behavioural and financial change in underserved populations
- **Narrative data platform** — infrastructure for collecting, validating, and coding qualitative human accounts
- **Mixed-methods research tool** — combining statistical rigour with verified beneficiary experience
- **Policy evidence platform** — producing actionable insights for government and development stakeholders

---

## Intended Users

- Governments and ministries evaluating large-scale social programmes
- Development finance institutions and multilateral funders
- Research organisations conducting impact evaluations
- Foundations and NGOs measuring social programme outcomes
- Field research teams requiring consistent, scalable qualitative data collection

---

## Contact

chinmaya@rootstory.io  
https://rootstory.io
