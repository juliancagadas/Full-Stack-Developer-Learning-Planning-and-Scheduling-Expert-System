/* =====================================================================
   Full-Stack Developer Learning Plan — frontend behavior
   -----------------------------------------------------------------
   This file is intentionally limited to what the project spec allows
   JavaScript to do:
     1. Show/hide the per-technology skill-level question.
     2. Validate the form.
     3. Turn the answers into CLIPS facts (plain data, not reasoning)
        for the user to load into the real CLIPS expert system.
     4. Display results / pasted CLIPS output.
   It does NOT decide priorities, hours, schedules, or recommendations
   — that reasoning lives entirely in clips/main.clp.
   ===================================================================== */

(function () {
  "use strict";

  // Must exactly match the `topic` names used in clips/main.clp
  const TOPICS = [
    { symbol: "HTML",          label: "HTML" },
    { symbol: "CSS",           label: "CSS" },
    { symbol: "JavaScript",    label: "JavaScript" },
    { symbol: "Git-GitHub",    label: "Git / GitHub" },
    { symbol: "React",         label: "React" },
    { symbol: "NodeJS",        label: "Node.js" },
    { symbol: "Database-SQL",  label: "Database / SQL" },
    { symbol: "REST-API",      label: "REST API" },
    { symbol: "Deployment",    label: "Deployment" }
  ];

  const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];

  /* ------------------------------------------------------------- */
  /* Build the "known technologies" checklist (checkbox + reveal)   */
  /* ------------------------------------------------------------- */
  function buildKnownTechList() {
    const container = document.getElementById("known-tech-list");
    TOPICS.forEach(function (topic) {
      const item = document.createElement("div");
      item.className = "tech-item";
      item.dataset.symbol = topic.symbol;

      const header = document.createElement("label");
      header.className = "tech-item-header";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "known-" + topic.symbol;
      checkbox.dataset.role = "known-checkbox";
      checkbox.dataset.symbol = topic.symbol;

      const name = document.createElement("span");
      name.className = "tech-name";
      name.textContent = topic.label;

      header.appendChild(checkbox);
      header.appendChild(name);

      const subfield = document.createElement("div");
      subfield.className = "skill-subfield";

      const subLabel = document.createElement("p");
      subLabel.className = "skill-subfield-label";
      subLabel.textContent = "Your skill level in " + topic.label + ":";

      const radioRow = document.createElement("div");
      radioRow.className = "radio-row";

      SKILL_LEVELS.forEach(function (level) {
        const pill = document.createElement("label");
        pill.className = "pill-radio";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "skill-" + topic.symbol;
        radio.value = level;

        const span = document.createElement("span");
        span.textContent = level;

        pill.appendChild(radio);
        pill.appendChild(span);
        radioRow.appendChild(pill);
      });

      subfield.appendChild(subLabel);
      subfield.appendChild(radioRow);

      item.appendChild(header);
      item.appendChild(subfield);
      container.appendChild(item);

      checkbox.addEventListener("change", function () {
        item.classList.toggle("is-checked", checkbox.checked);
        subfield.classList.toggle("is-open", checkbox.checked);
        if (!checkbox.checked) {
          radioRow.querySelectorAll("input[type=radio]").forEach(function (r) {
            r.checked = false;
          });
        }
      });
    });
  }

  /* ------------------------------------------------------------- */
  /* Build the "topics to learn" checklist (simple checkboxes)       */
  /* ------------------------------------------------------------- */
  function buildGoalTechList() {
    const container = document.getElementById("goal-tech-list");
    TOPICS.forEach(function (topic) {
      const item = document.createElement("div");
      item.className = "tech-item";

      const header = document.createElement("label");
      header.className = "tech-item-header";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "goal-" + topic.symbol;
      checkbox.dataset.role = "goal-checkbox";
      checkbox.dataset.symbol = topic.symbol;

      const name = document.createElement("span");
      name.className = "tech-name";
      name.textContent = topic.label;

      header.appendChild(checkbox);
      header.appendChild(name);
      item.appendChild(header);
      container.appendChild(item);

      checkbox.addEventListener("change", function () {
        item.classList.toggle("is-checked", checkbox.checked);
      });
    });
  }

  /* ------------------------------------------------------------- */
  /* Validation                                                     */
  /* ------------------------------------------------------------- */
  function setError(key, message) {
    const el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = message || "";
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error").forEach(function (el) {
      el.textContent = "";
    });
  }

  function getCheckedValue(name) {
    const checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }

  function validateForm() {
    clearAllErrors();
    let valid = true;

    if (!getCheckedValue("overall-skill")) {
      setError("overall-skill", "Please choose your overall skill level.");
      valid = false;
    }

    // Every checked "known" technology must have a skill level chosen.
    const knownBoxes = document.querySelectorAll('[data-role="known-checkbox"]:checked');
    knownBoxes.forEach(function (box) {
      const symbol = box.dataset.symbol;
      if (!getCheckedValue("skill-" + symbol)) {
        setError("overall-skill",
          "Please rate your skill level for every technology you checked as known (missing: " + symbol + ").");
        valid = false;
      }
    });

    const goalBoxes = document.querySelectorAll('[data-role="goal-checkbox"]:checked');
    if (goalBoxes.length === 0) {
      setError("goals", "Pick at least one technology you want to learn.");
      valid = false;
    }

    const hoursPerDay = document.getElementById("hours-per-day").value;
    const daysPerWeek = document.getElementById("days-per-week").value;
    if (!hoursPerDay || !daysPerWeek) {
      setError("time-fields", "Please choose both your hours per day and days per week.");
      valid = false;
    }
    if (!getCheckedValue("preferred-time")) {
      setError("time-fields", "Please choose a preferred study time.");
      valid = false;
    }

    if (!getCheckedValue("target-duration")) {
      setError("target-duration", "Please choose a target duration.");
      valid = false;
    }

    return valid;
  }

  /* ------------------------------------------------------------- */
  /* Turn the form into CLIPS facts (plain data transfer, no logic) */
  /* ------------------------------------------------------------- */
  function collectFormData() {
    const knownFacts = [];
    document.querySelectorAll('[data-role="known-checkbox"]:checked').forEach(function (box) {
      const symbol = box.dataset.symbol;
      const level = getCheckedValue("skill-" + symbol);
      if (level) knownFacts.push({ symbol: symbol, level: level });
    });

    const goalSymbols = [];
    document.querySelectorAll('[data-role="goal-checkbox"]:checked').forEach(function (box) {
      goalSymbols.push(box.dataset.symbol);
    });

    return {
      overallSkill: getCheckedValue("overall-skill"),
      known: knownFacts,
      goals: goalSymbols,
      hoursPerDay: document.getElementById("hours-per-day").value,
      daysPerWeek: document.getElementById("days-per-week").value,
      preferredTime: getCheckedValue("preferred-time"),
      targetDuration: getCheckedValue("target-duration")
    };
  }

  function generateFactsText(data) {
    const lines = [];
    lines.push(";; =====================================================================");
    lines.push(";; Generated by the Full-Stack Developer Learning Plan web form.");
    lines.push(";; Load this alongside main.clp:");
    lines.push(';;   (load "main.clp")');
    lines.push(';;   (load "user-input.clp")');
    lines.push(";;   (reset)");
    lines.push(";;   (run)");
    lines.push(";;   (print-report)");
    lines.push(";; =====================================================================");
    lines.push("");
    lines.push("(deffacts user-input-facts");
    lines.push("   (user-profile (overall-skill-level " + data.overallSkill + ")");
    lines.push("                 (study-hours-per-day " + data.hoursPerDay + ")");
    lines.push("                 (study-days-per-week " + data.daysPerWeek + ")");
    lines.push("                 (preferred-study-time " + data.preferredTime + ")");
    lines.push("                 (target-duration-months " + data.targetDuration + "))");
    lines.push("");

    if (data.known.length > 0) {
      data.known.forEach(function (k) {
        lines.push("   (topic-skill (topic " + k.symbol + ") (level " + k.level + "))");
      });
      lines.push("");
    }

    data.goals.forEach(function (symbol) {
      lines.push("   (selected-topic (topic " + symbol + "))");
    });

    lines.push(")");
    return lines.join("\n");
  }

  /* ------------------------------------------------------------- */
  /* Results section wiring                                        */
  /* ------------------------------------------------------------- */
  function showResults(factsText) {
    const resultsSection = document.getElementById("results");
    const factsOutput = document.getElementById("facts-output");
    factsOutput.textContent = factsText;
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wireResultActions() {
    document.getElementById("copy-facts-btn").addEventListener("click", function () {
      const text = document.getElementById("facts-output").textContent;
      navigator.clipboard.writeText(text).then(function () {
        const btn = document.getElementById("copy-facts-btn");
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = original; }, 1500);
      });
    });

    document.getElementById("download-facts-btn").addEventListener("click", function () {
      const text = document.getElementById("facts-output").textContent;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "user-input.clp";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // This only displays whatever the user pastes — it does not
    // recompute or reinterpret the CLIPS output in any way.
    document.getElementById("clips-output-paste").addEventListener("input", function (e) {
      const display = document.getElementById("pasted-output-display");
      const value = e.target.value.trim();
      if (value.length > 0) {
        display.textContent = value;
        display.hidden = false;
      } else {
        display.hidden = true;
      }
    });
  }

  /* ------------------------------------------------------------- */
  /* Init                                                           */
  /* ------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildKnownTechList();
    buildGoalTechList();
    wireResultActions();

    document.getElementById("planner-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateForm()) {
        const firstError = document.querySelector(".field-error:not(:empty)");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const data = collectFormData();
      const factsText = generateFactsText(data);
      showResults(factsText);
    });
  });
})();
