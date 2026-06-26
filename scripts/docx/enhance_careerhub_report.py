from __future__ import annotations

import argparse
from pathlib import Path

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


REFERENCE_MARGINS = {
    "top": 0.925,
    "bottom": 0.787,
    "left": 0.984,
    "right": 0.866,
    "header_distance": 0.492,
    "footer_distance": 0.433,
}
BULLET_PREFIX = "\u2022"
SAGA_PREFIX = "Saga \u0111\u0103ng k\u00fd"
COVER_TEXT_REPLACEMENTS = {
    "KHOA MẠNG MÁY TÍNH VÀ TRUYỀN THÔNG": "KHOA CÔNG NGHỆ PHẦN MỀM",
    "Thực hiện bởi nhóm <STT Nhóm>, bao gồm:": "Nhóm thực hiện gồm:",
    "Họ tên thành viên 01\tMSSV\t\tTrưởng nhóm": "Trần Nguyễn Lân\t\t\tTrưởng nhóm",
    "Họ tên thành viên 02\tMSSV\t\tThành viên": "Phan Nguyễn Anh Kiệt\t\t\tThành viên",
    "Họ tên thành viên 03\tMSSV\t\tThành viên": "Nguyễn Mạnh Đăng\t\t\tThành viên",
}


def set_style_font(style_name: str, doc: Document, size_pt: float, *, bold: bool | None = None,
                   italic: bool | None = None, align: WD_ALIGN_PARAGRAPH | None = None,
                   before_pt: float | None = None, after_pt: float | None = None,
                   line_spacing: float | None = None) -> None:
    style = doc.styles[style_name]
    style.font.name = "Times New Roman"
    style.font.size = Pt(size_pt)
    if bold is not None:
        style.font.bold = bold
    if italic is not None:
        style.font.italic = italic
    if align is not None:
        style.paragraph_format.alignment = align
    if before_pt is not None:
        style.paragraph_format.space_before = Pt(before_pt)
    if after_pt is not None:
        style.paragraph_format.space_after = Pt(after_pt)
    if line_spacing is not None:
        style.paragraph_format.line_spacing = line_spacing


def has_style(doc: Document, style_name: str) -> bool:
    try:
        doc.styles[style_name]
        return True
    except KeyError:
        return False


def set_run_font(run, *, name: str = "Times New Roman", size_pt: float | None = None,
                 bold: bool | None = None, italic: bool | None = None,
                 color: RGBColor | None = None) -> None:
    run.font.name = name
    if size_pt is not None:
        run.font.size = Pt(size_pt)
    if bold is not None:
        run.font.bold = bold
    if italic is not None:
        run.font.italic = italic
    if color is not None:
        run.font.color.rgb = color
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    r_fonts.set(qn("w:ascii"), name)
    r_fonts.set(qn("w:hAnsi"), name)
    r_fonts.set(qn("w:eastAsia"), name)


def style_paragraph_runs(paragraph, *, name: str = "Times New Roman",
                         size_pt: float | None = None, bold: bool | None = None,
                         italic: bool | None = None,
                         color: RGBColor | None = None) -> None:
    for run in paragraph.runs:
        set_run_font(
            run,
            name=name,
            size_pt=size_pt,
            bold=bold,
            italic=italic,
            color=color,
        )


def delete_paragraph(paragraph) -> None:
    element = paragraph._element
    parent = element.getparent()
    if parent is not None:
        parent.remove(element)


def clear_story(story) -> None:
    element = story._element
    for child in list(element):
        element.remove(child)
    story.add_paragraph()


def find_first_heading_index(doc: Document) -> int:
    return next(
        (
            index
            for index, paragraph in enumerate(doc.paragraphs)
            if paragraph.style.name == "Heading 1" and paragraph.text.strip()
        ),
        len(doc.paragraphs),
    )


def add_page_number(paragraph) -> None:
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "

    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")

    run = paragraph.add_run()
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)
    set_run_font(run, size_pt=11)


def set_cell_shading(cell, fill: str) -> None:
    cell_properties = cell._tc.get_or_add_tcPr()
    shading = cell_properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        cell_properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_paragraph_shading(paragraph, fill: str) -> None:
    properties = paragraph._element.get_or_add_pPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def clear_paragraph_shading(paragraph) -> None:
    properties = paragraph._element.get_or_add_pPr()
    shading = properties.find(qn("w:shd"))
    if shading is not None:
        properties.remove(shading)


def format_cell_paragraph(paragraph, *, align: WD_ALIGN_PARAGRAPH, bold: bool = False) -> None:
    paragraph.alignment = align
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.0
    style_paragraph_runs(paragraph, size_pt=11.5, bold=bold)


def set_table_widths(table, widths_in_inches: list[float]) -> None:
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for row in table.rows:
        for index, width in enumerate(widths_in_inches):
            row.cells[index].width = Inches(width)


