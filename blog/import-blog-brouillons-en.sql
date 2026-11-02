-- Import des 12 articles de blog traduits (English) en BROUILLON — préparé le 18/10/2026.
-- À coller dans Supabase > SQL Editor. Rien n'est publié : chaque article est créé
-- en statut « draft », avec couverture, images et catégorie, à relire puis publier
-- depuis /admin/blog. Relancer ce script est sans danger (ON CONFLICT DO NOTHING).
-- Les produits liés (linked_product_ids) reprennent ceux de la version française.
BEGIN;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$ai-smart-home-autumn-2026$q$, 'uk', $q$AI and the smart home: what autumn 2026 really changes$q$, $q$Smart home AI: what IFA 2026, Alexa+ and Matter 1.5 mean for your purchases, and the questions to ask yourself before you splash out.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. We have not tested the products mentioned: everything below is based on published sources, listed at the end of the article.*

On the box of a vacuum cleaner or a fridge, "AI" long looked like a simple marketing line. This autumn, the announcements are getting more concrete. Smart home AI now means a washing machine that looks at what you put in it, a camera that finds a specific moment in its recordings when you describe it in a single sentence, and a voice assistant that chains requests together without you repeating its name every time. What remains is to work out what is available in France, what is coming in 2027 and what really deserves your money.

## IFA 2026 in one idea: devices that observe and adapt

The Berlin show ran from 4 to 8 September 2026. In its round-up published on 13 September, Technomedia sums up the trend like this: we are moving from simply connected devices to "contextual" ones, able to observe a situation, cross-reference several pieces of information and adjust how they work by themselves.

### Appliances that look inside the drum and the fridge

A few examples cited by Technomedia. At Haier, the Vision 15 washing machine has a built-in camera that assesses the amount of laundry, its colours and the type of fabric, then adjusts the water, detergent and cycle length. The Horizon Hydro Hub and Maestro fridges recognise food and advise on how long and where to store it. At Hisense, the PureView fridge suggests recipes based on its contents and flags products close to their use-by date. For its part, Winkco reports that Samsung is showing fridges that recognise food and suggest recipes with Gemini, Google's AI.

Useful or gimmick? For a family that throws away leftovers every week, a fridge that reminds you what is about to expire makes sense. For a single person who rarely cooks, probably less so. No French price is announced in the sources consulted, and Technomedia points out that some equipment will not arrive until 2027.

### Cameras and sensors that process everything at home

This is the most interesting trend for a cautious buyer. Several players (Ugreen, EZVIZ, Qualcomm, Asus) are championing AI processing directly on the device, without constantly sending video, voice and habits to the cloud. EZVIZ pairs its new cameras with a base station, the AI CoreX, which analyses footage locally and finds clips from a natural-language request. At Reolink, according to Winkco, the OMVI range runs its AI (ReoNeura) on the camera itself, with no subscription. TP-Link is showing a sensor, the Tapo T150, that uses radar to detect whether a room is occupied, even when the person is no longer moving.

The argument is twofold: less data travelling, and no monthly fee to unlock the smart features. Technomedia does note, however, that concern about privacy grows as the home watches its occupants ever more closely.

## Alexa+ in France: the voice assistant goes generative AI

