"""
Data pipeline - Process ECDICT (English-Chinese Dictionary) data.
Downloads and processes the ECDICT open-source dictionary for English words.
"""
import json
import csv
import os
import sys
import urllib.request
import zipfile

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ECDICT_URL = "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-csv-1.0.28.zip"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def download_ecdict():
    """Download ECDICT if not present."""
    os.makedirs(DATA_DIR, exist_ok=True)
    zip_path = os.path.join(DATA_DIR, "ecdict.zip")
    csv_path = os.path.join(DATA_DIR, "ecdict.csv")

    if os.path.exists(csv_path):
        print(f"ECDICT already downloaded: {csv_path}")
        return csv_path

    print(f"Downloading ECDICT from {ECDICT_URL}...")
    try:
        urllib.request.urlretrieve(ECDICT_URL, zip_path)
        print("Download complete, extracting...")

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(DATA_DIR)

        # Find the CSV file
        for f in os.listdir(DATA_DIR):
            if f.endswith('.csv') and 'ecdict' in f.lower():
                os.rename(os.path.join(DATA_DIR, f), csv_path)
                break

        os.remove(zip_path)
        print(f"Extracted to: {csv_path}")
        return csv_path
    except Exception as e:
        print(f"Download failed: {e}")
        print("Please manually download ECDICT and place in data/ecdict.csv")
        return None


def process_ecdict(csv_path: str, frequency_filter: int = 50000):
    """Process ECDICT CSV and generate JSON word data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    words = []
    count = 0

    print(f"Processing ECDICT: {csv_path}")
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('word', '').strip()
                if not word or len(word) < 2:
                    continue

                # Filter by frequency
                freq = row.get('frq', '')
                if freq and freq.isdigit() and int(freq) > frequency_filter:
                    continue

                # Parse translation
                translation = row.get('translation', '')
                phonetic = row.get('phonetic', '')

                if not translation:
                    continue

                # Parse meanings from translation
                meanings = []
                for line in translation.split('\\n'):
                    line = line.strip()
                    if not line:
                        continue

                    # Try to extract POS and definition
                    pos = ""
                    definition = line
                    for p in ["n.", "v.", "vt.", "vi.", "adj.", "adv.", "prep.", "conj.", "pron.", "art."]:
                        if line.startswith(p):
                            pos = p
                            definition = line[len(p):].strip()
                            break

                    meanings.append({
                        "pos": pos,
                        "definition_zh": definition,
                    })

                if not meanings:
                    continue

                word_data = {
                    "word_id": f"en_{word.lower().replace(' ', '_')}",
                    "language_code": "en",
                    "word": word,
                    "phonetic_ipa": f"/{phonetic}/" if phonetic else None,
                    "meanings": meanings,
                    "frequency_rank": int(freq) if freq and freq.isdigit() else None,
                    "difficulty_level": _calc_difficulty(freq),
                    "tags": _get_tags(row),
                }

                words.append(word_data)
                count += 1

                if count % 10000 == 0:
                    print(f"  Processed {count} words...")

    except FileNotFoundError:
        print(f"File not found: {csv_path}")
        return

    # Save processed data
    output_path = os.path.join(OUTPUT_DIR, "en_words.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Processed {count} English words → {output_path}")


def _calc_difficulty(freq_str: str) -> int:
    """Calculate difficulty level from frequency."""
    if not freq_str or not freq_str.isdigit():
        return 3

    freq = int(freq_str)
    if freq < 2000:
        return 1
    elif freq < 5000:
        return 2
    elif freq < 15000:
        return 3
    elif freq < 30000:
        return 4
    else:
        return 5


def _get_tags(row: dict) -> list:
    """Extract tags from ECDICT row."""
    tags = []
    collins = row.get('collins', '')
    if collins and collins.isdigit() and int(collins) > 0:
        tags.append(f"Collins-{collins}")

    oxford = row.get('oxford', '')
    if oxford == '1':
        tags.append("Oxford-3000")

    bnc = row.get('bnc', '')
    if bnc and bnc.isdigit():
        bnc_rank = int(bnc)
        if bnc_rank < 5000:
            tags.append("高频")

    return tags


if __name__ == "__main__":
    csv_path = download_ecdict()
    if csv_path:
        process_ecdict(csv_path)
