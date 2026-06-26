from __future__ import annotations

import argparse
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from pygments import lex
from pygments.lexers import TypeScriptLexer
from pygments.token import Comment, Keyword, Literal, Name, Number, Operator, Punctuation, String


SAGA_TEXT = "Saga đăng ký (workflow-service):"
OUTBOX_TEXT = "Outbox:"
ARCHITECTURE_TEXT = "Client (Web/Next.js)"

CODE_BACKGROUND = "F6F8FA"
CODE_BORDER = "D0D7DE"

DEFAULT_COLOR = RGBColor(36, 41, 47)
SAGA_TITLE = RGBColor(9, 105, 218)
SAGA_SERVICE = RGBColor(38, 127, 153)
STEP_LABEL = RGBColor(9, 105, 218)
SUCCESS_COLOR = RGBColor(17, 128, 76)
ERROR_COLOR = RGBColor(180, 35, 24)
ACTION_COLOR = DEFAULT_COLOR
ACCENT_COLOR = RGBColor(9, 105, 218)
WARNING_COLOR = DEFAULT_COLOR
OUTBOX_TITLE = RGBColor(9, 105, 218)
QUEUE_COLOR = RGBColor(17, 128, 76)
ENTITY_COLOR = RGBColor(38, 127, 153)
ARROW_COLOR = RGBColor(87, 96, 106)
COMMENT_COLOR = RGBColor(87, 96, 106)
STRING_COLOR = RGBColor(163, 21, 21)
NUMBER_COLOR = RGBColor(9, 134, 88)
FUNCTION_COLOR = RGBColor(121, 94, 38)


def set_run_font(
    run,
    *,
    name: str = "Consolas",
    size_pt: float = 10.7,
    bold: bool = False,
    italic: bool = False,
    color: RGBColor = DEFAULT_COLOR,
) -> None:
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color

    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    r_fonts.set(qn("w:ascii"), name)
    r_fonts.set(qn("w:hAnsi"), name)
    r_fonts.set(qn("w:eastAsia"), name)


def set_paragraph_shading(paragraph, fill: str) -> None:
    properties = paragraph._element.get_or_add_pPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)
    shading.set(qn("w:val"), "clear")
    shading.set(qn("w:color"), "auto")


def set_paragraph_borders(paragraph, color: str) -> None:
    properties = paragraph._element.get_or_add_pPr()
    borders = properties.find(qn("w:pBdr"))
    if borders is None:
        borders = OxmlElement("w:pBdr")
        properties.append(borders)

    for border_name in ("top", "left", "bottom", "right"):
        border = borders.find(qn(f"w:{border_name}"))
        if border is None:
            border = OxmlElement(f"w:{border_name}")
            borders.append(border)
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:space"), "1")
        border.set(qn("w:color"), color)


def clear_paragraph_content(paragraph) -> None:
    paragraph_element = paragraph._element
    for child in list(paragraph_element):
        if child.tag != qn("w:pPr"):
            paragraph_element.remove(child)


def add_segment(
    paragraph,
    text: str,
    *,
    color: RGBColor,
    bold: bool = False,
    italic: bool = False,
    size_pt: float = 10.7,
) -> None:
    if not text:
        return
    run = paragraph.add_run(text)
    set_run_font(run, color=color, bold=bold, italic=italic, size_pt=size_pt)


def add_line_break(paragraph, *, size_pt: float = 10.7) -> None:
    run = paragraph.add_run()
    set_run_font(run, size_pt=size_pt, color=DEFAULT_COLOR)
    run.add_break()


def add_indent(paragraph, count: int) -> None:
    add_segment(paragraph, "\u00A0" * count, color=DEFAULT_COLOR)


def style_code_block(paragraph, *, fill: str, border_color: str, line_spacing: float = 1.08) -> None:
    paragraph.style = "Normal"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.left_indent = Inches(0.22)
    paragraph.paragraph_format.right_indent = Inches(0.22)
    paragraph.paragraph_format.first_line_indent = None
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(8)
    paragraph.paragraph_format.line_spacing = line_spacing
    set_paragraph_shading(paragraph, fill)
    set_paragraph_borders(paragraph, border_color)


