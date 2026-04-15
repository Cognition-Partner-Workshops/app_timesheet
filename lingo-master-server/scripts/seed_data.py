#!/usr/bin/env python3
"""
LingoMaster Seed Data Script
=============================
Populates the database with wordbooks and words across multiple languages.

Usage:
  DATABASE_URL="sqlite+aiosqlite:///./local.db" python scripts/seed_data.py
  DATABASE_URL="postgresql+asyncpg://user:pass@localhost/lingomaster" python scripts/seed_data.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from api.database.connection import Base
from api.database.models import Language, WordbookCategory, Wordbook, Word, WordbookWord


LANGUAGES = [
    {"language_code": "en", "language_name": "English", "flag_emoji": "\U0001f1ec\U0001f1e7", "is_active": True, "sort_order": 1},
    {"language_code": "fr", "language_name": "French", "flag_emoji": "\U0001f1eb\U0001f1f7", "is_active": True, "sort_order": 2},
    {"language_code": "ja", "language_name": "Japanese", "flag_emoji": "\U0001f1ef\U0001f1f5", "is_active": True, "sort_order": 3},
    {"language_code": "de", "language_name": "German", "flag_emoji": "\U0001f1e9\U0001f1ea", "is_active": True, "sort_order": 4},
    {"language_code": "es", "language_name": "Spanish", "flag_emoji": "\U0001f1ea\U0001f1f8", "is_active": True, "sort_order": 5},
]

CATEGORIES = [
    {"category_id": 1, "language_code": "en", "category_type": "exam", "category_name": "Exam Vocabulary", "sort_order": 1},
    {"category_id": 2, "language_code": "en", "category_type": "level", "category_name": "Graded Vocabulary", "sort_order": 2},
    {"category_id": 3, "language_code": "en", "category_type": "scenario", "category_name": "Scenario Vocabulary", "sort_order": 3},
    {"category_id": 4, "language_code": "ja", "category_type": "exam", "category_name": "JLPT Exam", "sort_order": 1},
    {"category_id": 5, "language_code": "ja", "category_type": "level", "category_name": "Graded Vocabulary", "sort_order": 2},
    {"category_id": 6, "language_code": "fr", "category_type": "level", "category_name": "Graded Vocabulary", "sort_order": 1},
    {"category_id": 7, "language_code": "de", "category_type": "level", "category_name": "Graded Vocabulary", "sort_order": 1},
    {"category_id": 8, "language_code": "es", "category_type": "level", "category_name": "Graded Vocabulary", "sort_order": 1},
]

WORDBOOKS = [
    {"book_id": "en_cet4", "language_code": "en", "category_id": 1, "name": "CET-4 Core",
     "description": "College English Test Band 4 core vocabulary", "word_count": 30, "difficulty": 2,
     "is_free": True, "cover_color": "#4A90D9", "sort_order": 1},
    {"book_id": "en_cet6", "language_code": "en", "category_id": 1, "name": "CET-6 Core",
     "description": "College English Test Band 6 core vocabulary", "word_count": 20, "difficulty": 3,
     "is_free": True, "cover_color": "#7B68EE", "sort_order": 2},
    {"book_id": "en_ielts", "language_code": "en", "category_id": 1, "name": "IELTS Core",
     "description": "IELTS exam high-frequency vocabulary", "word_count": 15, "difficulty": 4,
     "is_free": False, "cover_color": "#E74C3C", "sort_order": 3},
    {"book_id": "en_daily", "language_code": "en", "category_id": 3, "name": "Daily English",
     "description": "Everyday conversation vocabulary", "word_count": 20, "difficulty": 1,
     "is_free": True, "cover_color": "#2ECC71", "sort_order": 1},
    {"book_id": "en_business", "language_code": "en", "category_id": 3, "name": "Business English",
     "description": "Professional business vocabulary", "word_count": 15, "difficulty": 3,
     "is_free": False, "cover_color": "#F39C12", "sort_order": 2},
    {"book_id": "ja_n5", "language_code": "ja", "category_id": 4, "name": "JLPT N5",
     "description": "JLPT N5 basic vocabulary", "word_count": 20, "difficulty": 1,
     "is_free": True, "cover_color": "#FF6B6B", "sort_order": 1},
    {"book_id": "ja_n4", "language_code": "ja", "category_id": 4, "name": "JLPT N4",
     "description": "JLPT N4 vocabulary", "word_count": 15, "difficulty": 2,
     "is_free": True, "cover_color": "#FF8E53", "sort_order": 2},
    {"book_id": "fr_a1", "language_code": "fr", "category_id": 6, "name": "French A1",
     "description": "French A1 beginner vocabulary", "word_count": 15, "difficulty": 1,
     "is_free": True, "cover_color": "#3498DB", "sort_order": 1},
    {"book_id": "de_a1", "language_code": "de", "category_id": 7, "name": "German A1",
     "description": "German A1 beginner vocabulary", "word_count": 15, "difficulty": 1,
     "is_free": True, "cover_color": "#1ABC9C", "sort_order": 1},
    {"book_id": "es_a1", "language_code": "es", "category_id": 8, "name": "Spanish A1",
     "description": "Spanish A1 beginner vocabulary", "word_count": 15, "difficulty": 1,
     "is_free": True, "cover_color": "#E67E22", "sort_order": 1},
]


EN_CET4_WORDS = [
    {
        "word_id": "en_abandon",
        "word": "abandon",
        "phonetic_ipa": "/əˈbændən/",
        "difficulty_level": 2,
        "frequency_rank": 2000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "放弃；抛弃",
                "definition_en": "to give up completely",
                "example": "He abandoned his car in the snow.",
                "example_zh": "他把车丢弃在雪地里。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_ability",
        "word": "ability",
        "phonetic_ipa": "/əˈbɪləti/",
        "difficulty_level": 1,
        "frequency_rank": 800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "能力；才能",
                "definition_en": "the power or skill to do something",
                "example": "She has the ability to solve complex problems.",
                "example_zh": "她有解决复杂问题的能力。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_absorb",
        "word": "absorb",
        "phonetic_ipa": "/əbˈzɔːrb/",
        "difficulty_level": 2,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "吸收；吸引",
                "definition_en": "to take in or soak up",
                "example": "Plants absorb water through their roots.",
                "example_zh": "植物通过根部吸收水分。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_achieve",
        "word": "achieve",
        "phonetic_ipa": "/əˈtʃiːv/",
        "difficulty_level": 2,
        "frequency_rank": 1500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "达到；实现",
                "definition_en": "to successfully reach a goal",
                "example": "She achieved her dream of becoming a doctor.",
                "example_zh": "她实现了成为医生的梦想。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_adapt",
        "word": "adapt",
        "phonetic_ipa": "/əˈdæpt/",
        "difficulty_level": 2,
        "frequency_rank": 2500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "适应；改编",
                "definition_en": "to change to fit new conditions",
                "example": "Animals adapt to their environment.",
                "example_zh": "动物会适应它们的环境。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_advantage",
        "word": "advantage",
        "phonetic_ipa": "/ədˈvæntɪdʒ/",
        "difficulty_level": 2,
        "frequency_rank": 1200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "优势；有利条件",
                "definition_en": "a favorable position",
                "example": "Being bilingual is a great advantage.",
                "example_zh": "会双语是一个很大的优势。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_attempt",
        "word": "attempt",
        "phonetic_ipa": "/əˈtempt/",
        "difficulty_level": 2,
        "frequency_rank": 1800,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "尝试；企图",
                "definition_en": "to try to do something",
                "example": "He attempted to climb the mountain.",
                "example_zh": "他试图攀登那座山。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_balance",
        "word": "balance",
        "phonetic_ipa": "/ˈbæləns/",
        "difficulty_level": 2,
        "frequency_rank": 1600,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "平衡；余额",
                "definition_en": "a state of equilibrium",
                "example": "You need to maintain a work-life balance.",
                "example_zh": "你需要保持工作与生活的平衡。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_benefit",
        "word": "benefit",
        "phonetic_ipa": "/ˈbenɪfɪt/",
        "difficulty_level": 2,
        "frequency_rank": 1100,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "利益；好处",
                "definition_en": "an advantage or profit",
                "example": "Exercise has many health benefits.",
                "example_zh": "锻炼有很多健康益处。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_challenge",
        "word": "challenge",
        "phonetic_ipa": "/ˈtʃælɪndʒ/",
        "difficulty_level": 2,
        "frequency_rank": 900,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "挑战",
                "definition_en": "a difficult task",
                "example": "Climate change is a major challenge.",
                "example_zh": "气候变化是一个重大挑战。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_communicate",
        "word": "communicate",
        "phonetic_ipa": "/kəˈmjuːnɪkeɪt/",
        "difficulty_level": 2,
        "frequency_rank": 1300,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "交流；沟通",
                "definition_en": "to share information",
                "example": "It is important to communicate clearly.",
                "example_zh": "清楚地沟通很重要。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_consider",
        "word": "consider",
        "phonetic_ipa": "/kənˈsɪdər/",
        "difficulty_level": 2,
        "frequency_rank": 700,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "考虑；认为",
                "definition_en": "to think carefully about",
                "example": "Please consider my proposal.",
                "example_zh": "请考虑我的提议。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_contribute",
        "word": "contribute",
        "phonetic_ipa": "/kənˈtrɪbjuːt/",
        "difficulty_level": 2,
        "frequency_rank": 2200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "贡献；捐献",
                "definition_en": "to give to help achieve a goal",
                "example": "Everyone should contribute to society.",
                "example_zh": "每个人都应该为社会做贡献。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_describe",
        "word": "describe",
        "phonetic_ipa": "/dɪˈskraɪb/",
        "difficulty_level": 1,
        "frequency_rank": 1000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "描述；形容",
                "definition_en": "to give details about",
                "example": "Can you describe what happened?",
                "example_zh": "你能描述一下发生了什么吗？"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_determine",
        "word": "determine",
        "phonetic_ipa": "/dɪˈtɜːrmɪn/",
        "difficulty_level": 2,
        "frequency_rank": 1400,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "决定；确定",
                "definition_en": "to decide or establish",
                "example": "We need to determine the cause.",
                "example_zh": "我们需要确定原因。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_develop",
        "word": "develop",
        "phonetic_ipa": "/dɪˈveləp/",
        "difficulty_level": 2,
        "frequency_rank": 500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "发展；开发",
                "definition_en": "to grow or cause to grow",
                "example": "The company is developing new products.",
                "example_zh": "公司正在开发新产品。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_environment",
        "word": "environment",
        "phonetic_ipa": "/ɪnˈvaɪrənmənt/",
        "difficulty_level": 2,
        "frequency_rank": 600,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "环境",
                "definition_en": "the surroundings or conditions",
                "example": "We must protect the environment.",
                "example_zh": "我们必须保护环境。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_establish",
        "word": "establish",
        "phonetic_ipa": "/ɪˈstæblɪʃ/",
        "difficulty_level": 3,
        "frequency_rank": 1700,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "建立；确立",
                "definition_en": "to set up or create",
                "example": "The company was established in 1990.",
                "example_zh": "这家公司成立于1990年。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_evidence",
        "word": "evidence",
        "phonetic_ipa": "/ˈevɪdəns/",
        "difficulty_level": 2,
        "frequency_rank": 1100,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "证据；证明",
                "definition_en": "facts that prove something",
                "example": "There is no evidence of wrongdoing.",
                "example_zh": "没有不当行为的证据。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_experience",
        "word": "experience",
        "phonetic_ipa": "/ɪkˈspɪriəns/",
        "difficulty_level": 1,
        "frequency_rank": 400,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "经验；经历",
                "definition_en": "knowledge gained through involvement",
                "example": "He has years of teaching experience.",
                "example_zh": "他有多年的教学经验。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_function",
        "word": "function",
        "phonetic_ipa": "/ˈfʌŋkʃən/",
        "difficulty_level": 2,
        "frequency_rank": 900,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "功能；函数",
                "definition_en": "the purpose or role of something",
                "example": "The main function of the heart is to pump blood.",
                "example_zh": "心脏的主要功能是泵血。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_individual",
        "word": "individual",
        "phonetic_ipa": "/ˌɪndɪˈvɪdʒuəl/",
        "difficulty_level": 2,
        "frequency_rank": 1000,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "个人的；个别的",
                "definition_en": "single; separate",
                "example": "Each individual has unique talents.",
                "example_zh": "每个人都有独特的才能。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_influence",
        "word": "influence",
        "phonetic_ipa": "/ˈɪnfluəns/",
        "difficulty_level": 2,
        "frequency_rank": 1200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "影响；影响力",
                "definition_en": "the power to affect others",
                "example": "Social media has a huge influence on youth.",
                "example_zh": "社交媒体对年轻人有巨大的影响。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_maintain",
        "word": "maintain",
        "phonetic_ipa": "/meɪnˈteɪn/",
        "difficulty_level": 2,
        "frequency_rank": 1500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "维持；保持",
                "definition_en": "to keep in a certain state",
                "example": "It is important to maintain good health.",
                "example_zh": "保持良好健康很重要。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_opportunity",
        "word": "opportunity",
        "phonetic_ipa": "/ˌɒpərˈtjuːnəti/",
        "difficulty_level": 2,
        "frequency_rank": 800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "机会；时机",
                "definition_en": "a favorable time or situation",
                "example": "Don't miss this opportunity.",
                "example_zh": "不要错过这个机会。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_participate",
        "word": "participate",
        "phonetic_ipa": "/pɑːˈtɪsɪpeɪt/",
        "difficulty_level": 2,
        "frequency_rank": 2800,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "参加；参与",
                "definition_en": "to take part in an activity",
                "example": "Everyone is encouraged to participate.",
                "example_zh": "鼓励每个人参与。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_produce",
        "word": "produce",
        "phonetic_ipa": "/prəˈdjuːs/",
        "difficulty_level": 2,
        "frequency_rank": 700,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "生产；制造",
                "definition_en": "to make or create something",
                "example": "This factory produces electronic goods.",
                "example_zh": "这家工厂生产电子产品。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_recognize",
        "word": "recognize",
        "phonetic_ipa": "/ˈrekəɡnaɪz/",
        "difficulty_level": 2,
        "frequency_rank": 1600,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "认出；承认",
                "definition_en": "to identify or acknowledge",
                "example": "I didn't recognize her at first.",
                "example_zh": "我一开始没有认出她。"
            }
        ],
        "tags": [
            "CET4"
        ]
    },
    {
        "word_id": "en_significant",
        "word": "significant",
        "phonetic_ipa": "/sɪɡˈnɪfɪkənt/",
        "difficulty_level": 3,
        "frequency_rank": 900,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "重要的；显著的",
                "definition_en": "important or large enough to notice",
                "example": "There has been a significant improvement.",
                "example_zh": "已经有了显著的改进。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    },
    {
        "word_id": "en_technology",
        "word": "technology",
        "phonetic_ipa": "/tekˈnɒlədʒi/",
        "difficulty_level": 2,
        "frequency_rank": 300,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "技术；科技",
                "definition_en": "the application of scientific knowledge",
                "example": "Technology is changing our lives.",
                "example_zh": "科技正在改变我们的生活。"
            }
        ],
        "tags": [
            "CET4",
            "高频"
        ]
    }
]

EN_CET6_WORDS = [
    {
        "word_id": "en_accelerate",
        "word": "accelerate",
        "phonetic_ipa": "/əkˈseləreɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "加速；促进",
                "definition_en": "to increase speed",
                "example": "The car accelerated quickly.",
                "example_zh": "汽车迅速加速。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_accommodate",
        "word": "accommodate",
        "phonetic_ipa": "/əˈkɒmədeɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "容纳；适应",
                "definition_en": "to provide space or adapt",
                "example": "The hotel can accommodate 200 guests.",
                "example_zh": "酒店可以容纳200位客人。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_ambiguous",
        "word": "ambiguous",
        "phonetic_ipa": "/æmˈbɪɡjuəs/",
        "difficulty_level": 3,
        "frequency_rank": 5000,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "模棱两可的",
                "definition_en": "having more than one meaning",
                "example": "The statement is ambiguous.",
                "example_zh": "这个声明是模棱两可的。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_comprehensive",
        "word": "comprehensive",
        "phonetic_ipa": "/ˌkɒmprɪˈhensɪv/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "全面的；综合的",
                "definition_en": "complete and including everything",
                "example": "We need a comprehensive solution.",
                "example_zh": "我们需要一个全面的解决方案。"
            }
        ],
        "tags": [
            "CET6",
            "高频"
        ]
    },
    {
        "word_id": "en_controversy",
        "word": "controversy",
        "phonetic_ipa": "/ˈkɒntrəvɜːsi/",
        "difficulty_level": 3,
        "frequency_rank": 3800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "争议；争论",
                "definition_en": "a prolonged public disagreement",
                "example": "The policy caused much controversy.",
                "example_zh": "这项政策引起了很大的争议。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_deteriorate",
        "word": "deteriorate",
        "phonetic_ipa": "/dɪˈtɪəriəreɪt/",
        "difficulty_level": 4,
        "frequency_rank": 5500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "恶化；变坏",
                "definition_en": "to become worse",
                "example": "His health continued to deteriorate.",
                "example_zh": "他的健康状况持续恶化。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_eliminate",
        "word": "eliminate",
        "phonetic_ipa": "/ɪˈlɪmɪneɪt/",
        "difficulty_level": 3,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "消除；淘汰",
                "definition_en": "to remove or get rid of",
                "example": "We need to eliminate waste.",
                "example_zh": "我们需要消除浪费。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_exaggerate",
        "word": "exaggerate",
        "phonetic_ipa": "/ɪɡˈzædʒəreɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "夸大；夸张",
                "definition_en": "to make something seem larger",
                "example": "Don't exaggerate the problem.",
                "example_zh": "不要夸大这个问题。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_guarantee",
        "word": "guarantee",
        "phonetic_ipa": "/ˌɡærənˈtiː/",
        "difficulty_level": 3,
        "frequency_rank": 2800,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "保证；担保",
                "definition_en": "to promise with certainty",
                "example": "I can't guarantee success.",
                "example_zh": "我不能保证成功。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_implement",
        "word": "implement",
        "phonetic_ipa": "/ˈɪmplɪment/",
        "difficulty_level": 3,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "实施；执行",
                "definition_en": "to put into effect",
                "example": "We need to implement the new policy.",
                "example_zh": "我们需要实施新政策。"
            }
        ],
        "tags": [
            "CET6",
            "高频"
        ]
    },
    {
        "word_id": "en_inevitable",
        "word": "inevitable",
        "phonetic_ipa": "/ɪnˈevɪtəbl/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "不可避免的",
                "definition_en": "certain to happen",
                "example": "Change is inevitable.",
                "example_zh": "变化是不可避免的。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_manipulate",
        "word": "manipulate",
        "phonetic_ipa": "/məˈnɪpjuleɪt/",
        "difficulty_level": 4,
        "frequency_rank": 4800,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "操纵；操作",
                "definition_en": "to control cleverly",
                "example": "He tried to manipulate the results.",
                "example_zh": "他试图操纵结果。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_phenomenon",
        "word": "phenomenon",
        "phonetic_ipa": "/fɪˈnɒmɪnən/",
        "difficulty_level": 3,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "现象",
                "definition_en": "an observable event",
                "example": "This is a natural phenomenon.",
                "example_zh": "这是一种自然现象。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_predominant",
        "word": "predominant",
        "phonetic_ipa": "/prɪˈdɒmɪnənt/",
        "difficulty_level": 4,
        "frequency_rank": 5200,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "主要的；占优势的",
                "definition_en": "having the most influence",
                "example": "English is the predominant language.",
                "example_zh": "英语是主要语言。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_reluctant",
        "word": "reluctant",
        "phonetic_ipa": "/rɪˈlʌktənt/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "不情愿的",
                "definition_en": "unwilling to do something",
                "example": "She was reluctant to leave.",
                "example_zh": "她不愿意离开。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_sophisticated",
        "word": "sophisticated",
        "phonetic_ipa": "/səˈfɪstɪkeɪtɪd/",
        "difficulty_level": 3,
        "frequency_rank": 3600,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "复杂的；精密的",
                "definition_en": "highly developed and complex",
                "example": "This is a sophisticated system.",
                "example_zh": "这是一个精密的系统。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_substantial",
        "word": "substantial",
        "phonetic_ipa": "/səbˈstænʃəl/",
        "difficulty_level": 3,
        "frequency_rank": 2500,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "大量的；实质的",
                "definition_en": "of considerable importance",
                "example": "We made substantial progress.",
                "example_zh": "我们取得了重大进展。"
            }
        ],
        "tags": [
            "CET6",
            "高频"
        ]
    },
    {
        "word_id": "en_supplement",
        "word": "supplement",
        "phonetic_ipa": "/ˈsʌplɪment/",
        "difficulty_level": 3,
        "frequency_rank": 4300,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "补充；增补",
                "definition_en": "something added to complete",
                "example": "Take vitamin supplements.",
                "example_zh": "服用维生素补充剂。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_temporary",
        "word": "temporary",
        "phonetic_ipa": "/ˈtemprəri/",
        "difficulty_level": 2,
        "frequency_rank": 2800,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "临时的；暂时的",
                "definition_en": "lasting for a limited time",
                "example": "This is only a temporary solution.",
                "example_zh": "这只是一个临时的解决方案。"
            }
        ],
        "tags": [
            "CET6"
        ]
    },
    {
        "word_id": "en_unanimous",
        "word": "unanimous",
        "phonetic_ipa": "/juːˈnænɪməs/",
        "difficulty_level": 4,
        "frequency_rank": 5800,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "一致的；全体同意的",
                "definition_en": "fully in agreement",
                "example": "The decision was unanimous.",
                "example_zh": "这个决定是一致同意的。"
            }
        ],
        "tags": [
            "CET6"
        ]
    }
]

EN_IELTS_WORDS = [
    {
        "word_id": "en_abundant",
        "word": "abundant",
        "phonetic_ipa": "/əˈbʌndənt/",
        "difficulty_level": 3,
        "frequency_rank": 4500,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "丰富的",
                "definition_en": "existing in large quantities",
                "example": "Wildlife is abundant in this area.",
                "example_zh": "这个地区野生动物很丰富。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_allegation",
        "word": "allegation",
        "phonetic_ipa": "/ˌæləˈɡeɪʃən/",
        "difficulty_level": 4,
        "frequency_rank": 5000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "指控",
                "definition_en": "a claim without proof",
                "example": "The allegations were denied.",
                "example_zh": "指控被否认了。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_benchmark",
        "word": "benchmark",
        "phonetic_ipa": "/ˈbentʃmɑːrk/",
        "difficulty_level": 3,
        "frequency_rank": 4200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "基准",
                "definition_en": "a standard for comparison",
                "example": "This sets a new benchmark.",
                "example_zh": "这设定了新的基准。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_coherent",
        "word": "coherent",
        "phonetic_ipa": "/koʊˈhɪrənt/",
        "difficulty_level": 3,
        "frequency_rank": 4800,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "连贯的",
                "definition_en": "logical and consistent",
                "example": "Present a coherent argument.",
                "example_zh": "提出一个连贯的论点。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_demographic",
        "word": "demographic",
        "phonetic_ipa": "/ˌdeməˈɡræfɪk/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "人口统计的",
                "definition_en": "relating to population",
                "example": "Demographic changes affect policy.",
                "example_zh": "人口变化影响政策。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_empirical",
        "word": "empirical",
        "phonetic_ipa": "/ɪmˈpɪrɪkəl/",
        "difficulty_level": 4,
        "frequency_rank": 5500,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "经验主义的",
                "definition_en": "based on observation",
                "example": "We need empirical evidence.",
                "example_zh": "我们需要实证证据。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_fluctuate",
        "word": "fluctuate",
        "phonetic_ipa": "/ˈflʌktʃueɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "波动",
                "definition_en": "to vary irregularly",
                "example": "Prices fluctuate daily.",
                "example_zh": "价格每天波动。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_hypothesis",
        "word": "hypothesis",
        "phonetic_ipa": "/haɪˈpɒθəsɪs/",
        "difficulty_level": 3,
        "frequency_rank": 3800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "假说",
                "definition_en": "a proposed explanation",
                "example": "Test the hypothesis.",
                "example_zh": "检验假说。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_indigenous",
        "word": "indigenous",
        "phonetic_ipa": "/ɪnˈdɪdʒənəs/",
        "difficulty_level": 4,
        "frequency_rank": 5200,
        "meanings": [
            {
                "pos": "adj.",
                "definition_zh": "土著的",
                "definition_en": "native to a place",
                "example": "Indigenous cultures are diverse.",
                "example_zh": "土著文化是多样的。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_jurisdiction",
        "word": "jurisdiction",
        "phonetic_ipa": "/ˌdʒʊrɪsˈdɪkʃən/",
        "difficulty_level": 4,
        "frequency_rank": 5800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "管辖权",
                "definition_en": "official power to make decisions",
                "example": "This falls under federal jurisdiction.",
                "example_zh": "这属于联邦管辖权。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_legislation",
        "word": "legislation",
        "phonetic_ipa": "/ˌledʒɪsˈleɪʃən/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "立法",
                "definition_en": "laws collectively",
                "example": "New legislation was passed.",
                "example_zh": "新的立法获得通过。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_methodology",
        "word": "methodology",
        "phonetic_ipa": "/ˌmeθəˈdɒlədʒi/",
        "difficulty_level": 4,
        "frequency_rank": 4800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "方法论",
                "definition_en": "a system of methods",
                "example": "Explain your methodology.",
                "example_zh": "解释你的方法论。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_notion",
        "word": "notion",
        "phonetic_ipa": "/ˈnoʊʃən/",
        "difficulty_level": 3,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "概念",
                "definition_en": "an idea or belief",
                "example": "Reject the notion.",
                "example_zh": "拒绝这个概念。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_paradigm",
        "word": "paradigm",
        "phonetic_ipa": "/ˈpærədaɪm/",
        "difficulty_level": 4,
        "frequency_rank": 5000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "范式",
                "definition_en": "a typical pattern",
                "example": "A paradigm shift occurred.",
                "example_zh": "发生了范式转变。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    },
    {
        "word_id": "en_sustainability",
        "word": "sustainability",
        "phonetic_ipa": "/səˌsteɪnəˈbɪləti/",
        "difficulty_level": 3,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "可持续性",
                "definition_en": "ability to be maintained",
                "example": "Focus on sustainability.",
                "example_zh": "关注可持续性。"
            }
        ],
        "tags": [
            "IELTS"
        ]
    }
]

EN_DAILY_WORDS = [
    {
        "word_id": "en_breakfast",
        "word": "breakfast",
        "phonetic_ipa": "/ˈbrekfəst/",
        "difficulty_level": 1,
        "frequency_rank": 2000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "早餐",
                "definition_en": "the first meal of the day",
                "example": "I usually have eggs for breakfast.",
                "example_zh": "我通常早餐吃鸡蛋。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_restaurant",
        "word": "restaurant",
        "phonetic_ipa": "/ˈrestrɒnt/",
        "difficulty_level": 1,
        "frequency_rank": 1800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "餐厅",
                "definition_en": "a place to eat meals",
                "example": "Let's go to a restaurant tonight.",
                "example_zh": "今晚我们去餐厅吧。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_apartment",
        "word": "apartment",
        "phonetic_ipa": "/əˈpɑːrtmənt/",
        "difficulty_level": 1,
        "frequency_rank": 2500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "公寓",
                "definition_en": "a set of rooms for living in",
                "example": "She lives in a small apartment.",
                "example_zh": "她住在一个小公寓里。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_schedule",
        "word": "schedule",
        "phonetic_ipa": "/ˈʃedjuːl/",
        "difficulty_level": 1,
        "frequency_rank": 1500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "日程；时间表",
                "definition_en": "a plan of activities",
                "example": "What's your schedule today?",
                "example_zh": "你今天的日程是什么？"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_appointment",
        "word": "appointment",
        "phonetic_ipa": "/əˈpɔɪntmənt/",
        "difficulty_level": 2,
        "frequency_rank": 2800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "预约；约会",
                "definition_en": "a meeting arranged in advance",
                "example": "I have a doctor's appointment.",
                "example_zh": "我有一个医生预约。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_grocery",
        "word": "grocery",
        "phonetic_ipa": "/ˈɡroʊsəri/",
        "difficulty_level": 1,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "杂货店",
                "definition_en": "a store selling food",
                "example": "I need to go to the grocery store.",
                "example_zh": "我需要去杂货店。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_neighbor",
        "word": "neighbor",
        "phonetic_ipa": "/ˈneɪbər/",
        "difficulty_level": 1,
        "frequency_rank": 2200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "邻居",
                "definition_en": "a person living nearby",
                "example": "My neighbor is very friendly.",
                "example_zh": "我的邻居非常友好。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_commute",
        "word": "commute",
        "phonetic_ipa": "/kəˈmjuːt/",
        "difficulty_level": 2,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "通勤",
                "definition_en": "to travel to work regularly",
                "example": "I commute by subway every day.",
                "example_zh": "我每天坐地铁通勤。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_recipe",
        "word": "recipe",
        "phonetic_ipa": "/ˈresəpi/",
        "difficulty_level": 1,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "食谱",
                "definition_en": "instructions for preparing food",
                "example": "Do you have a recipe for this cake?",
                "example_zh": "你有这个蛋糕的食谱吗？"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_laundry",
        "word": "laundry",
        "phonetic_ipa": "/ˈlɔːndri/",
        "difficulty_level": 1,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "洗衣",
                "definition_en": "clothes that need washing",
                "example": "I need to do the laundry.",
                "example_zh": "我需要洗衣服。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_receipt",
        "word": "receipt",
        "phonetic_ipa": "/rɪˈsiːt/",
        "difficulty_level": 1,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "收据",
                "definition_en": "a written proof of payment",
                "example": "Please keep the receipt.",
                "example_zh": "请保留收据。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_furniture",
        "word": "furniture",
        "phonetic_ipa": "/ˈfɜːrnɪtʃər/",
        "difficulty_level": 1,
        "frequency_rank": 2800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "家具",
                "definition_en": "movable objects in a room",
                "example": "We need new furniture.",
                "example_zh": "我们需要新家具。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_reservation",
        "word": "reservation",
        "phonetic_ipa": "/ˌrezərˈveɪʃən/",
        "difficulty_level": 2,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "预订",
                "definition_en": "a booking",
                "example": "I made a reservation for dinner.",
                "example_zh": "我预订了晚餐。"
            }
        ],
        "tags": [
            "日常"
        ]
    },
    {
        "word_id": "en_luggage",
        "word": "luggage",
        "phonetic_ipa": "/ˈlʌɡɪdʒ/",
        "difficulty_level": 1,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "行李",
                "definition_en": "bags and suitcases",
                "example": "Don't forget your luggage.",
                "example_zh": "别忘了你的行李。"
            }
        ],
        "tags": [
            "日常",
            "旅行"
        ]
    },
    {
        "word_id": "en_prescription",
        "word": "prescription",
        "phonetic_ipa": "/prɪˈskrɪpʃən/",
        "difficulty_level": 2,
        "frequency_rank": 3800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "处方",
                "definition_en": "a doctor's order for medicine",
                "example": "You need a prescription for this medicine.",
                "example_zh": "这种药需要处方。"
            }
        ],
        "tags": [
            "日常",
            "医疗"
        ]
    },
    {
        "word_id": "en_ingredient",
        "word": "ingredient",
        "phonetic_ipa": "/ɪnˈɡriːdiənt/",
        "difficulty_level": 2,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "原料",
                "definition_en": "a component of a mixture",
                "example": "What ingredients do we need?",
                "example_zh": "我们需要什么原料？"
            }
        ],
        "tags": [
            "日常",
            "烹饪"
        ]
    },
    {
        "word_id": "en_subway",
        "word": "subway",
        "phonetic_ipa": "/ˈsʌbweɪ/",
        "difficulty_level": 1,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "地铁",
                "definition_en": "an underground railway",
                "example": "Take the subway to work.",
                "example_zh": "坐地铁去上班。"
            }
        ],
        "tags": [
            "日常",
            "交通"
        ]
    },
    {
        "word_id": "en_deadline",
        "word": "deadline",
        "phonetic_ipa": "/ˈdedlaɪn/",
        "difficulty_level": 2,
        "frequency_rank": 2500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "截止日期",
                "definition_en": "the latest time for completing",
                "example": "The deadline is next Friday.",
                "example_zh": "截止日期是下周五。"
            }
        ],
        "tags": [
            "日常",
            "工作"
        ]
    },
    {
        "word_id": "en_humidity",
        "word": "humidity",
        "phonetic_ipa": "/hjuːˈmɪdəti/",
        "difficulty_level": 2,
        "frequency_rank": 5000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "湿度",
                "definition_en": "amount of moisture in air",
                "example": "The humidity is very high today.",
                "example_zh": "今天的湿度很高。"
            }
        ],
        "tags": [
            "日常",
            "天气"
        ]
    },
    {
        "word_id": "en_envelope",
        "word": "envelope",
        "phonetic_ipa": "/ˈenvəloʊp/",
        "difficulty_level": 1,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "信封",
                "definition_en": "a paper container for a letter",
                "example": "Put the letter in the envelope.",
                "example_zh": "把信放进信封里。"
            }
        ],
        "tags": [
            "日常"
        ]
    }
]

EN_BUSINESS_WORDS = [
    {
        "word_id": "en_acquisition",
        "word": "acquisition",
        "phonetic_ipa": "/ˌækwɪˈzɪʃən/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "收购",
                "definition_en": "the act of acquiring",
                "example": "The acquisition was completed.",
                "example_zh": "收购已完成。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_budget",
        "word": "budget",
        "phonetic_ipa": "/ˈbʌdʒɪt/",
        "difficulty_level": 2,
        "frequency_rank": 1800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "预算",
                "definition_en": "a financial plan",
                "example": "We need to stay within budget.",
                "example_zh": "我们需要控制在预算内。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_collaborate",
        "word": "collaborate",
        "phonetic_ipa": "/kəˈlæbəreɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "合作",
                "definition_en": "to work together",
                "example": "Teams need to collaborate effectively.",
                "example_zh": "团队需要有效协作。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_delegate",
        "word": "delegate",
        "phonetic_ipa": "/ˈdelɪɡeɪt/",
        "difficulty_level": 3,
        "frequency_rank": 4500,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "委派",
                "definition_en": "to assign responsibility",
                "example": "Learn to delegate tasks.",
                "example_zh": "学会委派任务。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_entrepreneur",
        "word": "entrepreneur",
        "phonetic_ipa": "/ˌɒntrəprəˈnɜːr/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "企业家",
                "definition_en": "a person who starts a business",
                "example": "She is a successful entrepreneur.",
                "example_zh": "她是一位成功的企业家。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_forecast",
        "word": "forecast",
        "phonetic_ipa": "/ˈfɔːrkæst/",
        "difficulty_level": 2,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "预测",
                "definition_en": "to predict",
                "example": "Analysts forecast strong growth.",
                "example_zh": "分析师预测强劲增长。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_headquarters",
        "word": "headquarters",
        "phonetic_ipa": "/ˈhedk wɔːrtərz/",
        "difficulty_level": 2,
        "frequency_rank": 3200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "总部",
                "definition_en": "the main offices",
                "example": "The headquarters is in New York.",
                "example_zh": "总部在纽约。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_inventory",
        "word": "inventory",
        "phonetic_ipa": "/ˈɪnvəntɔːri/",
        "difficulty_level": 3,
        "frequency_rank": 3800,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "库存",
                "definition_en": "a complete list of items",
                "example": "We need to check our inventory.",
                "example_zh": "我们需要盘点库存。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_negotiate",
        "word": "negotiate",
        "phonetic_ipa": "/nɪˈɡoʊʃieɪt/",
        "difficulty_level": 3,
        "frequency_rank": 3000,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "谈判",
                "definition_en": "to discuss terms",
                "example": "They are negotiating a new contract.",
                "example_zh": "他们正在谈判一份新合同。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_revenue",
        "word": "revenue",
        "phonetic_ipa": "/ˈrevənjuː/",
        "difficulty_level": 3,
        "frequency_rank": 2500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "收入；营收",
                "definition_en": "income from business",
                "example": "Annual revenue exceeded expectations.",
                "example_zh": "年营收超过预期。"
            }
        ],
        "tags": [
            "商务",
            "高频"
        ]
    },
    {
        "word_id": "en_stakeholder",
        "word": "stakeholder",
        "phonetic_ipa": "/ˈsteɪkhoʊldər/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "利益相关者",
                "definition_en": "a person with interest in a business",
                "example": "We must consider all stakeholders.",
                "example_zh": "我们必须考虑所有利益相关者。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_turnover",
        "word": "turnover",
        "phonetic_ipa": "/ˈtɜːrnoʊvər/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "营业额",
                "definition_en": "total revenue",
                "example": "High turnover is a problem.",
                "example_zh": "高人员流动率是个问题。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_merger",
        "word": "merger",
        "phonetic_ipa": "/ˈmɜːrdʒər/",
        "difficulty_level": 3,
        "frequency_rank": 4500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "合并",
                "definition_en": "the combining of two companies",
                "example": "The merger created a larger company.",
                "example_zh": "合并创建了一家更大的公司。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_portfolio",
        "word": "portfolio",
        "phonetic_ipa": "/pɔːrtˈfoʊlioʊ/",
        "difficulty_level": 3,
        "frequency_rank": 3500,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "投资组合",
                "definition_en": "a range of investments",
                "example": "Diversify your portfolio.",
                "example_zh": "分散你的投资组合。"
            }
        ],
        "tags": [
            "商务"
        ]
    },
    {
        "word_id": "en_liability",
        "word": "liability",
        "phonetic_ipa": "/ˌlaɪəˈbɪləti/",
        "difficulty_level": 3,
        "frequency_rank": 4000,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "负债；责任",
                "definition_en": "a financial obligation",
                "example": "The company has significant liabilities.",
                "example_zh": "公司有大量负债。"
            }
        ],
        "tags": [
            "商务"
        ]
    }
]

JA_N5_WORDS = [
    {
        "word_id": "ja_watashi",
        "word": "私",
        "phonetic_ipa": "わたし",
        "difficulty_level": 1,
        "frequency_rank": 10,
        "meanings": [
            {
                "pos": "代名詞",
                "definition_zh": "我",
                "definition_en": "I, me",
                "example": "私は学生です。",
                "example_zh": "我是学生。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_gakkou",
        "word": "学校",
        "phonetic_ipa": "がっこう",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "学校",
                "definition_en": "school",
                "example": "学校に行きます。",
                "example_zh": "去学校。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_taberu",
        "word": "食べる",
        "phonetic_ipa": "たべる",
        "difficulty_level": 1,
        "frequency_rank": 100,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "吃",
                "definition_en": "to eat",
                "example": "ご飯を食べる。",
                "example_zh": "吃饭。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_nomu",
        "word": "飲む",
        "phonetic_ipa": "のむ",
        "difficulty_level": 1,
        "frequency_rank": 150,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "喝",
                "definition_en": "to drink",
                "example": "水を飲む。",
                "example_zh": "喝水。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_iku",
        "word": "行く",
        "phonetic_ipa": "いく",
        "difficulty_level": 1,
        "frequency_rank": 50,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "去",
                "definition_en": "to go",
                "example": "東京に行く。",
                "example_zh": "去东京。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_kuru",
        "word": "来る",
        "phonetic_ipa": "くる",
        "difficulty_level": 1,
        "frequency_rank": 60,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "来",
                "definition_en": "to come",
                "example": "友達が来る。",
                "example_zh": "朋友来了。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_miru",
        "word": "見る",
        "phonetic_ipa": "みる",
        "difficulty_level": 1,
        "frequency_rank": 80,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "看",
                "definition_en": "to see, to watch",
                "example": "テレビを見る。",
                "example_zh": "看电视。"
            }
        ],
        "tags": [
            "N5",
            "基础"
        ]
    },
    {
        "word_id": "ja_kaku",
        "word": "書く",
        "phonetic_ipa": "かく",
        "difficulty_level": 1,
        "frequency_rank": 120,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "写",
                "definition_en": "to write",
                "example": "手紙を書く。",
                "example_zh": "写信。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_yomu",
        "word": "読む",
        "phonetic_ipa": "よむ",
        "difficulty_level": 1,
        "frequency_rank": 130,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "读",
                "definition_en": "to read",
                "example": "本を読む。",
                "example_zh": "读书。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_hanasu",
        "word": "話す",
        "phonetic_ipa": "はなす",
        "difficulty_level": 1,
        "frequency_rank": 110,
        "meanings": [
            {
                "pos": "動詞",
                "definition_zh": "说；讲",
                "definition_en": "to speak",
                "example": "日本語を話す。",
                "example_zh": "说日语。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_ookii",
        "word": "大きい",
        "phonetic_ipa": "おおきい",
        "difficulty_level": 1,
        "frequency_rank": 300,
        "meanings": [
            {
                "pos": "形容詞",
                "definition_zh": "大的",
                "definition_en": "big, large",
                "example": "大きい犬がいる。",
                "example_zh": "有一只大狗。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_chiisai",
        "word": "小さい",
        "phonetic_ipa": "ちいさい",
        "difficulty_level": 1,
        "frequency_rank": 350,
        "meanings": [
            {
                "pos": "形容詞",
                "definition_zh": "小的",
                "definition_en": "small, little",
                "example": "小さい猫がいる。",
                "example_zh": "有一只小猫。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_neko",
        "word": "猫",
        "phonetic_ipa": "ねこ",
        "difficulty_level": 1,
        "frequency_rank": 500,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "猫",
                "definition_en": "cat",
                "example": "猫が好きです。",
                "example_zh": "我喜欢猫。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_inu",
        "word": "犬",
        "phonetic_ipa": "いぬ",
        "difficulty_level": 1,
        "frequency_rank": 450,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "狗",
                "definition_en": "dog",
                "example": "犬と散歩する。",
                "example_zh": "和狗散步。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_sensei",
        "word": "先生",
        "phonetic_ipa": "せんせい",
        "difficulty_level": 1,
        "frequency_rank": 180,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "老师",
                "definition_en": "teacher",
                "example": "先生に聞く。",
                "example_zh": "问老师。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_tomodachi",
        "word": "友達",
        "phonetic_ipa": "ともだち",
        "difficulty_level": 1,
        "frequency_rank": 250,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "朋友",
                "definition_en": "friend",
                "example": "友達と遊ぶ。",
                "example_zh": "和朋友玩。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_nihongo",
        "word": "日本語",
        "phonetic_ipa": "にほんご",
        "difficulty_level": 1,
        "frequency_rank": 220,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "日语",
                "definition_en": "Japanese language",
                "example": "日本語を勉強する。",
                "example_zh": "学习日语。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_benkyou",
        "word": "勉強",
        "phonetic_ipa": "べんきょう",
        "difficulty_level": 1,
        "frequency_rank": 280,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "学习",
                "definition_en": "study",
                "example": "毎日勉強する。",
                "example_zh": "每天学习。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_denwa",
        "word": "電話",
        "phonetic_ipa": "でんわ",
        "difficulty_level": 1,
        "frequency_rank": 320,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "电话",
                "definition_en": "telephone",
                "example": "電話をかける。",
                "example_zh": "打电话。"
            }
        ],
        "tags": [
            "N5"
        ]
    },
    {
        "word_id": "ja_jikan",
        "word": "時間",
        "phonetic_ipa": "じかん",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "时间",
                "definition_en": "time",
                "example": "時間がない。",
                "example_zh": "没有时间。"
            }
        ],
        "tags": [
            "N5"
        ]
    }
]

JA_N4_WORDS = [
    {
        "word_id": "ja_keiken",
        "word": "経験",
        "phonetic_ipa": "けいけん",
        "difficulty_level": 2,
        "frequency_rank": 800,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "经验",
                "definition_en": "experience",
                "example": "いい経験になった。",
                "example_zh": "成为了好的经验。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_setsumei",
        "word": "説明",
        "phonetic_ipa": "せつめい",
        "difficulty_level": 2,
        "frequency_rank": 700,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "说明",
                "definition_en": "explanation",
                "example": "説明してください。",
                "example_zh": "请说明。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_junbi",
        "word": "準備",
        "phonetic_ipa": "じゅんび",
        "difficulty_level": 2,
        "frequency_rank": 750,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "准备",
                "definition_en": "preparation",
                "example": "準備ができた。",
                "example_zh": "准备好了。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_kankei",
        "word": "関係",
        "phonetic_ipa": "かんけい",
        "difficulty_level": 2,
        "frequency_rank": 500,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "关系",
                "definition_en": "relationship",
                "example": "人間関係が大切だ。",
                "example_zh": "人际关系很重要。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_shakai",
        "word": "社会",
        "phonetic_ipa": "しゃかい",
        "difficulty_level": 2,
        "frequency_rank": 400,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "社会",
                "definition_en": "society",
                "example": "社会に貢献する。",
                "example_zh": "对社会做贡献。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_mondai",
        "word": "問題",
        "phonetic_ipa": "もんだい",
        "difficulty_level": 2,
        "frequency_rank": 300,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "问题",
                "definition_en": "problem",
                "example": "問題を解決する。",
                "example_zh": "解决问题。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_hitsuyou",
        "word": "必要",
        "phonetic_ipa": "ひつよう",
        "difficulty_level": 2,
        "frequency_rank": 600,
        "meanings": [
            {
                "pos": "形容動詞",
                "definition_zh": "必要的",
                "definition_en": "necessary",
                "example": "お金が必要だ。",
                "example_zh": "需要钱。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_tokubetsu",
        "word": "特別",
        "phonetic_ipa": "とくべつ",
        "difficulty_level": 2,
        "frequency_rank": 650,
        "meanings": [
            {
                "pos": "形容動詞",
                "definition_zh": "特别的",
                "definition_en": "special",
                "example": "特別な日だ。",
                "example_zh": "特别的日子。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_shizen",
        "word": "自然",
        "phonetic_ipa": "しぜん",
        "difficulty_level": 2,
        "frequency_rank": 550,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "自然",
                "definition_en": "nature",
                "example": "自然を大切にする。",
                "example_zh": "珍惜自然。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_bunka",
        "word": "文化",
        "phonetic_ipa": "ぶんか",
        "difficulty_level": 2,
        "frequency_rank": 500,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "文化",
                "definition_en": "culture",
                "example": "日本の文化を学ぶ。",
                "example_zh": "学习日本文化。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_kankyo",
        "word": "環境",
        "phonetic_ipa": "かんきょう",
        "difficulty_level": 2,
        "frequency_rank": 450,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "环境",
                "definition_en": "environment",
                "example": "環境を守る。",
                "example_zh": "保护环境。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_keizai",
        "word": "経済",
        "phonetic_ipa": "けいざい",
        "difficulty_level": 2,
        "frequency_rank": 350,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "经济",
                "definition_en": "economy",
                "example": "経済が成長している。",
                "example_zh": "经济正在增长。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_rekishi",
        "word": "歴史",
        "phonetic_ipa": "れきし",
        "difficulty_level": 2,
        "frequency_rank": 480,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "历史",
                "definition_en": "history",
                "example": "歴史を勉強する。",
                "example_zh": "学习历史。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_iken",
        "word": "意見",
        "phonetic_ipa": "いけん",
        "difficulty_level": 2,
        "frequency_rank": 520,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "意见",
                "definition_en": "opinion",
                "example": "意見を述べる。",
                "example_zh": "发表意见。"
            }
        ],
        "tags": [
            "N4"
        ]
    },
    {
        "word_id": "ja_jouhou",
        "word": "情報",
        "phonetic_ipa": "じょうほう",
        "difficulty_level": 2,
        "frequency_rank": 380,
        "meanings": [
            {
                "pos": "名詞",
                "definition_zh": "信息",
                "definition_en": "information",
                "example": "情報を集める。",
                "example_zh": "收集信息。"
            }
        ],
        "tags": [
            "N4"
        ]
    }
]

FR_A1_WORDS = [
    {
        "word_id": "fr_bonjour",
        "word": "bonjour",
        "phonetic_ipa": "/bɔ̃ʒuʁ/",
        "difficulty_level": 1,
        "frequency_rank": 50,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "你好",
                "definition_en": "hello",
                "example": "Bonjour, comment allez-vous?",
                "example_zh": "你好，你怎么样？"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_merci",
        "word": "merci",
        "phonetic_ipa": "/mɛʁsi/",
        "difficulty_level": 1,
        "frequency_rank": 80,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "谢谢",
                "definition_en": "thank you",
                "example": "Merci beaucoup!",
                "example_zh": "非常感谢！"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_manger",
        "word": "manger",
        "phonetic_ipa": "/mɑ̃ʒe/",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "吃",
                "definition_en": "to eat",
                "example": "Je veux manger.",
                "example_zh": "我想吃东西。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_boire",
        "word": "boire",
        "phonetic_ipa": "/bwaʁ/",
        "difficulty_level": 1,
        "frequency_rank": 250,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "喝",
                "definition_en": "to drink",
                "example": "Je veux boire de l'eau.",
                "example_zh": "我想喝水。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_maison",
        "word": "maison",
        "phonetic_ipa": "/mɛzɔ̃/",
        "difficulty_level": 1,
        "frequency_rank": 300,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "房子",
                "definition_en": "house",
                "example": "Je suis à la maison.",
                "example_zh": "我在家。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_ecole",
        "word": "école",
        "phonetic_ipa": "/ekɔl/",
        "difficulty_level": 1,
        "frequency_rank": 350,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "学校",
                "definition_en": "school",
                "example": "Je vais à l'école.",
                "example_zh": "我去上学。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_livre",
        "word": "livre",
        "phonetic_ipa": "/livʁ/",
        "difficulty_level": 1,
        "frequency_rank": 400,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "书",
                "definition_en": "book",
                "example": "Je lis un livre.",
                "example_zh": "我在读一本书。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_famille",
        "word": "famille",
        "phonetic_ipa": "/famij/",
        "difficulty_level": 1,
        "frequency_rank": 280,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "家庭",
                "definition_en": "family",
                "example": "Ma famille est grande.",
                "example_zh": "我的家庭很大。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_travail",
        "word": "travail",
        "phonetic_ipa": "/tʁavaj/",
        "difficulty_level": 1,
        "frequency_rank": 150,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "工作",
                "definition_en": "work",
                "example": "Je cherche du travail.",
                "example_zh": "我在找工作。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_ami",
        "word": "ami",
        "phonetic_ipa": "/ami/",
        "difficulty_level": 1,
        "frequency_rank": 320,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "朋友",
                "definition_en": "friend",
                "example": "C'est mon ami.",
                "example_zh": "这是我的朋友。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_parler",
        "word": "parler",
        "phonetic_ipa": "/paʁle/",
        "difficulty_level": 1,
        "frequency_rank": 100,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "说",
                "definition_en": "to speak",
                "example": "Je parle français.",
                "example_zh": "我说法语。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_comprendre",
        "word": "comprendre",
        "phonetic_ipa": "/kɔ̃pʁɑ̃dʁ/",
        "difficulty_level": 1,
        "frequency_rank": 180,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "理解",
                "definition_en": "to understand",
                "example": "Je ne comprends pas.",
                "example_zh": "我不明白。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_aimer",
        "word": "aimer",
        "phonetic_ipa": "/eme/",
        "difficulty_level": 1,
        "frequency_rank": 120,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "爱；喜欢",
                "definition_en": "to love; to like",
                "example": "J'aime la musique.",
                "example_zh": "我喜欢音乐。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_temps",
        "word": "temps",
        "phonetic_ipa": "/tɑ̃/",
        "difficulty_level": 1,
        "frequency_rank": 90,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "时间；天气",
                "definition_en": "time; weather",
                "example": "Il fait beau temps.",
                "example_zh": "天气很好。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "fr_jour",
        "word": "jour",
        "phonetic_ipa": "/ʒuʁ/",
        "difficulty_level": 1,
        "frequency_rank": 110,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "天",
                "definition_en": "day",
                "example": "Quel jour sommes-nous?",
                "example_zh": "今天是星期几？"
            }
        ],
        "tags": [
            "A1"
        ]
    }
]

DE_A1_WORDS = [
    {
        "word_id": "de_hallo",
        "word": "Hallo",
        "phonetic_ipa": "/ˈhalo/",
        "difficulty_level": 1,
        "frequency_rank": 50,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "你好",
                "definition_en": "hello",
                "example": "Hallo, wie geht es dir?",
                "example_zh": "你好，你好吗？"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_danke",
        "word": "Danke",
        "phonetic_ipa": "/ˈdaŋkə/",
        "difficulty_level": 1,
        "frequency_rank": 80,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "谢谢",
                "definition_en": "thank you",
                "example": "Danke schön!",
                "example_zh": "非常感谢！"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_essen",
        "word": "essen",
        "phonetic_ipa": "/ˈɛsn̩/",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "吃",
                "definition_en": "to eat",
                "example": "Ich esse Brot.",
                "example_zh": "我吃面包。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_trinken",
        "word": "trinken",
        "phonetic_ipa": "/ˈtʁɪŋkn̩/",
        "difficulty_level": 1,
        "frequency_rank": 250,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "喝",
                "definition_en": "to drink",
                "example": "Ich trinke Wasser.",
                "example_zh": "我喝水。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_haus",
        "word": "Haus",
        "phonetic_ipa": "/haʊ̯s/",
        "difficulty_level": 1,
        "frequency_rank": 300,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "房子",
                "definition_en": "house",
                "example": "Das ist mein Haus.",
                "example_zh": "这是我的房子。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_schule",
        "word": "Schule",
        "phonetic_ipa": "/ˈʃuːlə/",
        "difficulty_level": 1,
        "frequency_rank": 350,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "学校",
                "definition_en": "school",
                "example": "Ich gehe zur Schule.",
                "example_zh": "我去上学。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_buch",
        "word": "Buch",
        "phonetic_ipa": "/buːx/",
        "difficulty_level": 1,
        "frequency_rank": 400,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "书",
                "definition_en": "book",
                "example": "Ich lese ein Buch.",
                "example_zh": "我在读一本书。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_freund",
        "word": "Freund",
        "phonetic_ipa": "/fʁɔʏ̯nt/",
        "difficulty_level": 1,
        "frequency_rank": 280,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "朋友",
                "definition_en": "friend",
                "example": "Er ist mein Freund.",
                "example_zh": "他是我的朋友。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_arbeit",
        "word": "Arbeit",
        "phonetic_ipa": "/ˈaʁbaɪ̯t/",
        "difficulty_level": 1,
        "frequency_rank": 150,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "工作",
                "definition_en": "work",
                "example": "Ich suche Arbeit.",
                "example_zh": "我在找工作。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_sprechen",
        "word": "sprechen",
        "phonetic_ipa": "/ˈʃpʁɛçn̩/",
        "difficulty_level": 1,
        "frequency_rank": 120,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "说",
                "definition_en": "to speak",
                "example": "Ich spreche Deutsch.",
                "example_zh": "我说德语。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_verstehen",
        "word": "verstehen",
        "phonetic_ipa": "/fɛɐ̯ˈʃteːən/",
        "difficulty_level": 1,
        "frequency_rank": 180,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "理解",
                "definition_en": "to understand",
                "example": "Ich verstehe nicht.",
                "example_zh": "我不明白。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_lernen",
        "word": "lernen",
        "phonetic_ipa": "/ˈlɛʁnən/",
        "difficulty_level": 1,
        "frequency_rank": 220,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "学习",
                "definition_en": "to learn",
                "example": "Ich lerne Deutsch.",
                "example_zh": "我学德语。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_wohnen",
        "word": "wohnen",
        "phonetic_ipa": "/ˈvoːnən/",
        "difficulty_level": 1,
        "frequency_rank": 260,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "居住",
                "definition_en": "to live",
                "example": "Wo wohnst du?",
                "example_zh": "你住在哪里？"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_zeit",
        "word": "Zeit",
        "phonetic_ipa": "/t͡saɪ̯t/",
        "difficulty_level": 1,
        "frequency_rank": 90,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "时间",
                "definition_en": "time",
                "example": "Ich habe keine Zeit.",
                "example_zh": "我没有时间。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "de_geld",
        "word": "Geld",
        "phonetic_ipa": "/ɡɛlt/",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "n.",
                "definition_zh": "钱",
                "definition_en": "money",
                "example": "Ich brauche Geld.",
                "example_zh": "我需要钱。"
            }
        ],
        "tags": [
            "A1"
        ]
    }
]

ES_A1_WORDS = [
    {
        "word_id": "es_hola",
        "word": "hola",
        "phonetic_ipa": "/ˈola/",
        "difficulty_level": 1,
        "frequency_rank": 50,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "你好",
                "definition_en": "hello",
                "example": "¡Hola, amigo!",
                "example_zh": "你好，朋友！"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_gracias",
        "word": "gracias",
        "phonetic_ipa": "/ˈɡɾaθjas/",
        "difficulty_level": 1,
        "frequency_rank": 80,
        "meanings": [
            {
                "pos": "int.",
                "definition_zh": "谢谢",
                "definition_en": "thank you",
                "example": "Muchas gracias.",
                "example_zh": "非常感谢。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_comer",
        "word": "comer",
        "phonetic_ipa": "/koˈmeɾ/",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "吃",
                "definition_en": "to eat",
                "example": "Quiero comer.",
                "example_zh": "我想吃东西。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_beber",
        "word": "beber",
        "phonetic_ipa": "/beˈbeɾ/",
        "difficulty_level": 1,
        "frequency_rank": 250,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "喝",
                "definition_en": "to drink",
                "example": "Quiero beber agua.",
                "example_zh": "我想喝水。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_casa",
        "word": "casa",
        "phonetic_ipa": "/ˈkasa/",
        "difficulty_level": 1,
        "frequency_rank": 100,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "房子",
                "definition_en": "house",
                "example": "Estoy en casa.",
                "example_zh": "我在家。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_escuela",
        "word": "escuela",
        "phonetic_ipa": "/esˈkwela/",
        "difficulty_level": 1,
        "frequency_rank": 350,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "学校",
                "definition_en": "school",
                "example": "Voy a la escuela.",
                "example_zh": "我去上学。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_libro",
        "word": "libro",
        "phonetic_ipa": "/ˈliβɾo/",
        "difficulty_level": 1,
        "frequency_rank": 400,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "书",
                "definition_en": "book",
                "example": "Leo un libro.",
                "example_zh": "我在读一本书。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_amigo",
        "word": "amigo",
        "phonetic_ipa": "/aˈmiɣo/",
        "difficulty_level": 1,
        "frequency_rank": 280,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "朋友",
                "definition_en": "friend",
                "example": "Es mi amigo.",
                "example_zh": "他是我的朋友。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_trabajo",
        "word": "trabajo",
        "phonetic_ipa": "/tɾaˈβaxo/",
        "difficulty_level": 1,
        "frequency_rank": 150,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "工作",
                "definition_en": "work",
                "example": "Busco trabajo.",
                "example_zh": "我在找工作。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_hablar",
        "word": "hablar",
        "phonetic_ipa": "/aˈβlaɾ/",
        "difficulty_level": 1,
        "frequency_rank": 100,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "说",
                "definition_en": "to speak",
                "example": "Hablo español.",
                "example_zh": "我说西班牙语。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_entender",
        "word": "entender",
        "phonetic_ipa": "/entenˈdeɾ/",
        "difficulty_level": 1,
        "frequency_rank": 180,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "理解",
                "definition_en": "to understand",
                "example": "No entiendo.",
                "example_zh": "我不明白。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_aprender",
        "word": "aprender",
        "phonetic_ipa": "/apɾenˈdeɾ/",
        "difficulty_level": 1,
        "frequency_rank": 220,
        "meanings": [
            {
                "pos": "v.",
                "definition_zh": "学习",
                "definition_en": "to learn",
                "example": "Quiero aprender español.",
                "example_zh": "我想学西班牙语。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_familia",
        "word": "familia",
        "phonetic_ipa": "/faˈmilja/",
        "difficulty_level": 1,
        "frequency_rank": 250,
        "meanings": [
            {
                "pos": "n.f.",
                "definition_zh": "家庭",
                "definition_en": "family",
                "example": "Mi familia es grande.",
                "example_zh": "我的家庭很大。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_tiempo",
        "word": "tiempo",
        "phonetic_ipa": "/ˈtjempo/",
        "difficulty_level": 1,
        "frequency_rank": 90,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "时间",
                "definition_en": "time",
                "example": "No tengo tiempo.",
                "example_zh": "我没有时间。"
            }
        ],
        "tags": [
            "A1"
        ]
    },
    {
        "word_id": "es_dinero",
        "word": "dinero",
        "phonetic_ipa": "/diˈneɾo/",
        "difficulty_level": 1,
        "frequency_rank": 200,
        "meanings": [
            {
                "pos": "n.m.",
                "definition_zh": "钱",
                "definition_en": "money",
                "example": "Necesito dinero.",
                "example_zh": "我需要钱。"
            }
        ],
        "tags": [
            "A1"
        ]
    }
]

WORDBOOK_WORD_MAP = {
    "en_cet4": [w["word_id"] for w in EN_CET4_WORDS],
    "en_cet6": [w["word_id"] for w in EN_CET6_WORDS],
    "en_ielts": [w["word_id"] for w in EN_IELTS_WORDS],
    "en_daily": [w["word_id"] for w in EN_DAILY_WORDS],
    "en_business": [w["word_id"] for w in EN_BUSINESS_WORDS],
    "ja_n5": [w["word_id"] for w in JA_N5_WORDS],
    "ja_n4": [w["word_id"] for w in JA_N4_WORDS],
    "fr_a1": [w["word_id"] for w in FR_A1_WORDS],
    "de_a1": [w["word_id"] for w in DE_A1_WORDS],
    "es_a1": [w["word_id"] for w in ES_A1_WORDS],
}

ALL_WORDS = (
    EN_CET4_WORDS + EN_CET6_WORDS + EN_IELTS_WORDS + EN_DAILY_WORDS + EN_BUSINESS_WORDS
    + JA_N5_WORDS + JA_N4_WORDS
    + FR_A1_WORDS + DE_A1_WORDS + ES_A1_WORDS
)


async def seed_database():
    """Main function to seed the database with all data."""
    db_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./local.db")
    print(f"Database URL: {db_url}")

    engine_kwargs = {"echo": False}
    if not db_url.startswith("sqlite"):
        engine_kwargs.update({"pool_size": 5, "max_overflow": 2, "pool_pre_ping": True})

    engine = create_async_engine(db_url, **engine_kwargs)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created")

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Check if data already exists
        result = await session.execute(select(Language))
        existing = result.scalars().all()
        if existing:
            print(f"[SKIP] Database already has {len(existing)} languages. Delete DB file to re-seed.")
            await engine.dispose()
            return

        # Insert languages
        for lang_data in LANGUAGES:
            session.add(Language(**lang_data))
        await session.flush()
        print(f"[OK] Inserted {len(LANGUAGES)} languages")

        # Insert categories
        for cat_data in CATEGORIES:
            session.add(WordbookCategory(**cat_data))
        await session.flush()
        print(f"[OK] Inserted {len(CATEGORIES)} categories")

        # Insert wordbooks
        for wb_data in WORDBOOKS:
            session.add(Wordbook(**wb_data))
        await session.flush()
        print(f"[OK] Inserted {len(WORDBOOKS)} wordbooks")

        # Insert words
        for w_data in ALL_WORDS:
            lang_code = w_data["word_id"][:2]
            word = Word(
                word_id=w_data["word_id"],
                language_code=lang_code,
                word=w_data["word"],
                phonetic_ipa=w_data.get("phonetic_ipa"),
                meanings=w_data["meanings"],
                difficulty_level=w_data.get("difficulty_level", 1),
                frequency_rank=w_data.get("frequency_rank"),
                tags=w_data.get("tags"),
            )
            session.add(word)
        await session.flush()
        print(f"[OK] Inserted {len(ALL_WORDS)} words")

        # Insert wordbook-word associations
        total_links = 0
        for book_id, word_ids in WORDBOOK_WORD_MAP.items():
            for i, word_id in enumerate(word_ids):
                session.add(WordbookWord(book_id=book_id, word_id=word_id, sort_order=i + 1))
                total_links += 1
        await session.flush()
        print(f"[OK] Inserted {total_links} wordbook-word associations")

        await session.commit()
        print("\n=== Seed data insertion complete! ===")

    # Print statistics
    print("\n--- Statistics ---")
    print(f"  Languages: {len(LANGUAGES)} (en, fr, ja, de, es)")
    print(f"  Categories: {len(CATEGORIES)}")
    print(f"  Wordbooks: {len(WORDBOOKS)}")
    print(f"  Words: {len(ALL_WORDS)}")
    print(f"  Associations: {total_links}")
    print("\n--- Wordbook List ---")
    for wb in WORDBOOKS:
        print(f"  [{wb['language_code'].upper()}] {wb['name']} - {wb['word_count']} words (difficulty {wb['difficulty']})")

    await engine.dispose()


if __name__ == "__main__":
    print("=" * 50)
    print("  LingoMaster Seed Data Script")
    print("=" * 50)
    asyncio.run(seed_database())
