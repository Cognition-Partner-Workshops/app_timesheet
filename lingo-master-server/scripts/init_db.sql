-- LingoMaster Database Initialization
-- This script runs automatically on first PostgreSQL start

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert supported languages
INSERT INTO languages (language_code, language_name, flag_emoji, is_active, sort_order)
VALUES
    ('en', '英语', '🇬🇧', true, 1),
    ('fr', '法语', '🇫🇷', true, 2),
    ('ja', '日语', '🇯🇵', true, 3),
    ('de', '德语', '🇩🇪', true, 4),
    ('es', '西班牙语', '🇪🇸', true, 5)
ON CONFLICT DO NOTHING;

-- English wordbook categories
INSERT INTO wordbook_categories (language_code, category_type, category_name, sort_order)
VALUES
    ('en', 'exam', '考试词汇', 1),
    ('en', 'grade', '分级词汇', 2),
    ('en', 'scenario', '场景词汇', 3),
    ('en', 'textbook', '教材词汇', 4)
ON CONFLICT DO NOTHING;

-- Japanese wordbook categories
INSERT INTO wordbook_categories (language_code, category_type, category_name, sort_order)
VALUES
    ('ja', 'exam', 'JLPT考试', 1),
    ('ja', 'textbook', '教材词汇', 2)
ON CONFLICT DO NOTHING;

-- Sample English wordbooks
INSERT INTO wordbooks (book_id, language_code, category_id, name, description, word_count, difficulty, is_free, cover_color, sort_order)
VALUES
    ('en_cet4', 'en', 1, 'CET-4核心词汇', '大学英语四级考试核心词汇2000词', 2000, 2, true, '#4A90D9', 1),
    ('en_cet6', 'en', 1, 'CET-6核心词汇', '大学英语六级考试核心词汇3000词', 3000, 3, true, '#7B68EE', 2),
    ('en_toefl', 'en', 1, 'TOEFL核心词汇', '托福考试核心词汇4000词', 4000, 4, true, '#FF6347', 3),
    ('en_ielts', 'en', 1, 'IELTS核心词汇', '雅思考试核心词汇3500词', 3500, 3, true, '#32CD32', 4),
    ('en_high', 'en', 2, '高中核心词汇', '高中英语必备词汇3500词', 3500, 2, true, '#FFD700', 5),
    ('en_daily', 'en', 3, '日常会话800词', '日常英语会话高频词汇', 800, 1, true, '#87CEEB', 6)
ON CONFLICT DO NOTHING;

-- Sample Japanese wordbooks
INSERT INTO wordbooks (book_id, language_code, category_id, name, description, word_count, difficulty, is_free, cover_color, sort_order)
VALUES
    ('ja_n5', 'ja', 5, 'JLPT N5词汇', '日本语能力测试N5基础词汇800词', 800, 1, true, '#FF69B4', 1),
    ('ja_n4', 'ja', 5, 'JLPT N4词汇', '日本语能力测试N4词汇1500词', 1500, 2, true, '#DA70D6', 2),
    ('ja_n3', 'ja', 5, 'JLPT N3词汇', '日本语能力测试N3词汇3000词', 3000, 3, true, '#BA55D3', 3),
    ('ja_n2', 'ja', 5, 'JLPT N2词汇', '日本语能力测试N2词汇5000词', 5000, 4, true, '#9370DB', 4)
ON CONFLICT DO NOTHING;

