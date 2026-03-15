import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Get in touch with theory.golf.',
};

export default function ContactPage() {
  return (
    <div className="page-hero" style={{ alignItems: 'flex-start', paddingTop: '80px' }}>
      <div className="page-hero-inner" style={{ maxWidth: '680px' }}>
        <p className="eyebrow" style={{ marginBottom: '20px' }}>
          Get in touch
        </p>

        <h1 className="display-heading">
          <span style={{ color: 'var(--color-accent)' }}>Contact</span>
        </h1>

        <p className="display-sub">
          Interested in bringing theory.golf to your program? Reach out — we'd
          love to walk you through what the platform can do for your team.
        </p>

        <div style={{ marginTop: '48px' }}>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