![Hand touching a smart speaker on a shelf with a plant and books](https://images.pexels.com/photos/4790264/pexels-photo-4790264.jpeg?auto=compress&cs=tinysrgb&w=1600)

Amazon launched Alexa+ in France on 26 May 2026, in early access, according to Mac4Ever. The assistant is free during this phase, then will cost €22.99 a month, except for Prime subscribers, who get it at no extra charge. Amazon says that 97% of the Echo devices sold can run it. Among the new features cited: restaurant booking via The Fork, control of heating and home automation, chaining commands without repeating "Alexa", and calendar connection. The French version is built on models from Mistral AI.

If you already have a recent Echo speaker, the question is therefore not "should I buy another device" but "is the service worth its price outside Prime". Very old models (the 1st-generation Echo Dot, Echo Show 1 and 2, for example) are excluded.

## Matter 1.5: the standard that sets the stage

Matter is the common language meant to let devices from different brands talk to each other. Its version 1.5, published on 20 November 2025 by the Connectivity Standards Alliance, adds support for cameras (live video and audio streaming, two-way conversation, privacy zones), a unified approach to blinds, gates and garage doors, soil moisture sensors, and energy management tools: real-time electricity tariffs, finer metering and electric vehicle charging.

In practice, this paves the way for homes where the charging of a home battery shifts according to the price of electricity. In Berlin, Zendure showed a system that forecasts solar production, consumption, tariffs and the weather before deciding when to charge. But a published specification is not a product on the shelf: before you buy, check that the device mentions Matter on its product page, and not just "compatible with your assistant".

## AI you wear too: earbuds and smart rings

On the earbuds front, Apple unveiled the AirPods 5 on 9 September 2026: €149 (€169 with a wireless charging case), active noise cancellation from the first model, and live translation powered by Apple Intelligence. The feature needs a compatible iPhone. Apple claims up to 50% more outside noise is cancelled compared with the AirPods 4, a promise that Presse-citron points out still needs confirming by independent tests. The details are in our [wireless earbuds comparison](/blog/wireless-earbuds-which-category-to-choose).

Smart rings raise a different question: the business model. The Oura Ring 5 is announced from €429 in France, with a compulsory subscription of €5.99 a month, according to iPhoneSoft; without an active subscription, Selectra notes that you only get access to three daily scores and the settings. The Ultrahuman Ring Pro (€479, according to WatchGeneration) does not require a subscription to access its data, with paid options for certain detections. On the data side, the Mozilla Foundation gave the Ultrahuman Ring AIR (another model from the brand) 5/10 in its June 2026 assessment, praising the absence of a subscription but pointing to an entirely online ecosystem. A health ring therefore remains an object that entrusts your data to a cloud, whichever the brand.

Another idea seen at IFA: Anker's Soundcore SleepLab Pro bedside speaker, which tracks breathing, heart rate and sleep stages by radar, with no watch or ring. Launch is expected in late 2026 or early 2027, with no confirmed European price.

## Before you buy: four questions to ask yourself

1. **Where does the AI run?** On the device or in the cloud. Local processing protects your data better and often avoids a fee, but look for the exact wording on the product page.
2. **Is there a subscription, and what does it unlock?** Compare the cost over three years, not the purchase price. For the Oura Ring 5, Selectra works out €638.65 after three years (ring at €429 plus monthly subscription).
3. **Is it available now?** Several IFA announcements are for 2027 or are crowdfunded. A trade-show demo is not a promise of delivery.
4. **Does the product speak Matter?** It is good protection against being locked in to a single manufacturer.

Winkco adds a piece of common-sense advice: wait for real-world tests, because a demo does not always behave as it does at home, and last year's models generally drop in price within six to twelve months of the September announcements.

## Frequently asked questions

**Does the AI in connected devices work without internet?**
It depends on the product. Some cameras process images locally (EZVIZ, Reolink), while others send everything to the cloud. The spec sheet should say which.

**Is Alexa+ free in France?**
It is during early access and for Prime subscribers. Outside Prime, Amazon announces €22.99 a month afterwards (source: Mac4Ever, 26 May 2026 launch).

**Should I wait until 2027 to buy a smart home?**
No, if your need is simple (camera, sensor, speaker). Yes, if you are after a piece of kit seen at IFA whose French date has not been announced.

## Key takeaways

AI in the home becomes useful when it does something specific (finding a video clip, warning about a use-by date, shifting a charge). It is less convincing when it is just a label. For a first purchase, a camera with local processing and no subscription, or a Matter-compatible speaker, offers the best balance between real-world use and risk. For the rest, wait for French prices and the tests.

## Sources

- [Technomedia, « À l'IFA de Berlin, la maison connectée devient intelligente » (13 Sept 2026)](https://www.technomedia.org/2026/09/a-lifa-de-berlin-la-maison-connectee.html)
- [Winkco, « IFA 2026 : la maison connectée apprend à disparaître »](https://www.winkco.news/events/ifa-2026-maison-connectee-tendances/)
- [TechBox, « IFA 2026 nouveautés »](https://techbox.fr/ifa-2026/)
- [Mac4Ever, « Alexa arrive en France »](https://www.mac4ever.com/ia/196340-alexa-arrive-en-france)
- [Connectivity Standards Alliance, « Matter 1.5 introduces cameras, closures and enhanced energy management capabilities » (20 Nov 2025)](https://csa-iot.org/newsroom/matter-1-5-introduces-cameras-closures-and-enhanced-energy-management-capabilities/)
- [JustGeek, « AirPods 5 : nouveautés, prix et date de sortie » (9 Sept 2026)](https://www.justgeek.fr/airpods-5-nouveautes-prix-date-de-sortie-158071/)
- [Presse-citron, « AirPods 5 : Apple dévoile la nouvelle version… » (9 Sept 2026)](https://www.presse-citron.net/airpods-5-apple-devoile-la-nouvelle-version-de-ses-ecouteurs-sans-fil-avec-deux-belles-nouveautes/)
- [iPhoneSoft, « Oura Ring 5 : 40 % plus fine… disponible en France à partir de 429 € » (28 May 2026)](https://iphonesoft.fr/2026/05/28/oura-ring-5-40-pourcent-plus-fine-plus-precise-disponible-france-partir-429-euro)
- [Selectra, « Bague connectée et son abonnement caché »](https://selectra.info/telecom/actualites/marche/bague-connectee-et-son-abonnement-cache)
- [WatchGeneration, « Ultrahuman Ring Pro » (2 March 2026)](https://www.watchgeneration.fr/wearables/2026/03/ultrahuman-ring-pro-une-bague-connectee-avec-15-jours-dautonomie-19413)
- [Mozilla Foundation, privacy review of the Ultrahuman Ring AIR (2 June 2026)](https://www.mozillafoundation.org/fr/nothing-personal/ultrahuman-ring-privacy-review/)
- [BornCity, « Qi2.2-Standard : 637 zertifizierte Powerbanks… »](https://borncity.com/news/qi2-2-standard-637-zertifizierte-powerbanks-treiben-markt-boom/)
$q$, $q$https://images.pexels.com/photos/4790266/pexels-photo-4790266.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$smart home$q$, $q$AI$q$, $q$IFA 2026$q$, $q$Alexa+$q$, $q$Matter$q$, $q$security camera$q$, $q$smart ring$q$, $q$privacy$q$, $q$tech trends$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$tech-gadgets$q$), ARRAY['cf6e5520-75ed-4b11-853a-a1379772e599', '28e340be-73dd-48f9-b8f1-8470c7515e0d']::uuid[], NULL, $q$AI and the smart home: what changes this autumn$q$, $q$Smart home AI: what IFA 2026, Alexa+ and Matter 1.5 mean for your purchases, and the questions to ask yourself before you splash out.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$qi2-power-bank-buying-guide$q$, 'uk', $q$Qi2 power bank buying guide: how to choose well in 2026$q$, $q$Qi2 power bank: 25W Qi2.2, capacity in Wh, airline rules and safety. The criteria to choose without getting it wrong, before you buy.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. We have not tested the products mentioned: this article is based on published sources, listed at the bottom of the page.*

The magnetic power bank that clings to the back of your phone, no cable required, has found its way into bags everywhere. In 2026, the good old power bank with a cable has not gone away, but the Qi2 power bank has become the benchmark for anyone who wants to rescue their iPhone or compatible Android without being tethered by a wire. The market has also become more complicated: Qi2, Qi2.2, 15W, 25W, mAh, Wh. Here are the five criteria that really matter, followed by the rules to know before you board a plane.

## Qi2, Qi2.2: what changes for your phone

Qi2 is the version of the wireless charging standard that adds magnets to line the phone up properly with the charger, on the same principle as Apple's MagSafe. It charges at 15W. Qi2.2 raises that ceiling to 25W, according to the German site BornCity. The same site counts 64 certified Qi2.2 power banks in December 2025, then more than 637 certified products in February 2026 (the count is not quite the same).

Classic trap: a 25W Qi2 charger does not charge a phone any faster if the phone does not support it. The Best Buy Canada blog, at the time of CES in January 2026, said it plainly: these chargers continue to charge current devices at 15W and are aimed at upcoming phones, since few models accepted 25W at the time. According to BornCity, iOS 26 has supported Qi2.2 on current iPhones since July 2026, and the Samsung Galaxy S26 series received Qi2.2.1 certification at the start of the year. Even so, check your own phone's spec sheet before paying extra for 25W.

## Criterion 1: your phone's compatibility (and your case)

According to Best Buy Canada, Qi2 works with the iPhone 12 and later, the Google Pixel 10 series and "Qi2 ready" phones such as the Samsung Galaxy S25, the latter with an optional magnetic-compatible case. In other words, if your Android has no built-in magnets, the case becomes a condition for success. Also check the thickness it allows: Belkin states, for example, that one of its 25W Qi2 chargers works with cases up to 5mm.

## Criterion 2: capacity, in mAh and then in Wh

The mAh figures are the ones on the packaging. The Wh figures are the ones that matter when travelling. Skyscanner gives the conversion rule: mAh multiplied by 3.7 (the usual voltage), divided by 1,000. A 20,000mAh power bank therefore comes to roughly 74Wh. A 10,000mAh one works out at around 37Wh.

For a quick top-up, a 5,000mAh model is the most compact. Tom's Guide estimated that a 10,000mAh power bank is enough to fully recharge a device, which makes it a common compromise. Beyond that, you gain battery life but pay in weight and bulk. Slim magnetic models tend to sit at the lower end of the range: the Ugreen MagFlow Air, launched in Europe in March 2026 according to BornCity, offers 5,000mAh in 8.6mm of thickness and 127g.

## Criterion 3: wired power over USB-C

A magnetic power bank always charges more slowly than one connected by cable. If you also recharge a tablet or a laptop, look at the USB-C output. As examples: the Baseus PicoGo AM52 (10,000mAh) claims 25W over Qi2.2 and, according to Best Buy Canada, 45W over USB-C; the Anker Prime 26K can reach 300W of total power, according to BornCity. These figures serve as benchmarks for comparison. If you only recharge a phone, there is no need to aim for the maximum.

## Criterion 4: thickness, weight and real-world use

A power bank that stays in the bag because it is too heavy rescues nobody. Ask yourself: will it be stuck to the phone all day, or kept for emergencies? In the first case, slimness comes first (Baseus claims 16mm for the PicoGo AM52, Ugreen 8.6mm for the MagFlow Air). In the second, capacity can take priority. Some models include a USB-C cable or a kickstand for watching a video while charging (as with the Anker MagGo 10K Qi2, according to BornCity).

## Criterion 5: safety and product recalls

A lithium battery remains something to keep an eye on. In June 2025, Tom's Guide reported Anker's recall of more than 1.15 million PowerCore 10000 power banks (model A1263) in the United States because of an overheating risk: 19 incidents reported, some involving flames. The recall covered units sold between mid-2016 and December 2022, and the site urges people to stop using an affected model immediately and not to throw it out with household waste. This recall concerned the US market, but it serves as a reminder of three simple habits: note down your power bank's model number, keep proof of purchase, and buy from an identifiable seller rather than from an anonymous listing.

## Travelling with a power bank: the rules on planes

![Hands holding a smartphone connected to a power bank, outdoors](https://images.pexels.com/photos/16814787/pexels-photo-16814787.jpeg?auto=compress&cs=tinysrgb&w=1600)

The basic rule, according to Skyscanner: the power bank travels in the cabin, never in the hold. Up to 100Wh (about 27,000mAh), no special steps are needed. Between 100 and 160Wh, the airline's prior approval is required, generally for two power banks at most. Above 160Wh, carriage is forbidden.

Another development to be aware of: in-flight use is being restricted. According to Journal du Geek (August 2026), the Lufthansa group (Lufthansa, Swiss, Austrian, Eurowings, Edelweiss, Brussels Airlines) bans using a power bank to charge a device, and Air France also bans charging a device from a power bank during the flight. Rules change quickly: check your airline's page before you leave.

## A few models spotted in 2026

Without claiming to offer a ranking (we have not tested anything), here are the product families mentioned by our sources: Ugreen MagFlow Air (5,000mAh), Baseus PicoGo AM52 (10,000mAh, 25W Qi2.2), Anker MagGo 10K Qi2 with built-in stand, Belkin BoostCharge Slim Magnetic (5,000 and 10,000mAh, announced for the second quarter of 2026), Ugreen MagFlow 20,000mAh (25W Qi2, seen at CES). None of these sources gives a reliable price for the UK: compare offers at the time of purchase.

## Frequently asked questions

**Does a Qi2 power bank work with an Android phone?**
Yes, if the phone is Qi2-compatible (or fitted with a magnetic case), for example the Pixel 10 or the Galaxy S25 series with a dedicated case, according to Best Buy Canada. Otherwise, use the USB-C output.

**How many mAh do I need for a day of travel?**
A 10,000mAh power bank should be enough to fully recharge a device, according to Tom's Guide. The capacity actually delivered depends on the model: check the product's spec sheet.

**Can I take a 20,000mAh power bank on a plane?**
Yes, it comes to about 74Wh, below the 100Wh limit (source: Skyscanner), but in the cabin and subject to the airline's policy on in-flight use.

**Is it worth paying more for 25W?**
Only if your phone supports it. Otherwise, 15W Qi2 will give you the same result.

## Key takeaways

Choose your phone and how you will use the power bank first, and only then look at the spec sheet. A slim, magnetic 10,000mAh model that works with your case is enough for most people. 25W only makes sense if your device can handle it. And before a flight, do the sums in Wh: it is the only unit the airline will look at.

## Sources

- [BornCity, « Qi2.2-Standard : 637 zertifizierte Powerbanks… »](https://borncity.com/news/qi2-2-standard-637-zertifizierte-powerbanks-treiben-markt-boom/)
- [Best Buy Canada, « Faster 25W Qi2 charging takes over CES 2026 » (8 Jan 2026)](https://blog.bestbuy.ca/ces-2026/faster-25w-qi2-charging-takes-over-ces-2026)
- [Tom's Guide FR, « Anker rappelle plus d'un million de batteries défectueuses » (20 June 2025)](https://www.tomsguide.fr/anker-rappelle-plus-dun-million-de-batteries-defectueuses-que-faire-si-votre-batterie-est-concernee/)
- [Skyscanner FR, « Powerbank en avion : les règles »](https://www.skyscanner.fr/vols/conseils/powerbank-en-avion-les-regles)
- [Journal du Geek (6 August 2026), power banks now banned by some airlines](https://www.journaldugeek.com/2026/08/06/les-batteries-externes-sont-desormais-interdites-en-avion-voici-les-6-compagnies-qui-vous-linterdisent/)
$q$, $q$https://images.pexels.com/photos/37475677/pexels-photo-37475677.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$power bank$q$, $q$Qi2$q$, $q$Qi2.2$q$, $q$wireless charging$q$, $q$MagSafe$q$, $q$travel$q$, $q$flights$q$, $q$USB-C$q$, $q$buying guide$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$tech-gadgets$q$), '{}', NULL, $q$Qi2 power bank buying guide 2026 (Qi2.2, flights)$q$, $q$Qi2 power bank: 25W Qi2.2, capacity in Wh, airline rules and safety. The criteria to choose without getting it wrong, before you buy.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$wireless-earbuds-which-category-to-choose$q$, 'uk', $q$Wireless earbuds: premium in-ear, mid-range or open-ear, which category should you choose?$q$, $q$Noise-cancelling wireless earbuds: premium, mid-range, AirPods 5 or open-ear? A comparison by category to help you choose for how you listen.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. We have not tested these earbuds: the article is based on published sources, cited at the bottom of the page.*

Shopping for noise-cancelling wireless earbuds means choosing from dozens of models that all promise the same thing. Rather than comparing them one by one, it is better to start with the right category. This autumn, four families stand out: premium in-ear models, the mid-range, the just-released AirPods 5, and open-ear earbuds. Each suits a different use, and the prices the press has recorded sometimes differ by a factor of two for the same model.

## The four categories at a glance

| Category | Who it suits | Benchmarks (sources cited below) | Main limitation |
|---|---|---|---|
| Premium in-ear | Commuting, open-plan offices, flights | Sony WF-1000XM6 at €299.99 at launch; Bose QC Ultra Earbuds 2 recorded between €294 and €350 | High price, battery life with noise cancellation around 6 to 8 hrs |
| Mid-range | Everyday use, tight budget | Galaxy Buds3 Pro, Nothing Ear (3), Huawei FreeBuds Pro 4 recorded between roughly €119 and €250 | Features vary by brand |
| AirPods 5 | iPhone users | €149 or €169 (wireless charging case), noise cancellation on both | Live translation limited to compatible iPhones |
| Open-ear | Office, cycling, running | Shokz OpenDots ONE 10 hrs, Bose Ultra Open 7 hrs | No real isolation, sound leakage at high volume |

## Premium in-ear: Sony, Bose and the race for noise cancellation

Sony launched the WF-1000XM6 in February 2026 at €299.99, which is €20 less than the previous model at its release, according to WatchGeneration. The manufacturer promises noise cancellation that is 25% more effective than the previous generation, thanks to four microphones per earbud. The stated battery life is 8 hours with noise cancellation and 24 hours with the case, with Bluetooth LE Audio and Auracast. Phonandroid, in a February 2026 comparison, recorded these earbuds at between €244.98 (Fnac, Darty) and €456.96 (RueDuCommerce): a gap that is a reminder to compare offers.

On the other side, the Bose QuietComfort Ultra Earbuds 2 are recorded by Phonandroid at between €294.01 and €350.40, with 6 hours of battery life with noise cancellation and 24 hours with the case, IPX4 protection and personalised sound tuning (CustomTune). The same comparison cites the Sennheiser Momentum True Wireless 4 (from €184.63 to €299.99, up to 28 hours with the case) and the Bang & Olufsen Beoplay Eleven (€569, with only one retailer recorded).

Who are they for? For people who spend hours on the underground, on planes or in an open-plan office and want the best silence possible. Phonandroid, incidentally, puts the price range of most high-end models "between €150 and €300".

## Mid-range: the best balance of price and features

This is where plenty of pleasant surprises are found. Again according to Phonandroid: the Samsung Galaxy Buds3 Pro (from €119.99 to €249.99, IPX7 protection, 5 hours with noise cancellation), the Nothing Ear (3) (from €119 to €199.99, up to 38 hours with the case) and the Huawei FreeBuds Pro 4 (from €134.98 to €231.26, dual drivers, 5 hours with noise cancellation). These ranges date from February 2026 and have inevitably moved since.

The catch: the most appealing features (proprietary codec, advanced settings) are sometimes tied to a phone from the same brand. The Galaxy Buds3 Pro, for example, support a Samsung-specific codec (SSC), whose value depends on your phone.

## AirPods 5: a category of their own, for the Apple ecosystem

Apple unveiled the AirPods 5 on 9 September 2026, with availability announced from 18 September. Price: €149, or €169 with the wireless charging case. A notable new feature highlighted by JustGeek: active noise cancellation is present on both versions, whereas the AirPods 4 reserved it for the €199 model. Apple claims up to 50% more outside noise is cancelled compared with the AirPods 4, up to 5 hours of listening with noise cancellation (22 hours with the case) and IP57 certification. Live translation, powered by Apple Intelligence, requires a compatible iPhone.

A word of caution on the figures: these are the manufacturer's claims. Presse-citron points out that independent tests are still needed to confirm the claimed improvement.

## Open-ear earbuds: when you need to hear what is around you

Open-ear earbuds do not block the ear canal. According to Son-Vidéo's comparison (updated in April 2026), this lets you stay aware of your surroundings, in town or while exercising, and suits people who find ear tips uncomfortable. In return, they offer no real isolation, ambient noise can get in the way of listening in a noisy setting, and a high volume can let sound leak to those nearby.

On battery life, Son-Vidéo cites the Shokz OpenDots ONE (10 hours, 40 hours with the case), the Nothing Ear (open) (8 hours, about 30 hours with the case) and the Bose Ultra Open (7 hours, 27 hours with the case, IPX4). The comparison does not give prices.

## The criteria that really matter

### Noise cancellation

![Black wireless earbuds in their open charging case, on a textured background](https://images.pexels.com/photos/8858287/pexels-photo-8858287.jpeg?auto=compress&cs=tinysrgb&w=1600)

It varies from one model to another, and the percentages claimed (Sony, Apple) each relate to the brand's own previous generation: they cannot be compared with one another. Look for independent tests, and check whether there is a transparency mode for the moments when you need to hear an announcement.

### Battery life, with and without the case

Look at the figure "with noise cancellation on", not the more flattering one that includes the case. In Phonandroid's comparison, it ranges from 5 hours (Galaxy Buds3 Pro, Huawei FreeBuds Pro 4) to 8 hours (Sony WF-1000XM6). A wireless charging case is handy: our [Qi2 power bank guide](/blog/qi2-power-bank-buying-guide) explains how to top it up on the move.

### Codecs, multipoint, Auracast

Multipoint lets you connect two devices at once (phone and computer). Codecs (LDAC, aptX, LC3) determine the quality of the sound transmitted: check that your phone supports them. Auracast is broadcast audio sharing, already announced on the Sony WF-1000XM6 and Sennheiser Momentum True Wireless 4. Useful in time, rarely decisive today.

## Which to choose for how you listen

- You travel a lot: premium in-ear, checking battery life with noise cancellation.
- You have an iPhone and a limited budget: the AirPods 5, while waiting for independent tests.
- You are on Android and want to spend under €200: mid-range, compared on current prices.
- You work or run while hearing what is going on around you: open-ear earbuds.

AI is arriving in this category too, with the AirPods 5's live translation, which we place in our [overview of AI in everyday objects](/blog/ai-smart-home-autumn-2026).

## Frequently asked questions

**What is the difference between in-ear and open-ear earbuds?**
In-ear models sit in the ear canal and isolate. Open-ear ones stay outside and let ambient noise through, generally without noise cancellation, according to Son-Vidéo.

**Are the AirPods 5 worth it compared with the AirPods 4?**
On paper: noise cancellation from the €149 model, better resistance (IP57) and live translation. Wait for independent tests to learn how effective it really is.

**What budget do you need for good noise cancellation?**
Phonandroid puts most high-end models between €150 and €300, and records several noise-cancelling models from €119 at certain retailers.

**Are the prices quoted still valid?**
No, they are dated snapshots (February 2026 for Phonandroid). Always check the current price.

## Key takeaways

The right choice depends less on the spec sheet than on where you listen. A premium in-ear model for commuting, an open-ear one at the office, the AirPods 5 if the rest of your kit is Apple. If in doubt, compare battery life with noise cancellation, compatibility with your phone, and the current price.

## Sources

- [JustGeek, « AirPods 5 : nouveautés, prix et date de sortie » (9 Sept 2026)](https://www.justgeek.fr/airpods-5-nouveautes-prix-date-de-sortie-158071/)
- [Presse-citron, « AirPods 5 : Apple dévoile la nouvelle version… » (9 Sept 2026)](https://www.presse-citron.net/airpods-5-apple-devoile-la-nouvelle-version-de-ses-ecouteurs-sans-fil-avec-deux-belles-nouveautes/)
- [WatchGeneration, « Sony annonce les WF-1000XM6 » (13 Feb 2026)](https://www.watchgeneration.fr/audio/2026/02/sony-annonce-les-wf-1000xm6-de-nouveaux-concurrents-aux-airpods-pro-3-29999-eu-19345)
- [Phonandroid, « AirPods : quelles sont les meilleures alternatives… en 2026 ? » (23 Feb 2026)](https://www.phonandroid.com/airpods-6-alternatives-meilleures-que-les-ecouteurs-dapple.html)
- [Son-Vidéo, « Comparatif des meilleurs écouteurs ouverts 2026 » (updated 14 April 2026)](https://blog.son-video.com/2025/11/comparatif-des-meilleurs-ecouteurs-ouverts/)
$q$, $q$https://images.pexels.com/photos/35147239/pexels-photo-35147239.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$wireless earbuds$q$, $q$noise cancelling$q$, $q$AirPods 5$q$, $q$Sony WF-1000XM6$q$, $q$open-ear earbuds$q$, $q$audio$q$, $q$comparison$q$, $q$buying guide$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$tech-gadgets$q$), ARRAY['1774956b-a0ca-4547-91fa-67d78499f506']::uuid[], NULL, $q$Noise-cancelling wireless earbuds: which type to choose$q$, $q$Noise-cancelling wireless earbuds: premium, mid-range, AirPods 5 or open-ear? A comparison by category to help you choose for how you listen.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$home-decor-trends-autumn-winter-2026-2027$q$, 'uk', $q$Home decor trends for autumn-winter 2026-2027: the colours and materials to know$q$, $q$Chocolate, moss green, burgundy, walnut, bouclé: the home decor colours and materials of autumn-winter 2026-2027, and how to adopt them without buying everything again.$q$, $q$*Transparency: Tendpick is an affiliate site. If you buy through certain links in this article, we earn a commission, at no extra cost to you. This article draws on published sources, cited throughout the text, and not on product tests.*


After several seasons dominated by beige and off-white, the home decor trends for autumn-winter 2026-2027 give colour its place back. Not garish colours: deep shades, almost edible, that recall chocolate, moss or wine. Wood gets darker, textiles get softer and shapes get rounder.

Here is what the specialist websites and paint brands consulted in early October 2026 are saying, with one useful caveat: these are directions noted by retailers, not rules. You have nothing to change just because a blog says so. But if a room bores you, it is a good moment to pick up an idea.

## What the sources say this season

The Maison&Objet trade fair (10 to 14 September 2026 at Paris Nord Villepinte, open to professionals only) took "Pulse in Motion" as its theme. Its "Color Power" area announced colour without defining it: according to Vincent Grégoire of the NellyRodi trend agency, it is a "profusion of creative energy" rather than a single trend that can be singled out. In other words, nobody is imposing a palette.

The specifics come rather from retailers. IdMarket (18 August 2026), Raphaële Meubles (11 September 2026) and the Histoires Singulières guide (3 September 2026) agree on the essentials: deep colours, dark wood, soft materials. That overlap is the filter used here.

## Colours: the return of deep tones

### Chocolate, moss green, plum and midnight blue

The Histoires Singulières guide cites chocolate brown, moss green, plum, midnight blue and muted ochre. Rust and ochre serve there as softer versions of terracotta, on objects and textiles. Its advice: anchor these rich shades with light neutrals such as linen, ecru or beige ceramics.

Raphaële Meubles talks about pairings rather than isolated shades: olive green with powder pink or terracotta, burgundy with deep blue, chocolate brown with a touch of ochre. The idea is to move away from the beige-on-beige look without ending up with a garish living room.

Paint brands are heading the same way. Dulux has named Soulful Sage, a soft, greyed sage green, its colour of the year for 2027 (announcement of 8 September 2026 reported by Dezeen). The brand explains that AkzoNobel's research points towards lighter, more considered spaces. According to Homes & Gardens (22 September 2026), Behr has chosen "Grounded", a deep mossy green, and Graham & Brown "Rose Earth", a powder pink with notes of faded terracotta that the magazine calls a "new neutral". Green therefore dominates, in light or dark versions.

### Burgundy, the novelty of the season

IdMarket presents burgundy and deep red as the big newcomer of the season. The advice is cautious, and it is worth following: use it as an accent or on a single statement piece, such as an armchair, a throw or a lampshade, rather than on four walls.

### Beige remains the base

Beige has not gone away. IdMarket even lists it among the key colours, as a calm backdrop for khaki green and terracotta. The nuance is that it becomes background scenery instead of being the main subject.

## Materials: dark wood, stone and soft textiles

![Living room with a sofa, decorative cushions and a framed picture on the wall](https://images.pexels.com/photos/16092169/pexels-photo-16092169.jpeg?auto=compress&cs=tinysrgb&w=1600)

Light Scandinavian-style wood is losing ground. Raphaële Meubles notes that darker species and finishes (walnut, smoked wood, brown finishes) are taking over, in a combination that works well with warm off-white, beige, olive green, burgundy and mineral materials. IdMarket follows the same line with walnut with a pronounced grain, a nod to the 1970s, and suggests pairing it with travertine or a stone effect: a travertine-effect coffee table in front of a walnut dining table, for example.

On the textile side, bouclé remains well established, chenille is on the rise for seating, and velvet shows up in cushions. Histoires Singulières adds bouclé wool, thick linen, glazed ceramics and warm metals (brass, brushed copper). Raphaële Meubles also mentions Murano-style blown glass and mixed-material pieces.

Patterns, for their part, come back in small doses: on a rug, cushions, a textile. Stripes, reworked checks, geometric or botanical designs, and even leopard print for the boldest (Raphaële Meubles).

## Shapes: roundness and relief

The straight line is retreating. IdMarket describes enveloping seating with very rounded arms, and Raphaële Meubles cites curved sofas, tables with softened corners and organic mirrors. For storage, relief does the decorating: wooden slats, fluting and arch shapes on the fronts of sideboards and low units.

One point to watch if your room is small: very enveloping seating takes up space. Measure before you buy. Our article on [small flat storage](/blog/small-apartment-storage-ideas) explains how to go about it.

## Four looks to follow this season

L'Artelier Déco (28 July 2026) sums up the season in five styles. Here are the ones that speak most to an ordinary home:

- "Luxurious" wabi-sabi: ceramics in organic shapes, raw textures, handmade objects, vases with irregular curves.
- Terracotta and Mediterranean ochres: rich terracotta, golden ochre, rust. A single well-chosen piece can be enough to change the atmosphere of a room.
- Controlled maximalism: a mix of heights, materials and textures, with objects chosen one by one for a gallery effect.
- Biophilic design: architectural plants, ceramic trays in organic shapes, place mats in natural fibres.

The fifth style, tableware as a way of life, ties in with the other three: handcrafted pieces made to be used every day.

## How to adopt these trends without buying everything again

![Rustic interior with decorative vases and plants on a wooden table](https://images.pexels.com/photos/31553231/pexels-photo-31553231.jpeg?auto=compress&cs=tinysrgb&w=1600)

A decor trend is a pretext, not an obligation to refurnish. A few simple steps, from the lightest to the most committed:

1. Change the textiles: two cushions in chocolate or moss velvet, a bouclé wool throw, a rust or terracotta rug (ideas from Histoires Singulières).
2. Freshen up the chairs: IdMarket suggests switching to natural shades such as beige or khaki.
3. Add a focal piece in walnut or travertine, while keeping your current furniture.
4. Paint a single wall, or a piece of furniture, in a deep green or burgundy.

If a piece of furniture you like is damaged, look at repair first. A repair bonus exists for out-of-warranty furniture: the details, with its limits, can be found in our article on [small flat storage](/blog/small-apartment-storage-ideas). To create the warm atmosphere that goes with these colours, lighting matters as much as paint: see our guide to a [cosy living room](/blog/cosy-living-room-winter).

## Frequently asked questions

**Which colour should I choose for a living room this autumn?**
The sources converge on greens (moss, olive, sage), chocolate browns and burgundies, against a beige or ecru background. For a first trial, a cushion or a throw is enough.

**Is beige out of fashion?**
No. The sites consulted keep it as a base. What changes is that richer tones are paired with it.

**How can I bring in burgundy without making the room feel heavy?**
In small quantities: an armchair, a lampshade, a vase. IdMarket recommends keeping it for accents or a statement piece.

**Does dark wood make a room darker?**
It can in a room without much light. A dark wooden piece against a light wall, with warm lighting, generally gives a better balance than entirely dark furniture. This is common-sense advice rather than a rule.

## Key takeaways

The 2026-2027 season is betting on earthy, deep colours, dark wood and soft materials. Choose one colour, one material and one shape that you like, not all three at once. A well-placed shade is worth more than a completely redone living room.
$q$, $q$https://images.pexels.com/photos/12933002/pexels-photo-12933002.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$home decor trends$q$, $q$autumn decor 2026$q$, $q$decor colours$q$, $q$walnut$q$, $q$bouclé$q$, $q$sage green$q$, $q$burgundy$q$, $q$living room$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$home-living$q$), '{}', NULL, $q$Autumn-Winter 2026-2027 Home Decor Trends: Colours$q$, $q$Chocolate, moss green, burgundy, walnut and bouclé: the autumn-winter 2026-2027 decor colours and materials, and how to adopt them without starting over.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$cosy-living-room-winter$q$, 'uk', $q$A cosy living room this winter: warm lighting, textiles and smart habits$q$, $q$Floor lamps, 2,700 K bulbs, throws and thick curtains: how to create a cosy living room this winter without heating more than you need to.$q$, $q$*Transparency: Tendpick is an affiliate site. If you buy through certain links in this article, we earn a commission, at no extra cost to you. The advice below draws on published sources, cited in the text, and not on product tests.*


A cosy living room is not necessarily a room full of cushions. Often, what changes everything is the lighting: switch off a white ceiling light, switch on two lamps, and the room suddenly feels more welcoming. For a cosy living room this winter, it is best to start there, then add textiles, and finally think about the actual warmth of the room.

The idea is to make the living room pleasant without turning up the thermostat. The two approaches complement each other more than you might think: some decor items, such as a thick curtain, also help to keep the heat in.

## Start with the lighting, not the sofa

### Layer your light sources

![Cosy living room with two armchairs and a lamp giving off a warm light](https://images.pexels.com/photos/39805580/pexels-photo-39805580.jpeg?auto=compress&cs=tinysrgb&w=1600)

Castorama distinguishes three types of lighting: general, indirect light for the whole room; focused light for a specific area such as a reading corner; and accent light for an object or a shelf. La Maison Saint-Gobain explains for its part that mixing direct and indirect light (filtered by a lampshade) lets you adjust the brightness and the mood.

In practice, that gives some simple guidelines:

- a table lamp on each side of the sofa, so that two people each have their own light (Castorama);
- a floor lamp next to the armchair in a reading corner, or a wall light if space is tight;
- several pendant lights at different heights above the coffee table, with the lowest hanging over the centre of the table (Castorama);
- a low floor lamp behind or beside the television, pointing towards the wall to limit glare (Saint-Gobain).

Histoires Singulières suggests a radical move: replacing the central light with a floor lamp. In a small room, Saint-Gobain prefers to keep a ceiling light with a shade, then add a floor lamp and a reading light. Both approaches hold up; it all depends on the size of your living room and your habits.

### Choose the right colour temperature

The colour of light is measured in kelvins. According to Coolblue's guide, 2,700 K corresponds to an "extra warm" white, 3,000 K to a warm white, 4,000 K to a neutral white and 6,500 K to a cool white. Histoires Singulières recommends light around 2,700 K for a living room, and Maison Aubertin cites the range of 2,700 to 3,000 K to recall the light of a candle. Saint-Gobain keeps cooler lights for work areas.

Always check the kelvin rating on the bulb packaging: not every source uses the words "warm" and "cool" in the same way, and a badly labelled "cool" white ruins the effect you are after.

### Lampshades, amber glass, candles

Histoires Singulières cites floor lamps with linen or paper shades for a lower, softer light, and amber glass pendant lights above the coffee table or a reading corner. Jardiland recommends multiplying candles, lanterns and fairy lights for a cocooning atmosphere, for example around a window or on a shelf. For the table, three candles of different heights, in ceramic or thick glass holders.

An obvious point that bears repeating: a lit candle is never left unattended, especially near fabric.

## Textiles that warm the eye (and a little more)

![Warm throw draped over a sofa](https://images.pexels.com/photos/6633533/pexels-photo-6633533.jpeg?auto=compress&cs=tinysrgb&w=1600)

Histoires Singulières lists a coherent set: a bouclé wool throw, cushions in chocolate, moss or plum velvet, a rust or terracotta rug, bed linen in thick ecru or beige linen. Maison Aubertin adds thick linen for curtains. These textiles match the colours of the season, which we cover in our article on [home decor trends for autumn-winter 2026-2027](/blog/home-decor-trends-autumn-winter-2026-2027).

Jardiland offers a typical living room scenario: one throw, three cushions, a lantern and two candles. It is a useful guide for avoiding clutter. A sofa with a throw over the arm and two well-chosen cushions already gives the impression of a lived-in living room.

## Cosy and thrifty: the habits that count

Now for the actual warmth. The figures below are recommendations from Ademe as reported by Futura, Hellio and Engie. We did not consult Ademe's original page: take them as rough orders of magnitude and check them before using them for a precise calculation.

- Recommended temperatures: around 19°C in living areas when they are occupied, 17°C in bedrooms (Futura, citing Ademe).
- One degree less on the thermostat can mean up to 7% savings on annual heating consumption (same source). The throw over your knees then becomes a tool for comfort and for saving money.
- Closing thick curtains and shutters every evening: Hellio, citing Ademe, puts the heat loss avoided at the windows at up to 60%. Engie estimates a heating saving of up to 2% from closing shutters at nightfall in all rooms. The two figures do not measure the same thing: one concerns losses through the windows, the other the overall bill.
- Fitting draught excluders on doors leading to an unheated room or to the outside (Hellio).
- Not placing anything in front of radiators, neither objects nor curtains (Engie).

The advantage of a thick linen or velvet curtain is that it counts both as decor and on this list. It is a purchase that justifies itself twice.

## A typical living room, step by step

Imagine a 20 m² living room with a white ceiling light and a sofa. Here is a realistic order of action:

1. Replace the bulbs with 2,700 K or 3,000 K models.
2. Add a lamp on each side of the sofa, or a floor lamp next to the armchair.
3. Put down a throw and two cushions, in a colour that picks up one from an object already in the room.
4. Hang a thick curtain along the main window.
5. Finish with a few candles, away from fabrics.

Nothing obliges you to do it all in the same week. Start with the bulbs: it is the cheapest step and the one whose effect shows soonest.

## Frequently asked questions

**Which bulb for a cosy living room?**
A warm-coloured LED, 2,700 K or 3,000 K according to the sources cited. Check the rating on the packaging.

**Are candles enough to light a living room?**
No, they serve as mood lighting. Castorama and Saint-Gobain place them as a complement to general light and focused light.

**Can you do without the ceiling light?**
Yes, some sites recommend it, others keep it in small rooms. Try it for a week with lamps alone.

**Does a thick curtain really change the temperature?**
Hellio cites Ademe as saying that closing thick curtains and shutters every evening can avoid up to 60% of heat loss through the windows. The result depends on the type of window and curtain.

## Key takeaways

Warm light first, textiles second, heating habits in parallel. A cosy living room is built with a few well-placed items rather than one massive purchase. For small rooms where every square metre counts, read our guide to [small flat storage](/blog/small-apartment-storage-ideas).
$q$, $q$https://images.pexels.com/photos/3987481/pexels-photo-3987481.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$cosy living room$q$, $q$living room lighting$q$, $q$floor lamp$q$, $q$winter decor$q$, $q$throw blanket$q$, $q$thick curtains$q$, $q$heating savings$q$, $q$snug$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$home-living$q$), '{}', NULL, $q$Cosy Living Room Ideas for Winter: Lighting, Textiles$q$, $q$Floor lamps, 2,700 K bulbs, throws and thick curtains: how to create a cosy living room this winter without heating more than you need to.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$small-apartment-storage-ideas$q$, 'uk', $q$Small flat storage: 12 ideas to save space before winter$q$, $q$Storage up high, multifunctional furniture, a well-equipped hallway, mirrors: 12 ideas for organising a small flat before winter.$q$, $q$*Transparency: Tendpick is an affiliate site. If you buy through certain links in this article, we earn a commission, at no extra cost to you. The advice draws on published sources, cited in the text, and not on product tests.*


In autumn, a small flat fills up: thick coats, boots, duvets, throws, seasonal appliances. Storage in a small flat quickly becomes the real subject of the new season, well before choosing colours. Here are twelve practical ideas, drawn from guides published by La Maison Saint-Gobain and Boulanger, with a section at the end on furniture repair.

Two caveats first. These guides are written by brands, with their own interests, and Boulanger's is undated. The ideas are common sense, but adapt them to your walls, your budget and your tenancy agreement (drilling into a wall is not always possible in a rented home).

## Why autumn puts a small flat to the test

Cold weather changes how we live. We stay at home more, we pile up bulkier clothes, we set up a blanket corner. If your living room doubles as an office, a spare bedroom or a dining room, every object has to find its place without cluttering the floor. The right approach is to free up the floor first, then tackle the mess higher up.

## Look up

1. **Raise the storage.** With ceilings of 2.50 to 3 m, La Maison Saint-Gobain suggests multiplying storage up high to free the floor: for example a floor-to-ceiling bookcase with a ladder and shallow shelves. With at least 4 m, a mezzanine can house the bed. Check the load-bearing capacity of partition walls and ask a professional if in doubt.
2. **Prefer tall and narrow to wide and bulky.** Boulanger recommends a shallow but tall bookcase rather than a bulky unit, and wall shelves for books and games.
3. **Use wall-mounted furniture** to clear floor space (Boulanger).

## Furniture that does double duty

![Grey room with a sofa and wall storage, free of clutter](https://images.pexels.com/photos/7546607/pexels-photo-7546607.jpeg?auto=compress&cs=tinysrgb&w=1600)

4. **An ottoman bed** or a platform bed stores little-used items, such as the summer duvet or suitcases (Boulanger, Saint-Gobain).
5. **The table that changes size.** Saint-Gobain cites a serving unit that converts into a table for up to eight guests. Boulanger mentions the extending table, the fold-away desk and folding or stackable chairs.
6. **A small two-seater sofa and an armchair** rather than a corner sofa in a cramped room, and no king-size bed in a narrow bedroom (Boulanger). This ties in with a trend of the season: very rounded, enveloping seating is in fashion, but it takes up more space. Measure before you get carried away. See our [2026-2027 decor trends](/blog/home-decor-trends-autumn-winter-2026-2027).

## The hallway and nooks

7. **Equip the hallway.** Saint-Gobain suggests coat hooks, shelves and a narrow console table. With winter coats, this is the zone that overflows first.
8. **Use wasted space**: an alcove for a small spare desk, a dressing area along a corridor (Saint-Gobain).

## The kitchen: freeing up the worktop

9. **Move rarely used appliances up.** Boulanger advises putting the microwave or coffee maker on a shelf or a high cupboard, and using hanging storage or magnetic strips for utensils.
10. **Choose stackable containers**: airtight, stackable boxes, a fold-down chopping board, a folding drainer. For very small kitchens, the page also cites a small-format hob, a mini oven or multifunction microwave, and a table-top fridge.

## Create breathing space: mirrors, light, zones

![Bright small studio with a white sofa and kitchen area](https://images.pexels.com/photos/6890400/pexels-photo-6890400.jpeg?auto=compress&cs=tinysrgb&w=1600)

11. **A mirror on a large stretch of wall** adds depth, according to Saint-Gobain, which also notes that mirrored walls are very fashionable. For better lighting, see also our article on a [cosy living room](/blog/cosy-living-room-winter): several small light sources are better than one big ceiling light.
12. **Divide without partitions.** A different floor covering, a colour on part of the wall, a platform with storage, or a glazed sliding door (Saint-Gobain).

In the bathroom, Saint-Gobain suggests a shower of about 100 x 70 cm rather than a bath, a vanity unit and wall-hung toilets to free up the floor, and white tiled walls with a darker floor to strengthen the impression of space. These choices require building work: they mainly concern homeowners.

## Buy less, repair more

When space is short, you keep fewer pieces of furniture, so you choose them better. You might as well make them last. According to Carenews (8 July 2026), the repair bonus, created by the Agec law and in place since December 2022, has covered furniture since 2025, among other categories. It is deducted directly from the invoice of a repairer certified under the QualiRépar label. The product must be out of warranty, bought in France, and the repair must cost more than the bonus. Carenews gives a range of 15 to 60 euros, with an average of 35 euros.

Beware of discrepancies between sources. Ecomaison, the furniture eco-organisation, spoke in November 2024 of a bonus of around 20% of the repair cost, with no cap mentioned. Amounts change: check the Ecomaison website or a certified repairer before committing.

None of this replaces a clear-out. Before buying a new storage unit, ask yourself one question: will I really use what is inside it?

## Frequently asked questions

**Where should I start?**
With an honest inventory: take out whatever clutters the floor, note what you have not used for a year, then measure the walls and available nooks before buying anything. A badly sized storage unit adds mess instead of removing it, and the dimensions of each product should appear on its product page.

**How do I organise a small flat without drilling?**
The guides cited rely mainly on furniture (a tall, shallow bookcase, an ottoman bed, modular furniture). Wall storage requires drilling: check your tenancy agreement.

**Which multifunctional piece of furniture should I choose first?**
The ottoman bed is the one most often cited, since it adds storage volume without taking up any extra floor space.

**Does a mirror really make a room look bigger?**
It gives an impression of depth, according to Saint-Gobain. It does not create floor area, but it changes perception.

**Can I have a sofa or a table repaired with the bonus?**
Furniture has been covered since 2025 according to Carenews. The precise conditions (certified repairer, out of warranty) should be checked before the work.

## Key takeaways

A small flat is organised in three stages: free up the floor, raise the storage, and choose furniture that serves several purposes. Autumn turns it into a real-life test. And before replacing a piece of furniture, see whether a repair is possible.
$q$, $q$https://images.pexels.com/photos/30537169/pexels-photo-30537169.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$storage$q$, $q$small flat$q$, $q$space saving$q$, $q$multifunctional furniture$q$, $q$studio flat$q$, $q$organisation$q$, $q$furniture repair$q$, $q$hallway$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$home-living$q$), '{}', NULL, $q$Small Flat Storage Ideas: 12 Ways to Save Space$q$, $q$Storage up high, multifunctional furniture, a well-equipped hallway, mirrors: 12 ideas for organising a small flat before winter.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$screenless-fitness-tracker-ring-or-watch-which-to-choose$q$, 'uk', $q$Screenless fitness tracker, smart ring or watch: which to choose in late 2026?$q$, $q$Fitbit Air, Garmin Cirqa, Oura Ring 5: the formats, subscriptions and claimed battery life of 2026's screenless trackers, so you can choose with confidence.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. We have not tried these devices: the information below comes from the specialist press and manufacturers' announcements, with sources to back it up.*


Wrists have lost a few screens this year. Google unveiled the Fitbit Air on 7 May 2026, Oura revealed its Ring 5 on 28 May, and Garmin launched the Cirqa on 24 July. That makes three different ways of tracking sleep, heart rate and activity, without displaying the time or notifications. If you are torn between a screenless band, a ring or a regular watch, here is what you need to compare them on solid ground.

### Why trackers are everywhere in 2026

Every year, the American College of Sports Medicine (ACSM) surveys around 2,000 clinicians, researchers and exercise professionals to rank fitness trends. For 2026, wearable technology comes top, in a ranking published on 22 October 2025. The ACSM points out that sensors now track indicators such as heart rate or skin temperature, while noting that the accuracy of devices varies.

That last caveat matters. An Athletech News article dated 6 August 2026 points out that adoption among the general public is moving faster than clinical integration: doctors, insurers and medical records are not yet set up to make use of this data on a continuous basis. A tracker therefore remains a personal monitoring tool, not medical advice.

## Three formats, three ways of wearing your data

### The screenless band

![Black smart ring resting on a concrete surface](https://images.pexels.com/photos/34241802/pexels-photo-34241802.jpeg?auto=compress&cs=tinysrgb&w=1600)

This is the big novelty of the year. The idea: a lightweight band, worn on the wrist or upper arm, that records continuously and displays nothing. Everything is read in the app.

- **Fitbit Air (Google)**: announced on 7 May 2026 from $99 in the United States. No screen and no button, claimed battery life of up to seven days, compatible with Android and iPhone. Three months of Google Health Premium are included with purchase.
- **Garmin Cirqa**: launched on 24 July 2026 at $199 (£179 in the UK). Garmin presents it with no compulsory subscription, with up to ten days of battery life, tracking of heart rate, blood oxygen saturation and body temperature, and sleep reports. The optional Garmin Connect+ service costs $6.99 a month or $69.99 a year.
- **Whoop**: this is the rival against which these two launches are being compared. According to Athletech News, Whoop has added in recent months an ECG authorised by the US FDA, blood pressure indications and optional blood tests. The same article reports that in 2025 the FDA sent Whoop a warning about the blood pressure feature, which the company disputes. This detail illustrates the grey area well: these devices flirt with the medical field without being part of it.

### The smart ring

The Oura Ring 5 was announced on 28 May 2026, with shipping from 4 June. According to The Next Web, it measures 6.09 mm wide and 2.29 mm thick, around 40% less than the Ring 4, with a claimed battery life of up to nine days. US price: $399 (black and silver) or $499 (other finishes). An Oura membership is required: $5.99 a month or $69.99 a year.

Oura also offers alerts on patterns in temperature, heart rate variability or breathing. An important point: its "Blood Pressure Signals" flag trends; the ring does not measure blood pressure directly.

### The watch with a screen

It keeps its audience: the screen lets you start a workout, read a message or check the time without taking out your phone. Athletech News describes the Apple Watch as the most widely deployed connected health device in the world. The downside: a battery that is often more heavily used, and an object that stays "visible" at night for anyone who sleeps badly with a watch on their wrist. It is up to you to decide what bothers you least.

## The real cost: the subscription

The purchase price is only half the story. Here is what the sources consulted say (US or UK prices; prices in France need checking on the manufacturers' websites, and no price in euros has been confirmed here):

| Device | Announced price | Subscription | Claimed battery life | Screen |
|---|---|---|---|---|
| Fitbit Air | $99 | 3 months of Google Health Premium included | up to 7 days | no |
| Garmin Cirqa | $199 / £179 | not compulsory (Connect+ optional, $6.99/month) | up to 10 days | no |
| Oura Ring 5 | $399 or $499 | compulsory ($5.99/month or $69.99/year) | up to 9 days | no |

Over a year, the gap widens quickly. A ring with a compulsory membership costs more than a band with no commitment, even if the shape and comfort may justify the choice.

## How to choose based on how you will use it

![Person showing a smart band on their wrist in a park in autumn](https://images.pexels.com/photos/4436294/pexels-photo-4436294.jpeg?auto=compress&cs=tinysrgb&w=1600)

A few simple questions help you decide.

Do you mainly want to understand your night? A screenless tracker is forgotten about in bed, which makes a case for a band or a ring. Before you buy, read our article on [what sleep scores are really worth](/blog/sleep-tracking-tracker-scores-evening-routine): the night's estimate has its limits.

Do you want to track your workouts, your pace, your GPS? In that case a watch is often still more practical, since the screen is used directly during exercise.

Do you simply want to move more? An entry-level model is enough. If your goal is walking and a bit of strength work, our guide to [strength training at home](/blog/home-strength-training-equipment-beginner-routine) shows what to aim for without complicated equipment.

And the budget? Count the device, any subscription, and spare straps: at Garmin, an extra strap for the Cirqa is listed at $49.99 or $59.99 depending on whether it is worn on the wrist or the upper arm.

The Global Wellness Summit, in its January 2026 report, also notes a backlash against over-optimising wellbeing. In other words, a tracker can become a source of anxiety if you check it every hour. Choosing a discreet device also means giving yourself the right not to look.

## What these devices cannot do

They do not diagnose. An unusual figure in the app is not an illness, and a reassuring reading is not a medical green light. The ACSM points out that accuracy varies from one device to another. If a symptom worries you, or if an alert puzzles you, talk to a doctor rather than looking for the answer in a graph.

## FAQ

**Is a screenless band more accurate than a watch?**
None of the sources consulted demonstrates this. The ACSM simply states that the accuracy of devices varies. Wrist or finger sensors make estimates, which are not the equivalent of a medical examination.

**Do you have to pay a subscription?**
It depends on the model. According to the sources cited above, the Garmin Cirqa works without a subscription, the Fitbit Air includes three months of Google Health Premium, and the Oura Ring 5 requires a membership. Check the current terms before you buy.

**Are these devices available in France?**
The sources consulted talk about the United States and the United Kingdom. Prices and availability dates in France are not confirmed here: check the official stores.

**Can they be used to monitor your health?**
They give trend indicators on sleep, activity or heart rate. For any health question, a professional remains the person to turn to.

## In summary

The choice comes down less to the spec sheet than to three points: comfort on the wrist or finger, the cost over two years, and how you will actually use it. If you want to track your nights without wearing anything bulky, a screenless band or ring is a sound choice. If you run with GPS, a watch will do the job better. And if simply looking at numbers stresses you out, you are better off not buying one at all.
$q$, $q$https://images.pexels.com/photos/18662969/pexels-photo-18662969.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$fitness tracker$q$, $q$smart band$q$, $q$smart ring$q$, $q$sleep$q$, $q$wearables$q$, $q$wellbeing$q$, $q$fitness$q$, $q$Oura$q$, $q$Garmin$q$, $q$Fitbit$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$sport-wellness$q$), ARRAY['0c3e4b8d-21f6-4cb8-bb53-777e7ca467f6']::uuid[], NULL, $q$Screenless Tracker or Smart Ring: Which to Choose?$q$, $q$Fitbit Air, Garmin Cirqa, Oura Ring 5: formats, subscriptions and claimed battery life of 2026's screenless trackers, to help you choose well.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$sleep-tracking-tracker-scores-evening-routine$q$, 'uk', $q$Sleep tracking: how much are tracker scores really worth, and how can you sleep better without the stress?$q$, $q$Trackers estimate sleep rather than measure it. What they can do, the orthosomnia trap and a simple evening routine for better sleep.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. This article is for information only and does not replace the advice of a doctor.*


The alarm goes off, you reach for your phone: 71 out of 100. You felt fairly good, and suddenly you feel a bit less so. Sleep tracking with a band, ring or smartwatch has become commonplace, and the scores that come with it influence your mood in the morning. Best to know what these numbers represent, and how to use them without turning the night into a graded test.

## What a tracker measures (and what it estimates)

First point, and it changes a lot: a tracker does not measure sleep directly. According to ICT&health (article of 26 January 2026), these devices estimate the night from heart rate and movement, using algorithms. Bedtimes and wake-up times are now detected with good reliability. The split between light, deep and REM sleep is less reliable than in a sleep laboratory.

The Sleep Foundation, on a page updated on 28 May 2026 and medically reviewed, says much the same. It cites a 2021 study in which trackers identified deep sleep accurately in only 59% of cases, and states that only a sleep study in a specialist centre gives the most accurate data. The page adds that in the United States these devices are not regulated by the FDA.

In practical terms: the night's total and the timings are reasonable guides; the "deep sleep: 1 hr 12 min" box deserves more caution. Imagine a thermometer that gave the temperature to the minute, but that you knew was sometimes a degree out: you would use the trend, not the exact figure. Sleep tracking works in the same way.

## Orthosomnia: when the score becomes the problem

The term "orthosomnia" describes an obsessive quest for perfect sleep, fuelled by tracker data. The Sleep Foundation specifies that it is a proposed label, not an official diagnosis. In early research, some people stayed in bed longer to improve their score, which has nothing to do with sleeping better.

This concern ties in with an underlying trend. In its January 2026 report, the Global Wellness Summit describes a backlash against over-optimisation, and places sleep as the gateway to what it calls "neurowellness". ICT&health, for its part, notes that fixating on scores can create stress and worsen sleep, especially when you compare yourself with others or chase a target for sleep stages. Needs vary a great deal from one person to another.

## Getting the most from your sleep tracking

![Pillows and sheets on a sunlit bed](https://images.pexels.com/photos/13245210/pexels-photo-13245210.jpeg?auto=compress&cs=tinysrgb&w=1600)

So, should you put the tracker away in a drawer? Not necessarily. The experts cited by ICT&health acknowledge a real role for it: making sleep visible. Daniel Forger, of the University of Michigan, sees value in that visibility even though he points to clinical research for detailed analysis. Chantale Branson, of the Morehouse School of Medicine, notes that these devices are fine for spotting trends over several weeks, not for judging a single night.

A sensible way to go about it:

- Look at the weekly averages rather than last night.
- Look for simple links: ICT&health gives the example of more restless sleep after alcohol or a late meal.
- If the morning number makes you anxious, go two or three days without checking it. That is common-sense advice, not a medical recommendation.
- Do not spend longer in bed to "improve" the score, as the Sleep Foundation reminds us.

A concrete example: over three weeks, you notice that the nights after a late dinner are more fragmented. You move the meal by an hour for ten days and compare. There is no need for more technology than that, and the tracker then plays the role of a logbook rather than a judge.

If you are still unsure about which device to get, our guide to [screenless trackers, rings and watches](/blog/screenless-fitness-tracker-ring-or-watch-which-to-choose) compares the models released in 2026.

## An evening routine in three settings

![Bed with pillows bathed in morning light and geometric shadows](https://images.pexels.com/photos/31145681/pexels-photo-31145681.jpeg?auto=compress&cs=tinysrgb&w=1600)

Often the most effective thing is the bedroom itself. The Institut National du Sommeil et de la Vigilance (INSV), in a document published with Vitalaire in March 2026, boils its advice down to three ideas: cool, dark, quiet.

### Keeping it cool

The INSV advises keeping the bedroom at 18°C and airing it for about ten minutes before sleep. An article in Futura (August 2024) reports that the institute considers 18 to 19°C optimal and recommends not exceeding 20°C. The same lines add nuance: a US study of 50 older people found better sleep between 20 and 25°C, with big differences from one person to another. There is no magic temperature, then: adjust with common sense.

### Keeping it dark

Dim the lights one to two hours before bed, preferably with warm lighting. Close shutters and curtains, and switch off stray lights. Limit screens during the preceding hour, and put your phone in aeroplane mode.

### Keeping it quiet

Reduce ambient noise (window closed, earplugs if needed), turn off notifications, set up a relaxing routine and keep the bed for sleeping.

## When to talk to a doctor

A tracker is not designed to spot a sleep disorder. According to the INSV/Vitalaire document, snoring, pauses in breathing, frequent waking to urinate, daytime sleepiness or unrefreshing sleep may point to obstructive sleep apnoea syndrome, which affects between 4 and 9% of adults. In that case, talk to a doctor.

The Sleep Foundation also advises seeking help sooner if you have difficulty sleeping or daytime sleepiness, and mentions cognitive behavioural therapy for insomnia as something to discuss with a professional. A score of 62 says nothing about any of that.

## FAQ

**Are sleep trackers reliable?**
For timings and total duration, fairly, according to the sources cited. For the stages (deep, REM), less so. They are no substitute for a sleep study.

**What temperature should the bedroom be?**
The INSV gives 18°C, or 18 to 19°C according to the Futura article. It varies from person to person.

**My score is poor, should I worry?**
A single score does not mean much. If tiredness or a symptom persists, see a doctor rather than interpreting a number.

**Do an eye mask or earplugs help?**
They address two of the INSV's tips (darkness and quiet). They do not fix a sleep disorder, for which medical advice remains useful.

## In summary

A tracker can make the night easier to read, provided you take it for what it is: an estimate. Keep an eye on the trends, look after the bedroom, and leave the morning number in its place. If tiredness sets in, it is a question for a doctor, not for an app.
$q$, $q$https://images.pexels.com/photos/17371465/pexels-photo-17371465.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$sleep$q$, $q$sleep tracker$q$, $q$orthosomnia$q$, $q$bedtime routine$q$, $q$wellbeing$q$, $q$wearables$q$, $q$bedroom$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$sport-wellness$q$), ARRAY['0c3e4b8d-21f6-4cb8-bb53-777e7ca467f6']::uuid[], NULL, $q$Sleep Tracking: How Accurate Are Tracker Scores?$q$, $q$Trackers estimate sleep rather than measure it. What they can do, the orthosomnia trap and a simple evening routine to help you sleep better.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$home-strength-training-equipment-beginner-routine$q$, 'uk', $q$Strength training at home: the minimum equipment and a routine to get you started$q$, $q$How many sessions, what equipment, how many reps? A home strength training routine, backed by WHO and NHS guidelines.$q$, $q$*Transparency: Tendpick earns a commission if you buy through certain links in this article, at no extra cost to you. This article is for information only and does not replace a doctor or a qualified coach.*


You don't need a gym membership to work on your strength. Strength training at home mostly takes a bit of space, two or three pieces of equipment at most, and consistency that lasts over time. Here are the official guidelines, an example routine and what you should (or shouldn't) buy.

## Why strength is back in 2026

In its annual ranking of fitness trends for 2026, the ACSM puts traditional strength training in seventh place. It notes that fewer than 30% of American adults meet the muscle-strengthening recommendations, and argues for progressive, accessible programmes focused on long-term health and the ability to move, rather than on appearance.

The Global Wellness Summit, in its January 2026 report, points the same way, speaking of a desire for strength rather than slimness, particularly among women. An equipment manufacturer, BowFlex, predicts for its part, on its blog (December 2025), that people will keep setting up exercise corners at home, with adjustable dumbbells and foldable equipment. It is a commercial site promoting its own products, so take the forecast with the pinch of salt it deserves.

## How much, and how often

The guidelines are simple. The World Health Organization recommends that adults aged 18 to 64 do at least 150 minutes of moderate-intensity aerobic activity a week (or 75 minutes of vigorous intensity), up to 300 minutes for additional benefits. It adds muscle-strengthening activity on at least two days a week, working the main muscle groups.

The NHS gives practical guidelines: aim for 8 to 12 repetitions of each exercise, do at least 2 sets (3 to go further), until the point where one more repetition would be difficult without help. For beginners, it advises building up the load gradually over several weeks. The groups to work: legs, hips, back, abdomen, chest, shoulders and arms.

## Equipment: from nothing to a small corner of the living room

![Person holding purple dumbbells during a home workout](https://images.pexels.com/photos/8846572/pexels-photo-8846572.jpeg?auto=compress&cs=tinysrgb&w=1600)

Among the exercises to do at home, the NHS lists press-ups, sit-ups, squats, climbing stairs and even yoga, that is, bodyweight exercises with no equipment. To progress, it mentions weights and resistance bands.

One possible progression, without promising anything about results:

1. **Nothing at all.** Squats, press-ups (on your knees or against a wall at first), glute bridge, plank. A mat is enough to protect your wrists and back.
2. **Resistance bands.** They take up little room and are handy for horizontal rows or shoulder exercises.
3. **A pair of adjustable dumbbells or a kettlebell.** This is the equipment manufacturers push most for small spaces. Check the weight range and the locking system before buying.
4. **A folding bench**, only if you can see you are still at it after two or three months.

The takeaway: the equipment should follow the habit, not come before it. Many home strength training projects stall with new kit left sitting in a corner. It is better to start with three weeks of bodyweight work, see whether the rhythm holds, and then invest. Think about space too: a mat unrolled in five seconds in the living room is easier to store than a bench that blocks the way.

## An example routine for two sessions a week

![Woman doing a leg exercise with a red resistance band on a yoga mat](https://images.pexels.com/photos/6339636/pexels-photo-6339636.jpeg?auto=compress&cs=tinysrgb&w=1600)

This example is given as an illustration, modelled on NHS guidelines (2 sets of 8 to 12 repetitions). It is not a personalised programme. If possible, get a qualified sports instructor to show you the movements.

**Warm-up**: a few minutes of brisk walking, shoulder and hip rotations.

**Session A**
- Squat (bodyweight or with a dumbbell)
- Incline press-ups, hands on a stable piece of furniture
- Resistance band row
- Plank, for as long as you can hold it with good posture

**Session B**
- Reverse lunges
- Glute bridge
- Shoulder press with dumbbells or weighted bottles
- Side plank

Alternate A and B, with at least one day between sessions. Allow around half an hour, warm-up included: that is short enough to slot in before dinner or in the morning before work. Note down your repetitions. When 12 repetitions become easy, increase the load or slow the movement down. Sleep also plays a part in the routine: our article on [sleep tracking](/blog/sleep-tracking-tracker-scores-evening-routine) gives pointers for the bedroom.

## Adding walking: what the research says

Walking complements strength work well, and one figure circulates widely: 7,000 steps. It comes from a meta-analysis published in The Lancet Public Health in 2025, led by the University of Sydney and covering 57 studies. Compared with 2,000 steps a day, 7,000 steps were associated with a 47% lower risk of death and a 38% lower risk of dementia. Going up to 10,000 steps added only a little extra benefit for most of the outcomes studied.

Two caveats. These are associations observed in studies, not a promise for any individual. And the researchers point out that these results are not yet built into official guidelines; researcher Melody Ding calls it a "realistic" target, not a magic threshold. To count your steps, a pedometer or an activity tracker is enough: see our [comparison of screenless trackers, rings and watches](/blog/screenless-fitness-tracker-ring-or-watch-which-to-choose).

## Take care before you start

If you are returning to exercise after a long break, or if you have a chronic illness, persistent pain, a pregnancy or any doubt about your state of health, ask a doctor's advice before you begin. Stop any exercise that causes sharp pain. Start gently: progress happens over weeks.

## FAQ

**How many sessions a week to start with?**
The WHO recommends muscle-strengthening activity on at least two days a week. Two short sessions are enough to get going.

**Do you need dumbbells to progress?**
Not necessarily at first: bodyweight alone lets you train. Weights or bands are for making things harder later on.

**How many repetitions?**
The NHS says 8 to 12 repetitions of each exercise, in a minimum of 2 sets.

**Is 7,000 steps a day enough?**
According to the Sydney meta-analysis, it is associated with benefits close to those of 10,000 steps for most of the outcomes studied. If you are already active, 10,000 remains a good target, according to one of the researchers.

## In summary

Two sessions a week, a few basic movements, and walking when you can: that is a realistic framework which the WHO and the NHS support. Equipment comes after the habit. Start with a mat, add a band or a pair of adjustable dumbbells if you can see you are sticking with it, and keep a doctor or a qualified coach for the questions this article cannot settle.
$q$, $q$https://images.pexels.com/photos/8032738/pexels-photo-8032738.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$strength training$q$, $q$home workouts$q$, $q$beginner weight training$q$, $q$walking$q$, $q$7,000 steps$q$, $q$fitness$q$, $q$exercise equipment$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$sport-wellness$q$), '{}', NULL, $q$Home Strength Training: A Beginner's Routine$q$, $q$How many sessions, what equipment, how many reps? A home strength training routine for beginners, based on WHO and NHS guidelines.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$poster-gallery-wall-autumn-2026$q$, 'uk', $q$Gallery wall: how to put together a poster wall with character this autumn$q$, $q$Mismatched frames or a restrained wall? The autumn 2026 trends for pulling off a poster gallery wall, with simple rules to follow.$q$, $q$*Transparency: some of the links in this article are affiliate links. If you buy through them, Tendpick may earn a commission, at no extra cost to you. Tendpick has not tested the products mentioned, which are presented as selection ideas.*

The gallery wall, that wall covered in posters and frames, long felt like an exercise in geometry: six identical black frames, lined up to the millimetre above the sofa. In 2026, that reflex is starting to go out of fashion. To pull off a **poster gallery wall** this autumn, two directions are going head to head, and you can pick yours.

## Why the poster wall is changing its look in 2026

Etsy has ranked "Everyday Exhibits" among the key trends for spring and summer 2026, according to [Ideal Home](https://www.idealhome.co.uk/all-rooms/gallery-walls-everyday-exhibits-trend-2026) (article of 15 April 2026). The idea: more personal walls that mix pictures, ceramics, textiles and mirrors rather than lining up matching sets. Etsy sums up the new approach like this: "The best gallery walls feel collected, not coordinated." The platform also says that search interest in gallery prints has risen by 80% and in decorative mirrors by 50%. These are Etsy's figures, reported by the magazine, with no time period given.

The movement goes beyond the poster. ELLE Belgique, in an article of 25 January 2026, sees minimalism giving way to maximalism: rich materials, artworks on the walls, mixed eras and styles. Its phrase sums up the mood well: "the idea is no longer to hold back, but to dare". And looking back a little further, [SeLoger](https://edito.seloger.com/tendances/decoration-interieure/decoration-4-conseils-adopter-l-extravagance-maximalisme-article) was already advising in March 2025 to hang frames of different shapes and styles from floor to ceiling.

## Two schools of thought: the "collected" wall and the restrained wall

### The collected wall

This is the Etsy version. The tips reported by Ideal Home are concrete: mix frames in weathered wood and patinated metal, add a frame with a textured finish (fluted wood, for example), slip in a mirror, a wall light or even plates fixed up with adhesive discs. A line drawing can sit next to an oil portrait, a photograph next to an abstract painting. The magazine also recommends laying everything out on the floor before drilling: its author spent about an hour "editing" her arrangement this way, then made adjustments once it was up.

This style suits living spaces where you like objects to tell a story, and anyone who already has a pile of pictures, postcards and keepsakes.

### The restrained wall

At the other end of the spectrum, the art shop Rossetti Art argues in a February 2026 article for a gallery wall that is "more curated, less cluttered": five to seven pieces in total, compared with ten to fifteen in previous years, with a single frame style, two or three tones that echo one another and a main piece 30 to 40% larger than the others. This is a seller's point of view, not a study: treat it as a recipe, not a law.

Both approaches agree on the essentials. Neither calls for identical frames, and both prefer a coherent story to an accumulation.

## The rules in numbers for hanging with confidence

![Picture frames hung on a wall in a minimalist living room](https://images.pexels.com/photos/6699980/pexels-photo-6699980.jpeg?auto=compress&cs=tinysrgb&w=1600)

Rossetti Art gives precise guidelines, expressed in inches. Converted, here are the rough figures:

- Space between two frames: 2 to 3 inches, or roughly 5 to 8 cm.
- Centre of the arrangement: 57 to 60 inches from the floor, or roughly 145 to 152 cm, at eye level.
- Above a piece of furniture: 8 to 10 inches between the furniture and the bottom of the lowest frame, or roughly 20 to 25 cm.
- Slim frames, less than an inch wide (about 2.5 cm), for an up-to-date look.

These guidelines apply to a restrained wall. For a collected wall, keep them in mind but allow yourself some leeway: the whole thing should look as though it has been built up over time.

## Which images should you choose this autumn?

### The return of dark motifs and retro style

![Posters and photographs hung on a white wall](https://images.pexels.com/photos/7247495/pexels-photo-7247495.jpeg?auto=compress&cs=tinysrgb&w=1600)

eRank's trend guide for autumn 2026 (published on 4 August 2026) highlights "gothic florals": plum roses on a black background, faded burgundy flowers and espresso brown, with motifs of moths, moons and vines. It also names a shade, Plum Noir, a deep purple with hints of burgundy and brown. It is aimed at Etsy sellers, but it gives a good idea of what is circulating in illustration right now.

On the retro side, Pinterest Predicts 2026 announces Néo Déco, an Art Deco revival with chevrons, fan-shaped arches and chrome or brass details. On a wall, that means graphic posters, geometric lines and gold frames.

### A light background to let the art speak

Pantone has named Cloud Dancer (11-4201), a luminous, airy white, its colour of the year for 2026, announced on 4 December 2025. Pantone speaks of a "blank canvas". If your walls are white or cream, now is exactly the time to bring colour in through the pictures. [Planner 5D](https://planner5d.com/blog/fr/cloud-dancer-couleur-annee-2026-pantone/) advises choosing artworks and wall pieces that bring texture and identity, to avoid the cold effect of an all-white interior.

## A four-step method

1. Choose a dominant colour or two close tones, then look for images around it. A shared palette lets you mix styles without it looking messy.
2. Cut paper templates to the size of the frames and stick them to the wall with masking tape. You can see the arrangement before you drill.
3. Place the main piece first, then the others around it. Alternate large and small formats.
4. Add an element that is not a picture: a mirror, a small shelf, a ceramic object. See our article on [design objects and craft for autumn 2026](/blog/design-objects-craft-trends-autumn-2026) for ideas.

## Frequently asked questions

**How many posters do you need for a gallery wall?**
For a restrained wall, Rossetti Art recommends five to seven pieces. For a collected wall, there is no set number: you start from what you have and add to it over time.

**Do the frames all have to be identical?**
No. That is in fact the opposite of Etsy's "collected" trend. If you prefer unity, keep to a single frame style but vary the formats.

**How can you avoid drilling too many holes?**
Lay the frames out on the floor, then use paper templates on the wall. Ideal Home notes that small nail holes are easy to fill, but it is better to make few of them.

**Which poster colours should you choose on a white wall?**
Anything goes. White acts as a neutral backdrop, as Pantone explains for Cloud Dancer. Warm tones (burgundy, brown) and deep blacks give contrast, while bright colours give energy.

A poster wall pairs nicely with small pieces displayed beneath it. Our article on [creative stationery and crafts](/blog/creative-stationery-crafts-autumn-2026) also offers ideas for making your own illustrations to frame. Finally, find all our selections in the [Art & Design category](/produits).
$q$, $q$https://images.pexels.com/photos/34673857/pexels-photo-34673857.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$gallery wall$q$, $q$posters$q$, $q$wall decor$q$, $q$picture frames$q$, $q$2026 trends$q$, $q$wall art$q$, $q$Cloud Dancer$q$, $q$retro style$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$art-design$q$), '{}', NULL, $q$Poster gallery wall ideas for autumn 2026$q$, $q$Mismatched frames or a restrained wall? The autumn 2026 trends for pulling off a poster gallery wall, with simple rules to follow.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$design-objects-craft-trends-autumn-2026$q$, 'uk', $q$Design objects and craft: what Maison&Objet and Paris Design Week are signalling for autumn 2026$q$, $q$Materials, craft, vases and colour: what Maison&Objet and Paris Design Week 2026 tell us about the design objects to bring home this autumn.$q$, $q$*Transparency: some of the links in this article are affiliate links. If you buy through them, Tendpick may earn a commission, at no extra cost to you. Tendpick has not tested the products mentioned: this article describes trends and types of product.*

Every September, Paris packs into ten days the most inventive work that interior design has to offer. This year, Maison&Objet and Paris Design Week were held at the same time, and their messages overlap. Here is what you can take from them when choosing beautiful **design objects** this autumn, without needing a gallery owner's budget.

## September 2026 in Paris: two events, one subject

Maison&Objet took place from 10 to 14 September 2026 at Paris Nord Villepinte, for trade visitors only. According to [Paris Select Book](https://parisselectbook.com/2026/08/31/maisonobjet-septembre-2026-le-grand-rendez-vous-deco-qui-va-donner-le-ton-de-la-rentree), the show brought together 1,700 brands from 49 countries, 450 of them new, on the theme "Pulse in Motion", devised with the trend agency NellyRodi. Three trend spaces, "Utopia Now", "Kaleido-Scope" and "Color Power", promised "bold colours" and "poetic objects". The studio Masquespacio was its ambassador. Among the seven sectors is Fine Craft, devoted to artisan crafts.

Paris Design Week, for its part, is open to everyone, free of charge. From 10 to 19 September 2026, [Paris Friendly](https://www.paris-friendly.fr/paris-design-week-2026-programme.html) counts 320 addresses and 500 participants spread across four districts (the Marais, Saint-Germain-des-Prés, the Opéra and Bastille). The common thread, according to [designboom](https://www.designboom.com/?p=1201577): young designers, craft, and heritage venues turned into stages, from the Grand Palais to the Arc de Triomphe.

## Materials take centre stage

The clearest thing the exhibitions have in common: the material comes to the fore. Designboom cites hanji paper (the Hanjimania exhibition at the Hôtel de la Marine, with French and Korean designers), onyx, porcelain, feathers and shearling, Greek Cipollino marble, red travertine, walnut, and lacquers whose colour changes with the light. Joseph Walsh, the guest of honour, is showing two monumental ash sculptures, "Arcanum Formae", which can be seen until 25 October at the Hôtel de Sully.

What does that mean for an ordinary home? A beautiful object does not need to be spectacular: a piece in solid wood, stone or glazed ceramic has presence because you can see and feel its material. This year's white, Cloud Dancer, calls for exactly this kind of contrast. [Planner 5D](https://planner5d.com/blog/fr/cloud-dancer-couleur-annee-2026-pantone/) advises pairing it with wood, stone and natural fibres to keep it warm.

## The vase, star object of the autumn

![Ceramic vases in a variety of colours and textures](https://images.pexels.com/photos/8063852/pexels-photo-8063852.jpeg?auto=compress&cs=tinysrgb&w=1600)

Impossible to miss: the 1000 VASES exhibition (8 rue Chapon, 10 to 13 September) brought together, according to designboom, vases by independent makers from more than 60 countries. The eRank guide to autumn 2026 notes, for its part, handmade ceramics, darker woods and rounded, organic shapes for warm interiors.

A vase is a very good way into design: it does its job with or without flowers, it can go anywhere, and it rarely costs as much as a piece of furniture. Shape matters more than size. A slightly unexpected silhouette (narrow neck, wide base, relief) is enough to make it a design object in its own right.

## Craft as a "safe haven"

![Pieces of raw clay pottery, minimalist setting](https://images.pexels.com/photos/8063795/pexels-photo-8063795.jpeg?auto=compress&cs=tinysrgb&w=1600)

Paris Match Belgique, in its article on 2026 decor (18 November 2025), writes that craft, "far from being a passing fad, is becoming a safe haven". It cites ceramics, weaving, patina, restoring rather than replacing, and hunting for secondhand finds. ELLE Belgique takes the same line in January 2026: interiors designed to be photogenic are giving way to vintage pieces, inherited objects and individual tastes.

Fundamentally, this is good news for anyone who does not like following trends to the letter. A handmade object, even a modest one, has irregularities that make it unique. And it is easier to match with everything else, precisely because it is not "matching".

## Colour and retro: what is being said

On the palette side, designboom picks out, for example, the four shades of the DAYDREAM collaboration (Magma Orange, Chocolate Brown, Ice Cream Beige, Astral Purple) shown at the Grand Palais, and Masquespacio's colourful identity for the show. Paris Match Belgique, for its part, mentions earthy tones (burgundy, clay brown, forest green), Klein blue and sunny yellow, and "retro-glam" with golden glints and deep velvets.

Pinterest Predicts 2026 (9 December 2025) confirms the spirit of the times with Néo Déco, an Art Deco revival (chevrons, fan-shaped arches, chrome or brass details), and Chapithome, circus-inspired interiors with bold stripes and sculptural shapes, tempered by muted palettes. These are search trends, not obligations: take a touch of one, a single object, not the whole room.

## What the show says about what comes next

Interior Daily, in an article of 29 May 2026 on the September edition, mentions a new platform called (im)Pulse, which showcases emerging creative scenes, and a concept titled "A New Decor Narrative": how furniture, textiles, accessories and objects make up expressive interiors that say something about the people who live in them. It is the same idea as at ELLE Belgique: the home as a portrait, not a catalogue. For a buyer, the lesson is simple. Better an object that suits you than a "trendy" object that means nothing to you.

## How to take inspiration at home without breaking the bank

### Choose one piece, not ten

Trade shows display whole sets. At home, a single strong piece is enough: a sculptural vase on a console table, a ceramic candlestick, a wooden tray. Surround it with space.

### Pay attention to the material

Look for grain, glaze, veining and irregularities. If you are torn between two objects at a similar price, take the one whose material is easiest to read. To complete the look, a well-composed art wall does the same job: see our guide to [putting together a poster gallery wall](/blog/poster-gallery-wall-autumn-2026).

## Frequently asked questions

**Can you still see Paris Design Week exhibitions?**
Several have closed, but according to designboom, Joseph Walsh's "Arcanum Formae" runs until 25 October 2026 at the Hôtel de Sully, and the Yves de la Tour d'Auvergne retrospective at Pulp Galerie until 31 October. Check opening times before you travel.

**Is Maison&Objet open to the public?**
No, the show is for trade visitors only. Paris Design Week, on the other hand, is free and open to everyone.

**Which design object should you choose first?**
A vase or a ceramic object. It is versatile, durable and can be refreshed over time.

**How can you avoid the "boutique" look?**
Mix eras and origins, as ELLE Belgique suggests, and keep a few secondhand or inherited pieces.

If you like making things yourself, our article on [creative stationery and crafts](/blog/creative-stationery-crafts-autumn-2026) offers ideas for trying paint-your-own ceramics or crochet. All our ideas are gathered in the [Art & Design category](/produits).
$q$, $q$https://res.cloudinary.com/dznkihcch/image/upload/v1792249399/blog/aplixwklrf0wecxbwhtk.jpg$q$, 'draft', ARRAY[$q$design objects$q$, $q$Maison&Objet 2026$q$, $q$Paris Design Week$q$, $q$handmade craft$q$, $q$ceramics$q$, $q$vases$q$, $q$home decor trends$q$, $q$materials$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$art-design$q$), '{}', $q$Jerome$q$, $q$Design objects 2026: key takeaways from Maison&Objet$q$, $q$Materials, craft, vases and colour: what Maison&Objet and Paris Design Week 2026 tell us about the design objects to bring home this autumn.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$creative-stationery-crafts-autumn-2026$q$, 'uk', $q$Creative stationery and crafts: the return of paper and handmade this autumn$q$, $q$Notebooks, letter writing, craft kits: why paper and handmade are back in autumn 2026, and what to choose as a gift or a treat for yourself.$q$, $q$*Transparency: some of the links in this article are affiliate links. If you buy through them, Tendpick may earn a commission, at no extra cost to you. Tendpick has not tested the products mentioned: they are described by type, as ideas.*

A notebook with a colourful cover, a pen that glides nicely, an envelope you want to open. In autumn 2026, **creative stationery** is no longer just about going back to school: it has joined the aisle of little treats and gifts. And it goes well with hands-on crafts, which already keep plenty of people busy.

## Why paper is coming back

TelQuel (7 January 2026) describes a return to the analogue, from vinyl to handwritten letters by way of notebooks and printed photos, as a reaction to digital overload. The accessible extract is short, with no figures or study cited, so it should be read as an observation, not a measurement. The article does not reject digital for all that, which it considers "indispensable and inevitable": it simply suggests adding one analogue activity to daily life.

The same conclusion appears in a Maison&Objet article published in January 2025: stationery appeals as a tactile counterpoint to screens, associated with calm, creativity and self-expression. The founder of Papier Tigre, Maxime Brenon, explains there that a notebook "lets you disconnect, remember better and adopt a slower pace" (a loose rendering of the original English quotation).

## Creative stationery moves out of the office-supplies aisle

![Floral-covered journal with dried leaves and handwritten notes](https://images.pexels.com/photos/17042547/pexels-photo-17042547.jpeg?auto=compress&cs=tinysrgb&w=1600)

According to that Maison&Objet article, creative stationery has gone from a purely functional purchase to a more indulgent one. The range has widened: beyond notebooks and diaries, there is wrapping paper, architecture-inspired notepads, tick-off lists, storage boxes and repositionable notes. Home and design brands (Hay, Muuto, Ferm Living) have launched stationery collections, and long-established names such as Moleskine or Leuchtturm1917 are adopting bright colours and bold graphics.

A remark by the manager of a shop in Lille quoted in the article explains the appeal as a gift: stationery remains an impulse buy and a safe choice for giving. In other words, nothing is easier to slip under the Christmas tree or to give to a colleague.

## Writing letters: the "Club Courrier" effect

![Hand writing in pencil in an open notebook](https://images.pexels.com/photos/8548384/pexels-photo-8548384.jpeg?auto=compress&cs=tinysrgb&w=1600)

Pinterest Predicts 2026 (9 December 2025) ranks among its 21 trends Club Courrier, a revival of letter writing with coloured envelopes, themed stickers, decorative stamps, handwritten notes and gifts sent by post. Another trend, La vie en prose, evokes a poetic style in which the fountain pen has its place. Pinterest states that its predictions are based on analysis of searches and visual signals on its platform, and claims that 88% of its predictions over the past six years have come true. This is the company's own figure, and it is marking its own homework.

In practice, this translates into a small ritual: a letter a month to a friend, a card for every birthday, a note in a relative's letterbox. It takes very little: nice paper, envelopes, stamps.

## Crafts, an already well-established pastime

An OpinionWay survey for Wecandoo, carried out in July 2024 among 1,026 people aged 18 and over, indicates that 34% of French people do a creative or hands-on activity, and 42% of those aged 25 to 34. 37% say they would like to do more of it. 19% would prefer to be guided by a professional to get started (29% among 25 to 34-year-olds). This study dates from 2024 and comes from a workshop platform: it gives an order of magnitude, not a measurement for 2026.

The Tendances Créatives show in Montpellier illustrates the breadth of the field: sewing, knitting, crochet, beadwork, scrapbooking, patchwork, customisation, craft kits. The 2026 edition was held from 12 to 15 March and brought together around a hundred exhibitors; the next is announced for 4 to 7 March 2027. Pinterest also picks out lace and crochet in its Dans la dentelle trend.

## An easy end-of-year gift to get right

A few weeks from the festive season, stationery has a rare advantage: it suits almost everyone and fits a reasonable budget. A well-chosen notebook says more than a generic object, especially when it comes with a handwritten note. For a teenager, a journal with a graphic cover. For a colleague, a smart notepad. For a grandmother, a set of writing paper and stamps, which will give her a reason to write back. Craft kits play the same role for those who like making things: they are given in a box, and the activity comes with it.

## What to choose for each type of person

### For writing and organising

- A notebook or journal with a cover you like: the Maison&Objet article stresses that the pleasure of the object matters as much as its function.
- A pen that feels good in the hand.
- Writing paper, coloured envelopes, stickers and a rubber stamp for the Club Courrier spirit.

### For making

- A paint-by-numbers or embroidery kit, to get started without buying materials piece by piece.
- Paint-your-own ceramics: a plain piece to decorate, simple to try at home. See also our article on [design objects and craft this autumn](/blog/design-objects-craft-trends-autumn-2026).
- A crochet or knitting kit for a first project.

If you would like to frame your creations, our guide to [putting together a poster wall](/blog/poster-gallery-wall-autumn-2026) gives you guidelines on height and spacing.

## Patterns and colours of the season

eRank's guide to autumn 2026 (published on 4 August 2026) recommends, for stationery, gothic florals (plum roses on a black background), Plum Noir, checks (gingham, houndstooth, small checkerboards) and "cozymaxxing" sets: journals and reading cushions for a snug autumn. The guide is aimed at Etsy sellers and gives no search figures, but it offers style pointers for choosing a notebook or a letter-writing pad.

## Frequently asked questions

**What exactly is creative stationery?**
Notebooks, cards, papers, pens and accessories designed for their looks as much as for their use, as Maison&Objet describes them.

**Where should you start with crafts if you are a beginner?**
With a complete kit. It saves you choosing supplies at random. The OpinionWay/Wecandoo survey notes that 19% of French people would prefer professional guidance to get started.

**What is a simple, personal gift idea?**
A notebook with a lovely pen, or a set of writing paper. A handwritten card changes everything.

**Are the trends in this article measured?**
They come from a variety of sources (Pinterest, Maison&Objet, eRank, TelQuel), not all of which give figures. We have indicated each time what is backed by figures and what is not.

Find all our ideas in the [Art & Design category](/produits).
$q$, $q$https://images.pexels.com/photos/1174122/pexels-photo-1174122.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$creative stationery$q$, $q$arts and crafts$q$, $q$notebooks$q$, $q$letter writing$q$, $q$craft kits$q$, $q$DIY$q$, $q$gift ideas$q$, $q$2026 trends$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$art-design$q$), '{}', NULL, $q$Creative stationery and crafts: ideas for 2026$q$, $q$Notebooks, letter writing, craft kits: why paper and handmade are back in autumn 2026, and what to choose as a gift or a treat for yourself.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Contrôle : doit renvoyer 12 lignes en statut draft.
-- SELECT slug, market, status FROM blog_posts WHERE market = 'uk' ORDER BY created_at DESC LIMIT 12;
