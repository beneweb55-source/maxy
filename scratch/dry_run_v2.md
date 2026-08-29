# CONTRE-AUDIT DRY-RUN (PASS 2 - SEMANTIQUE)

## Statistiques Globales de Confiance
- **Total Produits** : 1678
- **CERTAIN** (Prêt pour Batch 1) : 782
- **TRÈS PROBABLE** (Prêt pour Batch 2) : 182
- **AMBIGU / INSUFFISANT** (Revue Humaine) : 714

## Structure Générée (Basée sur CERTAIN & TRÈS PROBABLE)
- Familles uniques : 9
- Catégories uniques : 18
- Modèles identifiés : 252

### Famille : COMPOSANTS INTERNES
#### Catégorie : CARTES D'EXTENSION
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Adaptateurs NGFF M.2 / Transfer Card Extension Rack Boards — SKU : Y1UB4NB6036 | Adaptateurs NGFF M.2 / Transfer Card Extension Rack Boards — SKU : Y1UB4NB6036 | 43 | 🔴 AMBIGU | Carte d'extension générique, type exact non défini |
| Contrôleurs HPE Smart Array PCle (Microsemi) (Format carte PCle classique, 2 ports) | Contrôleurs HPE Smart Array PCle (Microsemi) (Format carte PCle classique, 2 ports) | 5 | 🔴 AMBIGU | Carte d'extension générique, type exact non défini |
| Carte S2600W, 16GO RAM, XEON E5-2620v3 | Carte S2600W, 16GO RAM, XEON E5-2620v3 | 1 | 🔴 AMBIGU | Carte d'extension générique, type exact non défini |
| Tour noir -carte mere M10 JNP 2SB, 16GO RAM, XEON E-2236 | Tour noir -carte mere M10 JNP 2SB, 16GO RAM, XEON E-2236 | 1 | 🔴 AMBIGU | Carte d'extension générique, type exact non défini |
| Dell Intel X550-T2 — PCIe, 2× RJ45 10GbE | Dell Intel X550-T2 — PCIe, 2× RJ45 10GbE | 1 | 🟡 TRES PROBABLE | Carte réseau identifiée |
| Carte d'acquisition National Instruments X Series — PCIe, calibrée | Carte d'acquisition National Instruments X Series — PCIe, calibrée | 1 | 🔴 AMBIGU | Carte d'extension générique, type exact non défini |
| Riser PCIe x16 HP — Pour unité centrale SFF CARTES RÉSEAU | Riser PCIe x16 HP — Pour unité centrale SFF CARTES RÉSEAU | 1 | 🟡 TRES PROBABLE | Carte réseau identifiée |

#### Catégorie : CARTES GRAPHIQUES
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| RTX 2080 TI | RTX 2080 TI | 2 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| GTX 1050 TI | GTX 1050 TI | 2 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| NVIDIA Quadro 4000 — Dell OEM, Modèle : P2007, DP/N : 06WTYT et 0731Y3 | NVIDIA Quadro 4000 — Dell OEM, Modèle : P2007, DP/N : 06WTYT et 0731Y3 | 2 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| RTX 3080 | RTX 3080 | 1 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| NVIDIA Quadro 4000 — HP OEM, Réf. : 616076-001 | NVIDIA Quadro 4000 — HP OEM, Réf. : 616076-001 | 1 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| ASUS GeForce GTX 650 — Modèle : GTX650-DC-1GD5 | ASUS GeForce GTX 650 — Modèle : GTX650-DC-1GD5 | 1 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |
| NVIDIA Quadro K1200 — HP OEM, Spare P/N : 801195-002 | NVIDIA Quadro K1200 — HP OEM, Spare P/N : 801195-002 | 1 | 🟢 CERTAIN | Puce graphique isolée (pas de processeur système) |

#### Catégorie : MÉMOIRE RAM
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Samsung 4GB DDR4 (M378A5143EB1-CPB / PC4-2133P) - UDIMM | Samsung 4GB DDR4 (M378A5143EB1-CPB / PC4-2133P) - UDIMM | 10 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Kingston 16GB DDR4 3200MHz ECC Registered (KSM32RS4/16MEI) - RDIMM | Kingston 16GB DDR4 3200MHz ECC Registered (KSM32RS4/16MEI) - RDIMM | 9 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Kingston 32GB DDR4 2Rx4 PC4-2400T (Modèle 9995640-032.A00G) - RDIMM | Kingston 32GB DDR4 2Rx4 PC4-2400T (Modèle 9995640-032.A00G) - RDIMM | 9 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| PNY Technologies Europe Black 4GB DDR4 DIMM (64C0JJFDL8G09) - UDIMM | PNY Technologies Europe Black 4GB DDR4 DIMM (64C0JJFDL8G09) - UDIMM | 9 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Samsung 16GB DDR4 ECC Registered (M393A2K40EB3-CWEBY) - RDIMM | Samsung 16GB DDR4 ECC Registered (M393A2K40EB3-CWEBY) - RDIMM | 3 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| SK hynix 4GB DDR4 (HMA851U6CJR6N-VK) - UDIMM | SK hynix 4GB DDR4 (HMA851U6CJR6N-VK) - UDIMM | 3 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Samsung 8GB DDR4 ECC Registered (M393A1G40DB0-CPB0Q) - RDIMM | Samsung 8GB DDR4 ECC Registered (M393A1G40DB0-CPB0Q) - RDIMM | 2 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Samsung 16GB DDR4 2933 - UDIMM | Samsung 16GB DDR4 2933 - UDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Samsung 16GB DDR4 ECC Registered (M393A4K40CB2-CTD7Q) - RDIMM | Samsung 16GB DDR4 ECC Registered (M393A4K40CB2-CTD7Q) - RDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Samsung 32GB DDR4 ECC Registered (M393A4K40CB2-CTD7Q) - RDIMM | Samsung 32GB DDR4 ECC Registered (M393A4K40CB2-CTD7Q) - RDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Micron 16GB DDR4 ECC - RDIMM | Micron 16GB DDR4 ECC - RDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| SK hynix 16GB DDR4 2400T - RDIMM | SK hynix 16GB DDR4 2400T - RDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| SK hynix 16GB DDR4 3200AA (HMAG78EXNRA084N AD) - RDIMM | SK hynix 16GB DDR4 3200AA (HMAG78EXNRA084N AD) - RDIMM | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |
| Asus Notebook UX305C M5-6Y54 8go LPDDR3 256 gb ssd sata 13.3p | Asus Notebook UX305C M5-6Y54 8go LPDDR3 256 gb ssd sata 13.3p | 1 | 🟢 CERTAIN | Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier |

#### Catégorie : PROCESSEURS
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Intel Xeon E5-2620 v3 | Intel Xeon E5-2620 v3 | 8 | 🟡 TRES PROBABLE | Processeur seul (aucun composant de stockage ou ram mentionné) |
| Intel Xeon E5-2620 v4 | Intel Xeon E5-2620 v4 | 2 | 🟡 TRES PROBABLE | Processeur seul (aucun composant de stockage ou ram mentionné) |

