/**
 * A message to the gallery about a work, ready to send — never sent.
 * The person sends it themselves, from their own WhatsApp or email, so GAID
 * holds no address and no message. WhatsApp first: it is how Lagos talks.
 * With no contact on the gallery's file there is nothing to offer, and GAID
 * says so rather than inventing one.
 */
const GALLERIS = (process.env.GALLERIS_ORIGIN || 'https://www.gallerismuseum.com').split(',')[0].trim();

export function enquiryFor(gallery, work, name = '') {
  const who = String(name).trim().slice(0, 80);
  const link = `${GALLERIS}/app/?demo=${encodeURIComponent(gallery.slug)}&at=${encodeURIComponent(work.id)}`;
  const text = [
    `Hello ${gallery.name}.`,
    `I would like to know more about ${work.title}${work.artist ? ` by ${work.artist}` : ''}${work.year ? ` (${work.year})` : ''}.`,
    who ? `— ${who}` : '',
    link,
  ].filter(Boolean).join('\n');
  const digits = String(gallery.contact?.whatsapp ?? '').replace(/\D/g, '');
  if (digits.length >= 8) {
    return { channel: 'whatsapp', href: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`, text };
  }
  const email = String(gallery.contact?.email ?? '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { channel: 'email', href: `mailto:${email}?subject=${encodeURIComponent(work.title)}&body=${encodeURIComponent(text)}`, text };
  }
  return { channel: null, href: '', text };
}
