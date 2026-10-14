/* Vercel Web Analytics: page views, counted by Vercel without cookies.
   Nothing GAID knows about a visitor goes with it (docs/privacy.md). Works
   once Web Analytics is switched on for the project in Vercel. On a laptop
   it does nothing: its debug script lives on another host, which the page's
   policy refuses. */
import { inject } from './vendor/vercel-analytics.js';

if (!/^(localhost|127\.|\[::1\])/.test(location.hostname)) inject({ mode: 'production' });
