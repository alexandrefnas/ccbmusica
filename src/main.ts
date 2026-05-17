import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.remove(); // remove do DOM
    }
  })
  .catch((err) => console.error(err));
