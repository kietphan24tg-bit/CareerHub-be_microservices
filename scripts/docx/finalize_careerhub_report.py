from __future__ import annotations

import argparse
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt


MEMBER_IDS = {
    "Trần Nguyễn Lân": "24520945",
    "Phan Nguyễn Anh Kiệt": "24520910",
    "Nguyễn Mạnh Đăng": "24520256",
}

SUBJECT_LINE = "Môn học: SE361 - Phát triển Phần mềm theo Kiến trúc Microservices"
LECTURER_LINE = "Giảng viên hướng dẫn: Nguyễn Duy Khánh"
TEAM_LINE = "Nhóm thực hiện (MSSV):"
HEADER_LEFT = "Báo cáo Đồ án SE361"
GROUP_LABEL = "Nhóm 20"
COVER_META_PREFIXES = (
    "Môn học:",
    "Giảng viên hướng dẫn:",
    "Nhóm thực hiện",
    "Trần Nguyễn Lân",
    "Phan Nguyễn Anh Kiệt",
    "Nguyễn Mạnh Đăng",
    "Thời gian thực hiện:",
)


def set_paragraph_text(paragraph, text: str) -> None:
    if not paragraph.runs:
        paragraph.add_run(text)
        return

    first_run = paragraph.runs[0]
    first_run.text = text
    for run in paragraph.runs[1:]:
        run._element.getparent().remove(run._element)


def iter_table_paragraphs(document: Document):
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from cell.paragraphs


def iter_header_footer_paragraphs(document: Document):
    for section in document.sections:
        yield from section.header.paragraphs
        yield from section.footer.paragraphs


def apply_text_replacements(document: Document) -> None:
    for paragraph in [*document.paragraphs, *iter_table_paragraphs(document)]:
        text = paragraph.text.strip()

        if text.startswith("Môn học:"):
            set_paragraph_text(paragraph, SUBJECT_LINE)
        elif text.startswith("Giảng viên hướng dẫn:"):
            set_paragraph_text(paragraph, LECTURER_LINE)
        elif text in {"Nhóm thực hiện gồm:", "Nhóm thực hiện (MSSV):"}:
            set_paragraph_text(paragraph, TEAM_LINE)
        else:
            for member_name, member_id in MEMBER_IDS.items():
                if text.startswith(member_name):
                    set_paragraph_text(paragraph, f"{member_name}\t{member_id}")
                    paragraph.paragraph_format.tab_stops.clear_all()
                    paragraph.paragraph_format.tab_stops.add_tab_stop(Inches(3.35))
                    break

        if "Nhóm XX" in paragraph.text:
            set_paragraph_text(paragraph, paragraph.text.replace("Nhóm XX", GROUP_LABEL))

    for paragraph in iter_header_footer_paragraphs(document):
        text = paragraph.text
        if not text:
            continue
        updated = text.replace("Báo cáo Đồ án <Tên môn học>", HEADER_LEFT).replace("Nhóm XX", GROUP_LABEL)
        if updated != text:
            set_paragraph_text(paragraph, updated)


def enlarge_cover_metadata(document: Document) -> None:
    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text.startswith(COVER_META_PREFIXES):
            continue

        paragraph.paragraph_format.space_after = Pt(6)
        paragraph.paragraph_format.line_spacing = 1.05

        is_member_line = any(text.startswith(name) for name in MEMBER_IDS)
        if is_member_line:
            paragraph.paragraph_format.tab_stops.clear_all()
            paragraph.paragraph_format.tab_stops.add_tab_stop(Inches(3.55))

        for run in paragraph.runs:
            run.font.size = Pt(16)
            run.font.bold = not is_member_line


def center_captions(document: Document) -> None:
    caption_prefixes = ("Hình ", "Bảng ", "Đoạn mã ")
    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        is_caption_style = paragraph.style.name.lower().startswith("caption")
        if not is_caption_style and not text.startswith(caption_prefixes):
            continue

        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.left_indent = None
        paragraph.paragraph_format.right_indent = None
        paragraph.paragraph_format.first_line_indent = None
        paragraph.paragraph_format.space_before = Pt(4)
        paragraph.paragraph_format.space_after = Pt(8)
        paragraph.paragraph_format.line_spacing = 1.0


def finalize_document(input_path: Path, output_path: Path) -> None:
    document = Document(str(input_path))
    apply_text_replacements(document)
    enlarge_cover_metadata(document)
    center_captions(document)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    finalize_document(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