def replace_cover_text(doc: Document, first_heading_index: int) -> None:
    for paragraph in doc.paragraphs[:first_heading_index]:
        text = paragraph.text.strip()
        replacement = COVER_TEXT_REPLACEMENTS.get(text)
        if replacement is None:
            continue

        for run in paragraph.runs:
            run.text = ""

        if paragraph.runs:
            paragraph.runs[0].text = replacement
        else:
            paragraph.add_run(replacement)


def apply_reference_page_setup(doc: Document) -> None:
    for section in doc.sections:
        section.top_margin = Inches(REFERENCE_MARGINS["top"])
        section.bottom_margin = Inches(REFERENCE_MARGINS["bottom"])
        section.left_margin = Inches(REFERENCE_MARGINS["left"])
        section.right_margin = Inches(REFERENCE_MARGINS["right"])
        section.header_distance = Inches(REFERENCE_MARGINS["header_distance"])
        section.footer_distance = Inches(REFERENCE_MARGINS["footer_distance"])


def configure_styles(doc: Document) -> None:
    set_style_font(
        "Normal",
        doc,
        14,
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
        after_pt=0,
        line_spacing=1.15,
    )
    set_style_font(
        "Title",
        doc,
        26,
        bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        after_pt=15,
        line_spacing=1.0,
    )
    set_style_font(
        "Heading 1",
        doc,
        16,
        bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        before_pt=24,
        after_pt=12,
        line_spacing=1.0,
    )
    set_style_font(
        "Heading 2",
        doc,
        13,
        bold=True,
        before_pt=10,
        after_pt=2,
        line_spacing=1.0,
    )
    set_style_font(
        "Heading 3",
        doc,
        13,
        bold=True,
        before_pt=10,
        after_pt=2,
        line_spacing=1.0,
    )
    set_style_font(
        "Caption",
        doc,
        10,
        bold=True,
        italic=False,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        before_pt=3,
        after_pt=4,
        line_spacing=1.0,
    )
    for style_name in ("List Paragraph", "List Bullet", "List Number"):
        if has_style(doc, style_name):
            set_style_font(
                style_name,
                doc,
                14,
                after_pt=0,
                line_spacing=1.15,
            )
            doc.styles[style_name].paragraph_format.left_indent = Inches(0.38)
            doc.styles[style_name].paragraph_format.first_line_indent = Inches(-0.18)


def format_cover_page(doc: Document, first_heading_index: int) -> None:
    cover_paragraphs = doc.paragraphs[:first_heading_index]
    non_empty_cover_paragraphs = [paragraph for paragraph in cover_paragraphs if paragraph.text.strip()]

    for paragraph in cover_paragraphs:
        paragraph.style = doc.styles["Normal"]
        paragraph.paragraph_format.left_indent = None
        paragraph.paragraph_format.right_indent = None
        paragraph.paragraph_format.first_line_indent = None
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.0
        clear_paragraph_shading(paragraph)
        if paragraph.text.strip():
            style_paragraph_runs(paragraph, size_pt=14, bold=False, italic=False)

    for index, paragraph in enumerate(non_empty_cover_paragraphs):
        if index == 0:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(6)
            style_paragraph_runs(paragraph, size_pt=18, bold=True)
        elif index == 1:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(76)
            style_paragraph_runs(paragraph, size_pt=18, bold=True)
        elif index == 2:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(28)
            style_paragraph_runs(paragraph, size_pt=18, bold=True)
        elif index == 3:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = Pt(56)
            style_paragraph_runs(paragraph, size_pt=14, bold=False)
        elif index == len(non_empty_cover_paragraphs) - 1:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_before = Pt(90)
            paragraph.paragraph_format.space_after = Pt(0)
            style_paragraph_runs(paragraph, size_pt=14, bold=False)
        else:
            paragraph.alignment = None
            paragraph.paragraph_format.left_indent = Inches(1.32)
            paragraph.paragraph_format.space_after = Pt(13)
            style_paragraph_runs(paragraph, size_pt=14, bold=False)


def compact_cover_blank_paragraphs(doc: Document, first_heading_index: int) -> None:
    for paragraph in list(doc.paragraphs[:first_heading_index]):
        if paragraph.text.strip():
            continue
        delete_paragraph(paragraph)