### Famille : IMPRESSION
#### Catégorie : CONSOMMABLES
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Lenovo ThinkCentre M715q Tiny (AMD A6 PRO-8570E R5) | Lenovo ThinkCentre M715q Tiny (AMD A6 PRO-8570E R5) | 34 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x390 i5-8265 U 8gb ddr4 256gb ssd nvme 13.3''FHD | Lenovo thinkpad x390 i5-8265 U 8gb ddr4 256gb ssd nvme 13.3''FHD | 18 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x280 i5-8350 U 8go ddr4 256gb ssd nvme 12.5''FHD | Lenovo thinkpad x280 i5-8350 U 8go ddr4 256gb ssd nvme 12.5''FHD | 17 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Heatsink pour HPE ProLiant DL360 Gen9 (P/N : 734042-001 / 775403-001) | Heatsink pour HPE ProLiant DL360 Gen9 (P/N : 734042-001 / 775403-001) | 7 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 503A Yellow Toner Cartridge — Q7582A | HP 503A Yellow Toner Cartridge — Q7582A | 6 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| CF287X / 87X / 041H Black Toner Cartridge — 20,000 pages | CF287X / 87X / 041H Black Toner Cartridge — 20,000 pages | 6 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Heatsink pour HP DL380 / DL380P G10 (P/N : 875070-001 / 839274-001 / 873592-001) | Heatsink pour HP DL380 / DL380P G10 (P/N : 875070-001 / 839274-001 / 873592-001) | 5 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkbook 14 G3 Ryzen 5 5500U 16gb ddr4 512gb nvme battery 4h | Lenovo thinkbook 14 G3 Ryzen 5 5500U 16gb ddr4 512gb nvme battery 4h | 4 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad E14-G2 i7-1165 G7 16go ddr4 512gb ssd nvme pcle 14p | Lenovo thinkpad E14-G2 i7-1165 G7 16go ddr4 512gb ssd nvme pcle 14p | 4 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Canon Cartridge 724 H Black Toner Cartridge | Canon Cartridge 724 H Black Toner Cartridge | 4 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| KOANAN Compatible Toner Cartridge | KOANAN Compatible Toner Cartridge | 4 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| TONE-BANK Compatible Toner Cartridge | TONE-BANK Compatible Toner Cartridge | 4 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x270 i5-7300 U 8go ddr4 256gb ssd nvme 12.5p | Lenovo thinkpad x270 i5-7300 U 8go ddr4 256gb ssd nvme 12.5p | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 503A Cyan Toner Cartridge — Q7581A | HP 503A Cyan Toner Cartridge — Q7581A | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Station d'accueil Lenovo ThinkPad Ultra dock | Station d'accueil Lenovo ThinkPad Ultra dock | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 503A Magenta Toner Cartridge — Q7583A | HP 503A Magenta Toner Cartridge — Q7583A | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkPad Ultra Docking Station (Type : 40AJ / FRU P/N : 5D20X62306) | Lenovo ThinkPad Ultra Docking Station (Type : 40AJ / FRU P/N : 5D20X62306) | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Heatsink pour HP ProLiant ML350 Gen9 (P/N : 769018-001 / Spare : 780977-001) | Heatsink pour HP ProLiant ML350 Gen9 (P/N : 769018-001 / Spare : 780977-001) | 3 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkCentre amd pro a6 8gb 256gb SSD | Lenovo ThinkCentre amd pro a6 8gb 256gb SSD | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x1 carbon i5-8550 U 8go ddr4 256gb ssd nvme 14p | Lenovo thinkpad x1 carbon i5-8550 U 8go ddr4 256gb ssd nvme 14p | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkbook 14 G2 I7-1165 G7 16go ddr4 512gb ssd nvme pcle 14p | Lenovo thinkbook 14 G2 I7-1165 G7 16go ddr4 512gb ssd nvme pcle 14p | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad T14 Gen1 i7-1051 U 16go ddr4 512gb ssd nvme 14p | Lenovo thinkpad T14 Gen1 i7-1051 U 16go ddr4 512gb ssd nvme 14p | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkVision T22i-20 | Lenovo ThinkVision T22i-20 | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Blocs/modules de ventilation complets pour serveur Lot de ventilateurs SUNON - Modèle PF92381BX-D110-Q99-- et Nidec UltraFlo  Lot de dissipateurs thermiques (Heatsinks) pour processeurs Lot de cages et fonds de panier (Backplanes) SAS/SATA pour disques durs  Divers: pâte thermique, supports de montage CPU et caddies pour disques durs  RÉCAPITULATIF COMPLET | Blocs/modules de ventilation complets pour serveur Lot de ventilateurs SUNON - Modèle PF92381BX-D110-Q99-- et Nidec UltraFlo  Lot de dissipateurs thermiques (Heatsinks) pour processeurs Lot de cages et fonds de panier (Backplanes) SAS/SATA pour disques durs  Divers: pâte thermique, supports de montage CPU et caddies pour disques durs  RÉCAPITULATIF COMPLET | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| ThinkSystem 300GB — SAS 10K 12Gbps — 2,5" | ThinkSystem 300GB — SAS 10K 12Gbps — 2,5" | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Compatible Kyocera TK-5490 Toner Cartridge Set — TK#SET5490 | Compatible Kyocera TK-5490 Toner Cartridge Set — TK#SET5490 | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Nova Cartuchos Compatible Black Toner Cartridge | Nova Cartuchos Compatible Black Toner Cartridge | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Nova Cartuchos Compatible Cyan Toner Cartridge | Nova Cartuchos Compatible Cyan Toner Cartridge | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Nova Cartuchos Compatible Magenta Toner Cartridge | Nova Cartuchos Compatible Magenta Toner Cartridge | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Nova Cartuchos Compatible Yellow Toner Cartridge | Nova Cartuchos Compatible Yellow Toner Cartridge | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| WAVLINK USB-C 4K Triple Display MST Dock (Modèle : DY-TU4720 Rev.e) | WAVLINK USB-C 4K Triple Display MST Dock (Modèle : DY-TU4720 Rev.e) | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP CPU Heatsink (HPE P/N : 747608-001 / Spare : 777290-001) | HP CPU Heatsink (HPE P/N : 747608-001 / Spare : 777290-001) | 2 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkCentre i5-6th 8gb 256gb ssd | Lenovo ThinkCentre i5-6th 8gb 256gb ssd | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkCentre i3-10th 8gb ddr4 240gb SSD | Lenovo ThinkCentre i3-10th 8gb ddr4 240gb SSD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkpadStation P320-intel core i7-7em gen | Lenovo ThinkpadStation P320-intel core i7-7em gen | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkCentre m70q gen 3 i5 12400t 16gb ddr4 500gb ssd | Lenovo ThinkCentre m70q gen 3 i5 12400t 16gb ddr4 500gb ssd | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad P16V G1 i7 13700H 16gb ddr5 1tb nvme fhd 15.6p rtx A1000 battery 94% | Lenovo thinkpad P16V G1 i7 13700H 16gb ddr5 1tb nvme fhd 15.6p rtx A1000 battery 94% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkbook 13S G2 i5 1135U 8gb ddr4 256gb nvme tactile fhd 13p battery 87% | Lenovo thinkbook 13S G2 i5 1135U 8gb ddr4 256gb nvme tactile fhd 13p battery 87% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad P14S G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p Quadro P520 battery 88% | Lenovo thinkpad P14S G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p Quadro P520 battery 88% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad E585 ryzen 5 2500U 8gb ddr4 256gb nvme fhd 15.6 radeon vega 8 battery 90% | Lenovo thinkpad E585 ryzen 5 2500U 8gb ddr4 256gb nvme fhd 15.6 radeon vega 8 battery 90% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad P15V G3 i7 12700H 16gb ddr5 512gb nvme fhd 15.6p T600 battery 83% | Lenovo thinkpad P15V G3 i7 12700H 16gb ddr5 512gb nvme fhd 15.6p T600 battery 83% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p battery 90% | Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p battery 90% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 512gb nvme fhd 14p battery 85% | Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 512gb nvme fhd 14p battery 85% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x390 i5 8265U 8gb ddr4 512gb nvme fhd 13p battery 4h | Lenovo thinkpad x390 i5 8265U 8gb ddr4 512gb nvme fhd 13p battery 4h | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p battery hs | Lenovo thinkpad T14 G1 i7 10510U 16gb ddr4 256gb nvme fhd 14p battery hs | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x260 i5-6300 U 8go ddr4 256gb ssd nvme 12.5p | Lenovo thinkpad x260 i5-6300 U 8go ddr4 256gb ssd nvme 12.5p | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| ThinkCentre i7 upro 7eme 8gb ddr4 256gb sata SSD | ThinkCentre i7 upro 7eme 8gb ddr4 256gb sata SSD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x13 ryzen 5 4650u 8gb ddr4 256gb nvme ssd 86% | Lenovo thinkpad x13 ryzen 5 4650u 8gb ddr4 256gb nvme ssd 86% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| ThinkCentre i7 8700 16gb ddr4 256gb SSD | ThinkCentre i7 8700 16gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| ThinkCentre i7 9700 16gb ddr4 256gb SSD | ThinkCentre i7 9700 16gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| ThinkCentre i5 7400 8gb ddr4 256gb SSD | ThinkCentre i5 7400 8gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Wavlink WL-UTD03 USB-C 4K Triple Display Docking Station | Wavlink WL-UTD03 USB-C 4K Triple Display Docking Station | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkVision T24-40 | Lenovo ThinkVision T24-40 | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad L13 G3 Ryzen 5-5675 U 8go ddr4 256gb ssd nvme 13.3p | Lenovo thinkpad L13 G3 Ryzen 5-5675 U 8go ddr4 256gb ssd nvme 13.3p | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkSystem SR530 2x Xeon Silver 4208 64GB RAM 3x1.2TB SAS RAID 530-8i | Lenovo ThinkSystem SR530 2x Xeon Silver 4208 64GB RAM 3x1.2TB SAS RAID 530-8i | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| LENOVO THINKPAD T14 G1 I7 1051U 16GB RAM 500GB NVME 4H BATTERY | LENOVO THINKPAD T14 G1 I7 1051U 16GB RAM 500GB NVME 4H BATTERY | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo thinkpad x280 i5 8350U 8gb ddr4 128gb nvme fhd 13p battery 92% | Lenovo thinkpad x280 i5 8350U 8gb ddr4 128gb nvme fhd 13p battery 92% | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Epson T9452 Cyan XL Ink Supply Unit | Epson T9452 Cyan XL Ink Supply Unit | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Compatible HP 364A / CC364A Black Toner Cartridge | Compatible HP 364A / CC364A Black Toner Cartridge | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 05A Black Toner Cartridge — CE505A | HP 05A Black Toner Cartridge — CE505A | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 11X Black Toner Cartridge — Q6511X | HP 11X Black Toner Cartridge — Q6511X | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| HP 501A Black Toner Cartridge — Q6470A | HP 501A Black Toner Cartridge — Q6470A | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Ink MASTER CF283A Compatible Toner Cartridge | Ink MASTER CF283A Compatible Toner Cartridge | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| NEWLIGHT 283A / 283X / 737 Compatible Toner Cartridge | NEWLIGHT 283A / 283X / 737 Compatible Toner Cartridge | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Epson T9451 Black XL Ink Supply Unit | Epson T9451 Black XL Ink Supply Unit | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Epson T9453 Magenta XL Ink Supply Unit | Epson T9453 Magenta XL Ink Supply Unit | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Epson T9454 Yellow XL Ink Supply Unit | Epson T9454 Yellow XL Ink Supply Unit | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Carte HBA Lenovo ThinkSystem 430-8e — PCIe, 2× Mini-SAS HD | Carte HBA Lenovo ThinkSystem 430-8e — PCIe, 2× Mini-SAS HD | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkSystem S530 | Lenovo ThinkSystem S530 | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo Thinkcentre M75q Gen2 Ryzen 3 pro 5350 GE 16gb ddr4 512gb ssd | Lenovo Thinkcentre M75q Gen2 Ryzen 3 pro 5350 GE 16gb ddr4 512gb ssd | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Kit de rails de montage Lenovo ThinkSystem SR530 (FRU P/N : 00YK494 / SN : SM17A18040P1WX08X0121) | Kit de rails de montage Lenovo ThinkSystem SR530 (FRU P/N : 00YK494 / SN : SM17A18040P1WX08X0121) | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |
| Lenovo ThinkSmart Hub 500  (10V5) | Lenovo ThinkSmart Hub 500  (10V5) | 1 | 🟢 CERTAIN | Mot clé exclusif au consommable détecté (toner, cartridge, etc.) |

