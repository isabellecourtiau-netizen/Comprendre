const puppeteer = require('puppeteer');
const URL = 'http://127.0.0.1:8765/';
const ANCIEN = {scr:'home',tab:'j',parcours:'rum',deg:3,mode:'rdv',day:14,done:[1,2,3,5,8],
  memos:{'3':'Note de test jour 3 — œ, é, « guillemets »','8':'Deuxième note'},
  fb:{C02:1,C05:-1},fbd:{C02:3,C05:4},releve:{'3':2,'5':4,'8':1},remind:'07:30',
  q:[],qi:0,qorder:null,vday:null,qhist:[{t:1760000000000,scores:{rum:5},suggest:'rum',cycle:1}],
  seuils:[7],fin:0,cycle:2,arch:[{cycle:1,parcours:'sur',memos:{'2':'Ancien cycle'},done:[1,2],releve:{'2':3}}]};
let ok = 0, ko = 0;
function verif(nom, cond, detail) { if (cond) { ok++; console.log('  ✔', nom); } else { ko++; console.log('  ✘', nom, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300)); } }

(async () => {
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox']});
  async function page0(prep) {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    const erreurs = [], externes = [];
    p.on('pageerror', e => erreurs.push(e.message));
    p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) externes.push(r.url()); });
    await p.goto(URL, {waitUntil: 'load'});
    if (prep) { await p.evaluate(prep); await p.reload({waitUntil: 'load'}); }
    await new Promise(r => setTimeout(r, 800));
    return {p, ctx, erreurs, externes};
  }
  const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);

  console.log('T1 Premier lancement, aucune donnée');
  let {p, ctx, erreurs, externes} = await page0();
  verif('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  verif('aucun appel à un site extérieur (polices locales)', externes.length === 0, externes);
  verif('écran d’accueil affiché', await p.evaluate(() => S.scr === 'w'));
  const polices = await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight); });
  verif('polices chargées depuis l’application', polices.length >= 2, polices);
  await ctx.close();

  console.log('T2 Migration depuis l’ancienne clé pp24');
  ({p, ctx, erreurs} = await (async () => { const c = await browser.createBrowserContext(); const pg = await c.newPage(); const er = []; pg.on('pageerror', e => er.push(e.message));
    await pg.goto(URL); await pg.evaluate(a => localStorage.setItem('pp24', JSON.stringify(a)), ANCIEN); await pg.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 800)); return {p: pg, ctx: c, erreurs: er}; })());
  verif('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  const env = JSON.parse(await ls(p, 'mg-donnees') || 'null');
  verif('nouvelle clé créée, schéma 2', env && env.schema === 2 && env.format === 'micro-gestes', env);
  verif('migreDe = pp24', env && env.migreDe === 'pp24');
  verif('ancienne clé pp24 intacte', (await ls(p, 'pp24')) === JSON.stringify(ANCIEN));
  verif('copie de secours mg-secours-pp24', (await ls(p, 'mg-secours-pp24')) === JSON.stringify(ANCIEN));
  const etat = await p.evaluate(() => ({parcours: S.parcours, day: S.day, done: S.done, memos: S.memos, fb: S.fb, fbd: S.fbd, releve: S.releve, remind: S.remind, seuils: S.seuils, cycle: S.cycle, arch: S.arch, qhist: S.qhist, scr: S.scr}));
  for (const k of ['parcours','day','done','memos','fb','fbd','releve','remind','seuils','cycle','arch','qhist'])
    verif('champ ' + k + ' identique', JSON.stringify(etat[k]) === JSON.stringify(ANCIEN[k]), [etat[k], ANCIEN[k]]);
  verif('écran du jour affiché', etat.scr === 'home');
  verif('champs d’écran non enregistrés', env && !('scr' in (env.autres||{})) && !('qorder' in (env.autres||{})));
  verif('notes rangées dans cycleEnCours', env && env.cycleEnCours.notes['3'] === ANCIEN.memos['3']);

  console.log('T3 Relance : rien ne change, pas de double migration');
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  const env2 = JSON.parse(await ls(p, 'mg-donnees'));
  verif('date de création conservée', env2.creeLe === env.creeLe, [env2.creeLe, env.creeLe]);
  verif('jour toujours 14', await p.evaluate(() => S.day === 14));

  console.log('T4 Une action de l’utilisateur est bien enregistrée');
  await p.evaluate(() => { S.memos['9'] = 'Nouvelle note'; sv(); });
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  verif('nouvelle note retrouvée après relance', await p.evaluate(() => S.memos['9'] === 'Nouvelle note'));

  console.log('T5 Sauvegarde fichier puis restauration sur un « nouveau téléphone »');
  const sauvegarde = await p.evaluate(() => { const e = enveloppeActuelle(); e.type = 'sauvegarde'; return JSON.stringify(e); });
  await p.evaluate(() => rReglages(document.getElementById('scr')));
  const reg = await p.evaluate(() => document.getElementById('scr').innerText);
  verif('Réglages : bouton de sauvegarde', reg.includes('Enregistrer une sauvegarde'));
  verif('Réglages : numéro de version', reg.includes('Version 1.0.0'), reg.slice(-300));
  await ctx.close();
  ({p, ctx, erreurs} = await page0());
  await p.evaluate(txt => lireSauvegarde(txt), sauvegarde);
  const apercu = await p.evaluate(() => (document.getElementById('ovR') || {}).innerText || '');
  verif('aperçu affiché avant remplacement', apercu.includes('Rumination') && apercu.includes('jour 14'), apercu);
  await p.evaluate(() => confirmerRestauration());
  verif('données restaurées', await p.evaluate(() => S.parcours === 'rum' && S.day === 14 && S.memos['9'] === 'Nouvelle note' && S.arch.length === 1));
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  verif('toujours là après relance', await p.evaluate(() => S.day === 14));
  verif('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  await ctx.close();

  console.log('T6 Ancien code de reprise toujours accepté');
  const ancienCode = Buffer.from(unescape(encodeURIComponent(JSON.stringify(ANCIEN))), 'binary').toString('base64');
  ({p, ctx, erreurs} = await page0());
  verif('code accepté', await p.evaluate(c => restoreCode(c), ancienCode));
  verif('parcours repris', await p.evaluate(() => S.parcours === 'rum' && S.day === 14));
  await ctx.close();

  console.log('T7 Données d’une version plus récente : jamais écrasées');
  const futur = JSON.stringify({format: 'micro-gestes', schema: 99, cycleEnCours: {parcours: 'rum', jour: 20}});
  ({p, ctx, erreurs} = await (async () => { const c = await browser.createBrowserContext(); const pg = await c.newPage(); const er = []; pg.on('pageerror', e => er.push(e.message));
    await pg.goto(URL); await pg.evaluate(f => localStorage.setItem('mg-donnees', f), futur); await pg.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
    await pg.evaluate(() => sv()); return {p: pg, ctx: c, erreurs: er}; })());
  verif('données intactes', (await ls(p, 'mg-donnees')) === futur);
  verif('message affiché', await p.evaluate(() => !!ALERTE_DONNEES));
  await ctx.close();

  console.log('T8 Données illisibles : rien n’est effacé');
  ({p, ctx, erreurs} = await (async () => { const c = await browser.createBrowserContext(); const pg = await c.newPage(); const er = []; pg.on('pageerror', e => er.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.setItem('mg-donnees', '{abîmé')); await pg.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
    await pg.evaluate(() => sv()); return {p: pg, ctx: c, erreurs: er}; })());
  verif('contenu abîmé conservé', (await ls(p, 'mg-donnees')) === '{abîmé');
  verif('copie de secours créée', await p.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('mg-secours-illisible-'))));
  verif('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  await ctx.close();

  console.log('T9 Parcours complet : questionnaire puis premier jour (nouvel utilisateur)');
  ({p, ctx, erreurs} = await page0());
  await p.evaluate(() => { S.parcours = 'sur'; S.scr = 'home'; S.day = 1; sv(); render(); });
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  verif('parcours choisi conservé', await p.evaluate(() => S.parcours === 'sur' && S.scr === 'home'));
  verif('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  await ctx.close();

  await browser.close();
  console.log(`\nRésultat : ${ok} réussis, ${ko} échoués`);
  process.exit(ko ? 1 : 0);
})();
