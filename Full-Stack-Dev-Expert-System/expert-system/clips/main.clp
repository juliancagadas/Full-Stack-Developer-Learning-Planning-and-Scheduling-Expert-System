;; =====================================================================
;;  FULL-STACK DEVELOPER LEARNING PLANNING AND SCHEDULING EXPERT SYSTEM
;;  CLIPS Implementation
;; =====================================================================
;;  This program collects information about a learner (current skills,
;;  desired topics, available study time, target timeframe) and uses
;;  expert knowledge + forward-chaining rules to:
;;    1. PLAN   - decide what to learn, in what order, and what is missing
;;    2. SCHEDULE - turn that plan into a realistic weekly study schedule
;;
;;  Run with:  clips main.clp
;;  Then type: (start)
;; =====================================================================


;; =====================================================================
;; SECTION 1: DEFTEMPLATES
;; =====================================================================

;; --- Facts describing the USER ---------------------------------------

(deftemplate user-profile
   "Overall information about the learner"
   (slot overall-skill-level (type SYMBOL) (allowed-symbols Beginner Intermediate Advanced))
   (slot study-hours-per-day (type INTEGER))
   (slot study-days-per-week (type INTEGER))
   (slot preferred-study-time (type SYMBOL) (allowed-symbols Morning Afternoon Evening NoPreference))
   (slot target-duration-months (type INTEGER)))

(deftemplate topic-skill
   "The learner's self-rated skill level for ONE specific technology"
   (slot topic (type SYMBOL))
   (slot level (type SYMBOL) (allowed-symbols Beginner Intermediate Advanced)))

(deftemplate selected-topic
   "A technology the learner wants to learn"
   (slot topic (type SYMBOL)))

;; --- Facts describing EXPERT KNOWLEDGE --------------------------------

(deftemplate topic
   "One node of Full-Stack Development expert knowledge"
   (slot name (type SYMBOL))
   (slot difficulty (type SYMBOL) (allowed-symbols Easy Moderate Difficult))
   (slot estimated-hours (type INTEGER))
   (slot learning-order (type INTEGER)))

(deftemplate prerequisite
   "Topic REQUIRES another topic to be learned first"
   (slot topic (type SYMBOL))
   (slot requires (type SYMBOL)))

;; --- Facts INFERRED by the rule engine ---------------------------------

(deftemplate missing-prerequisite
   "A prerequisite the learner does not yet know well enough"
   (slot topic (type SYMBOL))          ; the prerequisite topic itself
   (slot needed-for (type SYMBOL)))    ; the selected topic that needs it

(deftemplate priority
   "How urgently a topic should be studied"
   (slot topic (type SYMBOL))
   (slot level (type SYMBOL) (allowed-symbols Highest High Medium Low)))

(deftemplate allocated-hours
   "Final recommended study hours for a topic, after adjusting for skill+difficulty"
   (slot topic (type SYMBOL))
   (slot hours (type INTEGER)))

(deftemplate recommendation
   "The recommended action for a topic"
   (slot topic (type SYMBOL))
   (slot action (type SYMBOL) (allowed-symbols LearnFirst Study Review SkipOrLightReview Pending)))

(deftemplate weekly-available-hours
   (slot hours (type INTEGER)))

(deftemplate total-required-hours
   (slot hours (type INTEGER)))

(deftemplate duration-check
   (slot status (type SYMBOL) (allowed-symbols Sufficient Insufficient))
   (slot required-hours (type INTEGER))
   (slot available-hours (type INTEGER)))

(deftemplate warning
   (slot message (type STRING)))

(deftemplate schedule-entry
   (slot week (type INTEGER))
   (slot day (type INTEGER))
   (slot topic (type SYMBOL))
   (slot hours (type INTEGER))
   (slot time-of-day (type SYMBOL)))

(deftemplate schedule-built
   "Flag fact: TRUE once the weekly schedule has been generated.")


;; =====================================================================
;; SECTION 2: DEFFACTS - EXPERT KNOWLEDGE BASE
;; =====================================================================
;; This is the knowledge an experienced Full-Stack Developer supplied
;; about topics, difficulty, estimated hours, order, and prerequisites.
;; (Git/GitHub is written as Git-GitHub, Database/SQL as Database-SQL,
;;  and REST API as REST-API because CLIPS symbol names cannot contain
;;  spaces or slashes.)

