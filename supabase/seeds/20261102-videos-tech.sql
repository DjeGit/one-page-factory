-- Vidéos officielles (chaînes des fabricants) pour les fiches Tech du 01/11/2026. Relevées sur YouTube le 02/11/2026.
-- Relançable. Pas de vidéo officielle trouvée pour : Ryzen 7 7800X3D, SOYO RTX 3070, lunettes connectées (laissées sans vidéo).

-- Shokz OpenRun Pro 2 : FR = vidéo de la chaîne Shokz en français ; ES et UK = vidéo officielle en anglais
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=tdvSJAjhlAM' WHERE slug = 'shokz-openrun-pro-2-ecouteurs-conduction-osseuse';
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=hB_8ATFkrn4' WHERE slug IN ('shokz-openrun-pro-2-auriculares-conduccion-osea', 'shokz-openrun-pro-2-bone-conduction-headphones');

-- Garmin Forerunner 255 (Garmin, présentation de la série)
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=vjb31lyG2tA'
WHERE slug IN ('garmin-forerunner-255-montre-gps-running', 'garmin-forerunner-255-reloj-gps-running', 'garmin-forerunner-255-gps-running-watch');

-- Garmin Forerunner 165 (Garmin, présentation de la série)
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=IQS5QsafSKg'
WHERE slug IN ('garmin-forerunner-165-montre-gps-running', 'garmin-forerunner-165-reloj-gps-running');

-- DJI Osmo Pocket 3 (DJI, « Introducing DJI Osmo Pocket 3 »)
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=_Bpwo7JlmII'
WHERE slug IN ('dji-osmo-pocket-3-camera-poche-stabilisee-4k', 'dji-osmo-pocket-3-camara-bolsillo-estabilizada-4k');

-- AMD Ryzen 5 9600X et Ryzen 7 9700X (AMD Gaming, série Ryzen 9000)
UPDATE products SET video_url = 'https://www.youtube.com/watch?v=Nk0TZOeCZsw'
WHERE slug IN ('amd-ryzen-5-9600x-processeur-6-coeurs', 'amd-ryzen-5-9600x-procesador-6-nucleos', 'amd-ryzen-5-9600x-6-core-processor',
               'amd-ryzen-7-9700x-processeur-8-coeurs', 'amd-ryzen-7-9700x-procesador-8-nucleos', 'amd-ryzen-7-9700x-8-core-processor');
