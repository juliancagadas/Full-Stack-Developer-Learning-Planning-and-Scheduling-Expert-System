/* =====================================================================
   Full-Stack Developer Learning Plan — frontend behavior
   ---------------------------------------------------------------------
   This file handles:
     1. Building the technology lists.
     2. Validating the form.
     3. Collecting the user's answers.
     4. Sending the answers to Flask.
     5. Receiving the CLIPS-generated learning plan.
     6. Displaying the results in the UI.

   IMPORTANT:
   JavaScript does NOT perform the expert-system reasoning.
   CLIPS/main.clp remains responsible for:
     - prerequisites
     - priorities
     - allocated hours
     - recommendations
     - duration checking
     - schedules
   ===================================================================== */

(function () {
  "use strict";

  // Must exactly match the `topic` names used in clips/main.clp
  const TOPICS = [
    { symbol: "HTML", label: "HTML" },
    { symbol: "CSS", label: "CSS" },
    { symbol: "JavaScript", label: "JavaScript" },
    { symbol: "Git-GitHub", label: "Git / GitHub" },
    { symbol: "React", label: "React" },
    { symbol: "NodeJS", label: "Node.js" },
    { symbol: "Database-SQL", label: "Database / SQL" },
    { symbol: "REST-API", label: "REST API" },
    { symbol: "Deployment", label: "Deployment" }
  ];

  const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];

  // Used to display CLIPS topic symbols as friendly names.
  const TOPIC_LABELS = Object.fromEntries(
    TOPICS.map(function (topic) {
      return [topic.symbol, topic.label];
    })
  );

  /* ------------------------------------------------------------- */
  /* Build the "known technologies" checklist                      */
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
      subLabel.textContent =
        "Your skill level in " + topic.label + ":";

      const skillError = document.createElement("p");
      skillError.className = "field-error";
      skillError.dataset.errorFor = "skill-" + topic.symbol;

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
      subfield.appendChild(skillError);

      item.appendChild(header);
      item.appendChild(subfield);

      container.appendChild(item);

      checkbox.addEventListener("change", function () {
        item.classList.toggle("is-checked", checkbox.checked);
        subfield.classList.toggle("is-open", checkbox.checked);

        if (!checkbox.checked) {
          radioRow
            .querySelectorAll("input[type=radio]")
            .forEach(function (radio) {
              radio.checked = false;
            });
        }
      });
    });
  }

  /* ------------------------------------------------------------- */
  /* Build the "topics to learn" checklist                         */
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
    const element = document.querySelector(
      '[data-error-for="' + key + '"]'
    );

    if (element) {
      element.textContent = message || "";
    }
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error").forEach(function (element) {
      element.textContent = "";
    });
  }

  function getCheckedValue(name) {
    const checked = document.querySelector(
      'input[name="' + name + '"]:checked'
    );

    return checked ? checked.value : null;
  }

  function validateForm() {
    clearAllErrors();

    let valid = true;

    // Overall skill
    if (!getCheckedValue("overall-skill")) {
      setError(
        "overall-skill",
        "Please choose your overall skill level."
      );

      valid = false;
    }

    // Every checked known technology must have a skill level.
    const knownBoxes = document.querySelectorAll(
      '[data-role="known-checkbox"]:checked'
    );

    knownBoxes.forEach(function (box) {
      const symbol = box.dataset.symbol;

      if (!getCheckedValue("skill-" + symbol)) {
        setError(
          "skill-" + symbol,
          "Please select your skill level for " + symbol + "."
        );

        valid = false;
      }
    });

    // At least one goal
    const goalBoxes = document.querySelectorAll(
      '[data-role="goal-checkbox"]:checked'
    );

    if (goalBoxes.length === 0) {
      setError(
        "goals",
        "Pick at least one technology you want to learn."
      );

      valid = false;
    }

    // Study time
    const hoursPerDay =
      document.getElementById("hours-per-day").value;

    const daysPerWeek =
      document.getElementById("days-per-week").value;

    if (!hoursPerDay || !daysPerWeek) {
      setError(
        "time-fields",
        "Please choose both your hours per day and days per week."
      );

      valid = false;
    }

    // Preferred study time
    if (!getCheckedValue("preferred-time")) {
      setError(
        "time-fields",
        "Please choose a preferred study time."
      );

      valid = false;
    }

    // Target duration
    if (!getCheckedValue("target-duration")) {
      setError(
        "target-duration",
        "Please choose a target duration."
      );

      valid = false;
    }

    return valid;
  }

  /* ------------------------------------------------------------- */
  /* Collect form data                                              */
  /* ------------------------------------------------------------- */

  function collectFormData() {
    const knownFacts = [];

    document
      .querySelectorAll('[data-role="known-checkbox"]:checked')
      .forEach(function (box) {
        const symbol = box.dataset.symbol;
        const level = getCheckedValue("skill-" + symbol);

        if (level) {
          knownFacts.push({
            symbol: symbol,
            level: level
          });
        }
      });

    const goalSymbols = [];

    document
      .querySelectorAll('[data-role="goal-checkbox"]:checked')
      .forEach(function (box) {
        goalSymbols.push(box.dataset.symbol);
      });

    return {
      overallSkill: getCheckedValue("overall-skill"),

      known: knownFacts,

      goals: goalSymbols,

      hoursPerDay:
        document.getElementById("hours-per-day").value,

      daysPerWeek:
        document.getElementById("days-per-week").value,

      preferredTime:
        getCheckedValue("preferred-time"),

      targetDuration:
        getCheckedValue("target-duration")
    };
  }

  /* ------------------------------------------------------------- */
  /* Send form data to Flask                                       */
  /* ------------------------------------------------------------- */

  async function generatePlan(data) {
    const response = await fetch("/api/generate-plan", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(data)
    });

    let result;

    try {
      result = await response.json();
    } catch (error) {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to generate the learning plan."
      );
    }

    return result.results;
  }

  /* ------------------------------------------------------------- */
  /* Small DOM helpers                                              */
  /* ------------------------------------------------------------- */

  function clearElement(element) {
    if (element) {
      element.replaceChildren();
    }
  }

  function createMessage(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    return paragraph;
  }

  function getTopicLabel(symbol) {
    return TOPIC_LABELS[symbol] || symbol;
  }

  /* ------------------------------------------------------------- */
  /* Render simple list                                             */
  /* ------------------------------------------------------------- */

  function renderList(containerId, items, emptyText, getText) {
    const container = document.getElementById(containerId);

    if (!container) {
      return;
    }

    clearElement(container);

    if (!items || items.length === 0) {
      container.appendChild(createMessage(emptyText));
      return;
    }

    const list = document.createElement("ul");

    items.forEach(function (item) {
      const listItem = document.createElement("li");

      listItem.textContent = getText(item);

      list.appendChild(listItem);
    });

    container.appendChild(list);
  }

  /* ------------------------------------------------------------- */
  /* Render missing prerequisites                                   */
  /* ------------------------------------------------------------- */

  function renderMissingPrerequisites(plan) {
    renderList(
      "missing-prerequisites",
      plan.missingPrerequisites,
      "No missing prerequisites were detected.",
      function (item) {
        return (
          getTopicLabel(item.topic) +
          " must be learned before " +
          getTopicLabel(item.neededFor)
        );
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render learning order                                          */
  /* ------------------------------------------------------------- */

  function renderLearningOrder(plan) {
    renderList(
      "learning-order",
      plan.learningOrder,
      "No learning order was generated.",
      function (topic) {
        return getTopicLabel(topic);
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render priorities                                              */
  /* ------------------------------------------------------------- */

  function renderPriorities(plan) {
    renderList(
      "priorities",
      plan.priorities,
      "No priorities were generated.",
      function (item) {
        return (
          getTopicLabel(item.topic) +
          " — " +
          item.level
        );
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render allocated study hours                                   */
  /* ------------------------------------------------------------- */

  function renderStudyHours(plan) {
    renderList(
      "study-hours",
      plan.allocatedHours,
      "No study-hour allocation was generated.",
      function (item) {
        return (
          getTopicLabel(item.topic) +
          " — " +
          item.hours +
          " hour(s)"
        );
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render recommendations                                         */
  /* ------------------------------------------------------------- */

  function renderRecommendations(plan) {
    renderList(
      "recommendations",
      plan.recommendations,
      "No additional recommendations.",
      function (item) {
        return (
          getTopicLabel(item.topic) +
          " — " +
          item.action
        );
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render warnings                                                */
  /* ------------------------------------------------------------- */

  function renderWarnings(plan) {
    renderList(
      "warnings",
      plan.warnings,
      "No warnings.",
      function (warning) {
        return warning;
      }
    );
  }

  /* ------------------------------------------------------------- */
  /* Render schedule table                                          */
  /* ------------------------------------------------------------- */

  function renderSchedule(plan) {
    const container = document.getElementById("schedule");

    if (!container) {
      return;
    }

    clearElement(container);

    if (!plan.schedule || plan.schedule.length === 0) {
      container.appendChild(
        createMessage("No schedule was generated.")
      );

      return;
    }

    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = [
      "Week",
      "Day",
      "Topic",
      "Hours",
      "Study Time"
    ];

    headers.forEach(function (headerText) {
      const th = document.createElement("th");

      th.textContent = headerText;

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    const sortedSchedule = [...plan.schedule].sort(function (a, b) {
      if (a.week !== b.week) {
        return a.week - b.week;
      }

      return a.day - b.day;
    });

    sortedSchedule.forEach(function (entry) {
      const row = document.createElement("tr");

      const weekCell = document.createElement("td");
      weekCell.textContent = entry.week;

      const dayCell = document.createElement("td");
      dayCell.textContent = entry.day;

      const topicCell = document.createElement("td");
      topicCell.textContent = getTopicLabel(entry.topic);

      const hoursCell = document.createElement("td");
      hoursCell.textContent = entry.hours;

      const timeCell = document.createElement("td");
      timeCell.textContent = entry.timeOfDay;

      row.appendChild(weekCell);
      row.appendChild(dayCell);
      row.appendChild(topicCell);
      row.appendChild(hoursCell);
      row.appendChild(timeCell);

      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    container.appendChild(table);
  }

  /* ------------------------------------------------------------- */
  /* Render duration information                                    */
  /* ------------------------------------------------------------- */

  function renderDuration(plan) {
    const container = document.getElementById("duration-result");

    if (!container) {
      return;
    }

    clearElement(container);

    if (!plan.duration) {
      container.appendChild(
        createMessage("No duration information was generated.")
      );

      return;
    }

    const duration = plan.durationCheck;

    const status = document.createElement("p");
    status.textContent =
      "Status: " + duration.status;

    const requiredHours = document.createElement("p");
    requiredHours.textContent =
      "Required hours: " + duration.requiredHours;

    const availableHours = document.createElement("p");
    availableHours.textContent =
      "Available hours: " + duration.availableHours;

    container.appendChild(status);
    container.appendChild(requiredHours);
    container.appendChild(availableHours);
  }

  /* ------------------------------------------------------------- */
  /* Display the complete CLIPS result                              */
  /* ------------------------------------------------------------- */

  function renderPlan(plan) {
    const resultsSection =
      document.getElementById("results");

    const errorElement =
      document.getElementById("results-error");

    const summaryElement =
      document.getElementById("results-summary");

    if (errorElement) {
      errorElement.hidden = true;
      errorElement.textContent = "";
    }

    if (summaryElement) {
      summaryElement.textContent =
        "Your plan has been generated by the CLIPS expert system. " +
        "You have " +
        plan.weeklyAvailableHours +
        " study hour(s) available per week.";
    }

    renderMissingPrerequisites(plan);
    renderLearningOrder(plan);
    renderPriorities(plan);
    renderStudyHours(plan);
    renderDuration(plan);
    renderRecommendations(plan);
    renderWarnings(plan);
    renderSchedule(plan);

    resultsSection.hidden = false;

    resultsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  /* ------------------------------------------------------------- */
  /* Display server error                                           */
  /* ------------------------------------------------------------- */

  function showResultsError(message) {
    const resultsSection =
      document.getElementById("results");

    const errorElement =
      document.getElementById("results-error");

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }

    resultsSection.hidden = false;

    resultsSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  /* ------------------------------------------------------------- */
  /* Loading state                                                   */
  /* ------------------------------------------------------------- */

  function setLoadingState(isLoading) {
    const form =
      document.getElementById("planner-form");

    if (!form) {
      return;
    }

    const submitButton =
      form.querySelector('button[type="submit"]');

    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;

    if (isLoading) {
      submitButton.dataset.originalText =
        submitButton.textContent;

      submitButton.textContent =
        "Generating Plan...";
    } else {
      submitButton.textContent =
        submitButton.dataset.originalText ||
        "Generate My Plan";
    }
  }

  /* ------------------------------------------------------------- */
  /* Init                                                            */
  /* ------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    buildKnownTechList();
    buildGoalTechList();

    const plannerForm =
      document.getElementById("planner-form");

    plannerForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        // Stop here if the form is invalid.
        if (!validateForm()) {
          const firstError =
            document.querySelector(
              ".field-error:not(:empty)"
            );

          if (firstError) {
            firstError.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }

          return;
        }

        const data = collectFormData();

        setLoadingState(true);

        try {
          /*
           * Send the user's answers to Flask.
           *
           * Flask will:
           *   1. Receive this JSON.
           *   2. Create the CLIPS environment.
           *   3. Load main.clp.
           *   4. Assert the user's facts.
           *   5. Run the CLIPS rules.
           *   6. Convert the resulting facts into JSON.
           *   7. Send the plan back here.
           */

          const plan = await generatePlan(data);

          renderPlan(plan);
        } catch (error) {
          console.error(
            "Failed to generate learning plan:",
            error
          );

          showResultsError(
            error.message ||
              "Something went wrong while generating your plan."
          );
        } finally {
          setLoadingState(false);
        }
      }
    );
  });
})();