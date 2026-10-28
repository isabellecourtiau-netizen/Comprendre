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
| `mg-mode-test` | Mode test activé (maintenance uniquement) | Le mode test |

## Le format (schéma 2)

```json
{
  "format": "micro-gestes",
  "schema": 2,
  "appVersion": "1.0.0",
  "creeLe": "…", "modifieLe": "…", "migreDe": "pp24",
  "acces": { "deverrouille": true, "methode": "code-test", "le": "…" },
  "reglages": { "rythme": "rdv", "heureRdv": "08:00", "degre": 3, "derniereSauvegarde": null, "rappelSauvegardeMasque": null },
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

**Accès** : `acces.methode` vaut `code-test` (code saisi), `lien` (lien `#acces=CODE`) ou
`utilisateur-existant` (toute personne qui avait déjà un parcours garde son accès).
Le code de test est dans `CFG.codeTest` (index.html). Il sera remplacé en phase 3 par
le formulaire d'accès.

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

## Mode test

Dans les Réglages, toucher 5 fois de suite la ligne « Version … » active le mode test
(ou ajouter `?test=1` à l'adresse ; `?test=0` le désactive). Il permet de simuler un
ancien utilisateur (données au format `pp24`), un nouveau lecteur, d'afficher le rappel
de sauvegarde et de voir les données enregistrées.

## Tests automatiques

Le fichier `tests/test-parcours.js` vérifie l'accès réservé, le volet Trac libre,
Mes notes, Vos données, le rappel de sauvegarde et le mode test.
Le fichier `tests/test-donnees.js` vérifie : premier lancement, conversion depuis
`pp24`, relance, enregistrement, sauvegarde puis restauration, ancien code de
reprise, données d'une version plus récente, données abîmées.

Il faut Node.js et le paquet `puppeteer` :

```
npm install puppeteer
python3 -m http.server 8765 --bind 127.0.0.1   (depuis le dossier de l'application)
node tests/test-donnees.js && node tests/test-parcours.js   (dans un autre terminal)
```

## Historique

| Version | Date | Schéma | Changements |
|---|---|---|---|
| v-trac | 4 oct. 2026 | 1 (`pp24`) | Version de Yann, avec le volet Trac |
| 1.0.0 | nov. 2026 | 2 | Données versionnées, conversion de `pp24`, copies de secours, sauvegarde fichier avec aperçu, stockage durable, polices hébergées avec l'application, numéro de version dans les Réglages |
| 1.1.0 | nov. 2026 | 2 | Accès réservé au parcours (code de test, lien d'accès), volet Trac libre, utilisateurs existants déverrouillés, écrans « Mes notes » et « Vos données » (avec « Tout effacer »), rappel doux de sauvegarde, mode test, textes d'accueil mis à jour, partage du livre au lieu de l'application. Champs ajoutés sans changer de schéma : `acces`, `reglages.rappelSauvegardeMasque`. |
| 1.1.1 | nov. 2026 | 2 | Icône et nom « MG test » pour distinguer la version de travail. **À remettre avant la mise en ligne pour les lecteurs.** |
