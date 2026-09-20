#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Génère un PDF paginé et mis en page à partir d'un fichier Markdown.

    python scripts/md-to-pdf.py DOCUMENTATION.md
    python scripts/md-to-pdf.py DOCUMENTATION.md GUIDE_UTILISATION.md
    python scripts/md-to-pdf.py --out-dir docs DOCUMENTATION.md

Chaîne de rendu : Markdown -> HTML mis en forme -> Chrome (impression PDF)
-> numérotation des pages. Chrome est utilisé parce qu'il gère correctement
les tableaux, les diagrammes en caractères semi-graphiques, les accents
français et l'arabe, ce que ne font pas les générateurs PDF les plus simples.

Prérequis :  python -m pip install markdown pygments reportlab pypdf
Régénérez les PDF après chaque modification des fichiers Markdown.
"""

from __future__ import annotations

import argparse
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("Module manquant. Installez-le avec :  python -m pip install markdown pygments")

# --- Emplacements usuels de Chrome / Edge sous Windows ----------------------
NAVIGATEURS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

MARQUE = "Kounouz Alafiya"
BASELINE = (
    "<strong>Plateforme de confiance, vérification et traçabilité du miel</strong><br>"
)

# Identité visuelle Kounouz Alafiya (reprise du design system du frontend).
VERT_FONCE = "#0C261B"
OR = "#D49B37"
CREME = "#EAE1D2"

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }

* { box-sizing: border-box; }

body {
  font-family: "Segoe UI", "Noto Sans", Tahoma, sans-serif;
  font-size: 10.2pt;
  line-height: 1.55;
  color: #1c1c1c;
  margin: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* --- Page de couverture ------------------------------------------------- */
.couverture {
  height: 245mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  page-break-after: always;
  border: 2pt solid __OR__;
  border-radius: 6pt;
  padding: 20mm 14mm;
}
.couverture .marque {
  font-size: 30pt;
  font-weight: 700;
  color: __VERT__;
  letter-spacing: 0.5pt;
  margin: 0;
}
.couverture .marque-ar {
  font-size: 24pt;
  color: __OR__;
  margin: 3mm 0 0 0;
  font-family: "Segoe UI", Tahoma, "Arial Unicode MS", sans-serif;
}
.couverture .filet {
  width: 55mm;
  border-top: 1.5pt solid __OR__;
  margin: 9mm auto;
}
.couverture .titre {
  font-size: 19pt;
  font-weight: 600;
  color: __VERT__;
  margin: 0 0 4mm 0;
  line-height: 1.3;
}
.couverture .sous-titre {
  font-size: 11.5pt;
  color: #4a4a4a;
  margin: 0;
  max-width: 125mm;
  line-height: 1.5;
}
.couverture .pied {
  margin-top: 16mm;
  font-size: 9.5pt;
  color: #6b6b6b;
}
.couverture .pied strong { color: __VERT__; }

/* --- Titres ------------------------------------------------------------- */
h1, h2, h3, h4 {
  color: __VERT__;
  line-height: 1.25;
  page-break-after: avoid;
  break-after: avoid;
}
h1 {
  font-size: 17pt;
  border-bottom: 1.5pt solid __OR__;
  padding-bottom: 2mm;
  margin: 0 0 5mm 0;
  page-break-before: always;
  break-before: page;
}
/* Le premier titre suit la couverture : pas de page blanche avant. */
h1.premier { page-break-before: avoid; break-before: avoid; }
h2 {
  font-size: 13pt;
  margin: 8mm 0 3mm 0;
  padding-left: 2.5mm;
  border-left: 3pt solid __OR__;
}
h3 { font-size: 11pt; margin: 6mm 0 2mm 0; }
h4 { font-size: 10.2pt; margin: 4mm 0 1.5mm 0; color: #333; }

p { margin: 0 0 3mm 0; orphans: 3; widows: 3; }

/* --- Tableaux ----------------------------------------------------------- */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 3mm 0 5mm 0;
  font-size: 8.8pt;
  page-break-inside: avoid;
  break-inside: avoid;
}
thead { display: table-header-group; }
th, td {
  border: 0.5pt solid #c9c9c9;
  padding: 1.6mm 2.2mm;
  text-align: left;
  vertical-align: top;
  word-wrap: break-word;
}
th {
  background: __VERT__;
  color: #fff;
  font-weight: 600;
  font-size: 8.6pt;
}
tbody tr:nth-child(even) { background: #faf8f4; }
td[align="center"], th[align="center"] { text-align: center; }

/* --- Code et diagrammes ------------------------------------------------- */
code {
  font-family: Consolas, "Cascadia Mono", "Courier New", monospace;
  font-size: 8.8pt;
  background: #f4f1ea;
  padding: 0.3mm 1.1mm;
  border-radius: 2pt;
  color: #6b3d0f;
}
pre {
  background: #fbf9f5;
  border: 0.5pt solid __CREME__;
  border-left: 2.5pt solid __OR__;
  border-radius: 3pt;
  padding: 3mm 3.5mm;
  margin: 3mm 0 5mm 0;
  overflow: visible;
  white-space: pre-wrap;
  page-break-inside: avoid;
  break-inside: avoid;
}
pre code {
  background: none;
  padding: 0;
  color: #24292e;
  font-size: 8.1pt;
  line-height: 1.42;
}

/* --- Listes ------------------------------------------------------------- */
ul, ol { margin: 0 0 3mm 0; padding-left: 6mm; }
li { margin-bottom: 1.2mm; }
li > ul, li > ol { margin-top: 1.2mm; }

/* --- Divers ------------------------------------------------------------- */
blockquote {
  margin: 3mm 0;
  padding: 2mm 4mm;
  background: #fbf7ef;
  border-left: 2.5pt solid __OR__;
  color: #3a3a3a;
  page-break-inside: avoid;
}
blockquote p:last-child { margin-bottom: 0; }
hr { border: none; border-top: 0.5pt solid __CREME__; margin: 6mm 0; }
a { color: #1a5c3a; text-decoration: none; }
strong { color: __VERT__; }

/* Sommaire : deux colonnes pour tenir sur une page. */
.sommaire ol { column-count: 2; column-gap: 10mm; }
"""

