/* Épisode d'essai, visible seulement avec index.html?test=1 : indices de Sauteriot, fin perdue, bilan « refaire seul » */
EPISODES.push({id:"test",titre:"Essai : indices et fin perdue",
extraits:{A:{src:"George Sand, chap. I",t:"Le père Barbeau de la Cosse n'était pas mal dans ses affaires, à preuve qu'il était du conseil municipal de sa commune. Il avait deux champs qui lui donnaient la nourriture de sa famille et du profit par-dessus le marché."}},
scenes:[
{type:"texte",ref:"A",decor:"d01_bessonniere_ext"},
{type:"qcm",id:"t1",comp:"prelever",ref:"A",q:"De quoi le père Barbeau est-il membre ?",pivot:"d01",
 o:[{t:"Du conseil municipal",ok:1},{t:"De la chorale",err:"hors"},{t:"Du tribunal",err:"hors"},{t:"De l'assemblée des vignerons",err:"hors"}],
 aide:["Relis la question : on te demande « de quoi », pas « quoi ».","Cherche une preuve donnée par l'auteur sur la situation du père Barbeau.","Regarde la fin de la première phrase."],expl:"C'est écrit : « il était du conseil municipal de sa commune »."},
{type:"qcm",id:"t2",comp:"inferer",ref:"A",q:"Les deux champs servent à…",
 o:[{t:"nourrir la famille et faire un peu de profit",ok:1},{t:"seulement nourrir la famille",err:"sous"},{t:"seulement vendre",err:"sous"},{t:"payer les impôts",err:"hors"}],
 aide:["Relis la question.","Il y a deux choses dans la phrase.","Regarde après « nourriture »."],expl:"Les champs donnent la nourriture, et du profit en plus."}
]});
