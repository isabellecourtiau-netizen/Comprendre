# Micro-gestes — données et versions

Ce document explique comment l'application range les données des utilisateurs,
et les règles à suivre pour ne jamais rien perdre d'une version à l'autre.

## Où sont les données

Tout reste sur le téléphone de la personne, dans le stockage du navigateur
(localStorage). Rien n'est envoyé à un serveur.

| Clé | Contenu | Qui l'écrit |
|---|---|---|
| `mg-donnees` | Les données actuelles, au format versionné (schéma 2) | L'application, à chaque action |
| `pp24` | Ancien format (Micro-gestes jusqu'à la v-trac). **Jamais effacé.** | Anciennes versions |
| `pp5` | Format de « Premier Pas » (avril 2026). Structure différente, non convertie. **Jamais effacé.** | Anciennes versions |
| `mg-secours-pp24` | Copie de l'ancien format, faite au moment de la conversion | L'application, une seule fois |
| `mg-secours-schema-N` | Copie avant chaque future conversion de schéma | L'application |
| `mg-secours-avant-restauration` | Copie des données avant une restauration | L'application |
| `mg-secours-illisible-…` | Copie de données abîmées, si la lecture a échoué | L'application |

## Le format (schéma 2)

```json
{
  "format": "micro-gestes",
  "schema": 2,
  "appVersion": "1.0.0",
  "creeLe": "…", "modifieLe": "…", "migreDe": "pp24",
  "acces": null,
  "reglages": { "rythme": "rdv", "heureRdv": "08:00", "degre": 3, "derniereSauvegarde": null },
  "cycleEnCours": {
    "numero": 1, "parcours": "rum", "jour": 14,
    "gestesFaits": [], "notes": {}, "avisGestes": {}, "avisGestesJour": {},
    "releve": {}, "passagesVus": [], "fin": 0
  },
  "cyclesArchives": [],
  "questionnaires": [],
  "selectionPerso": null,
  "autres": {}
}
```

Correspondance avec l'ancien format `pp24` :

| Ancien | Nouveau |
|---|---|
| `parcours`, `day`, `done`, `memos` | `cycleEnCours.parcours`, `.jour`, `.gestesFaits`, `.notes` |
| `fb`, `fbd` (cœur = 1, croix = -1, et le jour) | `cycleEnCours.avisGestes`, `.avisGestesJour` |
| `releve`, `seuils`, `fin`, `cycle` | `cycleEnCours.releve`, `.passagesVus`, `.fin`, `.numero` |
| `arch` | `cyclesArchives` |
| `qhist` | `questionnaires` |
| `mode`, `remind`, `deg` | `reglages.rythme`, `.heureRdv`, `.degre` |
| `persoL` | `selectionPerso` |
| tout autre champ inconnu | `autres` (rien n'est perdu) |
| `scr`, `tab`, `q`, `qi`, `qorder`, `vday`… | **non enregistrés** (état de l'écran) |

**Données de santé** : `notes`, `releve`, `questionnaires`, `parcours` et les cycles
archivés ne doivent **jamais** quitter le téléphone, sauf dans le fichier de
sauvegarde que la personne enregistre elle-même.

## Règles pour chaque nouvelle version

1. Changer `APP_VERSION` dans `index.html` **et** `V` dans `sw.js` (même valeur).
2. Si la forme des données change :
   - augmenter `SCHEMA` d'un cran ;
   - ajouter `MIGR[ancien numéro]` qui convertit l'ancien schéma vers le nouveau ;
   - ne jamais supprimer un champ sans le convertir ;
   - mettre à jour ce document.
3. Ne jamais effacer une ancienne clé (`pp24`, `pp5`, `mg-secours-…`).
4. Lancer les tests (ci-dessous) avant de publier.

## Tests automatiques

Le fichier `tests/test-donnees.js` vérifie : premier lancement, conversion depuis
`pp24`, relance, enregistrement, sauvegarde puis restauration, ancien code de
reprise, données d'une version plus récente, données abîmées.

Il faut Node.js et le paquet `puppeteer` :

```
npm install puppeteer
python3 -m http.server 8765 --bind 127.0.0.1   (depuis le dossier de l'application)
node tests/test-donnees.js                       (dans un autre terminal)
```

## Historique

| Version | Date | Schéma | Changements |
|---|---|---|---|
| v-trac | 4 oct. 2026 | 1 (`pp24`) | Version de Yann, avec le volet Trac |
| 1.0.0 | nov. 2026 | 2 | Données versionnées, conversion de `pp24`, copies de secours, sauvegarde fichier avec aperçu, stockage durable, polices hébergées avec l'application, numéro de version dans les Réglages |