-- Sample English words (CET-4)
INSERT INTO words (word_id, language_code, word, phonetic_ipa, meanings, word_family, frequency_rank, difficulty_level, tags)
VALUES
    ('en_abandon', 'en', 'abandon', '/əˈbændən/', '[{"pos":"vt.","definition_zh":"放弃，遗弃","definition_en":"to give up completely","example":"He abandoned his wife and children.","example_zh":"他抛弃了妻子和孩子。"}]', '{"root":"abandon","etymology":"来自法语 à bandon（任由处置）","related":["abandonment","abandoned"]}', 1500, 2, '{"CET-4","考研","高频"}'),
    ('en_ability', 'en', 'ability', '/əˈbɪləti/', '[{"pos":"n.","definition_zh":"能力，才能","definition_en":"the power or skill to do something","example":"She has the ability to solve complex problems.","example_zh":"她有能力解决复杂问题。"}]', '{"root":"abil","suffix":"-ity","etymology":"来自拉丁语 habilis（灵巧的）","related":["able","disable","enable"]}', 800, 1, '{"CET-4","基础","高频"}'),
    ('en_abroad', 'en', 'abroad', '/əˈbrɔːd/', '[{"pos":"adv.","definition_zh":"在国外，到国外","definition_en":"in or to a foreign country","example":"She has never been abroad.","example_zh":"她从未出过国。"}]', '{"prefix":"a-","root":"broad","etymology":"古英语 on brede（向远处）","related":["broad","broaden"]}', 2000, 1, '{"CET-4","基础","旅行"}'),
    ('en_absolute', 'en', 'absolute', '/ˈæbsəluːt/', '[{"pos":"adj.","definition_zh":"绝对的，完全的","definition_en":"total and complete","example":"I have absolute confidence in her.","example_zh":"我对她有绝对的信心。"}]', '{"prefix":"ab-","root":"solut","etymology":"来自拉丁语 absolutus（完成的）","related":["absolutely","absolution"]}', 3000, 2, '{"CET-4","考研"}'),
    ('en_absorb', 'en', 'absorb', '/əbˈzɔːrb/', '[{"pos":"vt.","definition_zh":"吸收，吸引注意","definition_en":"to take in or soak up","example":"Plants absorb carbon dioxide.","example_zh":"植物吸收二氧化碳。"}]', '{"prefix":"ab-","root":"sorb","etymology":"来自拉丁语 absorbere（吞没）","related":["absorption","absorbent","absorbing"]}', 3500, 2, '{"CET-4","科学"}'),
    ('en_accept', 'en', 'accept', '/əkˈsept/', '[{"pos":"vt.","definition_zh":"接受，承认","definition_en":"to receive willingly","example":"Please accept my apology.","example_zh":"请接受我的道歉。"}]', '{"prefix":"ac-","root":"cept","etymology":"来自拉丁语 accipere（接收）","related":["acceptance","acceptable","accepted"]}', 500, 1, '{"CET-4","基础","高频"}'),
    ('en_access', 'en', 'access', '/ˈækses/', '[{"pos":"n.","definition_zh":"接近，通道；访问权","definition_en":"the right or opportunity to approach","example":"Students have access to the library.","example_zh":"学生可以使用图书馆。"},{"pos":"vt.","definition_zh":"访问，存取","definition_en":"to gain access to","example":"You can access the database remotely.","example_zh":"你可以远程访问数据库。"}]', '{"prefix":"ac-","root":"cess","etymology":"来自拉丁语 accessus（接近）","related":["accessible","accessibility"]}', 1000, 2, '{"CET-4","IT","高频"}'),
    ('en_achieve', 'en', 'achieve', '/əˈtʃiːv/', '[{"pos":"vt.","definition_zh":"达到，完成","definition_en":"to successfully reach a goal","example":"She achieved her dream of becoming a doctor.","example_zh":"她实现了成为医生的梦想。"}]', '{"prefix":"a-","root":"chieve","etymology":"来自法语 achever（完成）","related":["achievement","achievable","achiever"]}', 1200, 2, '{"CET-4","考研","高频"}'),
    ('en_acquire', 'en', 'acquire', '/əˈkwaɪər/', '[{"pos":"vt.","definition_zh":"获得，学到","definition_en":"to gain possession of","example":"He acquired a taste for fine wine.","example_zh":"他养成了品尝好酒的爱好。"}]', '{"prefix":"ac-","root":"quire","etymology":"来自拉丁语 acquirere（获取）","related":["acquisition","acquired"]}', 2500, 3, '{"CET-4","CET-6","考研"}'),
    ('en_action', 'en', 'action', '/ˈækʃən/', '[{"pos":"n.","definition_zh":"行动，行为；作用","definition_en":"the process of doing something","example":"We need to take action immediately.","example_zh":"我们需要立即采取行动。"}]', '{"root":"act","suffix":"-ion","etymology":"来自拉丁语 actio（行动）","related":["act","active","activity","activate"]}', 300, 1, '{"CET-4","基础","高频"}')
ON CONFLICT DO NOTHING;

-- Link words to CET-4 wordbook
INSERT INTO wordbook_words (book_id, word_id, sort_order)
VALUES
    ('en_cet4', 'en_abandon', 1),
    ('en_cet4', 'en_ability', 2),
    ('en_cet4', 'en_abroad', 3),
    ('en_cet4', 'en_absolute', 4),
    ('en_cet4', 'en_absorb', 5),
    ('en_cet4', 'en_accept', 6),
    ('en_cet4', 'en_access', 7),
    ('en_cet4', 'en_achieve', 8),
    ('en_cet4', 'en_acquire', 9),
    ('en_cet4', 'en_action', 10)
ON CONFLICT DO NOTHING;

-- Sample Japanese words (N5)
INSERT INTO words (word_id, language_code, word, phonetic_ipa, meanings, frequency_rank, difficulty_level, tags)
VALUES
    ('ja_watashi', 'ja', '私', 'わたし', '[{"pos":"代词","definition_zh":"我","example":"私は学生です。","example_zh":"我是学生。"}]', 1, 1, '{"N5","基础"}'),
    ('ja_gakusei', 'ja', '学生', 'がくせい', '[{"pos":"名词","definition_zh":"学生","example":"彼は大学の学生です。","example_zh":"他是大学的学生。"}]', 50, 1, '{"N5","基础"}'),
    ('ja_sensei', 'ja', '先生', 'せんせい', '[{"pos":"名词","definition_zh":"老师，先生","example":"田中先生は優しいです。","example_zh":"田中老师很温柔。"}]', 80, 1, '{"N5","基础"}'),
    ('ja_hon', 'ja', '本', 'ほん', '[{"pos":"名词","definition_zh":"书，本","example":"この本は面白いです。","example_zh":"这本书很有趣。"}]', 100, 1, '{"N5","基础"}'),
    ('ja_taberu', 'ja', '食べる', 'たべる', '[{"pos":"动词","definition_zh":"吃","example":"朝ご飯を食べます。","example_zh":"吃早餐。"}]', 30, 1, '{"N5","基础","饮食"}')
ON CONFLICT DO NOTHING;

-- Link words to JLPT N5 wordbook
INSERT INTO wordbook_words (book_id, word_id, sort_order)
VALUES
    ('ja_n5', 'ja_watashi', 1),
    ('ja_n5', 'ja_gakusei', 2),
    ('ja_n5', 'ja_sensei', 3),
    ('ja_n5', 'ja_hon', 4),
    ('ja_n5', 'ja_taberu', 5)
ON CONFLICT DO NOTHING;
