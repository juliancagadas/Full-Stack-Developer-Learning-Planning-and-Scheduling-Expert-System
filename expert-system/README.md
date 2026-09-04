# Full-Stack Developer Learning Planning and Scheduling Expert System

An expert system that asks a learner about their current skills, goals, and
available time, then uses forward-chaining CLIPS rules and expert knowledge
to generate a personalized **learning plan** (what to learn, in what order,
what's missing) and **study schedule** (when, how long, how many sessions).


---

## 1. Project folder structure

```
expert-system/
├── README.md               <- this file
├── clips/
│   └── main.clp             <- the whole CLIPS expert system
└── frontend/
    ├── index.html            <- the web form (same questions as CLIPS)
    ├── style.css             <- styling
    ├── root.css              <- styling (reusable components)
    └── script.js             <- dynamic fields, validation, fact generation
```

---

## 2. Why two separate pieces?

A browser cannot execute a CLIPS program directly. So this project is split
into two independent parts, exactly as required:

1. **HTML/CSS/JS frontend** (`frontend/`) —> collects the learner's answers,
   shows/hides the per-technology skill question, validates the form, and
   turns the answers into a small CLIPS facts file. It contains **no**
   planning or scheduling logic.
2. **CLIPS expert system** (`clips/main.clp`) —> contains every actual
   reasoning rule: prerequisite checking, priority, study-hour allocation,
   scheduling, and target-duration validation. This is where the real
   expert-system inference happens.

For this prototype the two sides talk through a **manually transferred facts
file** — you fill out the form, it generates a CLIPS `deffacts` block, you
save that next to `main.clp` and load it into CLIPS. A future version could
put a small backend/API in between so the browser calls CLIPS automatically;
the CLIPS reasoning code itself would not need to change.

---

## 3. Running the CLIPS expert system

### Option A — fully interactive (CLIPS asks you the questions)

```bash
cd clips
clips
```

Inside the CLIPS prompt:

```
CLIPS> (load "main.clp")
CLIPS> (start)
```

`(start)` will ask you Q1–Q8 one at a time (skill level, known
technologies + their individual skill levels, topics to learn, study
hours/day, study days/week, preferred time, target duration), then
automatically runs the rules and prints the full report.

### Option B —> using the web form's generated facts

1. Open `frontend/index.html` in any browser and fill out the form.
2. Click **Generate My Learning Plan**.
3. Copy or download the generated facts block as `user-input.clp`,
   and put it in the `clips/` folder (next to `main.clp`).
4. In a terminal:

```bash
cd clips
clips
```

```
CLIPS> (load "main.clp")
CLIPS> (load "user-input.clp")
CLIPS> (reset)
CLIPS> (run)
CLIPS> (print-report)
```

---

## 4. How the facts and rules work

### Expert knowledge (`deffacts topic-knowledge-base`)

Every technology is stored as a `topic` fact with its difficulty,
expert-estimated study hours, and position in the recommended learning
order, plus `prerequisite` facts describing what must come before what:

```
(topic (name JavaScript) (difficulty Difficult) (estimated-hours 40) (learning-order 3))
(prerequisite (topic React) (requires JavaScript))
```

### User facts

Collected from Q1–Q8: `user-profile`, one `topic-skill` fact **per
individual technology** the learner knows, and one `selected-topic` fact
per technology they want to learn.

### Inference pipeline (forward chaining, controlled by rule salience)

```
selected-topic + prerequisite + topic-skill
        |
        v  (salience 100)
  missing-prerequisite  ---->  recommendation: LearnFirst / Pending
        |
        v  (salience 50-80)
  priority (Highest / High / Medium / Low)
        |
        v  (salience 30-40)
  allocated-hours   (estimated-hours x difficulty x skill-level)
        |
        v  (salience 15-20)
  weekly-available-hours + total-required-hours
        |
        v  (salience 10)
  duration-check (Sufficient / Insufficient) + warning
        |
        v  (salience 5)
  schedule-entry  (week-by-week study schedule)
```

Each stage only fires once the facts it needs exist, and rule `salience`
values keep the stages in the right order —> this is genuine CLIPS forward
chaining: every recommendation, priority, hour count, and schedule slot is
an **inferred fact**, not a hard-coded message.

---

## 5. Sample input (matches the project spec's own worked example)

- Overall skill level: Beginner
- Known technologies: HTML (Advanced), CSS (Intermediate), JavaScript (Beginner)
- Topics to learn: React, Node.js
- Study time: 2 hours/day, 5 days/week
- Preferred time: Evening
- Target duration: 3 months

## 6. Sample inference process

```
(selected-topic (topic React))
(topic-skill (topic JavaScript) (level Beginner))
(prerequisite (topic React) (requires JavaScript))
        |
        v
(missing-prerequisite (topic JavaScript) (needed-for React))
        |
        v
(priority (topic JavaScript) (level Highest))
        |
        v
(recommendation (topic JavaScript) (action LearnFirst))
(recommendation (topic React) (action Pending))
```

## 7. Sample final output (abridged)

```
B. MISSING PREREQUISITES
-------------------------
- JavaScript is required before NodeJS and should be learned first.
- JavaScript is required before React and should be learned first.

C. RECOMMENDED LEARNING ORDER
------------------------------
  1. JavaScript
  2. React
  3. NodeJS

D. TOPIC PRIORITIES
--------------------
- JavaScript: Highest
- CSS: Medium
- HTML: Low

E. ESTIMATED STUDY HOURS
-------------------------
- JavaScript: 48 hour(s)
- NodeJS: 42 hour(s)
- React: 36 hour(s)

F. WEEKLY AVAILABLE STUDY HOURS
--------------------------------
You have approximately 10 hour(s) available per week.

G. SUGGESTED STUDY SCHEDULE
----------------------------
  Week 1:
    Day 1 (Evening): 2 hour(s) -> JavaScript
    ... (continues, JavaScript finishes in week 5, then React, then NodeJS)

H. TARGET TIMEFRAME VALIDATION
-------------------------------
Total required study hours          : 126
Hours available in target timeframe : 120
Status                              : Insufficient
WARNING: Your current available study time may not be enough to complete
your selected learning goals within your target timeframe.
WARNING: Consider one or more of: increasing study hours per day,
increasing study days per week, extending your target duration, or
focusing on fewer topics.

I. FINAL RECOMMENDATIONS
-------------------------
- React: Pending
- JavaScript: LearnFirst
- NodeJS: Pending
- JavaScript: Study
```

This was run end-to-end against the actual CLIPS program while building
this project, so the numbers above are real engine output, not illustration.

---

## 8. Design decisions worth knowing about

- **Symbol names**: CLIPS symbols can't contain spaces or slashes, so
  `Git/GitHub` → `Git-GitHub`, `Database/SQL` → `Database-SQL`, and
  `REST API` → `REST-API` internally. The frontend displays the friendly
  names and maps them to these symbols automatically.
- **Prerequisite "satisfied" threshold**: a prerequisite counts as known
  well enough if the learner rated it Intermediate or Advanced. Beginner
  or never-rated ("unknown") is treated as not sufficient, per the
  knowledge-acquisition notes.
- **Days-per-week ranges**: Q6's ranges ("1 to 2 days", "3 to 4 days", "5
  to 6 days") are converted to the lower bound of each range (1, 3, 5) for
  hour calculations —> a conservative choice so the target-duration check
  doesn't overpromise what the learner can actually do.
- **"4 hours or more"** (Q5) is treated as exactly 4 hours for the same
  conservative reason.
- **Extra prerequisites/hours added beyond the spec's examples**: the spec
  only gave a few explicit prerequisite examples (JavaScript→React,
  JavaScript→Node.js) and a subset of estimated hours. Reasonable
  additions were made to make the system logically complete: HTML before
  CSS/JavaScript, Node.js + Database/SQL before REST API, REST API before
  Deployment, and estimated hours for Git/GitHub (8h), REST API (20h), and
  Deployment (12h).
