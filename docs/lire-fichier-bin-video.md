# Lire un fichier vidéo .bin (RGB565)

Les clips Kidoo sont exportés en fichier `.bin` au format **raw RGB565** (240×280 pixels, 10 FPS par défaut). Ce format n'est pas lisible directement par les lecteurs vidéo classiques. Cette doc explique comment le convertir en MP4 pour le visualiser sur PC.

## Prérequis

- **FFmpeg** installé sur le système et accessible en ligne de commande
- Téléchargement : https://ffmpeg.org/download.html  
- Ou via winget : `winget install ffmpeg`

## Conversion .bin → MP4

### Commande de base

```bash
ffmpeg -f rawvideo -pixel_format rgb565le -video_size 240x280 -framerate 10 -i video.bin -c:v libx264 -pix_fmt yuv420p output.mp4
```

### Paramètres

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `-f rawvideo` | — | Entrée = vidéo brute (pas de conteneur) |
| `-pixel_format rgb565le` | — | Format pixel RGB565 little-endian |
| `-video_size 240x280` | largeur×hauteur | Résolution des frames Kidoo |
| `-framerate 10` | FPS | Images par seconde |
| `-i video.bin` | chemin | Fichier .bin source |
| `-c:v libx264` | — | Encodeur vidéo pour l’output |
| `-pix_fmt yuv420p` | — | Format de sortie compatible lecteurs |
| `output.mp4` | chemin | Fichier MP4 généré |

### Sous Windows (PowerShell)

Depuis le dossier contenant FFmpeg :

```powershell
.\ffmpeg.exe -f rawvideo -pixel_format rgb565le -video_size 240x280 -framerate 10 -i .\video.bin -c:v libx264 -pix_fmt yuv420p output.mp4
```

### Si la résolution ou le framerate diffèrent

Adapte `-video_size` et `-framerate` :

```bash
ffmpeg -f rawvideo -pixel_format rgb565le -video_size 320x240 -framerate 15 -i video.bin -c:v libx264 -pix_fmt yuv420p output.mp4
```

## Lecture du MP4

Une fois le fichier créé, ouvre `output.mp4` avec VLC, le lecteur Windows, ou tout autre logiciel vidéo.

## Voir directement avec ffplay (si disponible)

Si `ffplay.exe` est inclus dans ton installation FFmpeg :

```bash
ffplay -f rawvideo -pixel_format rgb565le -video_size 240x280 -framerate 10 video.bin
```

 ou en PowerShell :

```powershell
.\ffplay.exe -f rawvideo -pixel_format rgb565le -video_size 240x280 -framerate 10 .\video.bin
```
