// src/components/ContactForm.tsx
import { useEffect, useState } from "react";
import Card from "./Card";
import { FaPaperPlane } from "react-icons/fa6";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") setSent(true);
  }, []);

  return (
    <Card>
      <h2 className="text-2xl font-semibold mb-4">Napisz do nas</h2>

      {sent && (
        <div className="mb-3 text-brand text-sm">
          Dziękujemy! Twoja wiadomość została wysłana.
        </div>
      )}

      <form
        action="https://formsubmit.co/biuro@zaplon.org.pl"
        method="POST"
        className="space-y-4"
      >
        <input type="hidden" name="_captcha" value="false" />
        <input
          type="hidden"
          name="_next"
          value={`${window.location.origin}/kontakt?sent=1`}
        />
        <input type="hidden" name="_subject" value="Nowa wiadomość z formularza kontaktowego" />

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="text-sm text-text-black/70">Imię i nazwisko</span>
            <input
              className="input-text"
              name="name"
              placeholder="Jan Kowalski"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-text-black/70">Email</span>
            <input
              type="email"
              className="input-text"
              name="email"
              placeholder="jan.kowalski@example.com"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-text-black/70">Wiadomość</span>
          <textarea
            className="input-textarea"
            rows={6}
            name="message"
            placeholder="W czym możemy pomóc?"
            required
          />
        </label>

        <button
          type="submit"
          className="btn btn-primary"
        >
          Wyślij wiadomość
          <FaPaperPlane className="ml-1" />
        </button>
      </form>
    </Card>
  );
}
