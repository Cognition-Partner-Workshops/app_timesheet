"""
Prompt templates for AI services.
"""

MEMORY_AID_PROMPT = """语言: {language}
单词: {word}
音标: {phonetic}
释义: {meaning}

请生成记忆辅助方法（JSON格式）：
{{
  "harmonic": "谐音记忆（≤30字）",
  "morphology": {{
    "prefix": "前缀（无则null）",
    "root": "词根",
    "suffix": "后缀（无则null）",
    "explanation": "构词说明（≤30字）"
  }},
  "story": "联想故事（≤50字）",
  "related_words": ["相关词1", "相关词2", "相关词3"],
  "common_phrases": ["常用搭配1", "常用搭配2"],
  "memory_tip": "一句话最佳记忆技巧"
}}"""

ANALYSIS_PROMPT = """用户最近7天学习数据:
- 新学单词: {new_words_count}
- 复习单词: {review_count}
- 平均每日用时: {avg_time_min}分钟
- 复习通过率: {pass_rate}%
- 连续打卡: {streak}天
- 最常出错的类别: {weak_categories}
- 总词汇量: {total_vocab}
- 已掌握: {mastered_count}

请生成分析报告（JSON格式）：
{{
  "summary": "一句话总结（鼓励性语气）",
  "efficiency_score": 1到100的整数,
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["需改进1", "需改进2"],
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"],
  "next_week_focus": "下周重点建议"
}}"""
