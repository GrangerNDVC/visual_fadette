/* Voix des dialogues : qui parle, avec quelle expression. Un extrait = une liste, dans l'ordre des répliques
   (les paragraphes qui commencent par « – »). Format : 'perso:expression'.
   Le portrait est cherché dans assets/portraits/<perso>/<nom du personnage en pied>_<expression>.png ;
   s'il manque, le jeu prend le personnage en pied, et à défaut il affiche seulement le nom.
   Pour un autre portrait que celui du personnage en pied de la scène : 'perso@nom_du_portrait:expression'.
   Un extrait qui n'est pas listé ici s'affiche comme avant, d'un seul bloc. */
window.VOIX={
 ep2:{
  C:['landry:inquiet','sylvinet:melancolique','landry:determine'],
  D:['landry:emu'],
  E:['landry:determine'],
  F:['pere_barbeau:soucieux','landry:inquiet','pere_barbeau:bienveillant'],
  H:['pere_barbeau:bienveillant'],
  S:['sylvinet:larmoyant','mere_barbeau:soucieuse']
 },
 ep3:{
  D1:['sylvinet:jaloux','landry:neutre','sylvinet:jaloux'],
  R:['mere_barbeau:fatiguee','landry:emu']
 },
 ep5:{
  A:['fadette:moqueuse'],
  B:['landry:fache','fadette:moqueuse','landry:neutre','fadette:fiere'],
  C:['fadette:moqueuse'],
  E1:['landry:inquiet','landry:inquiet'],
  E2:['fadette:fiere','landry:determine'],
  F:['fadette:fiere']
 }
};
