/* Tests du lot 2 : accès réservé, volet Trac libre, Mes notes, Vos données,
   rappel de sauvegarde, mode test. Même mode d'emploi que test-donnees.js. */
const puppeteer = require('puppeteer');
const URL = process.env.APP_URL || 'http://127.0.0.1:8765/';
const SHOTS = process.env.SHOTS || '';
let ok = 0, ko = 0;
function verif(nom, cond, detail) { if (cond) { ok++; console.log('  ✔', nom); } else { ko++; console.log('  ✘', nom, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300)); } }
const ANCIEN = {scr:'home',tab:'j',parcours:'rum',deg:3,mode:'rdv',day:14,done:[1,2,3,4,5,6,7,8,9,10,11,12,13],
  memos:{'3':'Note du jour 3','8':'Note du jour 8\nsur deux lignes'},fb:{},fbd:{},releve:{'3':2,'8':4},remind:'08:00',
  q:[],qi:0,qorder:null,vday:null,qhist:[],seuils:[1],fin:0,cycle:2,arch:[{cycle:1,parcours:'sur',memos:{'2':'Note de l’ancien cycle'},done:[1,2],releve:{}}]};
(async () => {
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox']});
  async function nouvelle(prep, arg, url) {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); const err = [];
    await p.setViewport({width: 390, height: 844, deviceScaleFactor: 2});
    p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.goto(URL, {waitUntil: 'load'});
    if (prep) await p.evaluate(prep, arg);
    await p.goto(url || URL, {waitUntil: 'load'}); if (url && url.includes('#')) await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 600));
    return {p, ctx, err};
  }
  const shot = async (p, nom) => { if (SHOTS) await p.screenshot({path: SHOTS + '/' + nom + '.png', fullPage: true}); };
  const texte = p => p.evaluate(() => document.getElementById('scr').innerText.toLowerCase());

  console.log('A1 Nouveau lecteur : accueil, puis écran d’accès');
  let {p, ctx, err} = await nouvelle();
  let tx = await texte(p);
  verif('accueil : bouton « Gérer le trac »', tx.includes('gérer le trac'));
  verif('accueil : plus de « Gratuit, sans compte »', !tx.includes('gratuit, sans compte'));
  await shot(p, '1-accueil');
  await p.evaluate(() => exigerAcces('quiz'));
  verif('« Commencer » mène à l’écran d’accès', await p.evaluate(() => S.scr === 'acces'));
  await shot(p, '2-acces');
  console.log('A2 Code d’accès');
  await p.evaluate(() => { document.getElementById('accesIn').value = 'mauvais'; validerCode(); });
  verif('mauvais code refusé', await p.evaluate(() => S.scr === 'acces' && !accesOK()));
  await p.evaluate(() => { document.getElementById('accesIn').value = ' lecteur 2026 '; validerCode(); });
  verif('bon code accepté (minuscules et espaces tolérés), questionnaire lancé', await p.evaluate(() => accesOK() && S.scr === 'quiz'));
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  verif('accès conservé après relance', await p.evaluate(() => accesOK()));
  verif('aucune erreur JavaScript', err.length === 0, err); await ctx.close();

  console.log('A3 Volet Trac libre, sans code');
  ({p, ctx, err} = await nouvelle());
  await p.evaluate(() => go('trac'));
  tx = await texte(p);
  verif('volet Trac affiché sans code', tx.includes('gérer le trac') && tx.includes('juste avant la scène'));
  verif('toujours pas d’accès au parcours', await p.evaluate(() => !accesOK()));
  ({p, ctx, err} = await nouvelle(null, null, URL + '#trac'));
  verif('lien du livret (#trac) toujours valable', await p.evaluate(() => S.scr === 'trac'));
  verif('aucune erreur JavaScript', err.length === 0, err); await ctx.close();

  console.log('A4 Utilisateur existant : accès conservé automatiquement');
  ({p, ctx, err} = await nouvelle(a => localStorage.setItem('pp24', JSON.stringify(a)), ANCIEN));
  verif('accès ouvert, méthode « utilisateur-existant »', await p.evaluate(() => accesOK() && META.acces.methode === 'utilisateur-existant'));
  verif('écran du jour affiché', await p.evaluate(() => S.scr === 'home' && S.day === 14));

  console.log('A5 Rappel doux de sauvegarde');
  tx = await texte(p);
  verif('rappel affiché (jour 14, aucune sauvegarde)', tx.includes('une sauvegarde de temps en temps'));
  await shot(p, '3-rappel');
  await p.evaluate(() => { META.rappelMasque = maintenant(); sv(); rJ(document.getElementById('scr')); });
  await p.reload({waitUntil: 'load'}); await new Promise(r => setTimeout(r, 500));
  verif('« Plus tard » le masque, même après relance', !(await texte(p)).includes('une sauvegarde de temps en temps'));

  console.log('A6 Mes notes');
  await p.evaluate(() => { S.tab = 'p'; render(); });
  tx = await texte(p);
  verif('Parcours : bouton « Mes notes (3) »', tx.includes('mes notes (3)'), tx.slice(0, 400));
  await p.evaluate(() => go('notes'));
  tx = await texte(p);
  verif('notes du parcours en cours, par jour', tx.includes('jour 3') && tx.includes('note du jour 3') && tx.includes('jour 8'));
  verif('relevé indiqué avec la note', tx.includes('journée : vraiment bien') || tx.includes('journée : vraiment bien'));
  verif('notes de l’ancien cycle', tx.includes('cycle 1') && tx.includes('note de l’ancien cycle'));
  await shot(p, '4-mes-notes');
  await p.evaluate(() => viewDay(3));
  verif('« Ouvrir ce jour » affiche le jour 3', await p.evaluate(() => S.vday === 3 && S.scr === 'home'));

  console.log('A7 Vos données et « Tout effacer »');
  await p.evaluate(() => go('donnees'));
  tx = await texte(p);
  verif('écran « Vos données »', tx.includes('ce qui reste sur ce téléphone') && tx.includes('ce qui est envoyé'));
  await shot(p, '5-vos-donnees');
  await p.evaluate(() => toutEffacer()); await new Promise(r => setTimeout(r, 1200));
  const cles = await p.evaluate(() => Object.keys(localStorage));
  verif('toutes les données effacées (y compris pp24 et copies)', !cles.some(k => k === 'pp24' || k.startsWith('mg-')), cles);
  verif('retour à l’accueil', await p.evaluate(() => S.scr === 'w'));
  verif('aucune erreur JavaScript', err.length === 0, err); await ctx.close();

  console.log('A8 Lien d’accès (prépare le lien envoyé par e-mail)');
  ({p, ctx, err} = await nouvelle(null, null, URL + '#acces=LECTEUR2026'));
  verif('accès ouvert par le lien', await p.evaluate(() => accesOK() && META.acces.methode === 'lien'));
  verif('code retiré de l’adresse', !(await p.evaluate(() => location.hash)).includes('acces'));
  ({p, ctx, err} = await nouvelle(null, null, URL + '#acces=FAUX'));
  verif('lien erroné refusé', await p.evaluate(() => !accesOK()));
  await ctx.close();

  console.log('A9 Mode test');
  ({p, ctx, err} = await nouvelle(a => localStorage.setItem('pp24', JSON.stringify(a)), ANCIEN, URL + '?test=1'));
  await p.evaluate(() => { S.tab = 'r'; render(); });
  tx = await texte(p);
  verif('bloc « Mode test » visible', tx.includes('mode test') && tx.includes('lecteur2026'));
  await shot(p, '6-mode-test');
  await p.evaluate(() => testAncienUtilisateur()); await new Promise(r => setTimeout(r, 1200));
  verif('« Simuler un ancien utilisateur » : conversion faite, jour 10', await p.evaluate(() => S.day === 10 && S.parcours === 'rum' && !!localStorage.getItem('mg-donnees')));
  await p.goto(URL + '?test=0'); await new Promise(r => setTimeout(r, 500));
  await p.evaluate(() => { S.tab = 'r'; render(); });
  verif('?test=0 masque le mode test', !(await texte(p)).includes('simuler un ancien utilisateur'));
  verif('aucune erreur JavaScript', err.length === 0, err); await ctx.close();

  await browser.close();
  console.log(`\nRésultat : ${ok} réussis, ${ko} échoués`);
  process.exit(ko ? 1 : 0);
})();
