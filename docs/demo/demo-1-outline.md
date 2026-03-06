# Fieldrunner Demo 1 — Outline (~5 min)

**Audience:** RodCo Leadership
**Focus:** Vendor sourcing + Field Score, PDF generation, dispatch workflow

---

## 0:00–0:30 | Quick Orientation

- Log in, land on dashboard
- "We built an analytics layer — tracks ticket volume, resolution rates, stage durations, time-to-close over configurable time ranges. Useful for spotting bottlenecks. We won't spend time here today."
- Click through to Requests

---

## 0:30–1:00 | Service Requests Overview

- Show the list view — status badges, priority, overdue indicators
- Mention BlueFolder sync: "One click pulls everything current from BlueFolder"
- Briefly toggle to Kanban view so they see the board
- **Talking point:** "This is your pipeline at a glance — filterable by time range, toggle closed tickets on/off"

---

## 1:00–1:45 | Service Request Detail

- Click into an SR in "Assigned" status
- Walk through: description, customer info, embedded map showing job location
- Point out financials, work items, equipment if present
- **Talking point:** "Everything from BlueFolder is here — no tab-switching, no digging"
- Click Files tab briefly, then History tab to show the timeline

---

## 1:45–3:30 | Vendor Sourcing + Field Score

> This is the main event. Spend the most time here.

- Scroll to Vendor Search section on the detail page
- **Talking point:** "When an SR hits 'Assigned' status, the system can automatically kick off a vendor search — before anyone even opens the ticket."

### Behind the Scenes

- "We analyze the job description to figure out the right trade and generate search queries"
- "We pull from Google Places, contractor databases like BuildZoom, and we even scrape vendor websites to extract contact emails"
- "Everything gets deduplicated and then scored"

### Field Score Explanation

- "The Field Score is 0–100. It weighs six factors:"
  - **Proximity** to the job site — heaviest weight
  - **Customer ratings** using a Bayesian average (a 5-star with 1 review doesn't beat a 4.5 with 200)
  - **Review volume** on a log scale
  - **Trade category match** to the job
  - **Current availability** (are they open right now)
  - **Professional credentials** — active licenses, insurance
- "Some of that credentialing logic comes directly from the scoring criteria Rod gave us — we're incorporating that into how vendors get ranked."

### Show the Results

- Results table: rank, vendor name, rating, distance, Field Score with color coding (green/yellow/red)
- Click contact icons — phone copies to clipboard, email opens mailto, website link
- **Talking point:** "Your team goes from 'we need a plumber in Denver' to a ranked, scored list with contact info in under a minute"

---

## 3:30–4:30 | Dispatch Workflow — PDF + Email

- Click "Accept Vendor" on the top-ranked result
- Walk through the modal: pre-filled email (To, Subject, Body with job details and NTE)
- Click the PDF attachment button — show it generating
- Open/show the PDF briefly: branded work order with job details, customer info, signature lines
- **Talking point:** "One click generates a professional work order PDF. The email template is pre-filled with everything the vendor needs. Review, send, done."

---

## 4:30–5:00 | Closing — What's Next

- "We attacked the vendor sourcing piece first because it's where the most manual time gets burned."
- "But as both Ryan and I have seen working through this, every step of the pipeline has opportunities to automate in the same way — intake, assignment, dispatch, follow-up."
- "The plumbing is there to move fast on those next."