(deffacts topic-knowledge-base
   "Expert knowledge about every Full-Stack Development topic"

   (topic (name HTML)         (difficulty Easy)      (estimated-hours 10) (learning-order 1))
   (topic (name CSS)          (difficulty Moderate)   (estimated-hours 15) (learning-order 2))
   (topic (name JavaScript)   (difficulty Difficult)  (estimated-hours 40) (learning-order 3))
   (topic (name Git-GitHub)   (difficulty Easy)      (estimated-hours 8)  (learning-order 4))
   (topic (name React)        (difficulty Difficult)  (estimated-hours 30) (learning-order 5))
   (topic (name NodeJS)       (difficulty Difficult)  (estimated-hours 35) (learning-order 6))
   (topic (name Database-SQL) (difficulty Moderate)   (estimated-hours 25) (learning-order 7))
   (topic (name REST-API)     (difficulty Moderate)   (estimated-hours 20) (learning-order 8))
   (topic (name Deployment)   (difficulty Moderate)   (estimated-hours 12) (learning-order 9))

   ;; --- Prerequisite relationships (from the domain expert) ----------
   (prerequisite (topic CSS)        (requires HTML))
   (prerequisite (topic JavaScript) (requires HTML))
   (prerequisite (topic React)      (requires JavaScript))
   (prerequisite (topic NodeJS)     (requires JavaScript))
   (prerequisite (topic REST-API)   (requires NodeJS))
   (prerequisite (topic REST-API)   (requires Database-SQL))
   (prerequisite (topic Deployment) (requires REST-API)))


;; =====================================================================
;; SECTION 3: DEFRULES - PLANNING (prerequisites, priority, allocation)
;; =====================================================================

;; ---------------------------------------------------------------------
;; 3.1  PREREQUISITE CHECKING
;; A prerequisite is "satisfied" if the learner rated themselves
;; Intermediate or Advanced in it. Beginner or "never rated" (Unknown)
;; is treated as NOT sufficient, per the knowledge-acquisition rules.
;; ---------------------------------------------------------------------

(defrule detect-missing-prerequisite
   "IF a selected topic has a prerequisite the learner does not know
    well enough, THEN flag that prerequisite as missing."
   (declare (salience 100))
   (selected-topic (topic ?t))
   (prerequisite (topic ?t) (requires ?req))
   (not (topic-skill (topic ?req) (level Advanced|Intermediate)))
   (not (missing-prerequisite (topic ?req) (needed-for ?t)))
   =>
   (assert (missing-prerequisite (topic ?req) (needed-for ?t)))
   (printout t "  -> Missing prerequisite detected: " ?req " must be learned before " ?t "." crlf))

(defrule mark-selected-topic-pending
   "IF a selected topic still has an unmet prerequisite THEN it cannot
    be recommended as the immediate next topic yet - mark it Pending."
   (declare (salience 90))
   (selected-topic (topic ?t))
   (missing-prerequisite (topic ?) (needed-for ?t))
   (not (recommendation (topic ?t) (action Pending)))
   =>
   (assert (recommendation (topic ?t) (action Pending))))

(defrule recommend-missing-prerequisite-first
   "A missing prerequisite itself should be recommended as LearnFirst."
   (declare (salience 90))
   (missing-prerequisite (topic ?p) (needed-for ?))
   (not (recommendation (topic ?p) (action LearnFirst)))
   =>
   (assert (recommendation (topic ?p) (action LearnFirst))))


;; ---------------------------------------------------------------------
;; 3.2  PRIORITY RULES  (Highest > High > Medium > Low)
;; ---------------------------------------------------------------------

(defrule priority-highest-missing-prerequisite
   "Highest priority: a missing prerequisite required by a selected topic."
   (declare (salience 80))
   (missing-prerequisite (topic ?t) (needed-for ?))
   (not (priority (topic ?t) (level ?)))
   =>
   (assert (priority (topic ?t) (level Highest))))