GABARIT = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>__TITRE__</title>
<style>__CSS__</style>
</head>
<body>
__COUVERTURE__
__CORPS__
</body>
</html>
"""

# Le nom arabe est écrit en entités HTML : le fichier reste lisible quel que
# soit l'encodage de la console qui l'affiche.
COUVERTURE = """
<div class="couverture">
  <p class="marque">Kounouz Alafiya</p>
  <p class="marque-ar">&#1603;&#1606;&#1608;&#1586; &#1575;&#1604;&#1593;&#1575;&#1601;&#1610;&#1577;</p>
  <div class="filet"></div>
  <p class="titre">__TITRE__</p>
  <p class="sous-titre">__SOUS_TITRE__</p>
  <div class="filet"></div>
  <p class="pied">
    __BASELINE__
    Phase 1 &middot; __DATE__
  </p>
</div>
"""


def trouver_navigateur() -> str:
    """Retourne le chemin d'un Chrome/Edge utilisable, ou interrompt le script."""
    for chemin in NAVIGATEURS:
        if os.path.isfile(chemin):
            return chemin
    for nom in ("chrome", "chromium", "msedge", "google-chrome"):
        trouve = shutil.which(nom)
        if trouve:
            return trouve
    sys.exit(
        "Chrome ou Edge est requis pour produire le PDF, mais aucun n'a été trouvé.\n"
        "Installez Google Chrome, ou ajoutez son chemin dans NAVIGATEURS."
    )


def sans_balises(texte: str) -> str:
    """Retire le gras et l'italique Markdown d'une ligne de titre."""
    texte = re.sub(r"\*\*(.+?)\*\*", r"\1", texte)
    return re.sub(r"\*(.+?)\*", r"\1", texte)


# Équivalents Latin-1 des signes typographiques courants : on les translittère
# au lieu de les supprimer, sinon « Marque — Titre » perdrait son tiret.
EQUIVALENTS_LATIN1 = {
    "—": "-",
    "–": "-",
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "…": "...",
    "→": "->",
    "≤": "<=",
    "≥": ">=",
    "✓": "",
    "✅": "",
}


def nettoyer_pour_pied(texte: str) -> str:
    """
    Réduit un titre aux caractères que les polices de base du PDF savent
    dessiner (Latin-1).

    Le pied de page est tracé avec Helvetica, qui ne contient aucun glyphe
    arabe : sans ce filtrage, le nom arabe sortirait en carrés noirs. Les
    signes typographiques sont translittérés plutôt que supprimés.
    """
    for source, cible in EQUIVALENTS_LATIN1.items():
        texte = texte.replace(source, cible)
    propre = "".join(c for c in texte if ord(c) < 0x100)
    # Un séparateur devenu orphelin après filtrage est retiré.
    propre = re.sub(r"^[\s:|-]+", "", propre)
    propre = re.sub(r"[\s:|-]+$", "", propre)
    propre = re.sub(r"\s{2,}", " ", propre).strip()
    return propre or MARQUE


