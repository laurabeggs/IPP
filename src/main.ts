import { createApp } from 'vue';
import App from './App.vue';
import { applyTheme, preferredTheme } from './lib/theme';
// Bento's tokens load first, light then dark, so the aliases in styles.css
// resolve every --px-* token against them.
import '@adyen/bento-design-tokens/dist/css/bento/variables.css';
import '@adyen/bento-design-tokens/dist/css/bento/variables-dark.css';
import './styles.css';

// Applied before mount so the first paint already uses the right tokens.
applyTheme(preferredTheme());

const app = createApp(App);

app.mount('#app');