(defrule priority-high-selected-ready
   "High priority: a selected topic whose prerequisites are all satisfied."
   (declare (salience 70))
   (selected-topic (topic ?t))
   (not (missing-prerequisite (topic ?) (needed-for ?t)))
   (not (priority (topic ?t) (level ?)))
   =>
   (assert (priority (topic ?t) (level High))))

(defrule priority-medium-intermediate-known
   "Medium priority: a topic the learner already knows at Intermediate
    level and could improve (review candidate)."
   (declare (salience 60))
   (topic-skill (topic ?t) (level Intermediate))
   (not (priority (topic ?t) (level ?)))
   =>
   (assert (priority (topic ?t) (level Medium))))

(defrule priority-low-advanced-known
   "Low priority: a topic the learner is already Advanced/proficient in."
   (declare (salience 50))
   (topic-skill (topic ?t) (level Advanced))
   (not (priority (topic ?t) (level ?)))
   =>
   (assert (priority (topic ?t) (level Low))))


;; ---------------------------------------------------------------------
;; 3.3  STUDY-HOUR ALLOCATION  (Estimated Hours + Difficulty + Skill)
;; Only topics that matter right now get an allocation: topics the
;; learner selected, and topics flagged as missing prerequisites.
;; ---------------------------------------------------------------------

(deffunction topic-is-pending
   "TRUE if ?t already has a Pending recommendation (it is a selected
    topic blocked on a missing prerequisite). Pending topics still get
    an hour allocation for planning, but should not also be labeled
    Study/Review/SkipOrLightReview until they are unblocked."
   (?t)
   (any-factp ((?r recommendation)) (and (eq ?r:topic ?t) (eq ?r:action Pending))))

(defrule allocate-hours-advanced
   "Advanced skill: reduce/skip study time to a light refresher only."
   (declare (salience 40))
   (topic-skill (topic ?t) (level Advanced))
   (topic (name ?t) (estimated-hours ?h))
   (or (selected-topic (topic ?t))
       (missing-prerequisite (topic ?t) (needed-for ?)))
   (not (allocated-hours (topic ?t) (hours ?)))
   =>
   (bind ?adjusted (max (integer (* ?h 0.1)) 1))
   (assert (allocated-hours (topic ?t) (hours ?adjusted)))
   (if (not (topic-is-pending ?t))
       then (assert (recommendation (topic ?t) (action SkipOrLightReview)))))

(defrule allocate-hours-intermediate
   "Intermediate skill: allocate review + practice time. Difficult
    topics still get slightly more time than easy/moderate ones."
   (declare (salience 40))
   (topic-skill (topic ?t) (level Intermediate))
   (topic (name ?t) (difficulty ?d) (estimated-hours ?h))
   (or (selected-topic (topic ?t))
       (missing-prerequisite (topic ?t) (needed-for ?)))
   (not (allocated-hours (topic ?t) (hours ?)))
   =>
   (if (eq ?d Difficult)
       then (bind ?factor 0.5)
       else (bind ?factor 0.35))
   (bind ?adjusted (max (integer (* ?h ?factor)) 1))
   (assert (allocated-hours (topic ?t) (hours ?adjusted)))
   (if (not (topic-is-pending ?t))
       then (assert (recommendation (topic ?t) (action Review)))))

(defrule allocate-hours-beginner-rated
   "Beginner skill (explicitly rated): needs close to full study time.
    Difficult topics get extra time on top of the expert estimate."
   (declare (salience 40))
   (topic-skill (topic ?t) (level Beginner))
   (topic (name ?t) (difficulty ?d) (estimated-hours ?h))
   (or (selected-topic (topic ?t))
       (missing-prerequisite (topic ?t) (needed-for ?)))
   (not (allocated-hours (topic ?t) (hours ?)))
   =>
   (if (eq ?d Difficult)
       then (bind ?factor 1.2)
       else (bind ?factor 1.0))
   (bind ?adjusted (integer (* ?h ?factor)))
   (assert (allocated-hours (topic ?t) (hours ?adjusted)))
   (if (not (topic-is-pending ?t))
       then (assert (recommendation (topic ?t) (action Study)))))