def libelle_pied(titre: str) -> str:
    """
    Compose le libellé du pied de page sans répéter la marque.

    « Guide d'utilisation — Kounouz Alafiya » contient déjà la marque : la
    préfixer une seconde fois donnerait « Kounouz Alafiya Guide d'utilisation
    Kounouz Alafiya ».
    """
    if MARQUE.lower() in titre.lower():
        return nettoyer_pour_pied(titre)
    return nettoyer_pour_pied(MARQUE + " — " + titre)


def extraire_entete(texte_md: str) -> tuple[str, str, str]:
    """
    Isole le titre et le sous-titre de l'en-tête du document.

    L'en-tête est tout ce qui précède le premier séparateur « --- ». Il est
    entièrement consommé : aucune de ses lignes ne doit réapparaître en haut
    du corps. Quand le titre de niveau 1 n'est que la marque (cas de
    DOCUMENTATION.md), la couverture l'affiche déjà en grand : on promeut
    alors la ligne suivante comme titre pour ne pas la répéter.
    """
    lignes = texte_md.splitlines()

    # Limite de l'en-tête : premier séparateur horizontal.
    fin_entete = None
    for i, ligne in enumerate(lignes[:30]):
        nu = ligne.strip()
        if len(nu) >= 3 and set(nu) in ({"-"}, {"*"}, {"_"}):
            fin_entete = i
            break

    if fin_entete is None:
        # Pas de séparateur : on se limite au titre et au bloc qui le suit.
        fin_entete = 0
        for i, ligne in enumerate(lignes[:30]):
            if ligne.startswith("# "):
                fin_entete = i + 1
                while fin_entete < len(lignes) and lignes[fin_entete].strip():
                    fin_entete += 1
                break
        corps = "\n".join(lignes[fin_entete:]).lstrip("\n")
    else:
        corps = "\n".join(lignes[fin_entete + 1 :]).lstrip("\n")

    entete = lignes[:fin_entete]

    titre_h1 = ""
    morceaux: list[str] = []
    for ligne in entete:
        nu = ligne.strip()
        if not nu:
            continue
        if nu.startswith("# ") and not titre_h1:
            titre_h1 = nu[2:].strip()
            continue
        morceaux.append(nu.lstrip("#").strip())

    titre_h1 = sans_balises(titre_h1)
    # La marque est déjà affichée en grand sur la couverture : un suffixe
    # « — Kounouz Alafiya » dans le titre ferait doublon.
    titre_h1 = re.sub(r"\s*[–—-]\s*" + re.escape(MARQUE) + r"\s*$", "", titre_h1)
    morceaux = [sans_balises(m) for m in morceaux]

    # Le titre n'est-il que la marque, éventuellement suivie de sa traduction ?
    reste = titre_h1.replace(MARQUE, "")
    reste_latin = "".join(c for c in reste if ord(c) < 0x100)
    titre_est_la_marque = MARQUE in titre_h1 and not re.search(r"[A-Za-z0-9]", reste_latin)

    if titre_est_la_marque and morceaux:
        titre = morceaux[0]
        sous_titre = " ".join(morceaux[1:]).strip()
    else:
        titre = titre_h1 or "Documentation"
        sous_titre = " ".join(morceaux).strip()

    return titre, sous_titre, corps


def mettre_en_page(corps_md: str) -> str:
    """Convertit le Markdown en HTML et applique les ajustements d'impression."""
    html = markdown.markdown(
        corps_md,
        extensions=["tables", "fenced_code", "attr_list", "sane_lists", "toc"],
        output_format="html5",
    )

    # Le premier <h1> ne doit pas déclencher un saut de page après la couverture.
    html = html.replace("<h1", '<h1 class="premier"', 1)

    # Le sommaire est une longue liste numérotée : deux colonnes évitent une
    # page presque vide.
    html = re.sub(
        r"(<h[12][^>]*>\s*Sommaire\s*</h[12]>\s*)(<ol>)",
        r'\1<div class="sommaire">\2',
        html,
        count=1,
    )
    if '<div class="sommaire">' in html:
        debut = html.index('<div class="sommaire">')
        fin = html.index("</ol>", debut) + len("</ol>")
        html = html[:fin] + "</div>" + html[fin:]

    return html


