/* prof.js : espace enseignante caché (⚙) et mode essai. Chargé seulement quand on touche le ⚙.
   - Espace complet (liste, suppression) : connexion Firebase e-mail + mot de passe ; ce sont les règles Firebase qui protègent les données.
   - « Pas de connexion ? » : mot de passe de secours, uniquement pour le mode essai. Il n'est pas écrit dans ce fichier,
     seulement son empreinte SHA-256 salée. C'est un verrou côté navigateur : il arrête les curieux, pas un pirate ; il ne protège aucune donnée. */
(function () {
'use strict';

var SEL = 'c9c349d75e111ae152e6dcd9', EMPREINTE = 'e7dc6a6a40fb9461d7faf4a7ebc4b1866aebb2a3390107223b79faab9d7ddf08', ITER = 4000;
var CLE_ESSAI = 'vct_essai';
var essais = 0;

/* ---------- SHA-256 en JavaScript pur (marche aussi en file:// et sur vieux Safari) ---------- */
var K = [], H0 = [];
(function () {
  var n = 2, p = [];
  while (p.length < 64) { var ok = true; for (var i = 0; i < p.length; i++) if (n % p[i] === 0) { ok = false; break; } if (ok) p.push(n); n++; }
  for (var j = 0; j < 64; j++) K.push((Math.pow(p[j], 1 / 3) % 1) * 4294967296 | 0);
  for (var k = 0; k < 8; k++) H0.push((Math.pow(p[k], 1 / 2) % 1) * 4294967296 | 0);
})();
function rr(n, x) { return (x >>> n) | (x << (32 - n)); }
function sha(b) {
  var m = b.slice(), bits = b.length * 8, i, o;
  m.push(0x80); while (m.length % 64 !== 56) m.push(0);
  m.push(0, 0, 0, 0, (bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);
  var h = H0.slice();
  for (o = 0; o < m.length; o += 64) {
    var w = [];
    for (i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
    for (i = 16; i < 64; i++) {
      var s0 = rr(7, w[i - 15]) ^ rr(18, w[i - 15]) ^ (w[i - 15] >>> 3), s1 = rr(17, w[i - 2]) ^ rr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a = h[0], b2 = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (i = 0; i < 64; i++) {
      var S1 = rr(6, e) ^ rr(11, e) ^ rr(25, e), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      var S0 = rr(2, a) ^ rr(13, a) ^ rr(22, a), mj = (a & b2) ^ (a & c) ^ (b2 & c), t2 = (S0 + mj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b2) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  var out = [];
  for (i = 0; i < 8; i++) out.push((h[i] >>> 24) & 255, (h[i] >>> 16) & 255, (h[i] >>> 8) & 255, h[i] & 255);
  return out;
}
function octets(s) { var u = unescape(encodeURIComponent(s)), a = []; for (var i = 0; i < u.length; i++) a.push(u.charCodeAt(i)); return a; }
function hex(b) { return b.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
function empreinte(mdp) {
  var sel = octets(SEL), h = sha(sel.concat(octets(':' + mdp)));
  for (var i = 0; i < ITER; i++) h = sha(h.concat(sel));
  return hex(h);
}

/* ---------- utilitaires ---------- */
function q(s) { return document.querySelector(s); }
function cles(o) { return o && typeof o === 'object' ? Object.keys(o) : []; }
function parse(s) { try { var o = JSON.parse(s); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function eps() { return (window.EPISODES || []).filter(function (e) { return e.id !== 'test'; }); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function dateFr(ms) { if (!ms) return '—'; var d = new Date(ms); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function ss(o) { try { if (o) sessionStorage.setItem(CLE_ESSAI, JSON.stringify(o)); else sessionStorage.removeItem(CLE_ESSAI); } catch (e) {} }
function ssLire() { try { return JSON.parse(sessionStorage.getItem(CLE_ESSAI)); } catch (e) { return null; } }

var css = document.createElement('style');
css.textContent =
'#vp-fond{position:fixed;left:0;top:0;right:0;bottom:0;background:#000a;z-index:100;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;font:15px/1.45 Arial,sans-serif;color:#2b2118}' +
'#vp-boite{background:#fffaf0;border-radius:12px;max-width:980px;width:100%;padding:16px 18px 18px;position:relative;box-shadow:0 4px 30px #0007}' +
'#vp-boite h3{margin:0 0 10px;font-family:Georgia,serif;color:#8a4b2a}#vp-boite label{display:block;margin:8px 0}' +
'#vp-boite input,#vp-boite select{font:inherit;padding:7px;border:2px solid #c9b48f;border-radius:6px;margin-left:6px;max-width:100%}' +
'#vp-boite button{font:inherit;cursor:pointer;background:#8a4b2a;color:#fff;border:0;border-radius:8px;padding:7px 14px;margin:4px 6px 4px 0}' +
'#vp-boite button.alt{background:#fff;color:#8a4b2a;border:2px solid #8a4b2a}#vp-boite button:disabled{opacity:.45}' +
'#vp-x{position:absolute;right:8px;top:6px;padding:2px 10px!important;font-size:20px}' +
'#vp-msg{color:#b3402f;min-height:1.3em;margin:8px 0}#vp-sec{font-size:.85rem;color:#7a6a58}' +
'#vp-tab{width:100%;border-collapse:collapse;font-size:.9rem}#vp-tab th,#vp-tab td{border-bottom:1px solid #e3d6b8;padding:5px 6px;text-align:left;white-space:nowrap}' +
'#vp-tab th.t{cursor:pointer;color:#8a4b2a;text-decoration:underline}#vp-def{overflow-x:auto;margin-top:8px}.vp-bar{margin:8px 0;padding:8px;background:#f1e6cc;border-radius:8px}' +
'#vp-essai{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#222;color:#fff;font:12px Arial,sans-serif;padding:6px 8px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}' +
'#vp-essai button,#vp-essai select{font:inherit;padding:5px 8px;border-radius:6px;border:1px solid #888;background:#444;color:#fff;cursor:pointer}' +
'#vp-essai button.q{background:#8a4b2a}#vp-essai label{display:inline-flex;align-items:center;gap:3px}body.essai{padding-bottom:84px}';
document.head.appendChild(css);

/* ---------- fenêtre ---------- */
function fenetre() {
  var f = q('#vp-fond'); if (f) f.parentNode.removeChild(f);
  f = document.createElement('div'); f.id = 'vp-fond'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true');
  f.innerHTML = '<div id="vp-boite"><button id="vp-x" class="alt" aria-label="Fermer">×</button><div id="vp-corps"></div></div>';
  document.body.appendChild(f);
  q('#vp-x').onclick = fermer;
  return q('#vp-corps');
}
function fermer() {
  var f = q('#vp-fond'); if (f) f.parentNode.removeChild(f);
  try { if (window.VCT_COMPTE && window.firebase && window.firebase.apps && window.firebase.apps.length && enLigne) window.firebase.auth().signOut(); } catch (e) {}
  enLigne = false;
  try { if (window.VCT_COMPTE) window.VCT_COMPTE.reseauOff(); } catch (e) {}
}
var enLigne = false;
function msg(t) { var m = q('#vp-msg'); if (m) m.textContent = t || ''; }

function ouvrir() {
  var c = fenetre();
  c.innerHTML = '<h3>Espace enseignante</h3>' +
    '<label>E-mail<input id="vp-mail" type="email" autocomplete="off"></label>' +
    '<label>Mot de passe<input id="vp-mdp" type="password" autocomplete="new-password"></label>' +
    '<button id="vp-ok">Se connecter</button><p id="vp-msg" role="alert"></p>' +
    '<a href="#" id="vp-sec">Pas de connexion ?</a><div id="vp-secours"></div>';
  q('#vp-ok').onclick = connexion;
  q('#vp-mdp').onkeydown = function (e) { if (e.key === 'Enter') connexion(); };
  q('#vp-sec').onclick = function (e) {
    e.preventDefault();
    q('#vp-secours').innerHTML = '<p>Ce secours ouvre seulement le mode essai (jamais la liste ni la suppression des comptes).</p>' +
      '<label>Mot de passe de secours<input id="vp-smdp" type="password" autocomplete="new-password"></label><button id="vp-sok" class="alt">Ouvrir le mode essai</button>';
    q('#vp-sok').onclick = secours;
    q('#vp-smdp').onkeydown = function (ev) { if (ev.key === 'Enter') secours(); };
    q('#vp-smdp').focus();
  };
  q('#vp-mail').focus();
}

/* ---------- mot de passe de secours : mode essai seulement ---------- */
function secours() {
  var b = q('#vp-sok'), i = q('#vp-smdp'); if (!i || !i.value) return;
  var v = i.value; i.value = ''; b.disabled = true;
  setTimeout(function () {
    if (empreinte(v) === EMPREINTE) { essais = 0; fermer(); demarrerEssai(); }
    else {
      essais++; msg('Mot de passe refusé.');
      setTimeout(function () { b.disabled = false; }, Math.min(10000, 1500 * essais));
    }
  }, 30);
}

/* ---------- connexion Firebase (e-mail + mot de passe) ---------- */
function connexion() {
  var mail = q('#vp-mail').value.trim(), mdp = q('#vp-mdp').value, b = q('#vp-ok');
  if (!mail || !mdp) return msg('Écris ton e-mail et ton mot de passe.');
  b.disabled = true; msg('Connexion…');
  window.VCT_COMPTE.fb(function (err, F) {
    if (err) { b.disabled = false; return msg('Pas de connexion à Firebase. Utilise « Pas de connexion ? » pour le mode essai.'); }
    window.VCT_COMPTE.reseauOn();
    var A = F.auth();
    A.setPersistence(F.auth.Auth.Persistence.NONE).then(function () { return A.signInWithEmailAndPassword(mail, mdp); })
      .then(function () { enLigne = true; q('#vp-mdp').value = ''; liste(); },
            function (e) {
              b.disabled = false; q('#vp-mdp').value = '';
              msg(e && e.code === 'auth/network-request-failed' ? 'Pas de réseau. Utilise « Pas de connexion ? » pour le mode essai.' : 'Connexion refusée.');
              try { window.VCT_COMPTE.reseauOff(); } catch (x) {}
            });
  });
}

/* ---------- liste des comptes ---------- */
var rows = [], tri = { k: 'num', d: 1 }, filtre = { deb: '', prog: '', a: '', b: '' };

function resume(s) {
  var E = eps(), last = -1, lastPos = 0, lastDone = false, tot = 0;
  E.forEach(function (e, i) {
    var p = (s.pos || {})[e.id] || 0, d = (s.done || {})[e.id];
    if (d || p > 0) { last = i; lastPos = p; lastDone = !!d; }
    tot += d ? e.scenes.length : (p > 0 ? p + 1 : 0);
  });
  var y = 0, ok1 = 0, h3 = 0;
  cles(s.res).forEach(function (k) { if (k.indexOf('test:') === 0) return; var r = s.res[k]; if (r.done) { y++; if ((r.t || 0) <= 1 && !r.h) ok1++; } if (r.h3) h3++; });
  var nd = (typeof window.DEFAITES === 'object' && window.DEFAITES) ? cles(window.DEFAITES).length : 0;
  return {
    tot: tot, last: last, lastPos: lastPos, lastDone: lastDone, y: y, ok1: ok1, h3: h3, def: cles(s.def).length, nd: nd,
    prog: last < 0 ? 'pas commencé' : 'Ép. ' + (last + 1) + (lastDone ? ' terminé ✓' : ' · scène ' + (lastPos + 1) + '/' + E[last].scenes.length),
    reus: y ? ok1 + ' / ' + y + ' (' + Math.round(100 * ok1 / y) + ' %)' : '—'
  };
}

function liste() {
  var c = q('#vp-corps');
  c.innerHTML = '<h3>Comptes élèves</h3><p id="vp-etat">Chargement…</p>';
  var F = window.firebase;
  window.VCT_COMPTE.reseauOn();
  F.database().ref(window.VCT_COMPTE.chemin).once('value').then(function (snap) {
    rows = [];
    snap.forEach(function (ch) {
      if (!/^[0-9]{4}$/.test(ch.key)) return;
      var v = ch.val() || {}, s = parse(v.donnees);
      rows.push({ num: ch.key, maj: v.maj || 0, s: s, r: resume(s) });
    });
    dessiner();
  }, function () { c.innerHTML = '<h3>Comptes élèves</h3><p id="vp-msg">Lecture refusée. Vérifie les règles Firebase et le compte utilisé.</p>' + pied(); branchePied(); });
}
function pied() {
  return '<div class="vp-bar"><button id="vp-essaibtn">🛠 Mode essai</button><button id="vp-maj" class="alt">Actualiser</button><button id="vp-quit" class="alt">Fermer et me déconnecter</button></div>';
}
function branchePied() {
  var e = q('#vp-essaibtn'); if (e) e.onclick = function () { fermer(); demarrerEssai(); };
  var m = q('#vp-maj'); if (m) m.onclick = liste;
  var f = q('#vp-quit'); if (f) f.onclick = fermer;
}
function visibles() {
  var E = eps();
  var l = rows.filter(function (r) {
    if (filtre.deb && r.num.indexOf(filtre.deb) !== 0) return false;
    if (filtre.prog !== '') {
      var p = filtre.prog.split(':'), i = +p[0], fin = p[1] === 'fin';
      if (r.r.last !== i || r.r.lastDone !== fin) return false;
      if (!fin) {
        var sc = r.r.lastPos + 1, a = filtre.a === '' ? 1 : +filtre.a, b = filtre.b === '' ? 9999 : +filtre.b;
        if (sc < a || sc > b) return false;
      }
    }
    return true;
  });
  l.sort(function (x, y) {
    var u, v;
    if (tri.k === 'num') { u = x.num; v = y.num; }
    else if (tri.k === 'prog') { u = x.r.tot; v = y.r.tot; }
    else { u = x.maj; v = y.maj; }
    return (u < v ? -1 : u > v ? 1 : 0) * tri.d || (x.num < y.num ? -1 : 1);
  });
  return l;
}
function dessiner() {
  var E = eps(), c = q('#vp-corps');
  var opts = '<option value="">Toute progression</option>';
  E.forEach(function (e, i) { opts += '<option value="' + i + ':cours">Ép. ' + (i + 1) + ' en cours</option><option value="' + i + ':fin">Ép. ' + (i + 1) + ' terminé</option>'; });
  c.innerHTML = '<h3>Comptes élèves</h3>' +
    '<div class="vp-bar">Numéro qui commence par<input id="vp-deb" size="4" maxlength="4" inputmode="numeric" value="' + filtre.deb + '"> ' +
    ' Retrouver un numéro d\'après la progression<select id="vp-prog">' + opts + '</select> scène de<input id="vp-a" size="3" value="' + filtre.a + '"> à<input id="vp-b" size="3" value="' + filtre.b + '">' +
    ' <button id="vp-f" class="alt">Filtrer</button><button id="vp-raz" class="alt">Tout afficher</button></div>' +
    '<p id="vp-etat"></p><div id="vp-def"></div>' +
    '<div class="vp-bar">Supprimer les comptes inactifs depuis<input id="vp-n" size="3" value="60"> jours <button id="vp-inact" class="alt">Supprimer…</button></div>' +
    '<p id="vp-msg" role="alert"></p>' + pied();
  q('#vp-prog').value = filtre.prog;
  q('#vp-f').onclick = function () { filtre.deb = q('#vp-deb').value.replace(/\D/g, ''); filtre.prog = q('#vp-prog').value; filtre.a = q('#vp-a').value.replace(/\D/g, ''); filtre.b = q('#vp-b').value.replace(/\D/g, ''); tableau(); };
  q('#vp-raz').onclick = function () { filtre = { deb: '', prog: '', a: '', b: '' }; dessiner(); };
  q('#vp-deb').oninput = function () { filtre.deb = this.value.replace(/\D/g, ''); tableau(); };
  q('#vp-inact').onclick = inactifs;
  branchePied();
  tableau();
}
function tableau() {
  var l = visibles(), fl = function (k) { return tri.k === k ? (tri.d > 0 ? ' ▲' : ' ▼') : ''; };
  var h = '<table id="vp-tab"><tr><th class="t" data-k="num">N°' + fl('num') + '</th><th class="t" data-k="prog">Progression' + fl('prog') + '</th><th>Réussite 1er coup</th><th>Indices niv. 3</th><th>Fins perdues</th><th class="t" data-k="maj">Dernière activité' + fl('maj') + '</th><th></th></tr>';
  l.forEach(function (r) {
    h += '<tr><td><b>' + r.num + '</b></td><td>' + r.r.prog + '</td><td>' + r.r.reus + '</td><td>' + r.r.h3 + '</td><td>' + r.r.def + ' / ' + r.r.nd + '</td><td>' + dateFr(r.maj) + '</td><td><button class="alt" data-s="' + r.num + '">Supprimer</button></td></tr>';
  });
  h += '</table>';
  q('#vp-def').innerHTML = h;
  q('#vp-etat').textContent = l.length + ' compte' + (l.length > 1 ? 's' : '') + ' affiché' + (l.length > 1 ? 's' : '') + ' sur ' + rows.length;
  var ths = document.querySelectorAll('#vp-tab th.t');
  for (var i = 0; i < ths.length; i++) ths[i].onclick = function () { var k = this.getAttribute('data-k'); tri = { k: k, d: tri.k === k ? -tri.d : (k === 'num' ? 1 : -1) }; tableau(); };
  var bs = document.querySelectorAll('#vp-tab button[data-s]');
  for (var j = 0; j < bs.length; j++) bs[j].onclick = function () { supprimer([this.getAttribute('data-s')]); };
}
function supprimer(nums) {
  if (!nums.length) return msg('Aucun compte à supprimer.');
  var t = nums.length === 1 ? 'Supprimer définitivement le compte n° ' + nums[0] + ' ?' : 'Supprimer définitivement ces ' + nums.length + ' comptes ?';
  if (!window.confirm(t)) return;
  var F = window.firebase, ref = F.database().ref(window.VCT_COMPTE.chemin);
  Promise.all(nums.map(function (n) { return ref.child(n).remove(); })).then(function () {
    rows = rows.filter(function (r) { return nums.indexOf(r.num) < 0; });
    tableau(); msg(nums.length + ' compte' + (nums.length > 1 ? 's supprimés' : ' supprimé') + '.');
  }, function () { msg('Suppression refusée.'); });
}
function inactifs() {
  var n = parseInt(q('#vp-n').value, 10);
  if (!(n >= 0)) return msg('Écris un nombre de jours.');
  var lim = Date.now() - n * 86400000;
  var l = rows.filter(function (r) { return !r.maj || r.maj < lim; }).map(function (r) { return r.num; });
  if (!l.length) return msg('Aucun compte inactif depuis ' + n + ' jours.');
  supprimer(l);
}

/* ---------- mode essai ---------- */
var essaiEtat = { express: false };
var barre = null;

function abreger(e) {
  if (!essaiEtat.express) return e;
  var out = [], run = false;
  e.scenes.forEach(function (s) {
    if (s.type === 'info' || s.type === 'resume' || s.type === 'album') return;
    if (s.type === 'texte') { out.push(s); run = false; return; }
    if (!run) { out.push(s); run = true; }
  });
  out = out.filter(function (s, i) { return s.type !== 'texte' || (out[i + 1] && out[i + 1].type !== 'texte'); });
  var c = {}; for (var k in e) c[k] = e[k]; c.scenes = out; return c;
}
function demarrerEssai() {
  window.VCT_ESSAI_ON = true; window.VCT_ABREGER = abreger;
  if (window.VCT_COMPTE) window.VCT_COMPTE.pause(true);
  var A = window.VCT_APP;
  A.setSave(null, {});
  document.body.classList.remove('gate'); document.body.classList.add('essai');
  ss(essaiEtat);
  faireBarre(); A.home();
  var e = q('#cpt'); if (e) e.textContent = '· mode essai';
}
function reprendreEssai(tout) {
  var s = ssLire(); essaiEtat.express = !!(s && s.express);
  demarrerEssai();
}
function faireBarre() {
  if (barre) { barre.parentNode.removeChild(barre); }
  barre = document.createElement('div'); barre.id = 'vp-essai';
  var def = '<option value="">Fin perdue…</option>';
  cles(window.DEFAITES).forEach(function (k) { def += '<option value="' + k + '">' + k + ' · ' + window.DEFAITES[k].titre + '</option>'; });
  barre.innerHTML = '<b>🛠 Essai</b>' +
    '<span id="vp-jeu">' +
    '<button id="vp-prec" title="Scène précédente">◀</button><button id="vp-suiv" title="Scène suivante">▶</button>' +
    '<button id="vp-qsuiv" title="Aller à la prochaine question">Question ▶</button>' +
    '<button id="vp-reussir" class="q" title="Répondre juste à la question affichée">✔ Réussir</button>' +
    '<button id="vp-echouer" class="q" title="Se tromper 3 fois (fin perdue si la question en a une)">✘ Échouer</button>' +
    '<button id="vp-jet" title="Rendre les 3 jetons de Sauteriot">💡 3 jetons</button>' +
    '</span>' +
    '<button id="vp-bilan" title="Écran de fin de l\'épisode">Bilan / fin</button>' +
    '<select id="vp-defsel">' + def + '</select>' +
    '<button id="vp-tout" title="Tous les épisodes terminés, toutes les fins perdues vues">Tout débloquer</button>' +
    '<label><input type="checkbox" id="vp-express"> Version express</label>' +
    '<button id="vp-quitter" class="q">Quitter l\'essai</button>';
  document.body.appendChild(barre);
  var A = window.VCT_APP;
  q('#vp-express').checked = !!essaiEtat.express;
  q('#vp-express').onchange = function () { essaiEtat.express = this.checked; ss(essaiEtat); };
  q('#vp-prec').onclick = function () { var i = A.si(); if (A.ep() && i > 0) A.aller(i - 1); };
  q('#vp-suiv').onclick = function () { var i = A.si(); if (A.ep()) A.aller(i + 1); };
  q('#vp-qsuiv').onclick = function () { var e = A.ep(); if (!e) return; for (var i = A.si() + 1; i < e.scenes.length; i++) if (A.isQ(e.scenes[i])) return A.aller(i); A.aller(e.scenes.length); };
  q('#vp-reussir').onclick = reussir;
  q('#vp-echouer').onclick = echouer;
  q('#vp-jet').onclick = function () { var e = A.ep(); if (!e) return; var s = A.getSave(); s.jet = s.jet || {}; s.jet[e.id] = 0; A.aller(A.si()); };
  q('#vp-bilan').onclick = function () { A.fin(); };
  q('#vp-defsel').onchange = function () { var v = this.value; this.value = ''; if (v) A.defaite(v); };
  q('#vp-tout').onclick = toutDebloquer;
  q('#vp-quitter').onclick = function () { ss(null); window.location.href = window.location.href.split('#')[0].split('?')[0]; };
  var obs = new MutationObserver(majBarre); obs.observe(q('#panel'), { childList: true });
  majBarre();
}
function majBarre() {
  var A = window.VCT_APP, j = q('#vp-jeu'); if (!j) return;
  j.style.display = (A.ep() && A.cur()) ? '' : 'none';
}
function reussir() {
  var c = window.VCT_APP.cur(); if (!c || !window.VCT_APP.isQ(c)) return;
  if (c.type === 'saisie') { var i = q('#panel input[type=text]'); if (i && i.nextSibling) { i.value = c.rep[0]; i.nextSibling.click(); } return; }
  var ok = q('#panel [data-ok]'); if (ok) ok.click();
}
function echouer() {
  var c = window.VCT_APP.cur(); if (!c || !window.VCT_APP.isQ(c)) return;
  for (var n = 0; n < 3; n++) {
    if (c.type === 'saisie') { var i = q('#panel input[type=text]'); if (!i || !i.nextSibling) return; i.value = 'zzzz'; i.nextSibling.click(); }
    else { var l = document.querySelectorAll('#panel .opt:not([data-ok]):not(:disabled), #panel .seg:not([data-ok]):not(.bad)'); if (!l.length) return; l[0].click(); }
  }
}
function toutDebloquer() {
  var A = window.VCT_APP, s = A.getSave(); s.done = s.done || {}; s.pos = s.pos || {}; s.def = s.def || {};
  eps().forEach(function (e) { s.done[e.id] = 1; s.pos[e.id] = e.scenes.length - 1; });
  cles(window.DEFAITES).forEach(function (k) { s.def[k] = 1; });
  A.home();
}

window.VCT_PROF = { ouvrir: ouvrir, reprendreEssai: reprendreEssai, empreinte: empreinte, fusionTest: null };
})();