(defrule allocate-hours-unknown
   "No skill was ever rated for this topic at all (never learned it):
    treat exactly like Beginner - full estimated hours, extra for
    Difficult topics."
   (declare (salience 30))
   (or (selected-topic (topic ?t))
       (missing-prerequisite (topic ?t) (needed-for ?)))
   (topic (name ?t) (difficulty ?d) (estimated-hours ?h))
   (not (topic-skill (topic ?t) (level ?)))
   (not (allocated-hours (topic ?t) (hours ?)))
   =>
   (if (eq ?d Difficult)
       then (bind ?factor 1.2)
       else (bind ?factor 1.0))
   (bind ?adjusted (integer (* ?h ?factor)))
   (assert (allocated-hours (topic ?t) (hours ?adjusted)))
   (if (not (topic-is-pending ?t))
       then (assert (recommendation (topic ?t) (action Study)))))


;; =====================================================================
;; SECTION 4: DEFRULES - AVAILABLE TIME & TARGET-DURATION VALIDATION
;; =====================================================================

(defrule calculate-weekly-available-hours
   "Available Weekly Hours = Study Hours Per Day x Study Days Per Week."
   (declare (salience 20))
   (user-profile (study-hours-per-day ?h) (study-days-per-week ?d))
   (not (weekly-available-hours (hours ?)))
   =>
   (assert (weekly-available-hours (hours (* ?h ?d)))))

(defrule calculate-total-required-hours
   "Total Required Hours = sum of every allocated-hours fact. Only
    active topics (selected topics + missing prerequisites) ever get
    an allocated-hours fact, so summing all of them is exactly the
    total the learner must study."
   (declare (salience 15))
   (weekly-available-hours (hours ?))    ; wait until allocation phase is done
   (not (total-required-hours (hours ?)))
   =>
   (bind ?sum 0)
   (do-for-all-facts ((?af allocated-hours)) TRUE
      (bind ?sum (+ ?sum ?af:hours)))
   (assert (total-required-hours (hours ?sum))))

(defrule validate-target-duration
   "Check whether the learner's available study time can realistically
    cover the total required hours within their target duration."
   (declare (salience 10))
   (total-required-hours (hours ?req))
   (weekly-available-hours (hours ?avail))
   (user-profile (target-duration-months ?months))
   (not (duration-check (status ?)))
   =>
   (bind ?weeks (* ?months 4))
   (bind ?total-available (* ?avail ?weeks))
   (if (>= ?total-available ?req)
       then
       (assert (duration-check (status Sufficient) (required-hours ?req) (available-hours ?total-available)))
       else
       (assert (duration-check (status Insufficient) (required-hours ?req) (available-hours ?total-available)))
       (assert (warning (message "Your current available study time may not be enough to complete your selected learning goals within your target timeframe.")))
       (assert (warning (message "Consider one or more of: increasing study hours per day, increasing study days per week, extending your target duration, or focusing on fewer topics.")))))


;; =====================================================================
;; SECTION 5: SCHEDULING
;; =====================================================================
;; The schedule is built by a deffunction (arithmetic distribution of
;; hours across days/weeks) that is TRIGGERED by a defrule once the
;; planning phase (allocation + duration-check) has completed. The
;; ordering of topics still comes entirely from the inferred `priority`
;; facts and expert `learning-order` knowledge - the function does not
;; decide WHAT to schedule or in WHAT order, only how to lay already
;; inferred hours+order across a calendar grid.
;; ---------------------------------------------------------------------

(deffunction get-priority-rank
   "1=Highest 2=High 3=Medium 4=Low 5=(no priority fact yet)"
   (?t)
   (bind ?rank 5)
   (do-for-fact ((?p priority)) (eq ?p:topic ?t)
      (switch ?p:level
         (case Highest then (bind ?rank 1))
         (case High then (bind ?rank 2))
         (case Medium then (bind ?rank 3))
         (case Low then (bind ?rank 4))))
   (return ?rank))

(deffunction get-learning-order
   (?t)
   (bind ?order 99)
   (do-for-fact ((?tp topic)) (eq ?tp:name ?t)
      (bind ?order ?tp:learning-order))
   (return ?order))

