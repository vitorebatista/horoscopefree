# Disclaimer & third-party content

This software fetches publicly available daily horoscope text from independently operated third-party websites. It is provided **AS IS** under the MIT License (see [`LICENSE`](./LICENSE)) — this disclaimer extends, but does not replace, the warranty and liability terms of that license.

## No affiliation

This project is not affiliated with, endorsed by, sponsored by, or in any way officially connected to horoscope.com, joaobidu.com.br, 20minutos.es, or any of their parent companies, owners, or operators. All trademarks, service marks, and copyrights in the horoscope content fetched by this library are the property of their respective owners.

## Third-party content ownership

All horoscope text returned by `getHoroscope()` and the HTTP API is the intellectual property of the originating publisher. This library does not claim any right in that content; it merely retrieves and caches it. Every `HoroscopeResult` exposes a `source` field containing the full upstream URL precisely so consumers can preserve attribution.

## If you build on this library, you should

1. **Display the source URL alongside any horoscope text you show to end users.** The `source` field is provided for this purpose. Visible attribution is the minimum bar for responsible reuse of third-party content.
2. **Read and comply with each upstream site's Terms of Service** before deploying. Terms may restrict automated access, redistribution, commercial use, or specific use cases entirely. ToS terms can change at any time — re-check periodically.
3. **Contact the publishers directly if your use case is commercial, high-volume, or reaches a wide audience.** A direct license, API agreement, or written permission from each publisher is the only way to operate without legal risk in those scenarios. The respectful path is to ask first.
4. **Honor `robots.txt`, rate limits, and the throttle defaults built into this library.** The default 1000 ms inter-request throttle is intentional. Tightening it or bypassing it can constitute abuse, breach ToS, and may run afoul of computer-misuse statutes (e.g. CFAA in the United States, the UK Computer Misuse Act, or analogous laws elsewhere).

## Your responsibility, not ours

You — the consumer of this library — are solely responsible for how you use it, including but not limited to: terms-of-service compliance, copyright clearance, source attribution, end-user disclosure, rate limiting, and adherence to all applicable laws (copyright, contract, computer misuse, consumer protection, and data protection) in every jurisdiction in which you operate or in which your users are located. The author and contributors of this repository accept no responsibility or liability for any third-party usage, redistribution, scraping decisions, or downstream consequences.

## Not legal advice

This document is descriptive guidance for users of this library; it is not legal advice. If you intend to deploy this software in a production, commercial, or wide-reach context, consult a qualified lawyer in your jurisdiction before depending on these words for protection.
