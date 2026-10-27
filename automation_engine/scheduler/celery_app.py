from celery import Celery
from celery.schedules import crontab
from automation_engine.config import REDIS_URL

app = Celery("college_outreach_automation", broker=REDIS_URL, backend=REDIS_URL)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "monthly-college-crawl-and-audit": {
            "task": "automation_engine.scheduler.tasks.monthly_full_audit_and_delta_monitor",
            # Runs periodically once in a month on the 1st of every month at 3:00 AM IST
            "schedule": crontab(day_of_month="1", hour="3", minute="0"),
        },
    },
)

if __name__ == "__main__":
    app.start()
