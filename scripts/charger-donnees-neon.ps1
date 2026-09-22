<#
.SYNOPSIS
    Cree les tables et charge les donnees de demonstration dans la base Neon.

.DESCRIPTION
    Regroupe l'etape 2 du guide de deploiement
    (GUIDE_DEPLOIEMENT_DEMO_GRATUIT.md, section 6) en une seule commande :

      - refuse toute cible qui n'est pas une base Neon, car le chargement
        commence par vider entierement la base visee ;
      - teste d'abord la voie normale (PostgreSQL, port 5432) ;
      - si ce port est bloque (VPN, pare-feu, operateur : erreur P1001),
        bascule automatiquement sur le WebSocket de Neon, port 443, qui passe
        partout. Le resultat dans la base est identique ;
      - compte les lignes chargees a la fin.

.PARAMETER DatabaseUrl
    Adresse de la base Neon. Par defaut, celle de backend\.env.

.PARAMETER Websocket
    Force la voie WebSocket sans essayer le port 5432.

.EXAMPLE
    .\scripts\charger-donnees-neon.ps1
    .\scripts\charger-donnees-neon.ps1 -DatabaseUrl "postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require"
#>
[CmdletBinding()]
param(
    [string] $DatabaseUrl,
    [switch] $Websocket
)

$ErrorActionPreference = 'Stop'
$racine  = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $racine 'backend'

function Etape([string] $t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Info ([string] $t) { Write-Host "  $t" }
function Souci([string] $t) { Write-Host "  ! $t" -ForegroundColor Yellow }
function Stop-Avec([string] $t) { Write-Host "`nARRET : $t" -ForegroundColor Red; exit 1 }

# PowerShell 5.1 transforme chaque ligne d'avertissement d'un programme externe
# en erreur terminante des lors qu'on ecrit `2>&1` ; `npx` en emet une a chaque
# appel. On redirige donc la sortie d'erreur vers un fichier, qu'on relit.
# Le code de sortie passe par cette variable, et non par le pipeline : une
# valeur de retour serait melangee a la sortie du programme, qui doit rester
# visible a l'ecran pendant les minutes que dure le chargement.
$script:DernierCode = 0

function Invoke-Natif {
    param(
        [Parameter(Mandatory)] [string[]] $Arguments,
        [switch] $Capturer
    )
    $fichierErreur = [System.IO.Path]::GetTempFileName()
    $ancienne = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $exe   = $Arguments[0]
        $reste = if ($Arguments.Count -gt 1) { $Arguments[1..($Arguments.Count - 1)] } else { @() }

        if ($Capturer) {
            $sortie = & $exe @reste 2> $fichierErreur | Out-String
        }
        else {
            # Out-Host : affiche au fur et a mesure sans rien renvoyer au pipeline.
            & $exe @reste 2> $fichierErreur | Out-Host
            $sortie = ''
        }
        $script:DernierCode = $LASTEXITCODE
        $erreurs = Get-Content $fichierErreur -Raw -ErrorAction SilentlyContinue

        if (-not $Capturer -and $erreurs) { Write-Host $erreurs }
        if ($Capturer) { return "$sortie`n$erreurs" }
    }
    finally {
        $ErrorActionPreference = $ancienne
        Remove-Item $fichierErreur -ErrorAction SilentlyContinue
    }
}

# --- 1. Adresse de la base -------------------------------------------------
Etape '1/5 Adresse de la base'