(deffunction get-allocated-hours
   (?t)
   (bind ?hrs 0)
   (do-for-fact ((?af allocated-hours)) (eq ?af:topic ?t)
      (bind ?hrs ?af:hours))
   (return ?hrs))

(deffunction ordered-active-topics
   "Every topic that has allocated hours, ordered by inferred priority
    first (Highest before High before Medium before Low) and by expert
    learning-order second."
   ()
   (bind ?result (create$))
   (loop-for-count (?rank 1 5) do
      (loop-for-count (?ord 1 9) do
         (do-for-all-facts ((?af allocated-hours))
                            (and (eq (get-priority-rank ?af:topic) ?rank)
                                 (eq (get-learning-order ?af:topic) ?ord))
            (bind ?result (insert$ ?result (+ (length$ ?result) 1) ?af:topic)))))
   (return ?result))

(deffunction build-schedule
   "Lay out study sessions week by week. Each session is capped at the
    learner's hours-per-day, and only study-days-per-week days are used
    each week. One topic is finished before the next one begins, which
    keeps the schedule consistent with the recommended learning order."
   (?hours-per-day ?days-per-week ?preferred-time)
   (bind ?week 1)
   (bind ?day 1)
   (progn$ (?t (ordered-active-topics))
      (bind ?remaining (get-allocated-hours ?t))
      (while (> ?remaining 0) do
         (bind ?session (min ?remaining ?hours-per-day))
         (assert (schedule-entry (week ?week) (day ?day) (topic ?t)
                                  (hours ?session) (time-of-day ?preferred-time)))
         (bind ?remaining (- ?remaining ?session))
         (bind ?day (+ ?day 1))
         (if (> ?day ?days-per-week)
             then (bind ?day 1) (bind ?week (+ ?week 1)))))
   (assert (schedule-built)))

(defrule create-schedule
   "Once the plan (allocated hours + duration check) is complete,
    generate the weekly study schedule."
   (declare (salience 5))
   (duration-check (status ?))
   (user-profile (study-hours-per-day ?hpd) (study-days-per-week ?dpw)
                 (preferred-study-time ?pref))
   (not (schedule-built))
   =>
   (build-schedule ?hpd ?dpw ?pref))


;; =====================================================================
;; SECTION 6: OUTPUT / REPORTING
;; =====================================================================

(deffunction max-schedule-week ()
   (bind ?max 1)
   (do-for-all-facts ((?s schedule-entry)) TRUE
      (if (> ?s:week ?max) then (bind ?max ?s:week)))
   (return ?max))

(deffunction print-schedule ()
   (bind ?maxweek (max-schedule-week))
   (loop-for-count (?w 1 ?maxweek) do
      (bind ?printed-header FALSE)
      (loop-for-count (?d 1 7) do
         (do-for-all-facts ((?s schedule-entry)) (and (eq ?s:week ?w) (eq ?s:day ?d))
            (if (not ?printed-header)
                then (printout t crlf "  Week " ?w ":" crlf) (bind ?printed-header TRUE))
            (printout t "    Day " ?d " (" ?s:time-of-day "): " ?s:hours
                      " hour(s) -> " ?s:topic crlf)))))

