from __future__ import annotations

import argparse
import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.text.paragraph import Paragraph
from pygments import lex
from pygments.lexers import TypeScriptLexer
from pygments.token import Comment, Keyword, Literal, Name, Number, Operator, Punctuation, String, Token


SNIPPETS = (
    {
        "anchor": "•  Đăng ký: gateway gọi workflow.RegisterCandidate/RegisterEmployer; saga thực thi ba bước và bù trừ khi lỗi; refresh token lưu trong cookie HttpOnly.",
        "intro": "Đoạn mã dưới đây minh họa phần workflow-service khởi tạo bản ghi saga và điều phối tuần tự ba bước đăng ký.",
        "caption": "Đoạn mã 3.1. Trích đoạn điều phối saga đăng ký trong workflow-service.",
        "code": """const saga = await this.registrationSagaRepository.createSaga({
  email: input.email,
  flow: input.flow,
  id: this.idGenerator.generate(),
  profilePayload: input.profilePayload,
  requestId: input.requestId,
  role: input.role
});

await this.startStep(saga.id, REGISTRATION_SAGA_STEP_NAMES.registerIdentity);
identity = await this.iamGrpcClient.registerIdentity(
  input.registerIdentityRequest,
  input.requestId
);

await this.completeStep(...);
await this.runCreateProfileStep({...});
return this.runActivateIdentityStep({...});""",
    },
    {
        "anchor": "•  Thông báo & email: communication-service tiêu thụ sự kiện để tạo notification (idempotent theo sourceEventId) và gửi email; có retry và DLQ.",
        "intro": "Ở nhánh lỗi activate, hệ thống đọc lại trạng thái identity trước khi rollback để xử lý đúng trường hợp ACK bị mất nhưng downstream đã hoàn tất.",
        "caption": "Đoạn mã 3.2. Read-based recovery trước khi kích hoạt compensation.",
        "code": """try {
  const activation = await this.iamGrpcClient.activateIdentity(
    { identity_id: input.identityId },
    input.requestId
  );
  return this.completeSagaFromActivation(...);
} catch (error) {
  currentIdentity = await this.readCurrentIdentityOrNull(
    input.identityId,
    input.requestId
  );

  if (currentIdentity?.status === 'active') {
    return this.completeSagaFromCurrentIdentity(...);
  }

  await this.failSaga(...);
  await this.resumeCompensation({...});
  throw error;
}""",
    },
    {
        "anchor": "•  Logging có cấu trúc dạng JSON; có công cụ thao tác DLQ (broker-ops) để replay sự kiện lỗi.",
        "intro": "Bên cạnh xử lý trong request sống, workflow-service còn có worker nền claim các saga stale theo lô để resume hoặc compensate tự động.",
        "caption": "Đoạn mã 3.3. Recovery worker quét và claim saga bị kẹt theo chu kỳ.",
        "code": """async onModuleInit(): Promise<void> {
  if (!this.runtimeConfig.registrationSagaRecoveryEnabled) {
    this.logger.log('Registration saga recovery processor is disabled');
    return;
  }

  await this.runRecoveryCycle();
  this.timer = setInterval(() => {
    void this.runRecoveryCycle();
  }, this.runtimeConfig.registrationSagaRecoveryPollIntervalMs);
}""",
    },
)

TOC_LABELS = (
    "TÓM TẮT",
    "Chương I. TỔNG QUAN.",
    "Chương II. THIẾT KẾ HỆ THỐNG.",
    "Chương III. TRIỂN KHAI HỆ THỐNG.",
    "Chương IV. KẾT LUẬN.",
    "NGUỒN THAM KHẢO",
)

CODE_BACKGROUND = "F6F8FA"
CODE_BORDER = "D0D7DE"
DEFAULT_CODE_COLOR = RGBColor(31, 35, 40)
COMMENT_COLOR = RGBColor(101, 109, 118)
KEYWORD_COLOR = RGBColor(9, 105, 218)
STRING_COLOR = RGBColor(15, 123, 108)
NUMBER_COLOR = RGBColor(188, 76, 0)
TYPE_COLOR = RGBColor(130, 80, 223)
OPERATOR_COLOR = RGBColor(191, 70, 8)


def set_run_font(
    run,
    *,
    name: str = "Times New Roman",
    size_pt: float | None = None,
    bold: bool | None = None,
    italic: bool | None = None,
    color: RGBColor | None = None,
) -> None:
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


def insert_paragraph_after(paragraph: Paragraph, *, style_name: str | None = None) -> Paragraph:
    new_paragraph = OxmlElement("w:p")
    paragraph._p.addnext(new_paragraph)
    created = Paragraph(new_paragraph, paragraph._parent)
    if style_name is not None:
        created.style = style_name
    return created


def find_paragraph_by_text(document: Document, text: str) -> Paragraph:
    for paragraph in document.paragraphs:
        if paragraph.text.strip() == text:
            return paragraph
    raise ValueError(f"Could not find paragraph: {text}")


def set_paragraph_shading(paragraph: Paragraph, fill: str) -> None:
    properties = paragraph._element.get_or_add_pPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)
    shading.set(qn("w:val"), "clear")
    shading.set(qn("w:color"), "auto")


