"""
Conflict resolution for data sync.
Uses "last-write-wins" strategy with version checking.
"""
from typing import Dict, Any, Tuple
from datetime import datetime


class ConflictResolver:
    """Resolves sync conflicts between client and server versions."""

    @staticmethod
    def resolve_learning_record(
        server_data: Dict[str, Any],
        client_data: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Resolve conflict for a learning record.
        Returns (winner_data, has_conflict).
        Strategy: Last-write-wins based on updated_at timestamp.
        """
        server_updated = server_data.get("updated_at")
        client_updated = client_data.get("updated_at")

        if server_updated and client_updated:
            if isinstance(server_updated, str):
                server_updated = datetime.fromisoformat(server_updated)
            if isinstance(client_updated, str):
                client_updated = datetime.fromisoformat(client_updated)

            if client_updated > server_updated:
                return client_data, True
            else:
                return server_data, True

        # If only one has updated_at, prefer the one that does
        if client_updated:
            return client_data, True
        return server_data, True

    @staticmethod
    def resolve_study_plan(
        server_data: Dict[str, Any],
        client_data: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Resolve conflict for a study plan.
        Strategy: Last-write-wins based on updated_at.
        """
        server_updated = server_data.get("updated_at")
        client_updated = client_data.get("updated_at")

        if server_updated and client_updated:
            if isinstance(server_updated, str):
                server_updated = datetime.fromisoformat(server_updated)
            if isinstance(client_updated, str):
                client_updated = datetime.fromisoformat(client_updated)

            if client_updated > server_updated:
                return client_data, True
            return server_data, True

        if client_updated:
            return client_data, True
        return server_data, True

    @staticmethod
    def resolve_daily_stat(
        server_data: Dict[str, Any],
        client_data: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Resolve conflict for daily stats.
        Strategy: Take maximum values (additive merge).
        """
        merged = dict(server_data)
        merged["new_words_learned"] = max(
            server_data.get("new_words_learned", 0),
            client_data.get("new_words_learned", 0),
        )
        merged["words_reviewed"] = max(
            server_data.get("words_reviewed", 0),
            client_data.get("words_reviewed", 0),
        )
        merged["words_mastered"] = max(
            server_data.get("words_mastered", 0),
            client_data.get("words_mastered", 0),
        )
        merged["time_spent_sec"] = max(
            server_data.get("time_spent_sec", 0),
            client_data.get("time_spent_sec", 0),
        )
        merged["review_pass_rate"] = max(
            server_data.get("review_pass_rate", 0),
            client_data.get("review_pass_rate", 0),
        )
        return merged, True

    @staticmethod
    def resolve_achievement(
        server_data: Dict[str, Any],
        client_data: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Resolve conflict for achievements.
        Strategy: Keep earliest earned_at (first achievement wins).
        """
        server_earned = server_data.get("earned_at")
        client_earned = client_data.get("earned_at")

        if server_earned and client_earned:
            if isinstance(server_earned, str):
                server_earned = datetime.fromisoformat(server_earned)
            if isinstance(client_earned, str):
                client_earned = datetime.fromisoformat(client_earned)

            if client_earned < server_earned:
                return client_data, True
            return server_data, True

        return server_data, False