if (-not $DatabaseUrl) {
    $fichierEnv = Join-Path $backend '.env'
    if (-not (Test-Path $fichierEnv)) { Stop-Avec "backend\.env est introuvable. Passez l'adresse avec -DatabaseUrl." }
    $ligne = Select-String -Path $fichierEnv -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1
    if (-not $ligne) { Stop-Avec "DATABASE_URL est absent de backend\.env. Passez l'adresse avec -DatabaseUrl." }
    $DatabaseUrl = ($ligne.Line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
    Info "Adresse lue dans backend\.env"
}

$hote = if ($DatabaseUrl -match '@([^/:?]+)') { $Matches[1] } else { '(illisible)' }
Info "Cible : $hote"

# Le chargement vide la base : aucune cible autre que Neon n'est acceptee.
if ($hote -notmatch 'neon\.tech$') {
    Stop-Avec @"
la cible n'est pas une base Neon.

Le chargement commence par VIDER entierement la base visee : il ne doit jamais
viser votre base de developpement locale. Corrigez backend\.env, ou passez
l'adresse Neon avec -DatabaseUrl.
"@
}

# Le pooler (PgBouncer) ne supporte pas les migrations Prisma : la CLI s'en
# sert pour poser un verrou consultatif, que le pooler ne conserve pas.
$urlDirecte = $DatabaseUrl -replace '-pooler', ''

if (-not (Test-Path (Join-Path $backend 'node_modules'))) {
    Stop-Avec "les dependances ne sont pas installees. Lancez d'abord : cd `"$backend`" ; npm install"
}

Push-Location $backend
try {
    # --- 2. Choix de la voie ----------------------------------------------
    Etape '2/5 Connexion a la base'

    $viaWebsocket = [bool] $Websocket
    if ($viaWebsocket) {
        Info 'Voie WebSocket (port 443) demandee.'
    }
    else {
        $env:DATABASE_URL = $urlDirecte
        Info 'Essai de la voie normale (PostgreSQL, port 5432)...'
        $statut = Invoke-Natif -Arguments @('npx', 'prisma', 'migrate', 'status') -Capturer

        if ($statut -match 'P1001') {
            Souci 'le port 5432 est bloque par votre reseau (VPN, pare-feu ou operateur).'
            Souci 'Bascule sur le WebSocket de Neon (port 443) : meme resultat, aucun reglage a changer.'
            $viaWebsocket = $true
        }
        elseif ($statut -match 'P1000|authentication failed') {
            Stop-Avec "identifiants refuses par Neon. Recopiez l'adresse depuis https://console.neon.tech (bouton « Connect »)."
        }
        elseif ($statut -match 'P1003') {
            Stop-Avec "la base indiquee n'existe pas sur ce projet Neon. Verifiez le nom apres le dernier « / » de l'adresse."
        }
        else {
            Info 'Connexion directe etablie.'
        }
    }

    # --- 3. Tables ---------------------------------------------------------
    Etape '3/5 Creation des tables'

    # L'adresse directe sert dans les deux cas : le pooler ajoute une couche
    # qui coupe les sessions longues, et le chargement en est une.
    $env:DATABASE_URL = $urlDirecte
    if ($viaWebsocket) {
        Invoke-Natif -Arguments @('npx', 'tsx', 'prisma/appliquer-migrations.ts')
    }
    else {
        Invoke-Natif -Arguments @('npx', 'prisma', 'migrate', 'deploy')
    }
    if ($script:DernierCode -ne 0) { Stop-Avec 'la creation des tables a echoue (message ci-dessus).' }

    # --- 4. Donnees --------------------------------------------------------
    Etape '4/5 Chargement des donnees (3 a 8 minutes, ne fermez pas la fenetre)'

    $env:DATABASE_URL = $urlDirecte
    if ($viaWebsocket) { $env:KZ_DB_WEBSOCKET = '1' }

    # Une connexion peut lacher au bout de plusieurs minutes (Neon met la base
    # en pause, le VPN se reconnecte...). Le chargement vide la base avant de
    # la remplir : le reprendre depuis zero est sans danger et donne le meme
    # resultat. Trois tentatives suffisent en pratique.
    $tentatives = 3
    for ($i = 1; $i -le $tentatives; $i++) {
        Invoke-Natif -Arguments @('npx', 'tsx', 'prisma/seed.ts')
        if ($script:DernierCode -eq 0) { break }

        if ($i -lt $tentatives) {
            Souci "la connexion a ete interrompue. Nouvelle tentative ($($i + 1)/$tentatives) dans 10 secondes..."
            Start-Sleep -Seconds 10
        }
        else {
            Stop-Avec @"
le chargement des donnees a echoue $tentatives fois de suite (message ci-dessus).

La base est maintenant incomplete : relancez ce script quand le reseau sera
plus stable. Si les coupures persistent, desactivez le VPN et relancez.
"@
        }
    }

    # --- 5. Verification ---------------------------------------------------
    Etape '5/5 Verification'

    $verif = Join-Path $env:TEMP 'kz-verification.ts'
    @'
import { createDbClient } from './prisma/db-client.js';
const p = await createDbClient();
const [u, c, pr, q] = await Promise.all([
  p.user.count(), p.categorie.count(), p.product.count(), p.qRCode.count(),
]);
console.log(`  Utilisateurs : ${u}`);
console.log(`  Categories   : ${c}`);
console.log(`  Produits     : ${pr}`);
console.log(`  Codes QR     : ${q}`);
if (u === 0) { console.error('  ATTENTION : la base est vide.'); process.exitCode = 1; }
await p.$disconnect();
'@ | Out-File -FilePath (Join-Path $backend 'kz-verification.ts') -Encoding utf8
    try { Invoke-Natif -Arguments @('npx', 'tsx', 'kz-verification.ts') } finally {
        Remove-Item (Join-Path $backend 'kz-verification.ts') -ErrorAction SilentlyContinue
    }

    Write-Host "`nTermine. Comptes de demonstration :" -ForegroundColor Green
    Write-Host '  admin@kounouzalafiya.com          (Admin123!)'
    Write-Host '  verification@kounouzalafiya.com   (Verif123!)'
    Write-Host '  agent@kounouzalafiya.com          (Agent123!)'
    Write-Host '  producteur@kounouzalafiya.com     (Prod123!)'
    Write-Host '  client@kounouzalafiya.com         (Client123!)'
}
finally {
    Pop-Location
    Remove-Item Env:DATABASE_URL    -ErrorAction SilentlyContinue
    Remove-Item Env:KZ_DB_WEBSOCKET -ErrorAction SilentlyContinue
}
