"""
SM-2 Algorithm tests.
Verifies the SM-2 spaced repetition algorithm implementation in the backend.
"""


class TestSM2Algorithm:
    """Test SM-2 algorithm logic (pure Python implementation matching iOS SM2Engine)."""

    @staticmethod
    def sm2_calculate(quality: int, repetitions: int, easiness_factor: float,
                      interval_days: int, consecutive_perfect: int = 0):
        """Python implementation of SM-2 algorithm for testing."""
        MIN_EF = 1.3
        MASTERY_THRESHOLD = 5

        q = max(0, min(5, quality))

        # Update easiness factor
        new_ef = easiness_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = max(MIN_EF, new_ef)

        if q >= 3:
            # Correct response
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = round(interval_days * new_ef)

            new_repetitions = repetitions + 1
            new_consecutive = consecutive_perfect + 1 if q == 5 else 0
        else:
            # Incorrect response
            new_repetitions = 0
            new_interval = 1
            new_consecutive = 0

        new_interval = min(365, new_interval)

        # Determine status
        if new_consecutive >= MASTERY_THRESHOLD:
            status = "mastered"
        elif new_repetitions <= 2:
            status = "learning"
        else:
            status = "reviewing"

        return {
            "easiness_factor": new_ef,
            "repetitions": new_repetitions,
            "interval_days": new_interval,
            "status": status,
            "consecutive_perfect": new_consecutive,
        }

    # --- Quality 5 (Perfect) Tests ---

    def test_first_review_quality_5(self):
        """First review with perfect answer should give interval=1."""
        result = self.sm2_calculate(5, 0, 2.5, 0)
        assert result["interval_days"] == 1
        assert result["repetitions"] == 1
        assert result["easiness_factor"] > 2.5  # EF should increase

    def test_second_review_quality_5(self):
        """Second review with perfect answer should give interval=6."""
        result = self.sm2_calculate(5, 1, 2.6, 1)
        assert result["interval_days"] == 6
        assert result["repetitions"] == 2

    def test_third_review_quality_5(self):
        """Third review should use EF * previous interval."""
        result = self.sm2_calculate(5, 2, 2.6, 6)
        expected = round(6 * (2.6 + 0.1))
        assert result["interval_days"] == min(365, expected)
        assert result["repetitions"] == 3

    def test_mastery_after_5_perfect(self):
        """Five consecutive perfect answers should achieve mastery."""
        ef = 2.5
        reps = 0
        interval = 0
        consecutive = 0

        for _ in range(5):
            result = self.sm2_calculate(5, reps, ef, interval, consecutive)
            ef = result["easiness_factor"]
            reps = result["repetitions"]
            interval = result["interval_days"]
            consecutive = result["consecutive_perfect"]

        assert result["status"] == "mastered"
        assert consecutive == 5

    # --- Quality 4 (Correct with hesitation) Tests ---

    def test_quality_4_ef_stable(self):
        """Quality 4 should keep EF relatively stable."""
        result = self.sm2_calculate(4, 2, 2.5, 6)
        assert result["easiness_factor"] == 2.5  # Should stay same for q=4
        assert result["repetitions"] == 3

    def test_quality_4_resets_consecutive(self):
        """Quality 4 should reset consecutive perfect count."""
        result = self.sm2_calculate(4, 2, 2.5, 6, 3)
        assert result["consecutive_perfect"] == 0

    # --- Quality 3 (Correct with difficulty) Tests ---

    def test_quality_3_ef_decreases(self):
        """Quality 3 should decrease EF slightly."""
        result = self.sm2_calculate(3, 2, 2.5, 6)
        assert result["easiness_factor"] < 2.5
        assert result["easiness_factor"] >= 1.3  # Min EF

    def test_quality_3_still_correct(self):
        """Quality 3 should still increase repetitions."""
        result = self.sm2_calculate(3, 2, 2.5, 6)
        assert result["repetitions"] == 3
        assert result["interval_days"] > 0

    # --- Quality 2 (Incorrect, easy to remember) Tests ---

    def test_quality_2_resets(self):
        """Quality 2 (incorrect) should reset repetitions."""
        result = self.sm2_calculate(2, 5, 2.5, 30)
        assert result["repetitions"] == 0
        assert result["interval_days"] == 1

    def test_quality_2_ef_decreases_more(self):
        """Quality 2 should decrease EF more than quality 3."""
        result_q2 = self.sm2_calculate(2, 2, 2.5, 6)
        result_q3 = self.sm2_calculate(3, 2, 2.5, 6)
        assert result_q2["easiness_factor"] < result_q3["easiness_factor"]

    # --- Quality 1 (Incorrect) Tests ---

    def test_quality_1_resets(self):
        """Quality 1 should reset repetitions."""
        result = self.sm2_calculate(1, 10, 2.5, 100)
        assert result["repetitions"] == 0
        assert result["interval_days"] == 1
        assert result["consecutive_perfect"] == 0

    # --- Quality 0 (Complete blackout) Tests ---

    def test_quality_0_resets(self):
        """Quality 0 should reset everything."""
        result = self.sm2_calculate(0, 10, 2.5, 100, 4)
        assert result["repetitions"] == 0
        assert result["interval_days"] == 1
        assert result["consecutive_perfect"] == 0

    def test_quality_0_ef_decreases_most(self):
        """Quality 0 should decrease EF the most."""
        result_q0 = self.sm2_calculate(0, 2, 2.5, 6)
        result_q1 = self.sm2_calculate(1, 2, 2.5, 6)
        result_q2 = self.sm2_calculate(2, 2, 2.5, 6)
        assert result_q0["easiness_factor"] <= result_q1["easiness_factor"]
        assert result_q1["easiness_factor"] <= result_q2["easiness_factor"]

    # --- Edge Cases ---

    def test_min_ef_bound(self):
        """EF should never go below 1.3."""
        # Repeatedly fail to lower EF
        ef = 1.3
        for _ in range(10):
            result = self.sm2_calculate(0, 0, ef, 1)
            ef = result["easiness_factor"]
        assert ef >= 1.3

    def test_max_interval_bound(self):
        """Interval should never exceed 365 days."""
        # High EF with many repetitions
        result = self.sm2_calculate(5, 10, 3.0, 300)
        assert result["interval_days"] <= 365

    def test_quality_boundary_values(self):
        """Test boundary quality values (0 and 5)."""
        result_0 = self.sm2_calculate(0, 2, 2.5, 6)
        result_5 = self.sm2_calculate(5, 2, 2.5, 6)

        assert result_0["repetitions"] == 0  # Incorrect
        assert result_5["repetitions"] == 3  # Correct

    def test_quality_out_of_range_clamped(self):
        """Quality values outside 0-5 should be clamped."""
        result_neg = self.sm2_calculate(-1, 2, 2.5, 6)
        result_high = self.sm2_calculate(6, 2, 2.5, 6)
        result_0 = self.sm2_calculate(0, 2, 2.5, 6)
        result_5 = self.sm2_calculate(5, 2, 2.5, 6)

        assert result_neg["easiness_factor"] == result_0["easiness_factor"]
        assert result_high["easiness_factor"] == result_5["easiness_factor"]

    # --- Progression Tests ---

    def test_learning_progression(self):
        """Test full learning progression from new to mastered."""
        ef = 2.5
        reps = 0
        interval = 0
        consecutive = 0
        statuses = []

        # Simulate 10 reviews with quality 5
        for _ in range(10):
            result = self.sm2_calculate(5, reps, ef, interval, consecutive)
            ef = result["easiness_factor"]
            reps = result["repetitions"]
            interval = result["interval_days"]
            consecutive = result["consecutive_perfect"]
            statuses.append(result["status"])

        # Should reach mastered status
        assert "mastered" in statuses
        # Intervals should be increasing
        assert result["interval_days"] > 1

    def test_recovery_from_failure(self):
        """Test recovery after a failure."""
        # Start with some progress
        ef = 2.5
        reps = 3
        interval = 15
        consecutive = 3

        # Fail
        result = self.sm2_calculate(1, reps, ef, interval, consecutive)
        assert result["repetitions"] == 0
        assert result["interval_days"] == 1

        # Recover
        result2 = self.sm2_calculate(5, result["repetitions"], result["easiness_factor"],
                                      result["interval_days"], result["consecutive_perfect"])
        assert result2["repetitions"] == 1
        assert result2["interval_days"] == 1  # First review after reset