def convertir(chemin_md: Path, dossier_sortie: Path, navigateur: str) -> Path:
    texte = chemin_md.read_text(encoding="utf-8")
    titre, sous_titre, corps_md = extraire_entete(texte)
    html_corps = mettre_en_page(corps_md)

    # Ne pas repeter la baseline si le document la porte deja dans son
    # sous-titre (cas de DOCUMENTATION.md).
    baseline = "" if "Plateforme de confiance" in sous_titre else BASELINE
    couverture = (
        COUVERTURE.replace("__TITRE__", titre)
        .replace("__SOUS_TITRE__", sous_titre)
        .replace("__BASELINE__", baseline)
        .replace("__DATE__", date.today().strftime("%d/%m/%Y"))
    )
    css = CSS.replace("__VERT__", VERT_FONCE).replace("__OR__", OR).replace("__CREME__", CREME)
    html = (
        GABARIT.replace("__CSS__", css)
        .replace("__COUVERTURE__", couverture)
        .replace("__CORPS__", html_corps)
        .replace("__TITRE__", f"{MARQUE} - {titre}")
    )

    dossier_sortie.mkdir(parents=True, exist_ok=True)
    chemin_pdf = dossier_sortie / (chemin_md.stem + ".pdf")

    # Le HTML est écrit à côté du Markdown source : Chrome doit pouvoir le lire.
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".html", delete=False, encoding="utf-8", dir=str(chemin_md.parent)
    ) as fh:
        fh.write(html)
        chemin_html = Path(fh.name)

    brut = dossier_sortie / (chemin_md.stem + ".brut.pdf")
    try:
        commande = [
            navigateur,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000",
            # Chemin absolu : Chrome résout les chemins relatifs depuis son
            # propre répertoire de travail, pas celui du script.
            f"--print-to-pdf={brut.resolve()}",
            chemin_html.resolve().as_uri(),
        ]
        res = subprocess.run(commande, capture_output=True, text=True, timeout=180)
        if not brut.exists():
            sys.exit(
                f"Chrome n'a pas produit de PDF pour {chemin_md.name}.\n"
                f"code={res.returncode}\n{res.stderr[-1500:]}"
            )
    finally:
        chemin_html.unlink(missing_ok=True)

    numeroter(brut, chemin_pdf, titre)
    brut.unlink(missing_ok=True)
    return chemin_pdf


def numeroter(source: Path, destination: Path, titre: str) -> None:
    """
    Ajoute « Marque — Titre » et « page N / T » en pied de chaque page,
    sauf la couverture.

    Chrome ne sait pas générer de pied de page personnalisé : on superpose
    donc un calque après coup.
    """
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas

    # Helvetica ne couvre que le Latin-1 : on filtre avant de dessiner.
    pied = libelle_pied(titre)

    lecteur = PdfReader(str(source))
    total = len(lecteur.pages)
    writer = PdfWriter()

    for index, page in enumerate(lecteur.pages):
        if index == 0:  # couverture : pas de pied de page
            writer.add_page(page)
            continue

        largeur = float(page.mediabox.width)
        hauteur = float(page.mediabox.height)

        tampon = io.BytesIO()
        c = canvas.Canvas(tampon, pagesize=(largeur, hauteur))
        c.setFont("Helvetica", 7.5)
        c.setFillColor(HexColor("#8a8a8a"))
        # Filet discret au-dessus du pied de page.
        c.setStrokeColor(HexColor(CREME))
        c.setLineWidth(0.4)
        c.line(45, 34, largeur - 45, 34)
        c.drawString(45, 24, pied)
        c.drawRightString(largeur - 45, 24, f"page {index} / {total - 1}")
        c.save()
        tampon.seek(0)

        calque = PdfReader(tampon).pages[0]
        page.merge_page(calque)
        writer.add_page(page)

    writer.add_metadata(
        {
            "/Title": MARQUE + " - " + titre,
            "/Author": MARQUE,
            "/Subject": "Plateforme de confiance, verification et tracabilite du miel - Phase 1",
            "/Creator": "scripts/md-to-pdf.py",
        }
    )
    with open(destination, "wb") as fh:
        writer.write(fh)


def main() -> None:
    parseur = argparse.ArgumentParser(
        description="Convertit un ou plusieurs fichiers Markdown en PDF mis en page."
    )
    parseur.add_argument("fichiers", nargs="+", help="fichiers Markdown à convertir")
    parseur.add_argument(
        "--out-dir", default="docs", help="dossier de sortie (par défaut : docs/)"
    )
    args = parseur.parse_args()

    navigateur = trouver_navigateur()
    print(f"Navigateur : {navigateur}")
    dossier = Path(args.out_dir)

    for nom in args.fichiers:
        chemin = Path(nom)
        if not chemin.is_file():
            print(f"  introuvable, ignoré : {nom}")
            continue
        pdf = convertir(chemin, dossier, navigateur)
        taille = pdf.stat().st_size / 1024
        print(f"  {chemin.name}  ->  {pdf}  ({taille:.0f} Ko)")


if __name__ == "__main__":
    main()
