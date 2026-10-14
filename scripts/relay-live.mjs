/* Does the phone-to-TV link work against the real Supabase Realtime?
   Two relays join one channel, as a phone and a TV would; one sends, the
   other must hear it. Runs on a GitHub runner (this container cannot reach
   *.supabase.co). Uses only the publishable key already in public/config.js. */
import { openRelay, topicFor, newCode } from '../public/relay.js';

const topic = topicFor('openaccess', newCode());
const heard = new Promise((ok) => {
  const tv = openRelay({ topic, onMessage: (m) => ok(m) });
  setTimeout(() => { tv.close(); ok(null); }, 20000);
});
await new Promise((r) => setTimeout(r, 3000));       // the TV joins first
const phone = openRelay({ topic, onMessage: () => {} });
setTimeout(() => phone.send({ type: 'at', workId: 'p1', slug: 'openaccess' }), 3000);
const got = await heard;
phone.close();
console.log(got ? `OK: the TV heard ${JSON.stringify(got)}` : 'FAILED: nothing arrived in 20 seconds');
process.exit(got ? 0 : 1);
