from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


TOC_ENTRIES = [
    ("TÓM TẮT", "__PAGE_SUMMARY__"),
    ("Chương I. TỔNG QUAN.", "__PAGE_CH1__"),
    ("Chương II. THIẾT KẾ HỆ THỐNG.", "__PAGE_CH2__"),
    ("Chương III. TRIỂN KHAI HỆ THỐNG.", "__PAGE_CH3__"),
    ("Chương IV. KẾT LUẬN.", "__PAGE_CH4__"),
    ("NGUỒN THAM KHẢO", "__PAGE_REF__"),
]
PAGE_MAP_KEYS = {
    "TÓM TẮT": "__PAGE_SUMMARY__",
    "Chương I. TỔNG QUAN.": "__PAGE_CH1__",
    "Chương II. THIẾT KẾ HỆ THỐNG.": "__PAGE_CH2__",
    "Chương III. TRIỂN KHAI HỆ THỐNG.": "__PAGE_CH3__",
    "Chương IV. KẾT LUẬN.": "__PAGE_CH4__",
    "NGUỒN THAM KHẢO": "__PAGE_REF__",
}


def read_document_xml(docx_path: Path) -> tuple[ZipFile, str]:
    archive = ZipFile(docx_path, "r")
    xml = archive.read("word/document.xml").decode("utf-8")
    return archive, xml


def write_document(docx_path: Path, source_archive: ZipFile, document_xml: str) -> None:
    payload = document_xml.encode("utf-8")
    with ZipFile(docx_path, "w", compression=ZIP_DEFLATED) as output_archive:
        for info in source_archive.infolist():
            data = payload if info.filename == "word/document.xml" else source_archive.read(info.filename)
            output_archive.writestr(info, data)


def build_manual_toc() -> str:
    heading = (
        '<w:p>'
        '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
        '<w:r><w:t>MỤC LỤC</w:t></w:r>'
        "</w:p>"
    )

    entries = []
    for label, placeholder in TOC_ENTRIES:
        entries.append(
            "<w:p>"
            '<w:pPr>'
            '<w:pStyle w:val="TOC1"/>'
            '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9016"/></w:tabs>'
            "</w:pPr>"
            f"<w:r><w:t>{label}</w:t></w:r>"
            "<w:r><w:tab/></w:r>"
            f"<w:r><w:t>{placeholder}</w:t></w:r>"
            "</w:p>"
        )
    return heading + "".join(entries)


def replace_toc_block(xml: str) -> str:
    manual_toc = build_manual_toc()
    pattern = r'<w:bookmarkStart\b[^>]*/><w:sdt>[\s\S]*?</w:sdt>'
    updated_xml, count = re.subn(pattern, manual_toc, xml, count=1)
    if count != 1:
        raise ValueError("Failed to replace TOC block.")
    return updated_xml


def remove_figure_list_section(xml: str) -> str:
    list_text = "DANH SÁCH HÌNH, BẢNG</w:t>"
    summary_text = "<w:t>TÓM TẮT</w:t>"

    start_text_index = xml.find(list_text)
    if start_text_index < 0:
        raise ValueError("Figure-list heading not found.")
    start_paragraph_index = xml.rfind("<w:p", 0, start_text_index)
    if start_paragraph_index < 0:
        raise ValueError("Figure-list paragraph start not found.")

    summary_text_index = xml.find(summary_text, start_text_index)
    if summary_text_index < 0:
        raise ValueError("Summary heading not found after figure list.")
    summary_paragraph_index = xml.rfind("<w:p", 0, summary_text_index)
    if summary_paragraph_index < 0:
        raise ValueError("Summary paragraph start not found.")

    return xml[:start_paragraph_index] + xml[summary_paragraph_index:]


def compact_gap_before_summary(xml: str) -> str:
    toc_tail = "__PAGE_REF__</w:t></w:r></w:p>"
    toc_tail_index = xml.find(toc_tail)
    if toc_tail_index < 0:
        raise ValueError("Could not locate end of manual TOC.")
    gap_start = toc_tail_index + len(toc_tail)

    summary_pattern = '<w:p><w:pPr><w:pageBreakBefore w:val="1"/><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>TÓM TẮT</w:t></w:r></w:p>'
    summary_start = xml.find(summary_pattern, gap_start)
    if summary_start < 0:
        raise ValueError("Could not locate actual summary paragraph.")

    return xml[:gap_start] + xml[summary_start:]


def inject_page_break(xml: str, heading_text: str) -> str:
    paragraph_pattern = re.compile(r"<w:p\b[\s\S]*?</w:p>")
    for match in paragraph_pattern.finditer(xml):
        paragraph_xml = match.group(0)
        if '<w:pStyle w:val="Heading1"/>' not in paragraph_xml:
            continue
        if f"<w:t>{heading_text}</w:t>" not in paragraph_xml:
            continue

        patched_paragraph = paragraph_xml
        if "<w:pageBreakBefore" not in patched_paragraph:
            patched_paragraph = patched_paragraph.replace("<w:pPr>", '<w:pPr><w:pageBreakBefore w:val="1"/>', 1)
        return xml[: match.start()] + patched_paragraph + xml[match.end() :]

    raise ValueError(f"Heading paragraph not found: {heading_text}")


def patch_layout(xml: str) -> str:
    updated_xml = replace_toc_block(xml)
    updated_xml = remove_figure_list_section(updated_xml)
    for heading_text, _ in TOC_ENTRIES:
        updated_xml = inject_page_break(updated_xml, heading_text)
    updated_xml = compact_gap_before_summary(updated_xml)
    return updated_xml


def update_toc_page_numbers(xml: str, page_map: dict[str, int]) -> str:
    updated_xml = xml
    for label, placeholder in TOC_ENTRIES:
        page_number = page_map.get(label)
        if page_number is None:
            raise ValueError(f"Missing page number for TOC entry: {label}")
        updated_xml = updated_xml.replace(placeholder, str(page_number), 1)
    return updated_xml


def load_page_map(page_map_path: Path) -> dict[str, int]:
    payload = json.loads(page_map_path.read_text(encoding="utf-8-sig"))
    return {str(key): int(value) for key, value in payload.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--page-map", type=Path)
    args = parser.parse_args()

    archive, xml = read_document_xml(args.input.resolve())
    try:
        updated_xml = patch_layout(xml) if args.page_map is None else update_toc_page_numbers(xml, load_page_map(args.page_map.resolve()))
        args.output.parent.mkdir(parents=True, exist_ok=True)
        write_document(args.output.resolve(), archive, updated_xml)
    finally:
        archive.close()


if __name__ == "__main__":
    main()