def token_color(token_type) -> RGBColor:
    if token_type in Comment:
        return COMMENT_COLOR
    if token_type in Keyword:
        return SAGA_TITLE
    if token_type in String or token_type in Literal.String:
        return STRING_COLOR
    if token_type in Number or token_type in Literal.Number:
        return NUMBER_COLOR
    if token_type in Name.Function:
        return FUNCTION_COLOR
    if token_type in Operator or token_type in Punctuation:
        return DEFAULT_COLOR
    if token_type in Name.Class or token_type in Name.Namespace or token_type in Name.Decorator or token_type in Name.Builtin:
        return ENTITY_COLOR
    return DEFAULT_COLOR


def render_typescript_paragraph(paragraph, *, fill: str, border_color: str) -> None:
    raw_text = paragraph.text.replace("\u00A0", " ")
    lines = [line for line in raw_text.splitlines() if line.strip()]
    clear_paragraph_content(paragraph)
    style_code_block(paragraph, fill=fill, border_color=border_color, line_spacing=1.0)
    lexer = TypeScriptLexer()

    for line_index, raw_line in enumerate(lines):
        line = raw_line.expandtabs(2)
        stripped = line.lstrip(" ")
        leading_spaces = len(line) - len(stripped)

        if leading_spaces:
            add_segment(paragraph, "\u00A0" * leading_spaces, color=DEFAULT_COLOR, size_pt=9.3)

        if stripped:
            for token_type, token_value in lex(stripped, lexer):
                token_value = token_value.replace("\r", "").replace("\n", "")
                if not token_value:
                    continue
                add_segment(
                    paragraph,
                    token_value,
                    color=token_color(token_type),
                    italic=token_type in Comment,
                    size_pt=9.3,
                )

        if line_index != len(lines) - 1:
            add_line_break(paragraph, size_pt=9.3)


