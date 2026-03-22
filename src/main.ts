import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';

const loadScriptOnce = (id: string, src: string) => {
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  document.head.appendChild(script);
};

loadScriptOnce('tailwind-cdn', 'https://cdn.tailwindcss.com');
loadScriptOnce('google-gsi-client', 'https://accounts.google.com/gsi/client');

bootstrapApplication(AppComponent);
