import { escapeHtml as esc } from '../graph.js';
import { fmtDate } from './documents.js';

// Treści wiadomości do użytkowników to wzór roboczy - do akceptacji przez fundację przed użyciem.

const shell = (body: string) => `${body}\n<p>Fundacja „Zapłon”</p>`;

export function invitationMail(link: string, expiresAt: Date, needsKrk: boolean, minorName?: string) {
  return {
    subject: 'Dokumenty do podpisania - Fundacja „Zapłon”',
    html: shell(
      [
        '<p>Dzień dobry,</p>',
        (minorName
          ? `<p>Zgłoszenie ${esc(minorName)} do wolontariatu w Fundacji „Zapłon” zostało zaakceptowane. Jako rodzic lub opiekun prawny podpisujesz dokumenty w imieniu małoletniego. Otwórz poniższy link, zapoznaj się z dokumentami, wypełnij zgody i oświadczenia i podpisz je kodem jednorazowym.</p>`
          : '<p>Twoje zgłoszenie zostało zaakceptowane. Żeby dokończyć formalności, otwórz poniższy link, zapoznaj się z dokumentami, wypełnij zgody i oświadczenia' +
          (needsKrk ? ', dołącz zaświadczenie o niekaralności z Krajowego Rejestru Karnego' : '') +
          ' i podpisz dokumenty kodem jednorazowym.</p>'),
        `<p><a href="${esc(link)}">${esc(link)}</a></p>`,
        `<p>Link jest osobisty i ważny do ${esc(fmtDate(expiresAt.toISOString()))}. Nie przekazuj go innym osobom.</p>`,
      ].join('\n'),
    ),
  };
}

export function otpMail(code: string) {
  return {
    subject: 'Kod do podpisania dokumentów - Fundacja „Zapłon”',
    html: shell(
      [
        '<p>Dzień dobry,</p>',
        `<p>Twój kod do podpisania dokumentów: <strong style="font-size:18px;letter-spacing:2px">${esc(code)}</strong></p>`,
        '<p>Kod jest ważny 10 minut. Jeśli to nie Ty go zamawiałeś/aś, zignoruj tę wiadomość i nikomu nie podawaj kodu.</p>',
      ].join('\n'),
    ),
  };
}

export function completedMail(link: string, expiresAt: Date) {
  return {
    subject: 'Dokumenty podpisane - Fundacja „Zapłon”',
    html: shell(
      [
        '<p>Dzień dobry,</p>',
        '<p>Dokumenty zostały podpisane przez obie strony. Możesz je pobrać pod poniższym linkiem.</p>',
        `<p><a href="${esc(link)}">${esc(link)}</a></p>`,
        `<p>Link jest osobisty i ważny do ${esc(fmtDate(expiresAt.toISOString()))}.</p>`,
      ].join('\n'),
    ),
  };
}

export function rejectedMail(note: string | null) {
  return {
    subject: 'Twoje zgłoszenie - Fundacja „Zapłon”',
    html: shell(
      [
        '<p>Dzień dobry,</p>',
        '<p>Dziękujemy za zgłoszenie. Tym razem nie możemy rozpocząć współpracy.</p>',
        ...(note ? [`<p>${esc(note)}</p>`] : []),
      ].join('\n'),
    ),
  };
}
