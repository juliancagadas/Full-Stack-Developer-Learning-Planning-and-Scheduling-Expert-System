from pathlib import Path

import clips
from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent.parent
CLIPS_DIR = BASE_DIR / "clips"
FRONTEND_DIR = BASE_DIR / "frontend"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path=""
)


# ---------------------------------------------------------
# FRONTEND
# ---------------------------------------------------------

@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


# ---------------------------------------------------------
# CLIPS
# ---------------------------------------------------------

def run_clips(user_data):
    environment = clips.Environment()

    # Load your existing expert-system rules.
    environment.load(str(CLIPS_DIR / "main.clp"))

    # Load the expert knowledge base.
    environment.reset()

    # -----------------------------------------------------
    # USER PROFILE
    # -----------------------------------------------------

    overall_skill = user_data["overallSkill"]
    hours_per_day = user_data["hoursPerDay"]
    days_per_week = user_data["daysPerWeek"]
    preferred_time = user_data["preferredTime"]
    target_duration = user_data["targetDuration"]

    environment.assert_string(
        f"""
        (user-profile
            (overall-skill-level {overall_skill})
            (study-hours-per-day {hours_per_day})
            (study-days-per-week {days_per_week})
            (preferred-study-time {preferred_time})
            (target-duration-months {target_duration})
        )
        """
    )

    # -----------------------------------------------------
    # KNOWN TECHNOLOGIES
    # -----------------------------------------------------

    for known_topic in user_data["known"]:
        symbol = known_topic["symbol"]
        level = known_topic["level"]

        environment.assert_string(
            f"(topic-skill (topic {symbol}) (level {level}))"
        )

    # -----------------------------------------------------
    # SELECTED TOPICS
    # -----------------------------------------------------

    for topic in user_data["goals"]:
        environment.assert_string(
            f"(selected-topic (topic {topic}))"
        )

    # -----------------------------------------------------
    # RUN YOUR EXISTING CLIPS RULES
    # -----------------------------------------------------

    environment.run()

    ordered_topics = environment.eval("(ordered-active-topics)")

    # -----------------------------------------------------
    # COLLECT RESULTS
    # -----------------------------------------------------

    results = {
        "missingPrerequisites": [],
        "learningOrder": [str(topic) for topic in ordered_topics],
        "priorities": [],
        "allocatedHours": [],
        "weeklyAvailableHours": None,
        "durationCheck": None,
        "warnings": [],
        "recommendations": [],
        "schedule": []
    }

    for fact in environment.facts():

        template_name = fact.template.name

        if template_name == "missing-prerequisite":
            results["missingPrerequisites"].append({
                "topic": str(fact["topic"]),
                "neededFor": str(fact["needed-for"])
            })

        elif template_name == "priority":
            results["priorities"].append({
                "topic": str(fact["topic"]),
                "level": str(fact["level"])
            })

        elif template_name == "allocated-hours":
            results["allocatedHours"].append({
                "topic": str(fact["topic"]),
                "hours": int(fact["hours"])
            })

        elif template_name == "weekly-available-hours":
            results["weeklyAvailableHours"] = int(fact["hours"])

        elif template_name == "duration-check":
            results["durationCheck"] = {
                "status": str(fact["status"]),
                "requiredHours": int(fact["required-hours"]),
                "availableHours": int(fact["available-hours"])
            }

        elif template_name == "warning":
            results["warnings"].append(
                str(fact["message"])
            )

        elif template_name == "recommendation":
            results["recommendations"].append({
                "topic": str(fact["topic"]),
                "action": str(fact["action"])
            })

        elif template_name == "schedule-entry":
            results["schedule"].append({
                "week": int(fact["week"]),
                "day": int(fact["day"]),
                "topic": str(fact["topic"]),
                "hours": int(fact["hours"]),
                "timeOfDay": str(fact["time-of-day"])
            })

    return results


# ---------------------------------------------------------
# API
# ---------------------------------------------------------

@app.post("/api/generate-plan")
def generate_plan():

    try:
        user_data = request.get_json()

        if not user_data:
            return jsonify({
                "success": False,
                "message": "No data was received."
            }), 400

        results = run_clips(user_data)

        return jsonify({
            "success": True,
            "results": results
        })

    except Exception as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


# ---------------------------------------------------------
# START SERVER
# ---------------------------------------------------------

if __name__ == "__main__":
    app.run(
        debug=True,
        port=5000
    )