def colorize_architecture_paragraph(paragraph) -> None:
    clear_paragraph_content(paragraph)
    style_code_block(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)
    line_builders = [
        lambda p: (
            add_indent(p, 8),
            add_segment(p, "Client ", color=SAGA_TITLE, bold=True),
            add_segment(p, "(Web/Next.js)", color=SAGA_SERVICE, bold=True),
        ),
        lambda p: (
            add_indent(p, 14),
            add_segment(p, "| ", color=DEFAULT_COLOR),
            add_segment(p, "HTTP + JWT", color=QUEUE_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 14),
            add_segment(p, "v", color=ARROW_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 8),
            add_segment(p, "+-------------+", color=COMMENT_COLOR),
            add_segment(p, "      ", color=DEFAULT_COLOR),
            add_segment(p, "gRPC", color=QUEUE_COLOR, bold=True),
            add_segment(p, "      ", color=DEFAULT_COLOR),
            add_segment(p, "+-------------------------------+", color=COMMENT_COLOR),
        ),
        lambda p: (
            add_indent(p, 8),
            add_segment(p, "|   ", color=DEFAULT_COLOR),
            add_segment(p, "GATEWAY", color=SAGA_TITLE, bold=True),
            add_segment(p, "   | ", color=DEFAULT_COLOR),
            add_segment(p, "------------->", color=ARROW_COLOR, bold=True),
            add_segment(p, " | ", color=DEFAULT_COLOR),
            add_segment(p, "iam · workflow · candidate", color=ENTITY_COLOR, bold=True),
            add_segment(p, "    |", color=DEFAULT_COLOR),
        ),
        lambda p: (
            add_indent(p, 8),
            add_segment(p, "| ", color=DEFAULT_COLOR),
            add_segment(p, "(REST only)", color=WARNING_COLOR, bold=True),
            add_segment(p, " |                | ", color=DEFAULT_COLOR),
            add_segment(p, "employer · job · application", color=ENTITY_COLOR, bold=True),
            add_segment(p, "  |", color=DEFAULT_COLOR),
        ),
        lambda p: (
            add_indent(p, 8),
            add_segment(p, "+-------------+                | ", color=COMMENT_COLOR),
            add_segment(p, "communication", color=OUTBOX_TITLE, bold=True),
            add_segment(p, "                 |", color=COMMENT_COLOR),
        ),
        lambda p: (
            add_indent(p, 39),
            add_segment(p, "+-------------------------------+", color=COMMENT_COLOR),
        ),
        lambda p: (
            add_indent(p, 46),
            add_segment(p, "| ", color=DEFAULT_COLOR),
            add_segment(p, "publish", color=SAGA_TITLE, bold=True),
            add_segment(p, " ", color=DEFAULT_COLOR),
            add_segment(p, "(Outbox)", color=STEP_LABEL, bold=True),
        ),
        lambda p: (
            add_indent(p, 46),
            add_segment(p, "v", color=ARROW_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 39),
            add_segment(p, "+----------------+", color=COMMENT_COLOR),
        ),
        lambda p: (
            add_indent(p, 39),
            add_segment(p, "|   ", color=DEFAULT_COLOR),
            add_segment(p, "RabbitMQ", color=ACTION_COLOR, bold=True),
            add_segment(p, "     |", color=DEFAULT_COLOR),
        ),
        lambda p: (
            add_indent(p, 39),
            add_segment(p, "+----------------+", color=COMMENT_COLOR),
        ),
        lambda p: (
            add_indent(p, 46),
            add_segment(p, "| ", color=DEFAULT_COLOR),
            add_segment(p, "consume", color=QUEUE_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 46),
            add_segment(p, "v", color=ARROW_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 28),
            add_segment(p, "communication ", color=OUTBOX_TITLE, bold=True),
            add_segment(p, "(notification + email),", color=QUEUE_COLOR, bold=True),
        ),
        lambda p: (
            add_indent(p, 28),
            add_segment(p, "job/application ", color=ENTITY_COLOR, bold=True),
            add_segment(p, "(cache + search index)", color=QUEUE_COLOR, bold=True),
        ),
    ]

    for line_index, builder in enumerate(line_builders):
        builder(paragraph)
        if line_index != len(line_builders) - 1:
            add_line_break(paragraph)


def colorize_saga_paragraph(paragraph) -> None:
    clear_paragraph_content(paragraph)
    style_code_block(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)

    add_segment(paragraph, "Saga đăng ký ", color=SAGA_TITLE, bold=True)
    add_segment(paragraph, "(workflow-service)", color=SAGA_SERVICE, bold=True)
    add_segment(paragraph, ":", color=SAGA_TITLE, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 2)
    add_segment(paragraph, "B1", color=STEP_LABEL, bold=True)
    add_segment(paragraph, ": ", color=DEFAULT_COLOR)
    add_segment(paragraph, "iam.RegisterIdentity", color=SAGA_SERVICE, bold=True)
    add_segment(paragraph, "     ", color=DEFAULT_COLOR)
    add_segment(paragraph, "(status = pending_profile)", color=SUCCESS_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 2)
    add_segment(paragraph, "B2", color=STEP_LABEL, bold=True)
    add_segment(paragraph, ": ", color=DEFAULT_COLOR)
    add_segment(paragraph, "candidate/employer.CreateProfile", color=SAGA_SERVICE, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 2)
    add_segment(paragraph, "B3", color=STEP_LABEL, bold=True)
    add_segment(paragraph, ": ", color=DEFAULT_COLOR)
    add_segment(paragraph, "iam.ActivateIdentity", color=SAGA_SERVICE, bold=True)
    add_segment(paragraph, "     ", color=DEFAULT_COLOR)
    add_segment(paragraph, "(status = active)", color=SUCCESS_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 0)
    add_segment(paragraph, "Nếu lỗi", color=ERROR_COLOR, bold=True)
    add_segment(paragraph, " -> ", color=ARROW_COLOR, bold=True)
    add_segment(paragraph, "compensation ngược", color=ERROR_COLOR, bold=True)
    add_segment(paragraph, ": ", color=DEFAULT_COLOR)
    add_segment(paragraph, "DeleteProfile", color=ACTION_COLOR, bold=True)
    add_segment(paragraph, ", ", color=DEFAULT_COLOR)
    add_segment(paragraph, "CancelPendingIdentity", color=ACTION_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 0)
    add_segment(paragraph, "Idempotency", color=ACCENT_COLOR, bold=True)
    add_segment(paragraph, " theo ", color=DEFAULT_COLOR)
    add_segment(paragraph, "requestId", color=WARNING_COLOR, bold=True)
    add_segment(paragraph, "; ", color=DEFAULT_COLOR)
    add_segment(paragraph, "recovery poller", color=SAGA_TITLE, bold=True)
    add_segment(paragraph, " xử lý ", color=DEFAULT_COLOR)
    add_segment(paragraph, "saga 'kẹt'", color=ERROR_COLOR, bold=True)
    add_segment(paragraph, ".", color=DEFAULT_COLOR)


