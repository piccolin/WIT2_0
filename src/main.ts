import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// -----------------------------------------------------------------
// Amplify v6 Config (in main.ts)
// -----------------------------------------------------------------
import { Amplify } from 'aws-amplify';
import amplifyconfig from './amplifyconfiguration.json'; // From Amplify CLI: npx ampx generate graphql-client-code

Amplify.configure(amplifyconfig); // Loads API endpoints, auth, credentials (e.g., API_KEY, Cognito)
