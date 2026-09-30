# Screenshots

Drop step screenshots here using the flow id and step id as the folder and file
name: `screens/<flow id>/<step id>.png`

Example: `screens/basic-card-payment/see-amount.png`

The explorer picks them up automatically; no code changes needed.

More specific versions win over less specific ones, in this order:

1. Device, language, and currency specific:
   `screens/basic-card-payment/see-amount--e285--en-US--EUR.png`
2. Language and currency specific:
   `screens/basic-card-payment/see-amount--en-US--EUR.png`
3. Device specific:
   `screens/basic-card-payment/see-amount--e285.png`
4. Any device and locale: `screens/basic-card-payment/see-amount.png`

Device ids: `e285`, `s1f2`, `ams1`, `tap-to-pay`.

Languages: `en-US`, `nl-NL`, `fr-FR`, `de-DE`. Currencies: `EUR`, `USD`, `GBP`.

Until a screenshot exists, the placeholder shows the amount formatted with the
selected language and currency.
