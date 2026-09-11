"""Convert Naukri LDJSON to clean CSV. Run once: python convert_to_csv.py"""
import json
import csv
import sys

INPUT = "../data/marketing_sample_for_naukri_com-naukri_com_job_data__20201001_20201231__5k_data.ldjson"
OUTPUT = "../data/naukri_jobs.csv"

FIELDS = [
    "uniq_id",
    "job_title",
    "company_name",
    "category",
    "city",
    "state",
    "country",
    "post_date",
    "job_description",
    "job_type",
    "salary_offered",
    "inferred_city",
    "inferred_state",
    "inferred_country",
    "is_remote",
]

rows = []
errors = 0

with open(INPUT, "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
            row = {}
            for field in FIELDS:
                val = record.get(field, "")
                if isinstance(val, list):
                    val = "|".join(str(v) for v in val)
                row[field] = val
            rows.append(row)
        except json.JSONDecodeError:
            errors += 1

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)

print(f"Converted {len(rows)} records to {OUTPUT}")
if errors:
    print(f"Skipped {errors} malformed lines")
