"""Create one starter Word template per disciplinary tier in doc_templates/.

Run once:  python make_doc_templates.py
After that, open the .docx files in Word and edit the wording freely. Keep the
{{ ... }} placeholders and the three {%tr %} table rows; docxtpl fills them in.

Available placeholders: employee_name, employee_title, team, manager_name,
tier_label, occurrence_total, today, and the `events` list (each has date,
type, minutes, occurrence, occurrence_label).

Existing templates are NOT overwritten unless you pass --force.
"""
import sys

from docx import Document
from docx.shared import Pt

from app.disciplinary import TEMPLATE_DIR, TIERS

# Placeholder wording per tier. HR should replace this with the real policy text.
WORDING = {
    "heads_up": "This is a friendly heads-up that your attendance occurrences have reached {{ occurrence_total }}. "
                "No formal action is being taken; please review the attendance policy.",
    "verbal_balanced_feedback": "We met to give balanced feedback about your attendance. "
                                "You currently have {{ occurrence_total }} occurrences.",
    "verbal_counseling": "This documents a verbal counseling about attendance. "
                         "You currently have {{ occurrence_total }} occurrences.",
    "verbal_warning": "This documents a verbal warning about attendance. "
                      "Further occurrences may lead to written warnings.",
    "written_warning_1": "This is a first written warning about attendance. "
                         "You currently have {{ occurrence_total }} occurrences.",
    "written_warning_2": "This is a second written warning about attendance. "
                         "Further occurrences may lead to termination of employment.",
    "termination": "This documents the termination of employment due to attendance, "
                   "having reached {{ occurrence_total }} occurrences.",
}


def build(tier) -> Document:
    doc = Document()
    doc.styles["Normal"].font.size = Pt(11)
    doc.add_heading("GI/Hepatology — {{ tier_label }}", level=1)
    doc.add_paragraph("Date: {{ today }}")
    doc.add_paragraph("Employee: {{ employee_name }}, {{ employee_title }} ({{ team }})")
    doc.add_paragraph("Manager: {{ manager_name }}")
    doc.add_paragraph(WORDING[tier.key])

    doc.add_heading("Attendance history", level=2)
    table = doc.add_table(rows=4, cols=4)
    table.style = "Table Grid"
    for cell, text in zip(table.rows[0].cells, ["Date", "Event", "Minutes late", "Occurrence"]):
        cell.text = text
    # docxtpl row loop: the {%tr %} rows are removed and the middle row repeats per event.
    table.rows[1].cells[0].text = "{%tr for e in events %}"
    for cell, text in zip(table.rows[2].cells, ["{{ e.date }}", "{{ e.type }}", "{{ e.minutes }}", "{{ e.occurrence }} ({{ e.occurrence_label }})"]):
        cell.text = text
    table.rows[3].cells[0].text = "{%tr endfor %}"

    doc.add_paragraph("Total occurrences: {{ occurrence_total }}")
    doc.add_paragraph("\nEmployee signature: ______________________   Date: __________")
    doc.add_paragraph("Manager signature: _______________________   Date: __________")
    return doc


def main(force: bool = False) -> None:
    TEMPLATE_DIR.mkdir(exist_ok=True)
    for tier in TIERS:
        path = TEMPLATE_DIR / f"{tier.key}.docx"
        if path.exists() and not force:
            print(f"skip  {path.name} (exists)")
            continue
        build(tier).save(path)
        print(f"wrote {path.name}")


if __name__ == "__main__":
    main(force="--force" in sys.argv)
