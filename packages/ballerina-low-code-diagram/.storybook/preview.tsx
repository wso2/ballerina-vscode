import React from 'react';
// import { IntlProvider } from 'react-intl';

// import messages from '../src/lang/en.json';


export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const decorators = [
  (Story: any) => (
    // <IntlProvider locale='en' defaultLocale='en' messages={messages}>
      <Story />
    // </IntlProvider>
  )
];
