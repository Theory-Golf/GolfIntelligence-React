'use client';

import { useState } from 'react';

const FORMSPREE_ID = 'xzdjaqpb';

export default function ContactForm() {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');

    const data = new FormData(e.target);

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="contact-success">
        <p className="contact-success-label">Message sent</p>
        <p className="contact-success-body">
          Thanks for reaching out. We'll be in touch shortly.
        </p>
        <button
          className="contact-submit"
          onClick={() => setStatus('idle')}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-row">
        <div className="contact-field">
          <label className="contact-label" htmlFor="name">Name</label>
          <input
            className="contact-input"
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            required
            disabled={status === 'submitting'}
          />
        </div>
        <div className="contact-field">
          <label className="contact-label" htmlFor="email">Email</label>
          <input
            className="contact-input"
            id="email"
            name="email"
            type="email"
            placeholder="you@school.edu"
            required
            disabled={status === 'submitting'}
          />
        </div>
      </div>

      <div className="contact-field">
        <label className="contact-label" htmlFor="program">Program / School</label>
        <input
          className="contact-input"
          id="program"
          name="program"
          type="text"
          placeholder="e.g. Stanford Men's Golf"
          disabled={status === 'submitting'}
        />
      </div>

      <div className="contact-field">
        <label className="contact-label" htmlFor="message">Message</label>
        <textarea
          className="contact-input contact-textarea"
          id="message"
          name="message"
          placeholder="Tell us about your program and what you're looking for."
          rows={5}
          required
          disabled={status === 'submitting'}
        />
      </div>

      {status === 'error' && (
        <p className="contact-error">
          Something went wrong — please try again or email us directly.
        </p>
      )}

      <button
        className="contact-submit"
        type="submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
