"""S.3: Klartraum-Bucket-List (Goals) + Abendritual (Intentions), Umzugsarbeit aus main.py."""
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from deps import get_session, require_auth
from models import Goal, Intention
from schemas import GoalIn, GoalToggle, IntentionFulfill, IntentionIn

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


@router.get("/goals")
def list_goals(session: Session = Depends(get_session)):
    goals = session.exec(select(Goal)).all()
    open_goals = sorted([g for g in goals if not g.done], key=lambda g: g.created_at)
    done_goals = sorted([g for g in goals if g.done], key=lambda g: g.done_at or g.created_at, reverse=True)
    return [
        {"id": g.id, "text": g.text, "done": g.done, "done_at": g.done_at.isoformat() if g.done_at else None}
        for g in open_goals + done_goals
    ]


@router.post("/goals", status_code=201)
def create_goal(payload: GoalIn, session: Session = Depends(get_session)):
    goal = Goal(text=payload.text.strip())
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return {"id": goal.id, "text": goal.text, "done": goal.done, "done_at": None}


@router.patch("/goals/{goal_id}")
def update_goal(goal_id: int, payload: GoalToggle, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "goal_not_found")
    goal.done = payload.done
    goal.done_at = dt.datetime.utcnow() if payload.done else None
    session.add(goal)
    session.commit()
    return {"id": goal.id, "text": goal.text, "done": goal.done, "done_at": goal.done_at.isoformat() if goal.done_at else None}


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(404, "goal_not_found")
    session.delete(goal)
    session.commit()


@router.get("/intentions/current")
def current_intention(session: Session = Depends(get_session)):
    stmt = select(Intention).where(Intention.fulfilled == None).order_by(col(Intention.id).desc())  # noqa: E711
    intention = session.exec(stmt).first()
    if not intention:
        return None
    return {
        "id": intention.id,
        "date": intention.date.isoformat(),
        "text": intention.text,
        "fulfilled": intention.fulfilled,
        "is_today": intention.date == dt.date.today(),
    }


@router.post("/intentions", status_code=201)
def create_intention(payload: IntentionIn, session: Session = Depends(get_session)):
    today = dt.date.today()
    existing = session.exec(
        select(Intention).where(Intention.date == today, Intention.fulfilled == None)  # noqa: E711
    ).first()
    if existing:
        existing.text = payload.text.strip()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        intention = existing
    else:
        intention = Intention(date=today, text=payload.text.strip())
        session.add(intention)
        session.commit()
        session.refresh(intention)
    return {
        "id": intention.id,
        "date": intention.date.isoformat(),
        "text": intention.text,
        "fulfilled": intention.fulfilled,
    }


@router.patch("/intentions/{intention_id}")
def update_intention(intention_id: int, payload: IntentionFulfill, session: Session = Depends(get_session)):
    intention = session.get(Intention, intention_id)
    if not intention:
        raise HTTPException(404, "intention_not_found")
    intention.fulfilled = payload.fulfilled
    session.add(intention)
    session.commit()
    return {"id": intention.id, "fulfilled": intention.fulfilled}
