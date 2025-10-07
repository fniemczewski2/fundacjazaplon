// src/components/ContactForm.tsx
import { useEffect, useState } from "react";
import Card from "./Card";

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

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-text-black/70">Imię i nazwisko</span>
            <input
              className="border-none py-2 px-4 rounded-xl shadow-inner focus:outline-none w-full"
              name="name"
              placeholder="Jan Kowalski"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-text-black/70">Email</span>
            <input
              type="email"
              className="border-none py-2 px-4 rounded-xl shadow-inner focus:outline-none w-full"
              name="email"
              placeholder="jan.kowalski@example.com"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-text-black/70">Wiadomość</span>
          <textarea
            className="border-none py-2 px-4 rounded-xl shadow-inner w-full focus:outline-none "
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
        </button>
      </form>
    </Card>
  );
}
