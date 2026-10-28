#!/usr/bin/env python3
"""
calcul_echelles.py : prepare deux fichiers pour le moteur du jeu.

  1) liste_images.txt     tous les fichiers de assets/ (chemins avec /), un par ligne
  2) sprites_meta.json    (+ sprites_meta.js lu par le jeu) hauteur de chaque personnage en pixels, ligne des pieds,
                          hauteur reelle supposee en cm et rapport cm_per_px

Utilisation (dans le dossier qui contient assets/) :
    pip install pillow numpy scipy
    python calcul_echelles.py assets
    python calcul_echelles.py assets --dossiers sprites,portraits   (si tes sprites en pied sont dans portraits/)

Les fichiers sont ecrits dans assets/. Les personnages dont la taille n'est pas connue
sont listes en fin d'execution : ajoute une ligne dans la table CM ci-dessous.
Echelle a l'ecran : taille affichee = pixels_ecran_par_cm * cm_per_px * taille de l'image.
"""
import os, re, sys, json, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

REF_ADULTE_CM = 172
# (motif sur le nom du fichier, hauteur reelle en cm jusqu'au sommet de la tete ou du chapeau)
CM = [
    (r'^landry_8', 125), (r'^landry_14', 160), (r'^landry_15', 163), (r'^landry_(17|18|19)', 172),
    (r'^sylvinet_8', 124), (r'^sylvinet_14', 158), (r'^sylvinet_15', 162), (r'^sylvinet_(17|18|19|20|27)', 170),
    (r'^fadette_14', 148), (r'^fadette_15', 150), (r'^fadette_16', 153), (r'^fadette_17', 160),
    (r'^fadette_(18|mariee)', 160),
    (r'^sauteriot_(10|moqueur|complice)', 126), (r'^sauteriot_(12|content|allie)', 134), (r'^sauteriot_15', 150),
    (r'^nanette_10', 130), (r'^nanette_(16|17)', 158),
    (r'^madelon', 160), (r'^mere_fadet', 148), (r'^(mere_)?sagette', 150), (r'^mere_barbeau', 158),
    (r'^pere_barbeau', 172), (r'^pere_caillaud', 172), (r'^cadet_caillaud', 172),
    (r'^mercier', 170), (r'^cheval', 185), (r'^cure', 170), (r'^baigneuse', 155),
    (r'^solange', 135), (r'^gamins', 140),
]
EXT = {'.png', '.webp'}


def cm_pour(nom):
    for motif, cm in CM:
        if re.search(motif, nom):
            return cm
    return None


def mesurer(chemin):
    im = Image.open(chemin).convert('RGBA')
    a = np.array(im)[..., 3] > 128
    if not a.any():
        return None
    # on retire les parties fines (cannes, plumes, lances) pour mesurer le corps
    op = ndi.binary_opening(a, structure=np.ones((25, 25)))
    ys, xs = np.where(op if op.sum() > 2000 else a)
    fy, fx = np.where(a)
    return {
        'canvas': list(im.size),
        'figure_top_y': int(ys.min()), 'foot_y': int(ys.max()),
        'figure_height_px': int(ys.max() - ys.min() + 1),
        'center_x': int((xs.min() + xs.max()) / 2),
        'full_bbox': [int(fx.min()), int(fy.min()), int(fx.max()), int(fy.max())],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('assets')
    ap.add_argument('--dossiers', default='sprites')
    args = ap.parse_args()
    racine = args.assets.rstrip('/\\')
    base = os.path.dirname(os.path.abspath(racine))

    # 1) liste_images.txt
    liste = []
    for dp, dn, fn in os.walk(racine):
        for f in fn:
            if f in ('liste_images.txt', 'sprites_meta.json'):
                continue
            liste.append(os.path.relpath(os.path.join(dp, f), base).replace(os.sep, '/'))
    liste.sort()
    with open(os.path.join(racine, 'liste_images.txt'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(liste) + '\n')
    print(len(liste), 'fichiers listes dans', os.path.join(racine, 'liste_images.txt'))

    # 2) sprites_meta.json
    meta, inconnus = {}, []
    for dossier in [d.strip() for d in args.dossiers.split(',') if d.strip()]:
        for dp, dn, fn in os.walk(os.path.join(racine, dossier)):
            for f in sorted(fn):
                nom, ext = os.path.splitext(f)
                if ext.lower() not in EXT:
                    continue
                m = mesurer(os.path.join(dp, f))
                if not m:
                    continue
                cm = cm_pour(nom)
                m['file'] = os.path.relpath(os.path.join(dp, f), racine).replace(os.sep, '/')
                m['real_height_cm'] = cm
                m['cm_per_px'] = round(cm / m['figure_height_px'], 4) if cm else None
                if cm is None:
                    inconnus.append(nom)
                meta[nom] = m
    with open(os.path.join(racine, 'sprites_meta.json'), 'w', encoding='utf-8') as fh:
        json.dump({'note': "Echelle : taille affichee = pixels_ecran_par_cm * cm_per_px * taille de l'image. "
                           "Adulte de reference = 172 cm. figure_height_px = tete ou chapeau aux pieds, sans canne ni plume.",
                   'ref_adult_cm': REF_ADULTE_CM, 'sprites': meta}, fh, indent=1, ensure_ascii=False)
    with open(os.path.join(racine, 'sprites_meta.js'), 'w', encoding='utf-8') as fh:
        fh.write('window.SPRITES_META=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(len(meta), 'sprites mesures dans', os.path.join(racine, 'sprites_meta.json'))
    if inconnus:
        print('Taille inconnue (ajoute-les dans la table CM) :', ', '.join(inconnus))


if __name__ == '__main__':
    main()
