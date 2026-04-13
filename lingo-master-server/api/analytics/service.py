"""
Analytics and statistics service.
"""
from typing import Dict, Any, List
from uuid import UUID
from datetime import date, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.models import (
    DailyStat, LearningRecord, Achievement, User, StudyPlan
)


class AnalyticsService:
    """Analytics and statistics service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_period_stats(self, user_id: str, period: str = "week") -> Dict[str, Any]:
        """Get statistics for a period (for AI analysis)."""
        if period == "month":
            days = 30
        else:
            days = 7

        start_date = date.today() - timedelta(days=days)

        # Get daily stats for the period
        stats_query = select(DailyStat).where(
            and_(
                DailyStat.user_id == UUID(user_id),
                DailyStat.stat_date >= start_date,
            )
        ).order_by(DailyStat.stat_date)
        result = await self.db.execute(stats_query)
        daily_stats = result.scalars().all()

        # Aggregate
        total_new = sum(s.new_words_learned for s in daily_stats)
        total_reviewed = sum(s.words_reviewed for s in daily_stats)
        total_time = sum(s.time_spent_sec for s in daily_stats)
        avg_time_min = round(total_time / max(len(daily_stats), 1) / 60, 1)

        pass_rates = [s.review_pass_rate for s in daily_stats if s.review_pass_rate > 0]
        avg_pass_rate = round(sum(pass_rates) / max(len(pass_rates), 1) * 100, 1)

        # Get user streak
        user_query = select(User).where(User.user_id == UUID(user_id))
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        streak = user.streak_days if user else 0

        # Get total vocab stats
        total_vocab_query = select(func.count()).select_from(LearningRecord).where(
            and_(
                LearningRecord.user_id == UUID(user_id),
                LearningRecord.status != "new",
            )
        )
        total_vocab_result = await self.db.execute(total_vocab_query)
        total_vocab = total_vocab_result.scalar() or 0

        mastered_query = select(func.count()).select_from(LearningRecord).where(
            and_(
                LearningRecord.user_id == UUID(user_id),
                LearningRecord.status == "mastered",
            )
        )
        mastered_result = await self.db.execute(mastered_query)
        mastered_count = mastered_result.scalar() or 0

        return {
            "new_words_count": total_new,
            "review_count": total_reviewed,
            "avg_time_min": avg_time_min,
            "pass_rate": avg_pass_rate,
            "streak": streak,
            "weak_categories": "待分析",
            "total_vocab": total_vocab,
            "mastered_count": mastered_count,
        }

    async def get_daily_stats(
        self, user_id: str, start_date: date, end_date: date
    ) -> List[Dict[str, Any]]:
        """Get daily stats for a date range."""
        query = select(DailyStat).where(
            and_(
                DailyStat.user_id == UUID(user_id),
                DailyStat.stat_date >= start_date,
                DailyStat.stat_date <= end_date,
            )
        ).order_by(DailyStat.stat_date)

        result = await self.db.execute(query)
        stats = result.scalars().all()

        return [
            {
                "date": str(s.stat_date),
                "new_words_learned": s.new_words_learned,
                "words_reviewed": s.words_reviewed,
                "words_mastered": s.words_mastered,
                "time_spent_sec": s.time_spent_sec,
                "review_pass_rate": s.review_pass_rate,
            }
            for s in stats
        ]

    async def get_learning_overview(self, user_id: str) -> Dict[str, Any]:
        """Get overall learning statistics overview."""
        uid = UUID(user_id)

        # Count by status
        status_query = select(
            LearningRecord.status,
            func.count(LearningRecord.record_id),
        ).where(
            LearningRecord.user_id == uid
        ).group_by(LearningRecord.status)

        result = await self.db.execute(status_query)
        status_counts = {row[0]: row[1] for row in result.all()}

        # Get total time spent
        time_query = select(func.sum(DailyStat.time_spent_sec)).where(
            DailyStat.user_id == uid
        )
        time_result = await self.db.execute(time_query)
        total_time = time_result.scalar() or 0

        # Get achievements count
        achievement_query = select(func.count()).select_from(Achievement).where(
            Achievement.user_id == uid
        )
        achievement_result = await self.db.execute(achievement_query)
        achievements_count = achievement_result.scalar() or 0

        # Get active plans count
        plan_query = select(func.count()).select_from(StudyPlan).where(
            and_(
                StudyPlan.user_id == uid,
                StudyPlan.status == "active",
            )
        )
        plan_result = await self.db.execute(plan_query)
        active_plans = plan_result.scalar() or 0

        return {
            "total_words": sum(status_counts.values()),
            "new_words": status_counts.get("new", 0),
            "learning_words": status_counts.get("learning", 0),
            "reviewing_words": status_counts.get("reviewing", 0),
            "mastered_words": status_counts.get("mastered", 0),
            "total_time_hours": round(total_time / 3600, 1),
            "achievements_earned": achievements_count,
            "active_plans": active_plans,
        }

    async def get_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's achievements."""
        query = select(Achievement).where(
            Achievement.user_id == UUID(user_id)
        ).order_by(Achievement.earned_at.desc())

        result = await self.db.execute(query)
        achievements = result.scalars().all()

        return [
            {
                "id": str(a.id),
                "achievement_key": a.achievement_key,
                "achievement_name": a.achievement_name,
                "achievement_type": a.achievement_type,
                "icon": a.icon,
                "earned_at": a.earned_at.isoformat() if a.earned_at else None,
            }
            for a in achievements
        ]

    async def check_and_award_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """Check and award any new achievements."""
        uid = UUID(user_id)
        new_achievements = []

        # Get user info
        user_query = select(User).where(User.user_id == uid)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user:
            return []

        # Get existing achievement keys
        existing_query = select(Achievement.achievement_key).where(
            Achievement.user_id == uid
        )
        existing_result = await self.db.execute(existing_query)
        existing_keys = {row[0] for row in existing_result.all()}

        # Get counts
        total_learned_query = select(func.count()).select_from(LearningRecord).where(
            and_(
                LearningRecord.user_id == uid,
                LearningRecord.status != "new",
            )
        )
        total_learned_result = await self.db.execute(total_learned_query)
        total_learned = total_learned_result.scalar() or 0

        # Achievement definitions
        achievements_to_check = [
            # Streak achievements
            ("streak_3", "初露锋芒", "streak", "🔥", user.streak_days >= 3),
            ("streak_7", "坚持不懈", "streak", "🔥", user.streak_days >= 7),
            ("streak_21", "习惯养成", "streak", "🔥", user.streak_days >= 21),
            ("streak_100", "百日精进", "streak", "🔥", user.streak_days >= 100),
            ("streak_365", "全年无休", "streak", "🔥", user.streak_days >= 365),
            # Vocab milestones
            ("vocab_100", "入门学者", "vocab", "📗", total_learned >= 100),
            ("vocab_500", "初级学者", "vocab", "📘", total_learned >= 500),
            ("vocab_2000", "中级学者", "vocab", "📙", total_learned >= 2000),
            ("vocab_5000", "高级学者", "vocab", "📕", total_learned >= 5000),
            ("vocab_10000", "词汇大师", "vocab", "👑", total_learned >= 10000),
        ]

        for key, name, atype, icon, condition in achievements_to_check:
            if key not in existing_keys and condition:
                achievement = Achievement(
                    user_id=uid,
                    achievement_key=key,
                    achievement_name=name,
                    achievement_type=atype,
                    icon=icon,
                )
                self.db.add(achievement)
                new_achievements.append({
                    "achievement_key": key,
                    "achievement_name": name,
                    "achievement_type": atype,
                    "icon": icon,
                })

        if new_achievements:
            await self.db.flush()

        return new_achievements