(deffunction print-report ()
   (printout t crlf "=====================================================================" crlf)
   (printout t " YOUR PERSONALIZED FULL-STACK DEVELOPER LEARNING PLAN" crlf)
   (printout t "=====================================================================" crlf)

   ;; --- A. User Summary -------------------------------------------
   (printout t crlf "A. USER SUMMARY" crlf "---------------" crlf)
   (do-for-fact ((?u user-profile)) TRUE
      (printout t "Overall skill level      : " ?u:overall-skill-level crlf)
      (printout t "Study time available     : " ?u:study-hours-per-day
                " hour(s)/day, " ?u:study-days-per-week " day(s)/week" crlf)
      (printout t "Preferred study time     : " ?u:preferred-study-time crlf)
      (printout t "Target duration          : " ?u:target-duration-months " month(s)" crlf))
   (printout t "Known technologies       : ")
   (bind ?known FALSE)
   (do-for-all-facts ((?ts topic-skill)) TRUE
      (bind ?known TRUE)
      (printout t ?ts:topic "(" ?ts:level ") "))
   (if (not ?known) then (printout t "none rated"))
   (printout t crlf "Topics selected to learn : ")
   (do-for-all-facts ((?st selected-topic)) TRUE (printout t ?st:topic " "))
   (printout t crlf)

   ;; --- B. Missing Prerequisites ------------------------------------
   (printout t crlf "B. MISSING PREREQUISITES" crlf "-------------------------" crlf)
   (bind ?anymissing FALSE)
   (do-for-all-facts ((?m missing-prerequisite)) TRUE
      (bind ?anymissing TRUE)
      (printout t "- " ?m:topic " is required before " ?m:needed-for
                " and should be learned first." crlf))
   (if (not ?anymissing)
       then (printout t "None - all prerequisites for your selected topics are satisfied." crlf))

   ;; --- C. Recommended Learning Order --------------------------------
   (printout t crlf "C. RECOMMENDED LEARNING ORDER" crlf "------------------------------" crlf)
   (bind ?i 1)
   (progn$ (?t (ordered-active-topics))
      (printout t "  " ?i ". " ?t crlf)
      (bind ?i (+ ?i 1)))

   ;; --- D. Topic Priorities -------------------------------------------
   (printout t crlf "D. TOPIC PRIORITIES" crlf "--------------------" crlf)
   (do-for-all-facts ((?p priority)) TRUE
      (printout t "- " ?p:topic ": " ?p:level crlf))

   ;; --- E. Estimated Study Hours -----------------------------------
   (printout t crlf "E. ESTIMATED STUDY HOURS" crlf "-------------------------" crlf)
   (do-for-all-facts ((?a allocated-hours)) TRUE
      (printout t "- " ?a:topic ": " ?a:hours " hour(s)" crlf))

   ;; --- F. Weekly Available Study Hours -----------------------------
   (printout t crlf "F. WEEKLY AVAILABLE STUDY HOURS" crlf "--------------------------------" crlf)
   (do-for-fact ((?w weekly-available-hours)) TRUE
      (printout t "You have approximately " ?w:hours " hour(s) available per week." crlf))

   ;; --- G. Suggested Study Schedule ----------------------------------
   (printout t crlf "G. SUGGESTED STUDY SCHEDULE" crlf "----------------------------" crlf)
   (print-schedule)

   ;; --- H. Target Timeframe Validation --------------------------------
   (printout t crlf crlf "H. TARGET TIMEFRAME VALIDATION" crlf "-------------------------------" crlf)
   (do-for-fact ((?d duration-check)) TRUE
      (printout t "Total required study hours          : " ?d:required-hours crlf)
      (printout t "Hours available in target timeframe : " ?d:available-hours crlf)
      (printout t "Status                              : " ?d:status crlf))
   (do-for-all-facts ((?w warning)) TRUE
      (printout t "WARNING: " ?w:message crlf))

   ;; --- I. Final Recommendations -------------------------------------
   (printout t crlf "I. FINAL RECOMMENDATIONS" crlf "-------------------------" crlf)
   (do-for-all-facts ((?r recommendation)) TRUE
      (printout t "- " ?r:topic ": " ?r:action crlf))
   (printout t crlf "=====================================================================" crlf))


;; =====================================================================
;; SECTION 7: USER INTERACTION  (asks Q1-Q8, then runs the engine)
;; =====================================================================

(deffunction ask-yes-no (?prompt)
   (bind ?valid FALSE)
   (bind ?answer FALSE)
   (while (not ?valid) do
      (printout t ?prompt " (yes/no): ")
      (bind ?resp (lowcase (str-cat (read))))
      (if (or (eq ?resp "yes") (eq ?resp "y"))
          then (bind ?answer TRUE) (bind ?valid TRUE)
          else (if (or (eq ?resp "no") (eq ?resp "n"))
                   then (bind ?answer FALSE) (bind ?valid TRUE)
                   else (printout t "  Please answer yes or no." crlf))))
   (return ?answer))