#### Catégorie : IMPRIMANTES
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| HP Color LaserJet Pro MFP M477fdn | HP Color LaserJet Pro MFP M477fdn | 6 | 🟢 CERTAIN | Gamme imprimante détectée |
| HP LaserJet Managed MFP E52645 | HP LaserJet Managed MFP E52645 | 5 | 🟢 CERTAIN | Gamme imprimante détectée |
| HP LaserJet Pro M501 | HP LaserJet Pro M501 | 3 | 🟢 CERTAIN | Gamme imprimante détectée |
| HP LaserJet Pro 400 M401a | HP LaserJet Pro 400 M401a | 2 | 🟢 CERTAIN | Gamme imprimante détectée |
| HP LaserJet Enterprise M507x - Monochrome Laser Printer | HP LaserJet Enterprise M507x - Monochrome Laser Printer | 1 | 🟢 CERTAIN | Gamme imprimante détectée |
| HP LaserJet Managed E60155 | HP LaserJet Managed E60155 | 1 | 🟢 CERTAIN | Gamme imprimante détectée |
| Toshiba B-EX4D2-GS12-QM-R - Barcode Printer | Toshiba B-EX4D2-GS12-QM-R - Barcode Printer | 1 | 🟢 CERTAIN | Gamme imprimante détectée |

### Famille : ORDINATEURS
#### Catégorie : PC BUREAU
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell OptiPlex 3050 Micro (Intel Core i5-6500T, 8 Go RAM, 256 Go SSD) | Dell OptiPlex 3050 Micro (Intel Core i5-6500T, 8 Go RAM, 256 Go SSD) | 11 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP EliteDesk 705 G4 DM 35W (AMD Ryzen 5 PRO 2400GE, 8 Go RAM) | HP EliteDesk 705 G4 DM 35W (AMD Ryzen 5 PRO 2400GE, 8 Go RAM) | 6 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP ProDesk 405 G4 (AMD Athlon PRO 200GE) | HP ProDesk 405 G4 (AMD Athlon PRO 200GE) | 6 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell OptiPlex 7050 Micro (Intel Core i5-6500T, 8 Go RAM, 256 Go SSD) | Dell OptiPlex 7050 Micro (Intel Core i5-6500T, 8 Go RAM, 256 Go SSD) | 5 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 3050 i5-7500T 8gb/256gb ssd | Dell Optiplex 3050 i5-7500T 8gb/256gb ssd | 4 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell OptiPlex Micro (Intel Core i5-7600T, 8 Go RAM, 256 Go SSD) | Dell OptiPlex Micro (Intel Core i5-7600T, 8 Go RAM, 256 Go SSD) | 4 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 3050 i5-6th 8gb 256gb ssd | Dell Optiplex 3050 i5-6th 8gb 256gb ssd | 3 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 3040 i5 6500T 8gb ddr3 256gb sata ssd | Dell Optiplex 3040 i5 6500T 8gb ddr3 256gb sata ssd | 3 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell optiplex 3040 i5 6500t 8gb ddr3 256gb sata SSD | Dell optiplex 3040 i5 6500t 8gb ddr3 256gb sata SSD | 2 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp EliteDesk 705 G4 Ryzen 5 PRO 2400G | Hp EliteDesk 705 G4 Ryzen 5 PRO 2400G | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp prodesk 400 g6 mt i5 8500t 8gb ddr4 256gb nvme | Hp prodesk 400 g6 mt i5 8500t 8gb ddr4 256gb nvme | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 5050 i7 6eme 8gb ddr4 256gb SSD | Dell Optiplex 5050 i7 6eme 8gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex i7 4790 8gb ddr3 256gb SSD | Dell Optiplex i7 4790 8gb ddr3 256gb SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell optiplex 7040 i7 6700 8gb ddr3 256gb nvme SSD | Dell optiplex 7040 i7 6700 8gb ddr3 256gb nvme SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Fujitsu mt i3 6eme 8gb ddr4 256gb sata SSD | Fujitsu mt i3 6eme 8gb ddr4 256gb sata SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP PRODESK 400 G6 i3 9eme 8gb ddr4 256gb nvme SSD | HP PRODESK 400 G6 i3 9eme 8gb ddr4 256gb nvme SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp elitedesk i7 upro 6eme 8gb ddr4 256gb sata SSD | Hp elitedesk i7 upro 6eme 8gb ddr4 256gb sata SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp prodesk i5 8eme 8gb ddr4 256gb sata ssd | Hp prodesk i5 8eme 8gb ddr4 256gb sata ssd | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| FUJI SFF i5 7400 4gb 256gb | FUJI SFF i5 7400 4gb 256gb | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP prodesk 600 G2 i3 6eme 8gb ddr3 256gb nvme SSD | HP prodesk 600 G2 i3 6eme 8gb ddr3 256gb nvme SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP Prodesk 290 G1 i3 7eme 8gb ddr4 250gb sata SSD | HP Prodesk 290 G1 i3 7eme 8gb ddr4 250gb sata SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp Pro tower i5 14400 16gb ddr5 256gb nvme SSD | Hp Pro tower i5 14400 16gb ddr5 256gb nvme SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 3060 i3 8100 8gb ddr4 256gb nvme SSD | Dell Optiplex 3060 i3 8100 8gb ddr4 256gb nvme SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp prodesk 600 g2 i7 6100 8gb ddr4 256gb SSD | Hp prodesk 600 g2 i7 6100 8gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 5040 i7 6eme 8gb ddr4 256gb SSD | Dell Optiplex 5040 i7 6eme 8gb ddr4 256gb SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP prodesk 400 g3 i3 6eme 8gb ddr4 240gb sata SSD | HP prodesk 400 g3 i3 6eme 8gb ddr4 240gb sata SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP PRODESK 400 G7 I3 10TH 256GB SSD 8GB RAM | HP PRODESK 400 G7 I3 10TH 256GB SSD 8GB RAM | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP PRODESK I3 7100 8GB RAM SANS DISQUE | HP PRODESK I3 7100 8GB RAM SANS DISQUE | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP PRODESK 400 G4 I3 7100T 8GB RAM 256GB SSD | HP PRODESK 400 G4 I3 7100T 8GB RAM 256GB SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP PRODESK 400 G6 I3 9TH 8GB RAM 256GB SSD | HP PRODESK 400 G6 I3 9TH 8GB RAM 256GB SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp prodesk 400 G4 i3 8100 8gb 240gb SSD | Hp prodesk 400 G4 i3 8100 8gb 240gb SSD | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP 295 G8 Microtower Ryzen 5 5600g 16gb ddr4 512 gb nvme 1050 ti | HP 295 G8 Microtower Ryzen 5 5600g 16gb ddr4 512 gb nvme 1050 ti | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 7070 i7 9700 16gb ram ddr4 256gb sata | Dell Optiplex 7070 i7 9700 16gb ram ddr4 256gb sata | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Hp ProDesk 600 g4 i5 8500t 8gb ram 256gb data ssd | Hp ProDesk 600 g4 i5 8500t 8gb ram 256gb data ssd | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP ProDesk 600 G4 (Intel Core i5-8500T, 8 Go RAM, 256 Go SSD) | HP ProDesk 600 G4 (Intel Core i5-8500T, 8 Go RAM, 256 Go SSD) | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 9020 i7 4790 8gb ddr3 256gb ssd sata | Dell Optiplex 9020 i7 4790 8gb ddr3 256gb ssd sata | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| Dell Optiplex 7410 i5 13500T 8gb ram 256gb nvme | Dell Optiplex 7410 i5 13500T 8gb ram 256gb nvme | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |
| HP EliteDesk 800 g6 i5 10500 16gb ddr4 256gb SSD NVMe | HP EliteDesk 800 g6 i5 10500 16gb ddr4 256gb SSD NVMe | 1 | 🟢 CERTAIN | Gamme PC bureau fixe standard |

