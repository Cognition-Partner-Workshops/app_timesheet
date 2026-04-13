"""
Data pipeline - Process JMdict (Japanese-Multilingual Dictionary) data.
Downloads and processes the JMdict open-source dictionary for Japanese words.
"""
import json
import os
import sys
import urllib.request
import gzip

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

JMDICT_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def download_jmdict():
    """Download JMdict if not present."""
    os.makedirs(DATA_DIR, exist_ok=True)
    gz_path = os.path.join(DATA_DIR, "JMdict_e.gz")
    xml_path = os.path.join(DATA_DIR, "JMdict_e.xml")

    if os.path.exists(xml_path):
        print(f"JMdict already downloaded: {xml_path}")
        return xml_path

    print(f"Downloading JMdict from {JMDICT_URL}...")
    try:
        urllib.request.urlretrieve(JMDICT_URL, gz_path)
        print("Download complete, extracting...")

        with gzip.open(gz_path, 'rb') as f_in:
            with open(xml_path, 'wb') as f_out:
                f_out.write(f_in.read())

        os.remove(gz_path)
        print(f"Extracted to: {xml_path}")
        return xml_path
    except Exception as e:
        print(f"Download failed: {e}")
        return None


def process_jmdict_simple(xml_path: str, max_words: int = 10000):
    """Process JMdict XML and generate JSON word data (simplified parser)."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    words = []
    count = 0

    print(f"Processing JMdict: {xml_path}")
    try:
        import xml.etree.ElementTree as ET
        tree = ET.parse(xml_path)
        root = tree.getroot()

        for entry in root.findall('entry'):
            if count >= max_words:
                break

            # Get kanji/reading
            k_ele = entry.find('k_ele')
            r_ele = entry.find('r_ele')

            word_text = ""
            reading = ""

            if k_ele is not None:
                keb = k_ele.find('keb')
                word_text = keb.text if keb is not None else ""
            if r_ele is not None:
                reb = r_ele.find('reb')
                reading = reb.text if reb is not None else ""

            if not word_text:
                word_text = reading
            if not word_text:
                continue

            # Get meanings
            meanings = []
            for sense in entry.findall('sense'):
                # Get POS
                pos_list = [p.text for p in sense.findall('pos') if p.text]
                pos = pos_list[0] if pos_list else ""

                # Get glosses (English meanings)
                glosses = [g.text for g in sense.findall('gloss') if g.text]
                if glosses:
                    meanings.append({
                        "pos": pos,
                        "definition_zh": "；".join(glosses[:3]),
                        "definition_en": "; ".join(glosses[:3]),
                    })

            if not meanings:
                continue

            word_id = f"ja_{word_text.replace(' ', '_')}"
            word_data = {
                "word_id": word_id,
                "language_code": "ja",
                "word": word_text,
                "phonetic_ipa": reading,
                "meanings": meanings,
                "frequency_rank": count + 1,
                "difficulty_level": 1 if count < 2000 else (2 if count < 5000 else 3),
                "tags": [],
            }

            words.append(word_data)
            count += 1

            if count % 1000 == 0:
                print(f"  Processed {count} words...")

    except Exception as e:
        print(f"Error processing JMdict: {e}")
        return

    output_path = os.path.join(OUTPUT_DIR, "ja_words.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Processed {count} Japanese words → {output_path}")


if __name__ == "__main__":
    xml_path = download_jmdict()
    if xml_path:
        process_jmdict_simple(xml_path)