(deffunction ask-menu-choice (?prompt ?labels ?values)
   "Prints a numbered menu built from ?labels, reads a number, and
    returns the matching element of ?values."
   (bind ?n (length$ ?labels))
   (bind ?valid FALSE)
   (bind ?result 0)
   (while (not ?valid) do
      (printout t crlf ?prompt crlf)
      (loop-for-count (?i 1 ?n) do
         (printout t "  " ?i ". " (nth$ ?i ?labels) crlf))
      (printout t "Enter the number of your choice: ")
      (bind ?resp (read))
      (if (and (integerp ?resp) (>= ?resp 1) (<= ?resp ?n))
          then (bind ?result (nth$ ?resp ?values)) (bind ?valid TRUE)
          else (printout t "  Please enter a number between 1 and " ?n "." crlf)))
   (return ?result))

(deffunction start ()
   (reset)
   (printout t crlf "=====================================================================" crlf)
   (printout t " FULL-STACK DEVELOPER LEARNING PLANNING AND SCHEDULING EXPERT SYSTEM" crlf)
   (printout t "=====================================================================" crlf)
   (printout t "Answer the questions below. I will build a personalized learning" crlf)
   (printout t "plan and weekly study schedule for you." crlf)

   (bind ?all-topics (create$ HTML CSS JavaScript Git-GitHub React NodeJS Database-SQL REST-API Deployment))
   (bind ?skill-labels (create$ "Beginner" "Intermediate" "Advanced"))
   (bind ?skill-values (create$ Beginner Intermediate Advanced))

   ;; Q1 --------------------------------------------------------------
   (bind ?overall (ask-menu-choice
      "Q1. What is your current overall skill level in web development?"
      ?skill-labels ?skill-values))

   ;; Q2 + Q3 -----------------------------------------------------------
   (printout t crlf "Q2/Q3. Let's find out which technologies you already know." crlf)
   (progn$ (?t ?all-topics)
      (if (ask-yes-no (str-cat "Do you already know/have experience with " ?t "?"))
          then
          (bind ?lvl (ask-menu-choice
             (str-cat "How would you rate your skill level in " ?t "?")
             ?skill-labels ?skill-values))
          (assert (topic-skill (topic ?t) (level ?lvl)))))

   ;; Q4 ----------------------------------------------------------------
   (printout t crlf "Q4. Now, which technologies do you want to learn?" crlf)
   (bind ?any-selected FALSE)
   (progn$ (?t ?all-topics)
      (if (ask-yes-no (str-cat "Do you want to learn " ?t "?"))
          then (assert (selected-topic (topic ?t))) (bind ?any-selected TRUE)))
   (if (not ?any-selected)
       then (printout t crlf "No topics were selected, so I will plan the full Full-Stack path for you." crlf)
            (progn$ (?t ?all-topics) (assert (selected-topic (topic ?t)))))

   ;; Q5 ------------------------------------------------------------------
   (bind ?hpd (ask-menu-choice "Q5. How many hours can you study per day?"
      (create$ "1 hour" "2 hours" "3 hours" "4 hours or more")
      (create$ 1 2 3 4)))

   ;; Q6 -------------------------------------------------------------------
   (bind ?dpw (ask-menu-choice "Q6. How many days per week can you study?"
      (create$ "1 to 2 days" "3 to 4 days" "5 to 6 days" "7 days")
      (create$ 1 3 5 7)))

   ;; Q7 ----------------------------------------------------------------
   (bind ?pref (ask-menu-choice "Q7. What time do you prefer to study?"
      (create$ "Morning" "Afternoon" "Evening" "No preference")
      (create$ Morning Afternoon Evening NoPreference)))

   ;; Q8 -----------------------------------------------------------------
   (bind ?duration (ask-menu-choice "Q8. How long do you want to reach your Full-Stack Developer goal?"
      (create$ "3 months" "6 months" "9 months" "12 months")
      (create$ 3 6 9 12)))

   (assert (user-profile (overall-skill-level ?overall)
                          (study-hours-per-day ?hpd)
                          (study-days-per-week ?dpw)
                          (preferred-study-time ?pref)
                          (target-duration-months ?duration)))

   (printout t crlf "Running the expert system..." crlf)
   (run)
   (print-report))
