package com.lingomaster.app.util

data class SM2Result(
    val repetitions: Int,
    val easeFactor: Double,
    val intervalDays: Int
)

object SM2Algorithm {
    /**
     * SM-2 Spaced Repetition Algorithm
     * @param quality Response quality (0-5): 0=complete blackout, 5=perfect response
     * @param repetitions Current number of consecutive correct responses
     * @param easeFactor Current ease factor (>= 1.3)
     * @param intervalDays Current interval in days
     * @return SM2Result with new repetitions, ease factor, and interval
     */
    fun calculate(
        quality: Int,
        repetitions: Int,
        easeFactor: Double,
        intervalDays: Int
    ): SM2Result {
        val q = quality.coerceIn(0, 5)

        return if (q >= 3) {
            // Correct response
            val newInterval = when (repetitions) {
                0 -> 1
                1 -> 6
                else -> (intervalDays * easeFactor).toInt().coerceAtLeast(1)
            }
            val newEF = (easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
                .coerceAtLeast(1.3)

            SM2Result(
                repetitions = repetitions + 1,
                easeFactor = newEF,
                intervalDays = newInterval
            )
        } else {
            // Incorrect response - reset
            val newEF = (easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
                .coerceAtLeast(1.3)

            SM2Result(
                repetitions = 0,
                easeFactor = newEF,
                intervalDays = 1
            )
        }
    }
}