def normalize_manual_bullets(doc: Document, first_heading_index: int) -> None:
    for index, paragraph in enumerate(doc.paragraphs):
        text = paragraph.text.strip()
        if not text:
            continue

        if index < first_heading_index and paragraph.style.name == "List Paragraph":
            paragraph.style = doc.styles["Normal"]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            paragraph.paragraph_format.left_indent = None
            paragraph.paragraph_format.first_line_indent = None
            paragraph.paragraph_format.space_after = Pt(6)
            style_paragraph_runs(paragraph, size_pt=14)
            continue

        if paragraph.style.name == "List Paragraph":
            if has_style(doc, "List Bullet") and text.startswith(BULLET_PREFIX):
                paragraph.text = text.removeprefix(BULLET_PREFIX).strip()
                paragraph.style = doc.styles["List Bullet"]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            paragraph.paragraph_format.left_indent = Inches(0.38)
            paragraph.paragraph_format.first_line_indent = Inches(-0.18)
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.15
            style_paragraph_runs(paragraph, size_pt=14)


def format_heading_page_breaks(doc: Document, first_heading_index: int) -> None:
    for index, paragraph in enumerate(doc.paragraphs):
        if index < first_heading_index:
            continue
        if paragraph.style.name == "Heading 1" and paragraph.text.strip():
            paragraph.paragraph_format.page_break_before = True


def is_code_like_text(text: str) -> bool:
    return (
        "+-------------+" in text
        or ("Client (Web/Next.js)" in text and "GATEWAY" in text)
        or text.startswith(SAGA_PREFIX)
        or text.startswith("Outbox:")
        or "-> publish" in text
    )


def format_code_like_paragraphs(doc: Document) -> None:
    code_fill = "EAF2FF"
    code_color = RGBColor(31, 78, 121)

    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text or not is_code_like_text(text):
            continue

        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
        paragraph.paragraph_format.left_indent = Inches(0.2)
        paragraph.paragraph_format.right_indent = Inches(0.2)
        paragraph.paragraph_format.first_line_indent = None
        paragraph.paragraph_format.space_before = Pt(6)
        paragraph.paragraph_format.space_after = Pt(8)
        paragraph.paragraph_format.line_spacing = 1.08
        set_paragraph_shading(paragraph, code_fill)
        style_paragraph_runs(
            paragraph,
            name="Consolas",
            size_pt=10.5,
            color=code_color,
        )


def normalize_body_paragraphs(doc: Document, first_heading_index: int) -> None:
    for index, paragraph in enumerate(doc.paragraphs):
        if index < first_heading_index:
            continue

        text = paragraph.text.strip()
        if not text:
            continue

        style_name = paragraph.style.name
        if style_name == "Normal":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.15
            style_paragraph_runs(paragraph, size_pt=14)
        elif style_name == "Heading 1":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            style_paragraph_runs(paragraph, size_pt=16, bold=True)
        elif style_name in {"Heading 2", "Heading 3"}:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            style_paragraph_runs(paragraph, size_pt=13, bold=True)
        elif style_name == "Caption":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            style_paragraph_runs(paragraph, size_pt=10, bold=True)


def clear_headers_and_add_footer(doc: Document) -> None:
    for section in doc.sections:
        section.different_first_page_header_footer = True

        clear_story(section.header)
        clear_story(section.first_page_header)
        clear_story(section.first_page_footer)
        clear_story(section.footer)

        footer_paragraph = section.footer.paragraphs[0]
        footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_page_number(footer_paragraph)


def format_tables(doc: Document) -> None:
    table_widths = {
        0: [1.2, 1.0, 1.0, 3.4],
        1: [2.0, 2.2, 2.3],
        2: [2.4, 3.3, 0.8],
    }
    table_alignments = {
        0: [WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT],
        1: [WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT],
        2: [WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER],
    }

    for table_index, table in enumerate(doc.tables):
        widths = table_widths.get(table_index)
        if widths is not None:
            set_table_widths(table, widths)

        table.style = "Table Grid"
        for row_index, row in enumerate(table.rows):
            for column_index, cell in enumerate(row.cells):
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                for paragraph in cell.paragraphs:
                    alignment = table_alignments.get(table_index, [WD_ALIGN_PARAGRAPH.LEFT] * len(row.cells))[column_index]
                    format_cell_paragraph(
                        paragraph,
                        align=alignment if row_index > 0 else WD_ALIGN_PARAGRAPH.CENTER,
                        bold=row_index == 0,
                    )
                if row_index == 0:
                    clear_paragraph_shading(cell.paragraphs[0])


def enhance_document(input_path: Path, output_path: Path) -> None:
    doc = Document(str(input_path))
    apply_reference_page_setup(doc)
    configure_styles(doc)

    first_heading_index = find_first_heading_index(doc)

    replace_cover_text(doc, first_heading_index)
    format_cover_page(doc, first_heading_index)
    compact_cover_blank_paragraphs(doc, first_heading_index)
    first_heading_index = find_first_heading_index(doc)
    normalize_manual_bullets(doc, first_heading_index)
    format_heading_page_breaks(doc, first_heading_index)
    normalize_body_paragraphs(doc, first_heading_index)
    format_code_like_paragraphs(doc)
    clear_headers_and_add_footer(doc)
    format_tables(doc)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    enhance_document(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
