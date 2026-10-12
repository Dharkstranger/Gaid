/* Where the live link between a phone and a TV runs: Supabase Realtime, in
   the project GAID shares with Galleris. The key is the publishable one, on
   purpose: a broadcast channel carries nothing that is not already on the
   gallery's public page, and nothing on it is stored. */
export const SUPABASE_URL = 'https://gudymczklujytsozwrsy.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_6fEAZc7ycde2oThx-dd59A_jfi6NAUe';

/* The gallery a page opens on. GAID's demo is twenty-four real paintings from
   the National Gallery of Art's open-access programme; the drawn "sample" it
   began with is retired for visitors, and old links to it land here. */
export const DEMO = 'openaccess';
export function galleryOf(params) {
  const asked = (params.get('gallery') || DEMO).toLowerCase();
  return asked === 'sample' ? DEMO : asked;
}
