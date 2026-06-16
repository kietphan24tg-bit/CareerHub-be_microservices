import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderInterviewMail,
  renderOfferMail
} from './recruitment-mail-template.renderer';

test('renderInterviewMail matches monolith invitation subject and CTA', () => {
  const rendered = renderInterviewMail({
    appUrl: 'http://localhost:4000/candidate/interviews/interview-1',
    companyName: 'Acme Corp',
    date: '2026-06-20',
    endTime: '11:00',
    interviewId: 'interview-1',
    jobTitle: 'Software Engineer',
    meetingLink: 'https://meet.example.com',
    platform: 'Google Meet',
    preview: 'A new interview invitation is available in your CareerHub account.',
    recipientIdentityId: 'candidate-1',
    sourceEventId: 'mail-1',
    startTime: '10:00',
    subject: 'CareerHub interview invitation',
    timezone: 'Asia/Ho_Chi_Minh',
    type: 'online'
  });

  assert.equal(rendered.subject, 'CareerHub interview invitation');
  assert.match(rendered.text, /Interview Invitation/);
  assert.match(rendered.text, /Software Engineer/);
  assert.match(rendered.text, /View interview details: http:\/\/localhost:4000\/candidate\/interviews\/interview-1/);
  assert.match(rendered.html, /View Interview/);
});

test('renderOfferMail matches monolith offer subject and CTA', () => {
  const rendered = renderOfferMail(
    {
      appUrl: 'http://localhost:4000/candidate/offers/offer-1',
      benefits: [],
      bonusDetails: null,
      companyName: 'Acme Corp',
      contractDocumentUrl: null,
      currency: 'USD',
      departmentTeam: 'Engineering',
      employmentType: 'full_time',
      expiresAt: '2026-07-01T00:00:00.000Z',
      location: 'Ho Chi Minh City',
      message: null,
      offerId: 'offer-1',
      preview: 'A new job offer is available in your CareerHub account.',
      probationCustom: null,
      probationType: 'two_months',
      recipientIdentityId: 'candidate-1',
      reportingTo: null,
      salary: '3000',
      salaryPeriod: 'monthly',
      seniorityLabel: 'Senior',
      sourceEventId: 'mail-2',
      startDate: '2026-08-01',
      subject: 'CareerHub job offer received',
      title: 'Software Engineer',
      workModel: 'hybrid'
    },
    'Alex'
  );

  assert.equal(rendered.subject, 'CareerHub job offer received');
  assert.match(rendered.text, /Dear Alex,/);
  assert.match(rendered.text, /View and respond: http:\/\/localhost:4000\/candidate\/offers\/offer-1/);
  assert.match(rendered.html, /Xem & phan hoi offer/);
});