#### Catégorie : PC PORTABLES
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell Latitude E 7250 i5-5300 U DDR3L ssd mSATA (probleme touchpad) | Dell Latitude E 7250 i5-5300 U DDR3L ssd mSATA (probleme touchpad) | 3 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7280 i7-7600 U 8go ddr4 256gb ssd nvme 12.5p | Dell Latitude 7280 i7-7600 U 8go ddr4 256gb ssd nvme 12.5p | 2 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Hp probook X360 11 G6 i5 10210Y 8 gb ddr4 128gb nvme tactile fhd 11.6p | Hp probook X360 11 G6 i5 10210Y 8 gb ddr4 128gb nvme tactile fhd 11.6p | 2 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 3540 i5-4210 U 8go ddr3l 256gb ssd 15.6p | Dell Latitude 3540 i5-4210 U 8go ddr3l 256gb ssd 15.6p | 2 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7300 i7-8665 U 8go ddr4 256gb ssd nvme 13.3p | Dell Latitude 7300 i7-8665 U 8go ddr4 256gb ssd nvme 13.3p | 2 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7390 i7-8650 U 8go ddr4 256gb ssd nvme 13.3p | Dell Latitude 7390 i7-8650 U 8go ddr4 256gb ssd nvme 13.3p | 2 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell latitude 3440 i5 1235U 8gb ddr4 256gb nvme fhd 14p | Dell latitude 3440 i5 1235U 8gb ddr4 256gb nvme fhd 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| HP elitebook AMD Pro a6 8gb ddr3 500gb HDD | HP elitebook AMD Pro a6 8gb ddr3 500gb HDD | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7280 i7-7600 U 8go ddr4 256gb ssd nvme 14p | Dell Latitude 7280 i7-7600 U 8go ddr4 256gb ssd nvme 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7420 i5-1145 G7 16go LPDDR4x 512gb ssd nvme pcle 14p | Dell Latitude 7420 i5-1145 G7 16go LPDDR4x 512gb ssd nvme pcle 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7480 i7-6600 8go ddr4 256gb ssd nvme 14p | Dell Latitude 7480 i7-6600 8go ddr4 256gb ssd nvme 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 7380 i5-8265 U 8go ddr4 256gb ssd nvme 13.3p | Dell Latitude 7380 i5-8265 U 8go ddr4 256gb ssd nvme 13.3p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 3410 i5-7300 U 8go ddr4 256gb ssd nvme 14p | Dell Latitude 3410 i5-7300 U 8go ddr4 256gb ssd nvme 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude E7270 i5-6300 U 8go ddr4 ssd 12.5p | Dell Latitude E7270 i5-6300 U 8go ddr4 ssd 12.5p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell Latitude 3410 i5-10210 U 16go ddr4 512gb ssd nvme 14p | Dell Latitude 3410 i5-10210 U 16go ddr4 512gb ssd nvme 14p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| HP Probook 455R G6  AMD Ryzen 5-3500 U 8go ddr4 256gb ssd nvme 15.6p | HP Probook 455R G6  AMD Ryzen 5-3500 U 8go ddr4 256gb ssd nvme 15.6p | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Hp Elitebook x360 830 g7 i7 10710u 16gb ddr4 500gb nvme 80% | Hp Elitebook x360 830 g7 i7 10710u 16gb ddr4 500gb nvme 80% | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |
| Dell xps 13 9345 Snapdragon x Elite 32gb ddr5 8445mhz 1tb nvme ssd | Dell xps 13 9345 Snapdragon x Elite 32gb ddr5 8445mhz 1tb nvme ssd | 1 | 🟢 CERTAIN | Gamme PC Portable reconnue (Latitude, Thinkpad, etc.) |

#### Catégorie : STATIONS DE TRAVAIL
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell Precision 5820 | Dell Precision 5820 | 11 | 🟢 CERTAIN | Station de travail (Workstation/Precision) |
| Workstation Pro - Xeon 4214 & RTX 2080 Ti - 32Go RAM - 1Tb nvme gen 4 | Workstation Pro - Xeon 4214 & RTX 2080 Ti - 32Go RAM - 1Tb nvme gen 4 | 1 | 🟢 CERTAIN | Station de travail (Workstation/Precision) |

### Famille : PÉRIPHÉRIQUES & ACCESSOIRES
#### Catégorie : ADAPTATEURS & CÂBLES
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell 600GB — SAS 15K 12Gbps — avec adaptateur 3,5" | Dell 600GB — SAS 15K 12Gbps — avec adaptateur 3,5" | 4 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| HPE 600GB — SAS 15K — avec adaptateur 3,5" | HPE 600GB — SAS 15K — avec adaptateur 3,5" | 2 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| HPE 729871-001 -2U Cable MANAGEMENT Arm kit | HPE 729871-001 -2U Cable MANAGEMENT Arm kit | 1 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| FUJITSU 147gb 10k rpm 2.5" avec adaptateur 3.5" | FUJITSU 147gb 10k rpm 2.5" avec adaptateur 3.5" | 1 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| HP 1tb 7200rpm SAS 2.5" avec adaptateur 3.5" | HP 1tb 7200rpm SAS 2.5" avec adaptateur 3.5" | 1 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| HP Kit Cable Arm Easy Install, 1U, G9 (P/N : 729872-001) | HP Kit Cable Arm Easy Install, 1U, G9 (P/N : 729872-001) | 1 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |
| HP Kit Cable Arm, 2U, G9 (P/N : 729871-001) | HP Kit Cable Arm, 2U, G9 (P/N : 729871-001) | 1 | 🔴 AMBIGU | Câble/Adaptateur générique, contexte manquant |

#### Catégorie : CLAVIERS & SOURIS
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| HP Keyboard (Modèle : KU-1469) | HP Keyboard (Modèle : KU-1469) | 5 | 🟢 CERTAIN | Clavier / Souris |
| Starter Wired Combo keyboard/mouse | Starter Wired Combo keyboard/mouse | 3 | 🟢 CERTAIN | Clavier / Souris |
| Dell Combo Wireless keyboard/Mouse | Dell Combo Wireless keyboard/Mouse | 3 | 🟢 CERTAIN | Clavier / Souris |
| HP Keyboard (Modèle : PR1101U / Spares P/N : 537924-051) | HP Keyboard (Modèle : PR1101U / Spares P/N : 537924-051) | 3 | 🟢 CERTAIN | Clavier / Souris |
| Dell Wired Keyboard | Dell Wired Keyboard | 2 | 🟢 CERTAIN | Clavier / Souris |
| Lenovo Wired Combo keyboard/mouse | Lenovo Wired Combo keyboard/mouse | 2 | 🟢 CERTAIN | Clavier / Souris |
| Starter Wireless Combo keyboard/mouse | Starter Wireless Combo keyboard/mouse | 2 | 🟢 CERTAIN | Clavier / Souris |
| HP Wired Desktop Keyboard | HP Wired Desktop Keyboard | 2 | 🟢 CERTAIN | Clavier / Souris |
| Dell Keyboard Wired Combo | Dell Keyboard Wired Combo | 2 | 🟢 CERTAIN | Clavier / Souris |
| PORT Connect Slim Wireless Keyboard | PORT Connect Slim Wireless Keyboard | 1 | 🟢 CERTAIN | Clavier / Souris |
| Dell Keyboard KB212-B (DP/N : 0DJ497) | Dell Keyboard KB212-B (DP/N : 0DJ497) | 1 | 🟢 CERTAIN | Clavier / Souris |

