/* compte.js : comptes élèves (numéro à 4 chiffres) et copie de la progression dans Firebase.
   - Le localStorage reste la mémoire principale (une copie par numéro) ; Firebase n'en garde qu'une copie.
   - Firebase (compat 8.10.1, sans modules) n'est chargé que lorsqu'un élève valide un numéro.
   - Sans compte : aucun échange. Rien n'est écrit dans la console. */
(function () {
'use strict';

var CFG = {
  apiKey: "AIzaSyBwoQqcFCH7ssSUyGkFd52v6Wam1O4WiVw",
  authDomain: "lexica-488e9.firebaseapp.com",
  databaseURL: "https://lexica-488e9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lexica-488e9",
  storageBucket: "lexica-488e9.firebasestorage.app",
  messagingSenderId: "3644116964",
  appId: "1:3644116964:web:5ae47e4211bb5603c301f1"
};
var CHEMIN = 'jeux/visualfadette';
var CLE = 'vct_save_v1';                         // sans compte ; avec compte : CLE + ':' + numéro
var SDK = 'https://www.gstatic.com/firebasejs/8.10.1/';
var VER = '20261029a';

var etat = { num: null, pause: false, hors: false };
var fb = null, dirty = false, tFirst = 0, tPlan = null, tRetry = null, envoi = false, echecs = 0;
var attente = [], snap = { res: {}, jet: {} }, dernierTick = 0;

function q(s) { return document.querySelector(s); }
function tick() { var n = Date.now(); if (n <= dernierTick) n = dernierTick + 1; dernierTick = n; return n; }
function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
function cles(o) { return o && typeof o === 'object' ? Object.keys(o) : []; }
function union(a, b) { var r = cles(a); cles(b).forEach(function (k) { if (r.indexOf(k) < 0) r.push(k); }); return r; }
function parse(s) { try { var o = JSON.parse(s); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function lireLocal(cle) { try { var s = localStorage.getItem(cle); return s ? parse(s) : null; } catch (e) { return null; } }
function ecrireLocal(cle, o) { try { localStorage.setItem(cle, JSON.stringify(o)); } catch (e) {} }

/* ---------- délai maximum pour toute opération réseau ---------- */
function avecDelai(fn, ms, cb) {
  var fini = false;
  var t = setTimeout(function () { if (!fini) { fini = true; cb(new Error('delai')); } }, ms);
  try {
    fn(function (err, res) { if (fini) return; fini = true; clearTimeout(t); cb(err, res); });
  } catch (e) { if (!fini) { fini = true; clearTimeout(t); cb(e); } }
}

/* ---------- chargement de Firebase (seulement quand il sert) ---------- */
function script(src, cb) {
  var s = document.createElement('script');
  s.src = src; s.onload = function () { cb(); }; s.onerror = function () { cb(new Error('script')); };
  document.head.appendChild(s);
}
function init() {
  if (!window.firebase.apps.length) window.firebase.initializeApp(CFG);
  fb = window.firebase;
}
function charger(cb) {
  if (fb) return cb(null, fb);
  if (window.firebase && window.firebase.database) { try { init(); return cb(null, fb); } catch (e) { return cb(e); } }
  script(SDK + 'firebase-app.js', function (e1) {
    if (e1) return cb(e1);
    script(SDK + 'firebase-auth.js', function (e2) {
      if (e2) return cb(e2);
      script(SDK + 'firebase-database.js', function (e3) {
        if (e3) return cb(e3);
        try { init(); cb(null, fb); } catch (e) { cb(e); }
      });
    });
  });
}
function ouvrirFb(cb) { avecDelai(charger, 15000, cb); }
function reseauOn() { try { fb.database().goOnline(); } catch (e) {} }
function reseauOff() { try { fb.database().goOffline(); } catch (e) {} }
/* Firebase chargé, élève connecté en anonyme (invisible), réseau ouvert */
function reseau(cb) {
  avecDelai(function (done) {
    charger(function (e) {
      if (e) return done(e);
      var a = fb.auth();
      var suite = function () { reseauOn(); done(null); };
      if (a.currentUser) return suite();
      a.signInAnonymously().then(suite, function (x) { done(x || new Error('auth')); });
    });
  }, 15000, cb);
}

/* ---------- suivi des modifications (dates pour la fusion) ---------- */
function resetSnap(s) {
  snap = { res: {}, jet: {} };
  cles(s.res).forEach(function (id) { var c = {}; for (var k in s.res[id]) if (k !== 'ts') c[k] = s.res[id][k]; snap.res[id] = JSON.stringify(c); });
  cles(s.jet).forEach(function (ep) { snap.jet[ep] = s.jet[ep]; });
}
function touch(s) {
  if (!s) return;
  cles(s.res).forEach(function (id) {
    var e = s.res[id], c = {}; for (var k in e) if (k !== 'ts') c[k] = e[k];
    var j = JSON.stringify(c);
    if (snap.res[id] === undefined) { if (!e.ts) e.ts = tick(); snap.res[id] = j; }
    else if (snap.res[id] !== j) { e.ts = tick(); snap.res[id] = j; }
  });
  s.jt = s.jt || {};
  cles(s.jet).forEach(function (ep) {
    if (snap.jet[ep] === undefined) { if (!s.jt[ep]) s.jt[ep] = tick(); snap.jet[ep] = s.jet[ep]; }
    else if (snap.jet[ep] !== s.jet[ep]) { s.jt[ep] = tick(); snap.jet[ep] = s.jet[ep]; }
  });
}
/* appelé par le jeu avant d'effacer ou de recommencer quelque chose : le cloud ne doit pas le ressusciter */
window.VCT_RAZ = function (key) {
  if (!etat.num || !window.VCT_APP) return;
  var s = window.VCT_APP.getSave();
  s.rz = s.rz || {}; s.rz[key] = tick();
  if (key.indexOf('res:') === 0) { var id = key.slice(4); if (s.res && s.res[id]) s.res[id].ts = tick(); }
  else if (key.indexOf('jet:') === 0) { s.jt = s.jt || {}; s.jt[key.slice(4)] = tick(); }
};

/* ---------- fusion : on ne perd jamais de progression ----------
   A = copie du cloud, B = copie de l'appareil.
   - épisodes terminés, fins perdues : union ; scène atteinte : maximum
   - jetons utilisés : maximum ; réponses : « réussi » l'emporte, essais et indices : maximum
   - rz : date d'un « effacé / recommencé » ; une valeur plus ancienne que cette date est ignorée
   - mode DYS : le choix de l'appareil l'emporte */
function vit(val, ts, rz) { return val !== undefined && val !== null && (!rz || (ts || 0) > rz); }
function fusion(A, B) {
  A = A || {}; B = B || {};
  var o = Object.assign({}, clone(A), clone(B));
  o.rz = {};
  union(A.rz, B.rz).forEach(function (k) { o.rz[k] = Math.max((A.rz || {})[k] || 0, (B.rz || {})[k] || 0); });
  if (B.dys !== undefined) o.dys = B.dys; else if (A.dys !== undefined) o.dys = A.dys;
  o.done = {}; union(A.done, B.done).forEach(function (k) { o.done[k] = 1; });
  o.def = {}; union(A.def, B.def).forEach(function (k) { o.def[k] = 1; });
  o.pos = {}; union(A.pos, B.pos).forEach(function (k) { o.pos[k] = Math.max((A.pos || {})[k] || 0, (B.pos || {})[k] || 0); });
  o.jet = {}; o.jt = {};
  union(A.jet, B.jet).forEach(function (ep) {
    var rz = o.rz['jet:' + ep];
    var ta = (A.jt || {})[ep], tb = (B.jt || {})[ep];
    var va = vit((A.jet || {})[ep], ta, rz), vb = vit((B.jet || {})[ep], tb, rz);
    if (va && vb) { o.jet[ep] = Math.max(A.jet[ep], B.jet[ep]); o.jt[ep] = Math.max(ta || 0, tb || 0); }
    else if (va) { o.jet[ep] = A.jet[ep]; o.jt[ep] = ta || 0; }
    else if (vb) { o.jet[ep] = B.jet[ep]; o.jt[ep] = tb || 0; }
  });
  o.res = {};
  union(A.res, B.res).forEach(function (id) {
    var rz = o.rz['res:' + id], ea = (A.res || {})[id], eb = (B.res || {})[id];
    var va = ea && vit(1, ea.ts, rz), vb = eb && vit(1, eb.ts, rz);
    if (va && vb) {
      var r = { c: ea.c || eb.c, t: Math.max(ea.t || 0, eb.t || 0), h: Math.max(ea.h || 0, eb.h || 0),
                e: (ea.e || []).length >= (eb.e || []).length ? (ea.e || []) : (eb.e || []),
                ts: Math.max(ea.ts || 0, eb.ts || 0) };
      if (ea.done || eb.done) r.done = 1; else r.done = 0;
      if (ea.h3 || eb.h3) r.h3 = 1;
      o.res[id] = r;
    } else if (va) o.res[id] = clone(ea);
    else if (vb) o.res[id] = clone(eb);
  });
  return o;
}
function serial(o) {
  var s = JSON.stringify(o);
  if (s.length < 58000) return s;
  var c = clone(o); cles(c.res).forEach(function (k) { c.res[k].e = []; });
  return JSON.stringify(c);
}

/* ---------- envois économes : 5 s après la dernière modification, 20 s au plus pendant une partie ---------- */
function planifier() {
  dirty = true;
  var now = Date.now(); if (!tFirst) tFirst = now;
  clearTimeout(tPlan);
  tPlan = setTimeout(function () { envoyer(); }, Math.max(0, Math.min(5000, tFirst + 20000 - now)));
}
window.VCT_SYNC = function (s) {
  if (!etat.num || etat.pause) return;
  touch(s); planifier(); majPied();
};
function envoyer(cb) {
  if (!etat.num || etat.pause) { if (cb) cb(false); return; }
  if (envoi) { if (cb) attente.push(cb); return; }
  if (cb) attente.push(cb);
  clearTimeout(tPlan); clearTimeout(tRetry);
  envoi = true; dirty = false; tFirst = 0;
  var num = etat.num, local = clone(window.VCT_APP.getSave());
  majPied();
  function fini(ok) {
    envoi = false; reseauOff();
    if (ok) { echecs = 0; etat.hors = false; }
    else { echecs++; etat.hors = true; dirty = true; tRetry = setTimeout(function () { if (dirty) envoyer(); }, Math.min(60000, 8000 * echecs)); }
    if (ok && dirty) planifier();
    majPied();
    var l = attente; attente = []; l.forEach(function (f) { try { f(ok); } catch (e) {} });
  }
  reseau(function (err) {
    if (err) return fini(false);
    var ref = fb.database().ref(CHEMIN + '/' + num);
    avecDelai(function (done) {
      ref.transaction(function (cur) {
        var cloud = cur && typeof cur.donnees === 'string' ? parse(cur.donnees) : {};
        return { v: 1, maj: Date.now(), donnees: serial(fusion(cloud, local)) };
      }, function (e, committed) { done(e, committed); }, false);
    }, 15000, function (e, committed) { fini(!e && !!committed); });
  });
}
function vider(cb) {            // envoie ce qui reste avant de changer d'élève (6 s au plus)
  var f = false, fin = function () { if (!f) { f = true; cb(); } };
  setTimeout(fin, 6000);
  (function b(n) {
    if (!etat.num || etat.pause || (!dirty && !envoi) || n > 3) return fin();
    envoyer(function () { setTimeout(function () { b(n + 1); }, 30); });
  })(0);
}
document.addEventListener('visibilitychange', function () { if (document.hidden && dirty && etat.num) envoyer(); });
window.addEventListener('online', function () { if (dirty && etat.num) envoyer(); });

/* ---------- pied de page : numéro et état de l'enregistrement ---------- */
function majPied() {
  var e = q('#cpt'); if (!e) return;
  if (document.body.classList.contains('gate') || window.VCT_ESSAI_ON) { e.textContent = window.VCT_ESSAI_ON ? '· mode essai' : ''; return; }
  e.textContent = etat.num
    ? '· n° ' + etat.num + (etat.hors ? ' · hors connexion, je réessaie' : (dirty || envoi) ? ' · enregistrement…' : ' · enregistré ✓')
    : '· sans compte';
}

/* ---------- écran du numéro ---------- */
function msg(t) { var m = q('#cptMsg'); if (m) m.textContent = t || ''; }
function occupe(b) { var l = document.querySelectorAll('#cptBtns button'); for (var i = 0; i < l.length; i++) l[i].disabled = b; }
function ecran() {
  var A = window.VCT_APP;
  A.setSave(null, {}); A.vide(); document.body.classList.add('gate'); majPied();
  var P = q('#panel');
  P.innerHTML = '<h2>Ton numéro</h2><p class="sub">Choisis un numéro à 4 chiffres et retiens-le : il sert à retrouver ta partie. Pas besoin de nom.</p>';
  var inp = document.createElement('input');
  inp.type = 'tel'; inp.id = 'cptNum'; inp.maxLength = 4; inp.autocomplete = 'off'; inp.placeholder = '0000';
  inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('pattern', '[0-9]*'); inp.setAttribute('aria-label', 'Numéro à 4 chiffres');
  inp.oninput = function () { inp.value = inp.value.replace(/[^0-9]/g, '').slice(0, 4); msg(''); };
  inp.onkeydown = function (e) { if (e.key === 'Enter') valider('reprendre'); };
  P.appendChild(inp);
  var d = document.createElement('div'); d.id = 'cptBtns';
  d.appendChild(A.btn('Reprendre ma partie', function () { valider('reprendre'); }));
  d.appendChild(A.btn('Nouvelle partie', function () { valider('nouvelle'); }, 1));
  d.appendChild(A.btn('Jouer sans compte', sansCompte, 1));
  P.appendChild(d);
  var m = document.createElement('p'); m.id = 'cptMsg'; m.className = 'msg'; m.setAttribute('role', 'alert'); P.appendChild(m);
}
function entrerJeu(num, save, cle) {
  etat.num = num; etat.pause = false;
  var A = window.VCT_APP;
  A.setSave(cle, save);
  if (cle) ecrireLocal(cle, save);
  resetSnap(save);
  document.body.classList.remove('gate');
  A.home(); majPied();
}
function sansCompte() {
  etat.num = null; etat.hors = false; dirty = false; clearTimeout(tPlan); clearTimeout(tRetry);
  entrerJeu(null, lireLocal(CLE) || {}, CLE);
}
function valider(mode) {
  var inp = q('#cptNum'), n = inp ? inp.value : '';
  if (!/^[0-9]{4}$/.test(n)) return msg('Écris ton numéro : 4 chiffres.');
  occupe(true); msg('Un instant…');
  reseau(function (err) {
    if (err) { occupe(false); return horsLigne(n, mode); }
    var ref = fb.database().ref(CHEMIN + '/' + n);
    if (mode === 'reprendre') {
      avecDelai(function (d) {
        ref.once('value', function (s) { d(null, s); }, function (e) { d(e || new Error('lecture')); });
      }, 12000, function (e, s) {
        reseauOff(); occupe(false);
        if (e) return horsLigne(n, mode);
        if (!s.exists()) return msg('Je ne trouve pas ce numéro.');
        connecte(n, s.val());
      });
    } else {
      avecDelai(function (d) {
        ref.transaction(function (cur) { if (cur !== null) return; return { v: 1, maj: Date.now(), donnees: '{}' }; },
          function (e, ok) { d(e, ok); }, false);
      }, 12000, function (e, ok) {
        reseauOff(); occupe(false);
        if (e) return horsLigne(n, mode);
        if (!ok) return msg('Ce numéro est déjà pris. Choisis-en un autre.');
        connecte(n, null);
      });
    }
  });
}
function connecte(n, rec) {
  var cle = CLE + ':' + n, cloud = rec && typeof rec.donnees === 'string' ? parse(rec.donnees) : {};
  var fus = fusion(cloud, lireLocal(cle));
  entrerJeu(n, fus, cle);
  etat.hors = false; dirty = true; envoyer();     // on a lu avant : on envoie maintenant la version fusionnée
}
function horsLigne(n, mode) {
  var cle = CLE + ':' + n, loc = lireLocal(cle);
  if (mode === 'reprendre' && loc && cles(loc).length) {
    entrerJeu(n, loc, cle); etat.hors = true; dirty = true; majPied();
    tRetry = setTimeout(function () { if (dirty) envoyer(); }, 10000);
    return;
  }
  msg(mode === 'nouvelle'
    ? "Pas de connexion : je ne peux pas créer ton numéro. Tu peux jouer sans compte."
    : "Je n'arrive pas à joindre le serveur. Vérifie la connexion, ou joue sans compte.");
}
function changer() {
  vider(function () {
    clearTimeout(tPlan); clearTimeout(tRetry);
    etat.num = null; etat.hors = false; dirty = false; tFirst = 0; envoi = false; snap = { res: {}, jet: {} };
    ecran();
  });
}

/* ---------- espace enseignante et mode essai : js/prof.js, chargé seulement à la demande ---------- */
function chargerProf(cb) {
  if (window.VCT_PROF) return cb();
  script('js/prof.js?v=' + VER, function (e) { cb(e || (window.VCT_PROF ? null : new Error('prof'))); });
}
window.VCT_PROF_OUVRIR = function () { chargerProf(function (e) { if (!e) window.VCT_PROF.ouvrir(); }); };

function demarrer() {
  var ess = false; try { ess = !!sessionStorage.getItem('vct_essai'); } catch (e) {}
  var tout = /[?&]tout(&|=|$)/.test(location.search) && (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  if (ess || tout) { chargerProf(function (e) { if (e) ecran(); else window.VCT_PROF.reprendreEssai(tout); }); return; }
  ecran();
}

window.VCT_COMPTE = {
  demarrer: demarrer, changer: changer, fb: ouvrirFb, reseauOn: reseauOn, reseauOff: reseauOff,
  pause: function (b) { etat.pause = !!b; majPied(); }, chemin: CHEMIN,
  fusion: fusion
};
})();
