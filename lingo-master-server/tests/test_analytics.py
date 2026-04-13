"""
Analytics module tests.
Tests: period stats, daily stats, learning overview, achievements.
"""
import pytest
from datetime import date, timedelta

from api.analytics.service import AnalyticsService
from api.database.models import DailyStat, LearningRecord


class TestAnalyticsService:
    """Test analytics and statistics service."""

    @pytest.mark.asyncio
    async def test_get_learning_overview_empty(self, seeded_db):
        """Test overview with no learning data."""
        db, user = seeded_db
        service = AnalyticsService(db)
        overview = await service.get_learning_overview(str(user.user_id))

        assert overview is not None
        assert overview["total_words"] == 0
        assert overview["mastered_words"] == 0
        assert overview["total_time_hours"] == 0

    @pytest.mark.asyncio
    async def test_get_learning_overview_with_data(self, seeded_db):
        """Test overview with learning records."""
        db, user = seeded_db

        # Add learning records
        record1 = LearningRecord(
            user_id=user.user_id,
            word_id="en_hello",
            easiness_factor=2.5,
            repetitions=3,
            interval_days=15,
            status="reviewing",
        )
        record2 = LearningRecord(
            user_id=user.user_id,
            word_id="en_world",
            easiness_factor=2.8,
            repetitions=6,
            interval_days=60,
            status="mastered",
        )
        db.add(record1)
        db.add(record2)
        await db.flush()

        service = AnalyticsService(db)
        overview = await service.get_learning_overview(str(user.user_id))

        assert overview["total_words"] == 2
        assert overview["mastered_words"] == 1
        assert overview["reviewing_words"] == 1

    @pytest.mark.asyncio
    async def test_get_daily_stats_empty(self, seeded_db):
        """Test daily stats with no data."""
        db, user = seeded_db
        service = AnalyticsService(db)
        stats = await service.get_daily_stats(
            str(user.user_id),
            date.today() - timedelta(days=7),
            date.today()
        )
        assert isinstance(stats, list)
        assert len(stats) == 0

    @pytest.mark.asyncio
    async def test_get_daily_stats_with_data(self, seeded_db):
        """Test daily stats with recorded data."""
        db, user = seeded_db

        # Add daily stat
        stat = DailyStat(
            user_id=user.user_id,
            stat_date=date.today(),
            new_words_learned=10,
            words_reviewed=30,
            words_mastered=2,
            time_spent_sec=1800,
            review_pass_rate=0.85,
        )
        db.add(stat)
        await db.flush()

        service = AnalyticsService(db)
        stats = await service.get_daily_stats(
            str(user.user_id),
            date.today() - timedelta(days=1),
            date.today()
        )
        assert len(stats) == 1
        assert stats[0]["new_words_learned"] == 10
        assert stats[0]["words_reviewed"] == 30
        assert stats[0]["time_spent_sec"] == 1800

    @pytest.mark.asyncio
    async def test_get_period_stats(self, seeded_db):
        """Test period aggregated stats."""
        db, user = seeded_db

        # Add stats for past week
        for i in range(7):
            stat = DailyStat(
                user_id=user.user_id,
                stat_date=date.today() - timedelta(days=i),
                new_words_learned=10,
                words_reviewed=20,
                words_mastered=2,
                time_spent_sec=1200,
                review_pass_rate=0.80,
            )
            db.add(stat)
        await db.flush()

        service = AnalyticsService(db)
        stats = await service.get_period_stats(str(user.user_id), "week")
        assert stats is not None
        assert stats["new_words_count"] == 70  # 10 * 7
        assert stats["streak"] == 0  # user streak starts at 0

    @pytest.mark.asyncio
    async def test_get_achievements_empty(self, seeded_db):
        """Test achievements with no achievements."""
        db, user = seeded_db
        service = AnalyticsService(db)
        achievements = await service.get_achievements(str(user.user_id))
        assert isinstance(achievements, list)
        assert len(achievements) == 0

    @pytest.mark.asyncio
    async def test_check_and_award_streak_achievement(self, seeded_db):
        """Test achievement awarding for streak."""
        db, user = seeded_db

        # Set user streak to 7
        user.streak_days = 7
        await db.flush()

        service = AnalyticsService(db)
        new_achievements = await service.check_and_award_achievements(str(user.user_id))

        # Should earn streak_3 and streak_7
        keys = [a["achievement_key"] for a in new_achievements]
        assert "streak_3" in keys
        assert "streak_7" in keys

    @pytest.mark.asyncio
    async def test_check_achievements_no_duplicates(self, seeded_db):
        """Test that achievements are not awarded twice."""
        db, user = seeded_db

        user.streak_days = 7
        await db.flush()

        service = AnalyticsService(db)

        # Award first time
        first_result = await service.check_and_award_achievements(str(user.user_id))
        assert len(first_result) > 0

        await db.commit()

        # Check again - should get no new achievements
        second_result = await service.check_and_award_achievements(str(user.user_id))
        assert len(second_result) == 0

    @pytest.mark.asyncio
    async def test_check_vocab_achievement(self, seeded_db):
        """Test vocabulary milestone achievement."""
        db, user = seeded_db

        # Add 100 learning records
        for i in range(100):
            record = LearningRecord(
                user_id=user.user_id,
                word_id=f"en_word_{i}",
                easiness_factor=2.5,
                repetitions=1,
                interval_days=1,
                status="learning",
            )
            db.add(record)
        await db.flush()

        service = AnalyticsService(db)
        new_achievements = await service.check_and_award_achievements(str(user.user_id))

        keys = [a["achievement_key"] for a in new_achievements]
        assert "vocab_100" in keys