def colorize_outbox_paragraph(paragraph) -> None:
    clear_paragraph_content(paragraph)
    style_code_block(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)

    add_segment(paragraph, "Outbox", color=OUTBOX_TITLE, bold=True)
    add_segment(paragraph, ":", color=OUTBOX_TITLE, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 2)
    add_segment(paragraph, "[Giao dịch]", color=WARNING_COLOR, bold=True)
    add_segment(paragraph, "  thay đổi ", color=DEFAULT_COLOR)
    add_segment(paragraph, "aggregate", color=ENTITY_COLOR, bold=True)
    add_segment(paragraph, "  +  ghi bản ghi ", color=DEFAULT_COLOR)
    add_segment(paragraph, "outbox", color=OUTBOX_TITLE, bold=True)
    add_segment(paragraph, "  ", color=DEFAULT_COLOR)
    add_segment(paragraph, "(pending)", color=QUEUE_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 2)
    add_segment(paragraph, "[Worker]", color=QUEUE_COLOR, bold=True)
    add_segment(paragraph, "       ", color=DEFAULT_COLOR)
    add_segment(paragraph, "poll pending", color=SAGA_TITLE, bold=True)
    add_segment(paragraph, "  ->  ", color=ARROW_COLOR, bold=True)
    add_segment(paragraph, "publish ", color=DEFAULT_COLOR)
    add_segment(paragraph, "RabbitMQ", color=ACTION_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 17)
    add_segment(paragraph, "->  ", color=ARROW_COLOR, bold=True)
    add_segment(paragraph, "đánh dấu ", color=DEFAULT_COLOR)
    add_segment(paragraph, "processed", color=QUEUE_COLOR, bold=True)
    add_line_break(paragraph)

    add_indent(paragraph, 17)
    add_segment(paragraph, "lỗi", color=ERROR_COLOR, bold=True)
    add_segment(paragraph, "  ->  ", color=ARROW_COLOR, bold=True)
    add_segment(paragraph, "tăng retry", color=SAGA_TITLE, bold=True)
    add_segment(paragraph, ", tới ngưỡng  ", color=DEFAULT_COLOR)
    add_segment(paragraph, "->  ", color=ARROW_COLOR, bold=True)
    add_segment(paragraph, "DLQ", color=ERROR_COLOR, bold=True)


def colorize_document(input_path: Path, output_path: Path) -> None:
    document = Document(str(input_path))

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if text.startswith(ARCHITECTURE_TEXT):
            colorize_architecture_paragraph(paragraph)
        elif text.startswith(SAGA_TEXT):
            colorize_saga_paragraph(paragraph)
        elif text.startswith(OUTBOX_TEXT):
            colorize_outbox_paragraph(paragraph)
        elif text.startswith("const saga ="):
            render_typescript_paragraph(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)
        elif text.startswith("try {"):
            render_typescript_paragraph(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)
        elif text.startswith("async onModuleInit(): Promise<void> {"):
            render_typescript_paragraph(paragraph, fill=CODE_BACKGROUND, border_color=CODE_BORDER)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    colorize_document(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