#### Catégorie : PIÈCES DE MONTAGE
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell 900GB — SAS 10K 12Gbps — avec caddy | Dell 900GB — SAS 10K 12Gbps — avec caddy | 29 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 600GB — SAS 10K — sans caddy | HPE 600GB — SAS 10K — sans caddy | 18 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 300GB — SAS 10K — sans caddy | HPE 300GB — SAS 10K — sans caddy | 16 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 300GB — SAS 10K — avec caddy | HPE 300GB — SAS 10K — avec caddy | 14 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Dell 300GB — SAS 15K — avec caddy | Dell 300GB — SAS 15K — avec caddy | 13 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Dell 600GB — SAS 10K — avec caddy | Dell 600GB — SAS 10K — avec caddy | 9 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HP 450GB — SAS 10K — avec caddy | HP 450GB — SAS 10K — avec caddy | 7 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 600GB — SAS 10K — avec caddy | HPE 600GB — SAS 10K — avec caddy | 7 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Hitachi 600GB — SAS 10K — sans caddy | Hitachi 600GB — SAS 10K — sans caddy | 7 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Dell 300GB — SAS 10K — sans caddy | Dell 300GB — SAS 10K — sans caddy | 4 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HP 450GB — SAS 10K — sans caddy | HP 450GB — SAS 10K — sans caddy | 3 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Dell 146GB — SAS 15K — avec caddy | Dell 146GB — SAS 15K — avec caddy | 3 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 600GB — SAS 15K — avec caddy | HPE 600GB — SAS 15K — avec caddy | 3 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| sans Caddy | sans Caddy | 3 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HP 300GB — SAS 15K — avec caddy | HP 300GB — SAS 15K — avec caddy | 3 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 600GB — SAS 15K — sans caddy | HPE 600GB — SAS 15K — sans caddy | 2 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 450GB — SAS 15K — sans caddy | HPE 450GB — SAS 15K — sans caddy | 1 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HPE 300GB — SAS 15K — sans caddy | HPE 300GB — SAS 15K — sans caddy | 1 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| Caddy/emplacement SAS 300GO -15K RPM vide | Caddy/emplacement SAS 300GO -15K RPM vide | 1 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HP 146GB — SAS 10K — avec caddy | HP 146GB — SAS 10K — avec caddy | 1 | 🟢 CERTAIN | Pièce de montage serveur/stockage |
| HP 300GB — SAS 10K — avec caddy | HP 300GB — SAS 10K — avec caddy | 1 | 🟢 CERTAIN | Pièce de montage serveur/stockage |

#### Catégorie : STATIONS D'ACCUEIL
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| HP 2013 UltraSlim Docking Station (Product : D9Y32AA / Spare : 732252-001) | HP 2013 UltraSlim Docking Station (Product : D9Y32AA / Spare : 732252-001) | 6 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |
| Station d'accueil Dell Dock WD15 | Station d'accueil Dell Dock WD15 | 5 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |
| Dell WD19 Docking Station (Modèle : K20A / Type : K20A001) | Dell WD19 Docking Station (Modèle : K20A / Type : K20A001) | 4 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |
| HP UltraSlim Docking Station | HP UltraSlim Docking Station | 3 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |
| Kensington Universal USB-C Scalable Video Dock with Power Delivery (P/N : K38249 / M/N : M01418) | Kensington Universal USB-C Scalable Video Dock with Power Delivery (P/N : K38249 / M/N : M01418) | 1 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |
| Targus USB-C DisplayPort Alt Mode Docking Station 85W PD (Modèle : DOCK430-A / SKU : DOCK430EUZ-70) | Targus USB-C DisplayPort Alt Mode Docking Station 85W PD (Modèle : DOCK430-A / SKU : DOCK430EUZ-70) | 1 | 🟢 CERTAIN | Identification forte de station d'accueil/dock |

### Famille : RÉSEAU & POS
#### Catégorie : ADAPTATEURS RÉSEAU
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Adaptateur réseau i-tec USB-C Gigabit Ethernet (10/100/1000 Mbps). | Adaptateur réseau i-tec USB-C Gigabit Ethernet (10/100/1000 Mbps). | 10 | 🟢 CERTAIN | Adaptateur réseau USB/externe |

#### Catégorie : SYSTÈMES POS
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Oracle MICROS Compact Workstation 310 | Oracle MICROS Compact Workstation 310 | 5 | 🟢 CERTAIN | Système POS / Micros détecté |
| Oracle MICROS Workstation 6 Series 2 (WS625x) POS Terminal | Oracle MICROS Workstation 6 Series 2 (WS625x) POS Terminal | 1 | 🟢 CERTAIN | Système POS / Micros détecté |
| Oracle MICROS Express Station 4 (EWS4) POS Terminal | Oracle MICROS Express Station 4 (EWS4) POS Terminal | 1 | 🟢 CERTAIN | Système POS / Micros détecté |

### Famille : SERVEURS
#### Catégorie : SERVEURS RACK
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Dell PowerEdge R630 | Dell PowerEdge R630 | 12 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE PROLiant ML350 Gen9 | HPE PROLiant ML350 Gen9 | 10 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Blocs d'alimentation (PSU) serveur 800W | Blocs d'alimentation (PSU) serveur 800W | 8 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE  PROLiant DL360 Gen9 | HPE  PROLiant DL360 Gen9 | 7 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE PROLiant DL360 Gen10 | HPE PROLiant DL360 Gen10 | 5 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE PROLiant DL380 Gen10 | HPE PROLiant DL380 Gen10 | 5 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HP PROLiant ML350 Gen9 | HP PROLiant ML350 Gen9 | 3 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE Smart Array P440ar (Serveurs Gen9, format Flexible, 2 ports) | HPE Smart Array P440ar (Serveurs Gen9, format Flexible, 2 ports) | 3 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell PowerEdge R430 | Dell PowerEdge R430 | 2 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE PROLiant DL325 Gen10 | HPE PROLiant DL325 Gen10 | 2 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell EMC PowerEdge R440 | Dell EMC PowerEdge R440 | 2 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE Smart Array P816i-a SR Gen10 (Serveurs Gen10, format Flexible, 4 ports) | HPE Smart Array P816i-a SR Gen10 (Serveurs Gen10, format Flexible, 4 ports) | 2 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HP PROLiant ML110 Gen9 | HP PROLiant ML110 Gen9 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell PowerEdge 2950 | Dell PowerEdge 2950 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HPE PROLiant DL380 Gen9 | HPE PROLiant DL380 Gen9 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell EMC PowerEdge T440 | Dell EMC PowerEdge T440 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell EMC PowerEdge T430 | Dell EMC PowerEdge T430 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HP PROLiant ML10 V2 | HP PROLiant ML10 V2 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| HP PROLiant ML350 Gen10 | HP PROLiant ML350 Gen10 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Dell PowerEdge 2950 (2x 146GB SAS 15K, 2x 300gb SAS 15K) | Dell PowerEdge 2950 (2x 146GB SAS 15K, 2x 300gb SAS 15K) | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |
| Riser NVMe HPE Quad Slim SAS — Serveur Gen10 | Riser NVMe HPE Quad Slim SAS — Serveur Gen10 | 1 | 🟢 CERTAIN | Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé |

### Famille : STOCKAGE
#### Catégorie : DISQUES DURS
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| Seagate Barracuda 500GB — 3,5" | Seagate Barracuda 500GB — 3,5" | 32 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS 2To-7.2K RPM-VERT 3.5 | HDD SAS 2To-7.2K RPM-VERT 3.5 | 21 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| WD Blue 500GB — 3,5" | WD Blue 500GB — 3,5" | 13 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS 4To-7.2K RPM-VIOLET 3.5 | HDD SAS 4To-7.2K RPM-VIOLET 3.5 | 12 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS 2To-7.2K RPM-VIOLET 3.5 | HDD SAS 2To-7.2K RPM-VIOLET 3.5 | 9 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| Dell Enterprise Plus 1.2TB — SAS 10K — 2,5" | Dell Enterprise Plus 1.2TB — SAS 10K — 2,5" | 7 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS Dell 1 Tb rpm 7.2k | HDD SAS Dell 1 Tb rpm 7.2k | 4 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS 2To-7.2K RPM-BLEU-Seagate Enterpise Capacity 3.5v5 | HDD SAS 2To-7.2K RPM-BLEU-Seagate Enterpise Capacity 3.5v5 | 3 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| Dell Enterprise Class 1.2TB — SAS 10K — 2,5" | Dell Enterprise Class 1.2TB — SAS 10K — 2,5" | 3 | 🟢 CERTAIN | Disque Dur mécanique identifié |
| HDD SAS 146GO -15K RPM 3.5 | HDD SAS 146GO -15K RPM 3.5 | 2 | 🟢 CERTAIN | Disque Dur mécanique identifié |