def set_paragraph_borders(paragraph: Paragraph, *, color: str, size: int = 4, space: int = 1) -> None:
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
        border.set(qn("w:sz"), str(size))
        border.set(qn("w:space"), str(space))
        border.set(qn("w:color"), color)


def style_intro_paragraph(paragraph: Paragraph) -> None:
    paragraph.style = "Normal"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph.paragraph_format.left_indent = None
    paragraph.paragraph_format.right_indent = None
    paragraph.paragraph_format.first_line_indent = Inches(0.39)
    paragraph.paragraph_format.space_before = Pt(3)
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.15
    for run in paragraph.runs:
        set_run_font(run, size_pt=14)


def style_caption_paragraph(paragraph: Paragraph) -> None:
    paragraph.style = "Caption"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.left_indent = Inches(0.2)
    paragraph.paragraph_format.first_line_indent = None
    paragraph.paragraph_format.space_before = Pt(2)
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.0
    for run in paragraph.runs:
        set_run_font(run, size_pt=10, bold=True)


def style_code_paragraph(paragraph: Paragraph) -> None:
    paragraph.style = "Normal"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.left_indent = Inches(0.22)
    paragraph.paragraph_format.right_indent = Inches(0.22)
    paragraph.paragraph_format.first_line_indent = None
    paragraph.paragraph_format.space_before = Pt(2)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.line_spacing = 1.0
    paragraph.paragraph_format.keep_together = True
    set_paragraph_shading(paragraph, CODE_BACKGROUND)
    set_paragraph_borders(paragraph, color=CODE_BORDER)


def token_color(token_type) -> RGBColor:
    if token_type in Comment:
        return COMMENT_COLOR
    if token_type in Keyword:
        return KEYWORD_COLOR
    if token_type in String or token_type in Literal.String:
        return STRING_COLOR
    if token_type in Number or token_type in Literal.Number:
        return NUMBER_COLOR
    if token_type in Operator or token_type in Punctuation:
        return OPERATOR_COLOR
    if token_type in Name.Class or token_type in Name.Namespace or token_type in Name.Decorator or token_type in Name.Builtin:
        return TYPE_COLOR
    return DEFAULT_CODE_COLOR


def append_code(paragraph: Paragraph, code: str) -> None:
    lexer = TypeScriptLexer()
    lines = code.splitlines()

    for index, raw_line in enumerate(lines):
        line = raw_line.expandtabs(2)
        stripped = line.lstrip(" ")
        leading_spaces = len(line) - len(stripped)

        if leading_spaces:
            indent_run = paragraph.add_run("\u00A0" * leading_spaces)
            set_run_font(indent_run, name="Consolas", size_pt=9.2, color=DEFAULT_CODE_COLOR)

        for token_type, token_value in lex(stripped, lexer):
            if not token_value:
                continue
            run = paragraph.add_run(token_value)
            set_run_font(
                run,
                name="Consolas",
                size_pt=9.2,
                italic=token_type in Comment,
                color=token_color(token_type),
            )

        if index != len(lines) - 1:
            paragraph.add_run().add_break()


def insert_snippet(document: Document, snippet: dict[str, str]) -> None:
    if any(paragraph.text.strip() == snippet["caption"] for paragraph in document.paragraphs):
        return

    anchor = find_paragraph_by_text(document, snippet["anchor"])

    intro = insert_paragraph_after(anchor, style_name="Normal")
    intro.add_run(snippet["intro"])
    style_intro_paragraph(intro)

    code_paragraph = insert_paragraph_after(intro, style_name="Normal")
    append_code(code_paragraph, snippet["code"])
    style_code_paragraph(code_paragraph)

    caption = insert_paragraph_after(code_paragraph, style_name="Caption")
    caption.add_run(snippet["caption"])
    style_caption_paragraph(caption)


def apply_snippets(document: Document) -> None:
    for snippet in SNIPPETS:
        insert_snippet(document, snippet)


def load_page_map(page_map_path: Path) -> dict[str, int]:
    payload = json.loads(page_map_path.read_text(encoding="utf-8-sig"))
    return {str(key): int(value) for key, value in payload.items()}


def update_manual_toc(document: Document, page_map: dict[str, int]) -> None:
    toc_paragraphs = [
        paragraph
        for paragraph in document.paragraphs
        if paragraph.style.name.lower().startswith("toc")
    ]

    if len(toc_paragraphs) < len(TOC_LABELS):
        raise ValueError("Manual TOC paragraphs were not found in the expected quantity.")

    for paragraph, label in zip(toc_paragraphs[: len(TOC_LABELS)], TOC_LABELS, strict=True):
        page_number = page_map.get(label)
        if page_number is None:
            raise ValueError(f"Missing page number for TOC entry: {label}")

        paragraph.text = f"{label}\t{page_number}"
        for run in paragraph.runs:
            set_run_font(run, size_pt=14)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--page-map", type=Path)
    args = parser.parse_args()

    document = Document(str(args.input.resolve()))

    if args.page_map is None:
        apply_snippets(document)
    else:
        update_manual_toc(document, load_page_map(args.page_map.resolve()))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(args.output.resolve()))


if __name__ == "__main__":
    main()
