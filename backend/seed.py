"""Seed script — creates sample data for development."""

import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import *
from app.models.question import Question, TestCase
from app.models.student import Student, StudentState
from app.models.admin import AdminUser
from app.models.competition import CompetitionConfig
from app.utils.security import hash_password
from app.config import get_settings

settings = get_settings()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # --- Admin User ---
        if not db.query(AdminUser).first():
            db.add(AdminUser(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            ))
            print("✓ Admin user created")

        # --- Round 1: Debugging Questions (MCQ) ---
        if not db.query(Question).filter(Question.round_number == 1).first():
            import mcq_data
            import json
            mcqs = mcq_data.generate_mcqs()
            for idx, mcq in enumerate(mcqs):
                q = Question(
                    round_number=1,
                    title=mcq["title"],
                    description=mcq["desc"],
                    buggy_code=mcq["code"],
                    language=mcq["lang"],
                    options=json.dumps(mcq["options"]),
                    correct_option=mcq["correct"],
                    points=10,
                    order_index=idx,
                )
                db.add(q)
            db.flush()
            print("✓ Round 1 questions created (40 MCQ debugging problems)")

        # --- Round 2: Programming Questions ---
        if not db.query(Question).filter(Question.round_number == 2).first():
            import r2_data
            r2_qs = r2_data.get_r2_questions()
            for idx, item in enumerate(r2_qs):
                q = Question(
                    round_number=2,
                    title=item["title"],
                    description=item["desc"],
                    input_description=item["input_desc"],
                    output_description=item["output_desc"],
                    constraints=item["constraints"],
                    sample_input=item["sample_in"],
                    sample_output=item["sample_out"],
                    points=10,
                    order_index=idx,
                )
                db.add(q)
                db.flush()

                for inp, out, is_sample in item["test_cases"]:
                    db.add(TestCase(
                        question_id=q.id,
                        input_data=inp,
                        expected_output=out,
                        is_sample=is_sample,
                        is_hidden=not is_sample,
                    ))

            print("✓ Round 2 questions created (10 programming problems)")

        # --- Sample Students (Disabled for Event) ---
        # sample_students = [
        #     ("22CSE001", "Viswa", "CSE", "III Year"),
        #     ("22CSE002", "Arun Kumar", "CSE", "III Year"),
        #     ("23CSE001", "Priya", "CSE", "II Year"),
        #     ("23CSE002", "Karthik", "CSE", "II Year"),
        #     ("22ECE001", "Divya", "ECE", "III Year"),
        # ]
        # for reg, name, dept, year in sample_students:
        #     existing = db.query(Student).filter(Student.register_number == reg).first()
        #     if not existing:
        #         db.add(Student(
        #             register_number=reg,
        #             name=name,
        #             department=dept,
        #             year=year,
        #             state=StudentState.ROUND_1_AVAILABLE,
        #         ))
        # print("✓ Sample students skipped (Event Ready)")

        db.commit()
        print("\n✅ Seed complete!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