### Famille : À VÉRIFIER
#### Catégorie : À VÉRIFIER
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| USB-C to C 5Gbps 100W 5A | USB-C to C 5Gbps 100W 5A | 61 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 256gb | SSD 256gb | 53 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 6100 | i3 - 6100 | 43 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Micron (2933) | 16GB Micron (2933) | 25 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB SK Hynix (2933) | 16GB SK Hynix (2933) | 23 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 500W Flex Slot Platinum Option : 865408-B21 Spare : 866729-001 P/N : 865399-101 | HPE 500W Flex Slot Platinum Option : 865408-B21 Spare : 866729-001 P/N : 865399-101 | 16 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 800W Flex Slot Platinum Option : 865414-B21 Spare : 866730-001 | HPE 800W Flex Slot Platinum Option : 865414-B21 Spare : 866730-001 | 14 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Micron (2666V) | 16GB Micron (2666V) | 13 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp pro mini 400G9 i3 12100t 16gb ddr4 256go NVMe | Hp pro mini 400G9 i3 12100t 16gb ddr4 256go NVMe | 12 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| P2000 | P2000 | 11 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Samsung (2400T) | 16GB Samsung (2400T) | 11 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Enterprise Plus 1.92TB — SAS — 2,5" | Dell Enterprise Plus 1.92TB — SAS — 2,5" | 10 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hewlett Packard Enterprise ML 350 G9 Xeon E5-2620 32GB RAM 2x300GB SAS RAID P440 AR | Hewlett Packard Enterprise ML 350 G9 Xeon E5-2620 32GB RAM 2x300GB SAS RAID P440 AR | 10 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i-tec USB-C Gigabit Ethernet Adapter (10/100/1000 Mbps) | i-tec USB-C Gigabit Ethernet Adapter (10/100/1000 Mbps) | 10 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HDD SAS 1To- Seagate Exos 7E8 3.5 | HDD SAS 1To- Seagate Exos 7E8 3.5 | 9 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lenovo 14 G3 AMD Ryzen 5-5500n 8go ddr4 256gb ssd nvme pcle 14p | Lenovo 14 G3 AMD Ryzen 5-5500n 8go ddr4 256gb ssd nvme pcle 14p | 8 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Samsung (2666V) | 16GB Samsung (2666V) | 8 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| RX 570 | RX 570 | 7 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Kingston SSD SATA 480GB | Kingston SSD SATA 480GB | 7 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP ProLiant DL360 G9 E5-2630 32GB RAM 2x300GB SAS RAID P440 AR | HP ProLiant DL360 G9 E5-2630 32GB RAM 2x300GB SAS RAID P440 AR | 7 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SAMSUNG 960gb | SAMSUNG 960gb | 6 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Western Digital WD RE3 500GB — 3,5" | Western Digital WD RE3 500GB — 3,5" | 5 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Kingston (2933) | 16GB Kingston (2933) | 5 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Samsung (2933) | 16GB Samsung (2933) | 5 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| RX 580 | RX 580 | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 14 eme | i3 - 14 eme | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 8100 | i3 - 8100 | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Seagate Desktop HDD 500GB — 3,5" | Seagate Desktop HDD 500GB — 3,5" | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP 460W Spare : 511777-001 Modèle : HSTNS-PL14 | HP 460W Spare : 511777-001 Modèle : HSTNS-PL14 | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB SK Hynix (2133P) | 32GB SK Hynix (2133P) | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB SK Hynix (2400T) | 16GB SK Hynix (2400T) | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB SK Hynix (2666V) | 8GB SK Hynix (2666V) | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 4GB SK Hynix (2666V) | 4GB SK Hynix (2666V) | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB SK Hynix (2133P) | 8GB SK Hynix (2133P) | 4 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Fujitsu Primergy RX2540 M2 | Fujitsu Primergy RX2540 M2 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Seagate SkyHawk 1TB — 3,5" | Seagate SkyHawk 1TB — 3,5" | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Toshiba 1TB — 3,5" | Toshiba 1TB — 3,5" | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP ML350 G9 | HP ML350 G9 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 500W Flex Slot Platinum Option : 720478-B21 Spare : 754377-001 Modèle : HSTNS-PL40 | HPE 500W Flex Slot Platinum Option : 720478-B21 Spare : 754377-001 Modèle : HSTNS-PL40 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Fujitsu Primergy RX2540 M2 Xeon E5-2630 32GB RAM | Fujitsu Primergy RX2540 M2 Xeon E5-2630 32GB RAM | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP 750W Spare : 511778-001 Modèle : HSTNS-PL18 | HP 750W Spare : 511778-001 Modèle : HSTNS-PL18 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 800W Flex Slot Platinum Option : 720479-B21 Spare : 754381-001 P/N : 723600-101 | HPE 800W Flex Slot Platinum Option : 720479-B21 Spare : 754381-001 P/N : 723600-101 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP 546FLR / 556FLR — FlexibleLOM, 2× SFP+ 10GbE | HP 546FLR / 556FLR — FlexibleLOM, 2× SFP+ 10GbE | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB SK Hynix (2400T) | 32GB SK Hynix (2400T) | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Samsung (2666V) | 32GB Samsung (2666V) | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 4GB Samsung (2133P) | 4GB Samsung (2133P) | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Samsung (2133P) | 8GB Samsung (2133P) | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Samsung (2400T) | 8GB Samsung (2400T) | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| EATON Ellipse ECO 650 | EATON Ellipse ECO 650 | 3 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 7280 i7 7600U 8gb ddr4 256gb nvme fhd 12.8p battery miss | Dell latitude 7280 i7 7600U 8gb ddr4 256gb nvme fhd 12.8p battery miss | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| P2200 | P2200 | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp G1 i3 4130 4GB ddr3 500gb HDD | Hp G1 i3 4130 4GB ddr3 500gb HDD | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Vostro 15 i5-7200 U 8go ddr4 256gb ssd 2.5''sata15.6p | Dell Vostro 15 i5-7200 U 8go ddr4 256gb ssd 2.5''sata15.6p | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SanDisk SSD SATA 500GB | SanDisk SSD SATA 500GB | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP - 120w | HP - 120w | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Tours avec boitier Fractal Design | Tours avec boitier Fractal Design | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Vostro 3580 i5-8265 8go ddr4 256gb ssd nvme 15.6p | Dell Vostro 3580 i5-8265 8go ddr4 256gb ssd nvme 15.6p | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i5 - 6500T | i5 - 6500T | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| P6000 | P6000 | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 8100T | i3 - 8100T | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 9100 | i3 - 9100 | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Cisco  WS-C2960X -24PS-L Switch | Cisco  WS-C2960X -24PS-L Switch | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Cisco SG350-28MP-K9-EU Switch | Cisco SG350-28MP-K9-EU Switch | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| NETGEAR GS752TPP-100EUS Switch | NETGEAR GS752TPP-100EUS Switch | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| ZYXEL Ethernet Switch - En boite | ZYXEL Ethernet Switch - En boite | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 3.84TB — SAS — 2,5" | HPE 3.84TB — SAS — 2,5" | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Toshiba 500GB — 3,5" | Toshiba 500GB — 3,5" | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Canon imageRUNNER ADVANCE 525i | Canon imageRUNNER ADVANCE 525i | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Canon imageRUNNER C1325iF | Canon imageRUNNER C1325iF | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lexmark B2442dw | Lexmark B2442dw | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Enterprise Capacity 1TB — SAS — 2,5" | Dell Enterprise Capacity 1TB — SAS — 2,5" | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Kioxia 24G 15.36TB — SAS — 2,5" | Kioxia 24G 15.36TB — SAS — 2,5" | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP ProLiant DL325 G10 AMD EPYC 7302P 32GB RAM 2x300GB SAS RAID P408i | HP ProLiant DL325 G10 AMD EPYC 7302P 32GB RAM 2x300GB SAS RAID P408i | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| sans RAID + 1 avec RAID | sans RAID + 1 avec RAID | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell 570W DP/N : 0RXCPH Réf : CWA2-0570-10-DL01 | Dell 570W DP/N : 0RXCPH Réf : CWA2-0570-10-DL01 | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| IBM / Lenovo 550W IBM P/N : 94Y8109 FRU : 94Y8110 Modèle : FSA011 | IBM / Lenovo 550W IBM P/N : 94Y8109 FRU : 94Y8110 Modèle : FSA011 | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Eaton 5PX EBM 48V RT2U G2 (Module batterie / Catalog Nb : 5PXEBM48RT2UG2) | Eaton 5PX EBM 48V RT2U G2 (Module batterie / Catalog Nb : 5PXEBM48RT2UG2) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Eaton 9SX 5000VA/4500W UPS (P/N : 9104-5210-00P / Modèle : 9SX5KIRT) | Eaton 9SX 5000VA/4500W UPS (P/N : 9104-5210-00P / Modèle : 9SX5KIRT) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| AISENS Monitor Desk Mount/POS Full Motion, 17" à 32" (Modèle : DT32TSR-373) | AISENS Monitor Desk Mount/POS Full Motion, 17" à 32" (Modèle : DT32TSR-373) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Micron (3200AA) | 32GB Micron (3200AA) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Samsung (2400T) | 32GB Samsung (2400T) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB SK Hynix (2666V) | 16GB SK Hynix (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 4GB Micron (2666V) | 4GB Micron (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Crucial (2666V) | 16GB Crucial (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 4GB Samsung (2666V) | 4GB Samsung (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Micron (2666V) | 8GB Micron (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB SK Hynix (2400T) | 8GB SK Hynix (2400T) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Samsung (2666V) | 8GB Samsung (2666V) | 2 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Aurora R13 i5 12400t 16gb ram ddr5 1tb ssd nvme Rtx 3060 12gb vram | Dell Aurora R13 i5 12400t 16gb ram ddr5 1tb ssd nvme Rtx 3060 12gb vram | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp Z 440 Xeon e5-1620 16gb ddr4 256gb ssd | Hp Z 440 Xeon e5-1620 16gb ddr4 256gb ssd | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 81% | Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 81% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP EliteOne 800 g5 i5 9600 8gb ram 240gb nvme | HP EliteOne 800 g5 i5 9600 8gb ram 240gb nvme | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Tour noir 2CRSI-PROCESSEUR XEON 4214, 16GO RAM,256GB NVME | Tour noir 2CRSI-PROCESSEUR XEON 4214, 16GO RAM,256GB NVME | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 84% | Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 84% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 43% | Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 43% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 45% | Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 45% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 3420 i5 1135G7 8gb ddr4 256gb nvme fhd 14p battery 69% | Dell latitude 3420 i5 1135G7 8gb ddr4 256gb nvme fhd 14p battery 69% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 78% | Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 78% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp notebook 255 G8 ryzen 3 3250U 8 gb ddr4 256gb nvme fhd 15.6p battery 96% | Hp notebook 255 G8 ryzen 3 3250U 8 gb ddr4 256gb nvme fhd 15.6p battery 96% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP ProOne 600 G4 21.5 i3 8eme 16gb ram 256gb ssd | HP ProOne 600 G4 21.5 i3 8eme 16gb ram 256gb ssd | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP Pro One 600 G4 I5 8500 8GB RAM 256GB | HP Pro One 600 G4 I5 8500 8GB RAM 256GB | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 7390 i7 8650U 16gb ddr4 512gb nvme fhd 13.2p battery HS | Dell latitude 7390 i7 8650U 16gb ddr4 512gb nvme fhd 13.2p battery HS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 50% | Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery 50% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 61% | Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 61% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lenovo V15 G2 ryzen 5 5500U 8gb ddr4 256gb nvme fhd 15.6p battery 81% | Lenovo V15 G2 ryzen 5 5500U 8gb ddr4 256gb nvme fhd 15.6p battery 81% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Maximpower i3 7eme 8gb ddr4 256gb sata SSD | Maximpower i3 7eme 8gb ddr4 256gb sata SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery HS | Dell latitude 3410 i3 10110U 8gb ddr4 256gb nvme fhd 14p battery HS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 7390 i7 8650U 8gb ddr4 256gb nvme fhd 13.2p battery miss | Dell latitude 7390 i7 8650U 8gb ddr4 256gb nvme fhd 13.2p battery miss | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Acer vertirom i3 7eme 8gb ddr4 256gb sata SSD | Acer vertirom i3 7eme 8gb ddr4 256gb sata SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Canon i-sensys LBP6780x | Canon i-sensys LBP6780x | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lenovo E31 i5-6200 U 8go ddr4 256gb ssd nvme 13.3p | Lenovo E31 i5-6200 U 8go ddr4 256gb ssd nvme 13.3p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lenovo carbon i5-7200 8go ddr4 256gb sssd nvme 14.0''FHD | Lenovo carbon i5-7200 8go ddr4 256gb sssd nvme 14.0''FHD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp pavilion i5 8eme 16gb ddr4 128gb nvme SSD | Hp pavilion i5 8eme 16gb ddr4 128gb nvme SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp 280 g2 i3 6eme 8gb ddr4 240gb sata SSD | Hp 280 g2 i3 6eme 8gb ddr4 240gb sata SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Acer aspire XR 780 i3 7eme 8gb GT710 1GB VRAM 256gb sata SSD | Acer aspire XR 780 i3 7eme 8gb GT710 1GB VRAM 256gb sata SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell latitude 7280 i7 7600U 8gb ddr4 256gb nvme fhd 12.8p battery HS | Dell latitude 7280 i7 7600U 8gb ddr4 256gb nvme fhd 12.8p battery HS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lexmark MS310dn | Lexmark MS310dn | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP EliteDisplay E22 G4 FHD 21.5" | HP EliteDisplay E22 G4 FHD 21.5" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Vostro 3590 i5-10210 U 16go ddr4 512gb ssd nvme 15.6p | Dell Vostro 3590 i5-10210 U 16go ddr4 512gb ssd nvme 15.6p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 85% | Dell vostro 5410 i5 11320H 8gb ddr4 256gb nvme fhd 14p battery 85% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell inspiron i5 8400 8gb ddr4 256gb SSD | Dell inspiron i5 8400 8gb ddr4 256gb SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp Pavillion i5 7400 8gb ddr4 256gb SSD | Hp Pavillion i5 7400 8gb ddr4 256gb SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp elitedisplay E22 G4 22p | Hp elitedisplay E22 G4 22p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp Zbook Firefly 14g7 i7 10610u 16gb ddr4 256gb 71% 71 nvme71% | Hp Zbook Firefly 14g7 i7 10610u 16gb ddr4 256gb 71% 71 nvme71% | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Toshiba Satellite pro R50-C i3-6006 U 8go ddr4 256gb ssd 2.5''sata 15.6p | Toshiba Satellite pro R50-C i3-6006 U 8go ddr4 256gb ssd 2.5''sata 15.6p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i7 - 6700 | i7 - 6700 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 4TB SanDisk NVME PCIe Gen4 x4 | SSD 4TB SanDisk NVME PCIe Gen4 x4 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 4tb Sabrent Rocket Q4 PCIe Gen4 | SSD 4tb Sabrent Rocket Q4 PCIe Gen4 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Acer Extensa 15 i3-1115 G4 16go ddr4 512gb ssd nvme 15.6p | Acer Extensa 15 i3-1115 G4 16go ddr4 512gb ssd nvme 15.6p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Kingston SSD 960GB | Kingston SSD 960GB | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 128GB NVMe | SSD 128GB NVMe | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 128gb PCIe Gen3 LITE-ON | SSD 128gb PCIe Gen3 LITE-ON | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 128gb PCIe Gen3 SK Hynix | SSD 128gb PCIe Gen3 SK Hynix | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 128gb PCIe Gen3 Samsung | SSD 128gb PCIe Gen3 Samsung | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 128gb PCIe Gen3 Western Digital | SSD 128gb PCIe Gen3 Western Digital | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 2TB PCIe Gen4 SK hynix | SSD 2TB PCIe Gen4 SK hynix | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Terra i3 8eme 16gb ddr4 240gb sata SSD | Terra i3 8eme 16gb ddr4 240gb sata SSD | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| WDRED SSD SATA 1TB | WDRED SSD SATA 1TB | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Asus Zenbook UX461FA i5-8265 U 16go LPDDR3 512GB ssd nvme 14p | Asus Zenbook UX461FA i5-8265 U 16go LPDDR3 512GB ssd nvme 14p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Vostro 14-5410 i5-11320H 16go ddr4 512gb ssd nvme pcle 14p | Dell Vostro 14-5410 i5-11320H 16go ddr4 512gb ssd nvme pcle 14p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP Z240-INTEL CORE i7 | HP Z240-INTEL CORE i7 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i3 - 7100T | i3 - 7100T | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i5 - 6500 | i5 - 6500 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| SSD 512GB Western Digital | SSD 512GB Western Digital | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| i5 - 6400T | i5 - 6400T | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Lenovo ideapad 3 81W2 RYZEN 5-3500 U 8go ddr4 256gb ssd nvme 15.6p | Lenovo ideapad 3 81W2 RYZEN 5-3500 U 8go ddr4 256gb ssd nvme 15.6p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp pro 290 G9 i3-12100 8gb Ram sans disque | Hp pro 290 G9 i3-12100 8gb Ram sans disque | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE P9Q37A G2 Basic PDU | HPE P9Q37A G2 Basic PDU | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Beemo 4-Bay NAS / Backup Unit | Beemo 4-Bay NAS / Backup Unit | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Boitier de sauvegarde Rex-Backup -Fireproof/ Waterproof, avec boite QNAP | Boitier de sauvegarde Rex-Backup -Fireproof/ Waterproof, avec boite QNAP | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell PowerVault MD3420 DAS | Dell PowerVault MD3420 DAS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| NAS Buffalo TeraStaion -format rack | NAS Buffalo TeraStaion -format rack | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| NETGEAR ReadyNAS 2100 NAS | NETGEAR ReadyNAS 2100 NAS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| QNAP TS-453A NAS | QNAP TS-453A NAS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Serveuur NAS Terra- Format tour | Serveuur NAS Terra- Format tour | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Synology DiskStation DS1512+NAS | Synology DiskStation DS1512+NAS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Cisco  WS-C2960X -48PS-L Switch | Cisco  WS-C2960X -48PS-L Switch | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP JE006A-V1910-24G Switch | HP JE006A-V1910-24G Switch | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE J9855A-2530-48G-PoE+ Switch | HPE J9855A-2530-48G-PoE+ Switch | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Enterprise Plus 1.92TB — SAS — PX05SRB192Y — 2,5" | Dell Enterprise Plus 1.92TB — SAS — PX05SRB192Y — 2,5" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| IBM Storage 3.2TB — SAS — 2,5" | IBM Storage 3.2TB — SAS — 2,5" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP t540 Thin Client -Windows 10 | HP t540 Thin Client -Windows 10 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell EMC T440 Silver 4110 | Dell EMC T440 Silver 4110 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Konica Minolta TA 4700 | Konica Minolta TA 4700 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 2ème emplacement CPU HS | 2ème emplacement CPU HS | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell EMC T430 | Dell EMC T430 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HPE 400GB — SAS — 2,5" | HPE 400GB — SAS — 2,5" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Intel D7-P5520 1.92TB — NVMe/PCIe — 2,5" | Intel D7-P5520 1.92TB — NVMe/PCIe — 2,5" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell 27 s2725HS-Boite | Dell 27 s2725HS-Boite | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| DELL VOSTRO I5 11320H 16gb ram 14" | DELL VOSTRO I5 11320H 16gb ram 14" | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp elite book 830 g7 i7 10510u | Hp elite book 830 g7 i7 10510u | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell 870W DP/N : 0YFG1C Modèle : N870P-S0 | Dell 870W DP/N : 0YFG1C Modèle : N870P-S0 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| HP 366FLR — FlexibleLOM, 4× RJ45 1GbE | HP 366FLR — FlexibleLOM, 4× RJ45 1GbE | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Gigabyte Radeon HD 5770 — Modèle : GV-R577UD-1GD, REV : 2.1 | Gigabyte Radeon HD 5770 — Modèle : GV-R577UD-1GD, REV : 2.1 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Konica Minolta bizhub 3602P — Part Number AAFK021, S/N : AAFK021008527 | Konica Minolta bizhub 3602P — Part Number AAFK021, S/N : AAFK021008527 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Logitech Device (M/N : V-U0032 / P/N : 860-000504) | Logitech Device (M/N : V-U0032 / P/N : 860-000504) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Logitech Group (M/N : V-U0036 / P/N : 886-000056) | Logitech Group (M/N : V-U0036 / P/N : 886-000056) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Eaton 5P 850 | Eaton 5P 850 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Logitech Rally Camera (M/N : V-R0010 / P/N : 860-000569) | Logitech Rally Camera (M/N : V-R0010 / P/N : 860-000569) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Logitech Group (M/N : V-U0036 / P/N : 886-000062) | Logitech Group (M/N : V-U0036 / P/N : 886-000062) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| AISENS Monitor Desk Mount/POS Full Motion, 10" à 24" (Modèle : DT24TSR-371) | AISENS Monitor Desk Mount/POS Full Motion, 10" à 24" (Modèle : DT24TSR-371) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Eaton 9PX 6000i 3:1 Power Module (Catalog Nb : 9PX6KiPM31 / P/N : 9105-1201-00P) | Eaton 9PX 6000i 3:1 Power Module (Catalog Nb : 9PX6KiPM31 / P/N : 9105-1201-00P) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Dell Précision 3640 i3-10100 8gb ram ddr4 500gb SSD NVMe | Dell Précision 3640 i3-10100 8gb ram ddr4 500gb SSD NVMe | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| AURES YUNO TXE15J19 Touchscreen POS Terminal | AURES YUNO TXE15J19 Touchscreen POS Terminal | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp Elitedisk i7 6700 8gb ddr4 256gb | Hp Elitedisk i7 6700 8gb ddr4 256gb | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Kingston (2133P) | 32GB Kingston (2133P) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Kingston (2400T) | 32GB Kingston (2400T) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Micron (2933) | 32GB Micron (2933) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 32GB Samsung (2933) | 32GB Samsung (2933) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 16GB Kingston (2133P) | 16GB Kingston (2133P) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Kingston (2133P) | 8GB Kingston (2133P) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Kingston (2400T) | 8GB Kingston (2400T) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Asus Zenbook UX463FA i5-10210 U 16go LPDDR3 512gb ssd nvme pcle 14p | Asus Zenbook UX463FA i5-10210 U 16go LPDDR3 512gb ssd nvme pcle 14p | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| Hp Pro One 600G2 i5 6500T 4gb rma 256gb ssd | Hp Pro One 600G2 i5 6500T 4gb rma 256gb ssd | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| 8GB Kingston (2666V) | 8GB Kingston (2666V) | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| A16 | A16 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| AMD Radeon HD 6570 1GB — Modèle : HX65701G002 | AMD Radeon HD 6570 1GB — Modèle : HX65701G002 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |
| AMD Radeon HD 6570 1GB — Modèle : V340, Réf. HP Spare : 860619-001 | AMD Radeon HD 6570 1GB — Modèle : V340, Réf. HP Spare : 860619-001 | 1 | 🔴 AMBIGU | Aucune règle sémantique claire ne correspond |

### Famille : ÉCRANS
#### Catégorie : SUPPORTS ÉCRANS
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| SpeaKa Professional Monitor Desk Stand, noir, ajustable 17" à 32" (Réf. : 3419447) | SpeaKa Professional Monitor Desk Stand, noir, ajustable 17" à 32" (Réf. : 3419447) | 6 | 🟢 CERTAIN | Support physique pour écran détecté |
| Support de bureau articulé AISENS DT24TSR-371 (Écrans 10" à 24") | Support de bureau articulé AISENS DT24TSR-371 (Écrans 10" à 24") | 1 | 🟢 CERTAIN | Support physique pour écran détecté |

### Famille : ÉNERGIE & CHARGEURS
#### Catégorie : CHARGEURS PC
| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |
|---|---|---|---|---|
| LENOVO - 130w / 135 w | LENOVO - 130w / 135 w | 23 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| LENOVO - 90w | LENOVO - 90w | 20 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| 65w | 65w | 17 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| LENOVO - 65w ( type C ) | LENOVO - 65w ( type C ) | 15 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| DELL - 65w | DELL - 65w | 15 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| HP - 65w | HP - 65w | 14 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| LENOVO - 65w ( normal ) | LENOVO - 65w ( normal ) | 13 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| DELL - 130w / 135w | DELL - 130w / 135w | 10 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| HP - 45w | HP - 45w | 9 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| LENOVO - 45w | LENOVO - 45w | 9 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| 90w | 90w | 9 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| LENOVO - 150w | LENOVO - 150w | 7 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| DELL - 45w | DELL - 45w | 6 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| DELL - 90w | DELL - 90w | 2 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |
| HP - 150w | HP - 150w | 1 | 🟡 TRES PROBABLE | Chargeur PC Portable (Wattage typique détecté) |

