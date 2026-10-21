import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import { applyTheme, preferredTheme } from './lib/theme';
// Bento's tokens load first, light then dark, so the aliases in styles.css
// resolve every --px-* token against them.
import '@adyen/bento-design-tokens/dist/css/bento/variables.css';
import '@adyen/bento-design-tokens/dist/css/bento/variables-dark.css';
import '@adyen/bento-vue3/fonts.css';
import './styles.css';

// Applied before mount so the first paint already uses the right tokens.
applyTheme(preferredTheme());

const app = createApp(App);

// Bento components translate their own built-in strings through vue-i18n, so
// an instance has to be installed before any of them mount.
app.use(createI18n({ legacy: false, locale: 'en-US', fallbackLocale: 'en-US' }));

app.mount('#app');
