"""
Data sync service - handles push/pull sync between iOS client and server.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.models import (
    LearningRecord, StudyPlan, DailyTask, DailyStat,
    Achievement, UserDevice,
)
from api.sync.models import (
    PushRequest, PushResponse, PullRequest, PullResponse,
    SyncChanges, ConflictRecord, SyncStatusResponse,
    LearningRecordSync, DailyStatSync, StudyPlanSync,
    DailyTaskSync, AchievementSync,
)
from api.sync.conflict_resolver import ConflictResolver


class SyncService:
    """Data synchronization service."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.resolver = ConflictResolver()

    async def _get_next_sync_version(self, user_id: str) -> int:
        """Get the next sync version number."""
        query = select(func.max(LearningRecord.sync_version)).where(
            LearningRecord.user_id == UUID(user_id)
        )
        result = await self.db.execute(query)
        current = result.scalar() or 0
        return current + 1

    async def push(self, user_id: str, request: PushRequest) -> PushResponse:
        """Handle push sync from client."""
        accepted = 0
        conflicts: List[ConflictRecord] = []
        new_version = await self._get_next_sync_version(user_id)

        # Sync learning records
        for record in request.changes.learning_records:
            try:
                await self._sync_learning_record(user_id, record, new_version)
                accepted += 1
            except Exception:
                pass

        # Sync daily stats
        for stat in request.changes.daily_stats:
            try:
                await self._sync_daily_stat(user_id, stat)
                accepted += 1
            except Exception:
                pass

        # Sync study plans
        for plan in request.changes.study_plans:
            try:
                await self._sync_study_plan(user_id, plan)
                accepted += 1
            except Exception:
                pass

        # Sync daily tasks
        for task in request.changes.daily_tasks:
            try:
                await self._sync_daily_task(user_id, task)
                accepted += 1
            except Exception:
                pass

        # Sync achievements
        for achievement in request.changes.achievements:
            try:
                await self._sync_achievement(user_id, achievement)
                accepted += 1
            except Exception:
                pass

        # Update device sync info
        await self._update_device_sync(user_id, request.device_id, new_version)

        await self.db.flush()

        return PushResponse(
            accepted=accepted,
            conflicts=conflicts,
            new_sync_version=new_version,
        )

    async def pull(self, user_id: str, request: PullRequest) -> PullResponse:
        """Handle pull sync - return changes since last sync version."""
        last_version = request.last_sync_version

        # Get learning records changed since last sync
        lr_query = select(LearningRecord).where(
            and_(
                LearningRecord.user_id == UUID(user_id),
                LearningRecord.sync_version > last_version,
            )
        )
        lr_result = await self.db.execute(lr_query)
        learning_records = lr_result.scalars().all()

        # Get current max sync version
        version_query = select(func.max(LearningRecord.sync_version)).where(
            LearningRecord.user_id == UUID(user_id)
        )
        version_result = await self.db.execute(version_query)
        current_version = version_result.scalar() or 0

        changes = SyncChanges(
            learning_records=[
                LearningRecordSync(
                    record_id=str(r.record_id),
                    user_id=str(r.user_id),
                    word_id=r.word_id,
                    easiness_factor=r.easiness_factor,
                    repetitions=r.repetitions,
                    interval_days=r.interval_days,
                    next_review_date=r.next_review_date,
                    consecutive_perfect=r.consecutive_perfect,
                    status=r.status,
                    quality_history=r.quality_history or [],
                    first_learned_at=r.first_learned_at,
                    last_reviewed_at=r.last_reviewed_at,
                    mastered_at=r.mastered_at,
                    updated_at=r.updated_at or datetime.now(timezone.utc),
                    sync_version=r.sync_version,
                )
                for r in learning_records
            ],
        )

        # Update device sync info
        await self._update_device_sync(user_id, request.device_id, current_version)

        return PullResponse(
            changes=changes,
            current_sync_version=current_version,
        )

    async def get_status(self, user_id: str, device_id: Optional[str] = None) -> SyncStatusResponse:
        """Get sync status."""
        version_query = select(func.max(LearningRecord.sync_version)).where(
            LearningRecord.user_id == UUID(user_id)
        )
        result = await self.db.execute(version_query)
        current_version = result.scalar() or 0

        last_sync_at = None
        if device_id:
            device_query = select(UserDevice).where(
                and_(
                    UserDevice.user_id == UUID(user_id),
                    UserDevice.device_id == UUID(device_id),
                )
            )
            device_result = await self.db.execute(device_query)
            device = device_result.scalar_one_or_none()
            if device:
                last_sync_at = device.last_sync_at

        return SyncStatusResponse(
            last_sync_at=last_sync_at,
            current_sync_version=current_version,
            pending_changes=0,
        )

    async def _sync_learning_record(
        self, user_id: str, record: LearningRecordSync, new_version: int
    ) -> None:
        """Sync a single learning record."""
        existing_query = select(LearningRecord).where(
            and_(
                LearningRecord.user_id == UUID(user_id),
                LearningRecord.word_id == record.word_id,
            )
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing record
            stmt = (
                update(LearningRecord)
                .where(LearningRecord.record_id == existing.record_id)
                .values(
                    easiness_factor=record.easiness_factor,
                    repetitions=record.repetitions,
                    interval_days=record.interval_days,
                    next_review_date=record.next_review_date,
                    consecutive_perfect=record.consecutive_perfect,
                    status=record.status,
                    quality_history=record.quality_history,
                    last_reviewed_at=record.last_reviewed_at,
                    mastered_at=record.mastered_at,
                    updated_at=datetime.now(timezone.utc),
                    sync_version=new_version,
                )
            )
            await self.db.execute(stmt)
        else:
            # Insert new record
            new_record = LearningRecord(
                user_id=UUID(user_id),
                word_id=record.word_id,
                easiness_factor=record.easiness_factor,
                repetitions=record.repetitions,
                interval_days=record.interval_days,
                next_review_date=record.next_review_date,
                consecutive_perfect=record.consecutive_perfect,
                status=record.status,
                quality_history=record.quality_history,
                first_learned_at=record.first_learned_at or datetime.now(timezone.utc),
                last_reviewed_at=record.last_reviewed_at,
                mastered_at=record.mastered_at,
                sync_version=new_version,
            )
            self.db.add(new_record)

    async def _sync_daily_stat(self, user_id: str, stat: DailyStatSync) -> None:
        """Sync a daily stat record."""
        existing_query = select(DailyStat).where(
            and_(
                DailyStat.user_id == UUID(user_id),
                DailyStat.stat_date == stat.stat_date,
            )
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            stmt = (
                update(DailyStat)
                .where(DailyStat.stat_id == existing.stat_id)
                .values(
                    new_words_learned=max(existing.new_words_learned, stat.new_words_learned),
                    words_reviewed=max(existing.words_reviewed, stat.words_reviewed),
                    words_mastered=max(existing.words_mastered, stat.words_mastered),
                    time_spent_sec=max(existing.time_spent_sec, stat.time_spent_sec),
                    review_pass_rate=stat.review_pass_rate,
                )
            )
            await self.db.execute(stmt)
        else:
            new_stat = DailyStat(
                user_id=UUID(user_id),
                stat_date=stat.stat_date,
                new_words_learned=stat.new_words_learned,
                words_reviewed=stat.words_reviewed,
                words_mastered=stat.words_mastered,
                time_spent_sec=stat.time_spent_sec,
                review_pass_rate=stat.review_pass_rate,
            )
            self.db.add(new_stat)

    async def _sync_study_plan(self, user_id: str, plan: StudyPlanSync) -> None:
        """Sync a study plan."""
        existing_query = select(StudyPlan).where(
            StudyPlan.plan_id == UUID(plan.plan_id)
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            stmt = (
                update(StudyPlan)
                .where(StudyPlan.plan_id == existing.plan_id)
                .values(
                    daily_new_words=plan.daily_new_words,
                    play_count=plan.play_count,
                    target_date=plan.target_date,
                    status=plan.status,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await self.db.execute(stmt)
        else:
            new_plan = StudyPlan(
                plan_id=UUID(plan.plan_id),
                user_id=UUID(user_id),
                book_id=plan.book_id,
                daily_new_words=plan.daily_new_words,
                play_count=plan.play_count,
                start_date=plan.start_date,
                target_date=plan.target_date,
                status=plan.status,
            )
            self.db.add(new_plan)

    async def _sync_daily_task(self, user_id: str, task: DailyTaskSync) -> None:
        """Sync a daily task."""
        existing_query = select(DailyTask).where(
            DailyTask.task_id == UUID(task.task_id)
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            stmt = (
                update(DailyTask)
                .where(DailyTask.task_id == existing.task_id)
                .values(
                    new_done=task.new_done,
                    review_done=task.review_done,
                    time_spent_sec=task.time_spent_sec,
                    completion_rate=task.completion_rate,
                )
            )
            await self.db.execute(stmt)
        else:
            new_task = DailyTask(
                task_id=UUID(task.task_id),
                plan_id=UUID(task.plan_id),
                user_id=UUID(user_id),
                task_date=task.task_date,
                new_target=task.new_target,
                new_done=task.new_done,
                review_target=task.review_target,
                review_done=task.review_done,
                time_spent_sec=task.time_spent_sec,
                completion_rate=task.completion_rate,
            )
            self.db.add(new_task)

    async def _sync_achievement(self, user_id: str, achievement: AchievementSync) -> None:
        """Sync an achievement."""
        existing_query = select(Achievement).where(
            and_(
                Achievement.user_id == UUID(user_id),
                Achievement.achievement_key == achievement.achievement_key,
            )
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if not existing:
            new_achievement = Achievement(
                user_id=UUID(user_id),
                achievement_key=achievement.achievement_key,
                achievement_name=achievement.achievement_name,
                achievement_type=achievement.achievement_type,
                icon=achievement.icon,
                earned_at=achievement.earned_at or datetime.now(timezone.utc),
            )
            self.db.add(new_achievement)

    async def _update_device_sync(
        self, user_id: str, device_id: str, sync_version: int
    ) -> None:
        """Update device sync information."""
        try:
            device_uuid = UUID(device_id)
        except (ValueError, AttributeError):
            return

        existing_query = select(UserDevice).where(
            UserDevice.device_id == device_uuid
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            stmt = (
                update(UserDevice)
                .where(UserDevice.device_id == device_uuid)
                .values(
                    last_sync_at=datetime.now(timezone.utc),
                    last_sync_version=sync_version,
                )
            )
            await self.db.execute(stmt)
