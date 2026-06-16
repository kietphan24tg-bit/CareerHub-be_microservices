import type {
  RecruitmentMailInterviewPayload,
  RecruitmentMailOfferBenefitPayload,
  RecruitmentMailOfferPayload
} from '@careerhub/contracts';

export type RenderedRecruitmentMail = {
  html: string;
  subject: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatLabel(value: string) {
  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null) {
  return value?.trim() || 'Not specified';
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not specified';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not specified';
  }

  return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function formatCompensation(
  salary: string | null,
  currency: string | null,
  period: string | null
) {
  if (!salary) {
    return 'Not specified';
  }

  const parts = [salary, currency ?? null, period ? formatLabel(period) : null].filter(
    (part): part is string => !!part
  );

  return parts.join(' / ');
}

function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
  timezone: string | null
) {
  if (!startTime) {
    return 'Not specified';
  }

  const range = endTime ? `${startTime} - ${endTime}` : startTime;
  return timezone ? `${range} (${timezone})` : range;
}

function formatProbation(type: string | null, custom: string | null) {
  if (type === 'custom') {
    return custom?.trim() || 'Custom';
  }

  if (!type) {
    return 'Not specified';
  }

  return formatLabel(type);
}

function formatMessageParagraphs(message: string | null) {
  const trimmed = message?.trim();
  if (!trimmed) {
    return [
      'Chung toi rat vui duoc moi ban tham gia va mong som nhan phan hoi cua ban tren CareerHub.'
    ];
  }

  return trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formatBulletLines(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-\u2022]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

function buildBenefitLines(benefits: RecruitmentMailOfferBenefitPayload[]) {
  return benefits
    .map((benefit) => {
      if (benefit.type === 'annual_leave' && benefit.annualLeaveDays) {
        return `${benefit.annualLeaveDays} ngay phep co luong`;
      }

      const label = benefit.name?.trim() || formatLabel(benefit.type);
      const monetaryParts = benefit.hasMonetaryValue
        ? [
            benefit.amount ? benefit.amount : null,
            benefit.currency,
            benefit.frequency ? formatLabel(benefit.frequency) : null
          ].filter((part): part is string => !!part)
        : [];
      const description = benefit.description?.trim();

      return [label, monetaryParts.length ? monetaryParts.join(' / ') : null, description]
        .filter((part): part is string => !!part)
        .join(': ');
    })
    .filter((line) => line.length > 0);
}

function buildDetailRow(label: string, value: string, isLink = false) {
  const renderedValue = isLink
    ? `<a href="${escapeHtml(value)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(value)}</a>`
    : escapeHtml(value);

  return `<tr>
      <td style="padding:14px 16px;width:210px;font-size:14px;font-weight:700;color:#334155;border-right:1px solid #dbe4ee;border-bottom:1px solid #dbe4ee;vertical-align:top;background-color:#f8fafc;">${escapeHtml(label)}</td>
      <td style="padding:14px 16px;font-size:14px;color:#0f172a;border-bottom:1px solid #dbe4ee;vertical-align:top;">${renderedValue}</td>
    </tr>`;
}

function buildBulletList(lines: string[]) {
  const items = lines
    .map(
      (line) =>
        `<tr>
            <td style="padding:0 10px 8px 0;font-size:16px;line-height:1.6;color:#166534;vertical-align:top;">&bull;</td>
            <td style="padding:0 0 8px;font-size:14px;line-height:1.6;color:#334155;vertical-align:top;">${escapeHtml(line)}</td>
          </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table>`;
}

function buildInterviewHtml(params: {
  companyName: string;
  dateLabel: string;
  interviewUrl: string;
  jobTitle: string;
  meetingLink: string | null;
  platformLabel: string;
  preview: string;
  timeLabel: string;
  typeLabel: string;
}) {
  const detailsRows = [
    buildDetailRow('Job', params.jobTitle),
    buildDetailRow('Company', params.companyName),
    buildDetailRow('Type', params.typeLabel),
    buildDetailRow('Date', params.dateLabel),
    buildDetailRow('Time', params.timeLabel),
    buildDetailRow('Platform', params.platformLabel),
    params.meetingLink ? buildDetailRow('Meeting link', params.meetingLink, true) : ''
  ].join('');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
                <div style="font-size:24px;font-weight:700;letter-spacing:0.2px;">CareerHub</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <div style="font-size:28px;font-weight:700;line-height:1.2;margin-bottom:12px;">Interview Invitation</div>
                <div style="font-size:16px;line-height:1.6;color:#475569;margin-bottom:24px;">${escapeHtml(params.preview)}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background-color:#f8fafc;">
                  ${detailsRows}
                </table>
                <div style="padding-top:28px;padding-bottom:12px;">
                  <a href="${escapeHtml(params.interviewUrl)}" style="display:inline-block;background-color:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;">View Interview</a>
                </div>
                <div style="font-size:13px;line-height:1.6;color:#64748b;">
                  If you need support, please contact the employer through your CareerHub account.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildOfferHtml(params: {
  benefitLines: string[];
  bonusLines: string[];
  candidateName: string;
  companyName: string;
  compensationLabel: string;
  contractUrl: string | null;
  departmentLabel: string;
  expirationLabel: string;
  introductionLines: string[];
  locationLabel: string;
  offerUrl: string;
  probationLabel: string;
  roleLabel: string;
  startDateLabel: string;
  title: string;
  workArrangementLabel: string;
}) {
  const detailsRows = [
    buildDetailRow('Vi tri', params.roleLabel),
    buildDetailRow('Phong / bao cao', params.departmentLabel),
    buildDetailRow('Luong', params.compensationLabel),
    buildDetailRow('Hinh thuc', params.workArrangementLabel),
    buildDetailRow('Dia diem', params.locationLabel),
    buildDetailRow('Ngay bat dau', params.startDateLabel),
    buildDetailRow('Han offer', params.expirationLabel),
    buildDetailRow('Thu viec', params.probationLabel)
  ].join('');
  const introHtml = params.introductionLines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(line)}</p>`
    )
    .join('');
  const bonusHtml = params.bonusLines.length
    ? buildBulletList(params.bonusLines)
    : `<div style="font-size:14px;line-height:1.6;color:#64748b;">Chi tiet thuong va phu cap se duoc xem tren CareerHub.</div>`;
  const benefitHtml = params.benefitLines.length
    ? buildBulletList(params.benefitLines)
    : `<div style="font-size:14px;line-height:1.6;color:#64748b;">Xem day du quyen loi trong offer tren CareerHub.</div>`;
  const contractHtml = params.contractUrl
    ? `<div style="font-size:13px;line-height:1.6;color:#64748b;padding-top:12px;">Hop dong (PDF):
          <a href="${escapeHtml(params.contractUrl)}" style="color:#166534;text-decoration:none;">${escapeHtml(params.contractUrl)}</a>
        </div>`
    : '';

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#edf2f7;font-family:Arial,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#edf2f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;background-color:#ffffff;border:1px solid #dbe4ee;">
            <tr>
              <td style="padding:20px 28px;background-color:#0f3d63;color:#ffffff;">
                <div style="font-size:24px;font-weight:700;letter-spacing:0.2px;">CareerHub</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-top:1px solid #dbe4ee;border-bottom:1px solid #dbe4ee;">
                <div style="font-size:28px;font-weight:700;line-height:1.25;color:#0f172a;">Ban co mot offer tu ${escapeHtml(params.companyName)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #dbe4ee;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#0f172a;">Dear ${escapeHtml(params.candidateName)},</p>
                ${introHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #dbe4ee;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe4ee;background-color:#ffffff;">
                  ${detailsRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #dbe4ee;">
                <div style="font-size:18px;font-weight:700;line-height:1.4;color:#0f172a;margin-bottom:12px;">Thuong & phu cap (tom tat)</div>
                ${bonusHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #dbe4ee;">
                <div style="font-size:18px;font-weight:700;line-height:1.4;color:#0f172a;margin-bottom:12px;">Quyen loi noi bat</div>
                ${benefitHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #dbe4ee;">
                <div style="padding-bottom:8px;">
                  <a href="${escapeHtml(params.offerUrl)}" style="display:block;background-color:#166534;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:700;text-align:center;">Xem & phan hoi offer</a>
                </div>
                ${contractHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background-color:#f8fafc;font-size:13px;line-height:1.7;color:#64748b;">
                Vui long phan hoi truoc han. Khong tra loi truc tiep email nay; hay dung CareerHub de xem day du ${escapeHtml(params.title)} va gui phan hoi.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderInterviewMail(
  payload: RecruitmentMailInterviewPayload
): RenderedRecruitmentMail {
  const dateLabel = formatDate(payload.date);
  const timeLabel = formatTimeRange(payload.startTime, payload.endTime, payload.timezone);
  const typeLabel = formatLabel(payload.type);
  const platformLabel = payload.platform ?? 'Not specified';
  const text = [
    'CareerHub',
    '',
    'Interview Invitation',
    payload.preview,
    '',
    `Job: ${payload.jobTitle}`,
    `Company: ${payload.companyName}`,
    `Type: ${typeLabel}`,
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Platform: ${platformLabel}`,
    payload.meetingLink ? `Meeting link: ${payload.meetingLink}` : null,
    '',
    `View interview details: ${payload.appUrl}`
  ]
    .filter((line): line is string => !!line)
    .join('\n');

  return {
    html: buildInterviewHtml({
      companyName: payload.companyName,
      dateLabel,
      interviewUrl: payload.appUrl,
      jobTitle: payload.jobTitle,
      meetingLink: payload.meetingLink,
      platformLabel,
      preview: payload.preview,
      timeLabel,
      typeLabel
    }),
    subject: payload.subject,
    text
  };
}

export function renderOfferMail(
  payload: RecruitmentMailOfferPayload,
  candidateName = 'there'
): RenderedRecruitmentMail {
  const compensationLabel = formatCompensation(
    payload.salary,
    payload.currency,
    payload.salaryPeriod
  );
  const startDateLabel = formatDate(payload.startDate);
  const expirationLabel = formatDateTime(payload.expiresAt);
  const employmentTypeLabel = payload.employmentType
    ? formatLabel(payload.employmentType)
    : 'Not specified';
  const workModelLabel = payload.workModel ? formatLabel(payload.workModel) : 'Not specified';
  const locationLabel = payload.location ?? 'Not specified';
  const roleLabel = [payload.title, payload.seniorityLabel]
    .filter((part): part is string => !!part)
    .join(' - ');
  const departmentLabel = [payload.departmentTeam, payload.reportingTo]
    .filter((part): part is string => !!part)
    .join(' - ');
  const workArrangementLabel = [employmentTypeLabel, workModelLabel]
    .filter((part) => part !== 'Not specified')
    .join(' - ');
  const probationLabel = formatProbation(payload.probationType, payload.probationCustom);
  const introductionLines = formatMessageParagraphs(payload.message);
  const bonusLines = formatBulletLines(payload.bonusDetails);
  const benefitLines = buildBenefitLines(payload.benefits);
  const text = [
    'CareerHub',
    '',
    `You have an offer from ${payload.companyName}`,
    '',
    `Dear ${candidateName},`,
    ...introductionLines,
    '',
    `Role: ${roleLabel || payload.title}`,
    departmentLabel ? `Department / reporting: ${departmentLabel}` : null,
    `Compensation: ${compensationLabel}`,
    `Work arrangement: ${workArrangementLabel || 'Not specified'}`,
    `Location: ${locationLabel}`,
    `Start date: ${startDateLabel}`,
    `Offer expires: ${expirationLabel}`,
    probationLabel !== 'Not specified' ? `Probation: ${probationLabel}` : null,
    bonusLines.length ? '' : null,
    bonusLines.length ? 'Bonus & allowances:' : null,
    ...bonusLines.map((line) => `- ${line}`),
    benefitLines.length ? '' : null,
    benefitLines.length ? 'Highlights:' : null,
    ...benefitLines.map((line) => `- ${line}`),
    payload.contractDocumentUrl ? `Contract document: ${payload.contractDocumentUrl}` : null,
    '',
    `View and respond: ${payload.appUrl}`
  ]
    .filter((line): line is string => !!line)
    .join('\n');

  return {
    html: buildOfferHtml({
      benefitLines,
      bonusLines,
      candidateName,
      companyName: payload.companyName,
      compensationLabel,
      contractUrl: payload.contractDocumentUrl,
      departmentLabel: departmentLabel || 'Not specified',
      expirationLabel,
      introductionLines,
      locationLabel,
      offerUrl: payload.appUrl,
      probationLabel,
      roleLabel: roleLabel || payload.title,
      startDateLabel,
      title: payload.title,
      workArrangementLabel: workArrangementLabel || 'Not specified'
    }),
    subject: payload.subject,
    text
  };
}
