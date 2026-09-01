/**
 * MATRICE UNIFIÉE DE SPÉCIFICATIONS ET ATTRIBUTS TECHNIQUES — MAXY
 * 
 * Cette matrice sert de source unique de vérité pour :
 * 1. La génération dynamique des formulaires de saisie (Ajout/Modification de Modèles et Produits)
 * 2. La génération dynamique des filtres à facettes (FilterDrawer)
 * 3. La validation et la standardisation des données techniques en base de données (JSONB)
 */

export interface OptionAttribut {
  valeur: string;
  label: string;
  badge?: string;
  description?: string;
}

export type TypeChampAttribut = 
  | "pills"      // Toggle group tactile (choix unique)
  | "pills_multi"// Toggle group tactile (choix multiple)
  | "select"     // Menu déroulant
  | "text"       // Saisie texte libre
  | "number"     // Saisie numérique
  | "boolean";   // Interrupteur Oui / Non

export interface DefinitionAttribut {
  cle: string;
  label: string;
  type: TypeChampAttribut;
  obligatoire?: boolean;
  options?: OptionAttribut[];
  unite?: string;
  placeholder?: string;
  filtre?: boolean; // Doit-il être affiché dans le tiroir de filtres ?
  aide?: string;
}

export interface ProfilEquipement {
  familleCle: string;
  familleNom: string;
  categories: string[]; // Noms ou mots-clés de catégories correspondantes
  icone: string;
  description: string;
  attributs: DefinitionAttribut[];
}

export const MATRICE_EQUIPEMENTS: Record<string, ProfilEquipement> = {
  chargeur: {
    familleCle: "ALIMENTATION",
    familleNom: "ALIMENTATION & CHARGEURS",
    categories: ["Chargeur", "Alimentation Externe", "Adaptateur Secteur", "Bloc d'alimentation"],
    icone: "Zap",
    description: "Adaptateurs secteurs et chargeurs pour ordinateurs et stations",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HP", label: "HP" },
          { valeur: "Dell", label: "Dell" },
          { valeur: "Lenovo", label: "Lenovo" },
          { valeur: "Apple", label: "Apple" },
          { valeur: "Asus", label: "Asus" },
          { valeur: "Acer", label: "Acer" },
          { valeur: "Universel", label: "Universel" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "type_connecteur",
        label: "Type d'embout / Connecteur",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Type-C", label: "USB Type-C" },
          { valeur: "Embout Jaune", label: "Embout Jaune (Lenovo Slim)" },
          { valeur: "Embout Rond 4.5mm", label: "Rond Fin (4.5mm - HP Bleu / Dell)" },
          { valeur: "Embout Rond 7.4mm", label: "Grand Rond (7.4mm)" },
          { valeur: "MagSafe 1", label: "MagSafe 1" },
          { valeur: "MagSafe 2", label: "MagSafe 2" },
          { valeur: "MagSafe 3", label: "MagSafe 3" },
          { valeur: "Autre", label: "Spécifique / Autre" }
        ]
      },
      {
        cle: "puissance_w",
        label: "Puissance (Watts)",
        type: "pills",
        obligatoire: true,
        filtre: true,
        unite: "W",
        options: [
          { valeur: "45W", label: "45W" },
          { valeur: "65W", label: "65W" },
          { valeur: "90W", label: "90W" },
          { valeur: "135W", label: "135W" },
          { valeur: "170W", label: "170W" },
          { valeur: "230W", label: "230W" },
          { valeur: "300W+", label: "300W+" }
        ]
      },
      {
        cle: "voltage_amperage",
        label: "Tension / Ampérage (ex: 19.5V - 3.33A)",
        type: "text",
        placeholder: "ex: 19.5V - 4.62A",
        filtre: false
      }
    ]
  },

  stockage: {
    familleCle: "STOCKAGE",
    familleNom: "STOCKAGE",
    categories: ["Disque", "SSD", "HDD", "Flash", "NVMe", "SAS", "SATA", "Disques Durs"],
    icone: "HardDrive",
    description: "Disques durs mécaniques et disques SSD NVMe/SATA",
    attributs: [
      {
        cle: "type_disque",
        label: "Type de disque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "SSD", label: "SSD (Flash)" },
          { valeur: "HDD", label: "HDD (Mécanique)" }
        ]
      },
      {
        cle: "interface",
        label: "Interface & Protocole",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "NVMe M.2", label: "NVMe M.2 (PCIe)" },
          { valeur: "SATA III", label: "SATA III" },
          { valeur: "SAS", label: "SAS (Serveur 12G/6G)" },
          { valeur: "U.2 / U.3", label: "U.2 / U.3 (NVMe Serveur)" },
          { valeur: "mSATA", label: "mSATA" }
        ]
      },
      {
        cle: "format_physique",
        label: "Format physique",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "M.2 2280", label: "M.2 2280" },
          { valeur: "2.5 pouces", label: "2.5\"" },
          { valeur: "3.5 pouces", label: "3.5\"" }
        ]
      },
      {
        cle: "capacite",
        label: "Capacité / Taille",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "128Go", label: "128 Go" },
          { valeur: "256Go", label: "256 Go" },
          { valeur: "512Go", label: "512 Go" },
          { valeur: "1To", label: "1 To" },
          { valeur: "2To", label: "2 To" },
          { valeur: "4To", label: "4 To" },
          { valeur: "8To+", label: "8 To+" }
        ]
      },
      {
        cle: "marque",
        label: "Marque constructeur",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Samsung", label: "Samsung" },
          { valeur: "Crucial / Micron", label: "Crucial / Micron" },
          { valeur: "Western Digital", label: "WD" },
          { valeur: "Seagate", label: "Seagate" },
          { valeur: "Kingston", label: "Kingston" },
          { valeur: "Intel", label: "Intel" },
          { valeur: "Kioxia / Toshiba", label: "Kioxia" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "vitesse_rpm",
        label: "Vitesse de rotation (pour HDD)",
        type: "pills",
        filtre: false,
        options: [
          { valeur: "5400 RPM", label: "5400 RPM" },
          { valeur: "7200 RPM", label: "7200 RPM" },
          { valeur: "10K RPM", label: "10 000 RPM (SAS)" },
          { valeur: "15K RPM", label: "15 000 RPM (SAS)" }
        ]
      }
    ]
  },

  ram: {
    familleCle: "MEMOIRE",
    familleNom: "MÉMOIRE & PROCESSEURS",
    categories: ["RAM", "Mémoire", "UDIMM", "ECC", "SO-DIMM", "RDIMM"],
    icone: "Cpu",
    description: "Barrettes de mémoire vive PC, Laptop et Serveur",
    attributs: [
      {
        cle: "format_cible",
        label: "Format cible",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "PC Fixe", label: "PC Fixe (DIMM)" },
          { valeur: "Laptop", label: "PC Portable (SO-DIMM)" },
          { valeur: "Serveur", label: "Serveur (RDIMM / LRDIMM)" }
        ]
      },
      {
        cle: "type_specifique",
        label: "Type spécifique",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "UDIMM Non-ECC", label: "UDIMM (Standard)" },
          { valeur: "ECC Registered (RDIMM)", label: "ECC Registered (RDIMM)" },
          { valeur: "ECC Unbuffered (UDIMM ECC)", label: "ECC Unbuffered" },
          { valeur: "LRDIMM", label: "LRDIMM (Haute densité)" }
        ]
      },
      {
        cle: "generation",
        label: "Génération DDR",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "DDR3", label: "DDR3 / DDR3L" },
          { valeur: "DDR4", label: "DDR4" },
          { valeur: "DDR5", label: "DDR5" }
        ]
      },
      {
        cle: "capacite",
        label: "Capacité unitaire",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "4Go", label: "4 Go" },
          { valeur: "8Go", label: "8 Go" },
          { valeur: "16Go", label: "16 Go" },
          { valeur: "32Go", label: "32 Go" },
          { valeur: "64Go", label: "64 Go" },
          { valeur: "128Go", label: "128 Go" }
        ]
      },
      {
        cle: "frequence_mhz",
        label: "Fréquence / Vitesse",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "1600MHz", label: "1600 MHz (PC3-12800)" },
          { valeur: "2133MHz", label: "2133 MHz (PC4-17000)" },
          { valeur: "2400MHz", label: "2400 MHz (PC4-19200)" },
          { valeur: "2666MHz", label: "2666 MHz (PC4-21300)" },
          { valeur: "2933MHz", label: "2933 MHz (PC4-23400)" },
          { valeur: "3200MHz", label: "3200 MHz (PC4-25600)" },
          { valeur: "4800MHz", label: "4800 MHz (DDR5)" },
          { valeur: "5600MHz", label: "5600 MHz (DDR5)" }
        ]
      },
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Samsung", label: "Samsung" },
          { valeur: "SK Hynix", label: "SK Hynix" },
          { valeur: "Micron / Crucial", label: "Micron / Crucial" },
          { valeur: "Kingston", label: "Kingston" },
          { valeur: "Corsair", label: "Corsair" },
          { valeur: "Autre", label: "Autre" }
        ]
      }
    ]
  },

  ordinateur_fixe: {
    familleCle: "ORDINATEURS",
    familleNom: "ORDINATEURS",
    categories: ["PC Fixe", "Tour", "SFF", "Mini PC", "Station de Travail", "Tout-en-un", "All-in-One", "AIO"],
    icone: "Monitor",
    description: "Unités centrales, Mini PC, SFF, Tours et Tout-en-un",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HP", label: "HP" },
          { valeur: "Dell", label: "Dell" },
          { valeur: "Lenovo", label: "Lenovo" },
          { valeur: "Apple", label: "Apple (Mac mini/iMac)" },
          { valeur: "Fujitsu", label: "Fujitsu" },
          { valeur: "Assemblé / Autre", label: "Autre" }
        ]
      },
      {
        cle: "format",
        label: "Format châssis",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Mini PC / Tiny", label: "Mini PC / Tiny / Micro" },
          { valeur: "SFF", label: "SFF (Small Form Factor)" },
          { valeur: "Tour (MT)", label: "Tour standard (MT/Tower)" },
          { valeur: "All-in-One", label: "Tout-en-un (AIO)" },
          { valeur: "Workstation", label: "Station de Travail (Workstation)" }
        ]
      },
      {
        cle: "cpu_gamme",
        label: "Processeur (CPU)",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Intel Core i3", label: "Core i3" },
          { valeur: "Intel Core i5", label: "Core i5" },
          { valeur: "Intel Core i7", label: "Core i7" },
          { valeur: "Intel Core i9", label: "Core i9" },
          { valeur: "Intel Xeon", label: "Xeon" },
          { valeur: "AMD Ryzen 5", label: "Ryzen 5" },
          { valeur: "AMD Ryzen 7", label: "Ryzen 7" },
          { valeur: "Apple Silicon (M1/M2/M3)", label: "Apple Silicon" }
        ]
      },
      {
        cle: "cpu_generation",
        label: "Génération CPU (ex: 6e, 8e, 10e, 12e)",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "4e / 5e Gen", label: "4e / 5e Gen" },
          { valeur: "6e / 7e Gen", label: "6e / 7e Gen" },
          { valeur: "8e / 9e Gen", label: "8e / 9e Gen" },
          { valeur: "10e / 11e Gen", label: "10e / 11e Gen" },
          { valeur: "12e / 13e Gen", label: "12e / 13e Gen" },
          { valeur: "14e Gen+", label: "14e Gen+" }
        ]
      },
      {
        cle: "ram_taille",
        label: "RAM installée",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "8Go", label: "8 Go" },
          { valeur: "16Go", label: "16 Go" },
          { valeur: "32Go", label: "32 Go" },
          { valeur: "64Go+", label: "64 Go+" }
        ]
      },
      {
        cle: "stockage_principal",
        label: "Stockage principal",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "256Go SSD", label: "256 Go SSD" },
          { valeur: "512Go SSD", label: "512 Go SSD" },
          { valeur: "1To SSD", label: "1 To SSD" },
          { valeur: "2To SSD+", label: "2 To SSD+" },
          { valeur: "500Go HDD", label: "500 Go HDD" },
          { valeur: "1To HDD", label: "1 To HDD" }
        ]
      },
      {
        cle: "gpu_dedie",
        label: "Carte Graphique Dédiée",
        type: "text",
        placeholder: "ex: NVIDIA Quadro P2000 4Go / GTX 1660",
        filtre: false
      },
      // Attributs spécifiques All-in-One (AIO)
      {
        cle: "taille_ecran_aio",
        label: "Taille d'écran (AIO)",
        type: "pills",
        aide: "Uniquement pour Tout-en-un (AIO)",
        options: [
          { valeur: "21.5 pouces", label: "21.5\"" },
          { valeur: "23.8 pouces", label: "23.8\" / 24\"" },
          { valeur: "27 pouces", label: "27\"" }
        ]
      },
      {
        cle: "ecran_tactile",
        label: "Écran tactile (AIO)",
        type: "boolean",
        aide: "Pour Tout-en-un tactile ou caisse POS"
      }
    ]
  },

  ordinateur_portable: {
    familleCle: "ORDINATEURS",
    familleNom: "ORDINATEURS",
    categories: ["PC Portables", "Laptops", "Ultrabooks", "MacBook"],
    icone: "Laptop",
    description: "Ordinateurs portables, Ultrabooks et stations mobiles",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HP", label: "HP" },
          { valeur: "Dell", label: "Dell" },
          { valeur: "Lenovo", label: "Lenovo" },
          { valeur: "Apple", label: "Apple" },
          { valeur: "Asus", label: "Asus" },
          { valeur: "Acer", label: "Acer" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "taille_ecran",
        label: "Taille de l'écran",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "13.3 pouces", label: "13.3\"" },
          { valeur: "14.0 pouces", label: "14.0\"" },
          { valeur: "15.6 pouces", label: "15.6\"" },
          { valeur: "16.0 pouces", label: "16.0\"" },
          { valeur: "17.3 pouces", label: "17.3\"" }
        ]
      },
      {
        cle: "cpu_modele",
        label: "Processeur (CPU)",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Intel Core i5", label: "Core i5" },
          { valeur: "Intel Core i7", label: "Core i7" },
          { valeur: "Intel Core i3", label: "Core i3" },
          { valeur: "AMD Ryzen 5", label: "Ryzen 5" },
          { valeur: "AMD Ryzen 7", label: "Ryzen 7" },
          { valeur: "Apple M1/M2/M3", label: "Apple M Series" }
        ]
      },
      {
        cle: "ram_taille",
        label: "RAM",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "8Go", label: "8 Go" },
          { valeur: "16Go", label: "16 Go" },
          { valeur: "32Go", label: "32 Go" },
          { valeur: "64Go", label: "64 Go" }
        ]
      },
      {
        cle: "stockage",
        label: "Stockage SSD",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "256Go SSD", label: "256 Go" },
          { valeur: "512Go SSD", label: "512 Go" },
          { valeur: "1To SSD", label: "1 To" },
          { valeur: "2To SSD", label: "2 To" }
        ]
      },
      {
        cle: "clavier_layout",
        label: "Disposition du clavier",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "AZERTY Français", label: "AZERTY (FR)" },
          { valeur: "QWERTY US", label: "QWERTY (US)" },
          { valeur: "QWERTY Arabe", label: "QWERTY (AR/EN)" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "gpu",
        label: "GPU Dédié (Optionnel)",
        type: "text",
        placeholder: "ex: RTX 3050 4Go / Intel Iris Xe"
      }
    ]
  },

  serveur: {
    familleCle: "SERVEURS",
    familleNom: "SERVEURS & BAIES",
    categories: ["Serveurs", "Rack", "Serveurs Rack", "Serveurs Tour", "Baies"],
    icone: "Server",
    description: "Serveurs physiques d'entreprise (Rack 1U/2U/4U, Tour)",
    attributs: [
      {
        cle: "marque",
        label: "Constructeur",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HPE ProLiant", label: "HPE ProLiant" },
          { valeur: "Dell PowerEdge", label: "Dell PowerEdge" },
          { valeur: "Lenovo ThinkSystem", label: "Lenovo ThinkSystem" },
          { valeur: "Cisco UCS", label: "Cisco UCS" },
          { valeur: "Supermicro", label: "Supermicro" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "format_serveur",
        label: "Format & Hauteur",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Rack 1U", label: "Rack 1U" },
          { valeur: "Rack 2U", label: "Rack 2U" },
          { valeur: "Rack 4U", label: "Rack 4U" },
          { valeur: "Tour (Tower)", label: "Tour" },
          { valeur: "Lame (Blade)", label: "Lame" }
        ]
      },
      {
        cle: "generation_serveur",
        label: "Génération constructeur",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Gen8 / 12G", label: "HPE G8 / Dell 12G" },
          { valeur: "Gen9 / 13G", label: "HPE G9 / Dell 13G" },
          { valeur: "Gen10 / 14G", label: "HPE G10 / Dell 14G" },
          { valeur: "Gen10 Plus / 15G", label: "HPE G10+ / Dell 15G" },
          { valeur: "Gen11 / 16G", label: "HPE G11 / Dell 16G" }
        ]
      },
      {
        cle: "cpu_config",
        label: "Configuration CPU (Sockets / Modèles)",
        type: "text",
        placeholder: "ex: 2x Intel Xeon Gold 6130 (32 Cœurs / 64 Threads)"
      },
      {
        cle: "ram_config",
        label: "Configuration Mémoire RAM",
        type: "text",
        placeholder: "ex: 128Go (4x32Go) DDR4 ECC RDIMM"
      },
      {
        cle: "baies_disques",
        label: "Baies disques (Format & Quantité)",
        type: "pills",
        options: [
          { valeur: "8x 2.5 SFF", label: "8x 2.5\" SFF" },
          { valeur: "16x 2.5 SFF", label: "16x 2.5\" SFF" },
          { valeur: "24x 2.5 SFF", label: "24x 2.5\" SFF" },
          { valeur: "4x 3.5 LFF", label: "4x 3.5\" LFF" },
          { valeur: "8x 3.5 LFF", label: "8x 3.5\" LFF" },
          { valeur: "12x 3.5 LFF", label: "12x 3.5\" LFF" }
        ]
      },
      {
        cle: "controleur_raid",
        label: "Contrôleur RAID / HBA",
        type: "text",
        placeholder: "ex: Smart Array P440ar 2Go FBWC / PERC H730"
      },
      {
        cle: "alimentations_psu",
        label: "Alimentations (Redondance)",
        type: "pills",
        options: [
          { valeur: "1x 500W", label: "1x 500W" },
          { valeur: "2x 500W Redondant", label: "2x 500W (Redondant)" },
          { valeur: "2x 800W Redondant", label: "2x 800W (Redondant)" },
          { valeur: "2x 1400W Redondant", label: "2x 1400W (Redondant)" }
        ]
      }
    ]
  },

  ecran: {
    familleCle: "ECRANS",
    familleNom: "ÉCRANS & PÉRIPHÉRIQUES",
    categories: ["Écrans", "Ecrans", "Moniteurs", "Affichage"],
    icone: "Tv",
    description: "Moniteurs et écrans professionnels",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Dell", label: "Dell" },
          { valeur: "HP", label: "HP" },
          { valeur: "Samsung", label: "Samsung" },
          { valeur: "LG", label: "LG" },
          { valeur: "Lenovo", label: "Lenovo" },
          { valeur: "Philips", label: "Philips" },
          { valeur: "Asus / BenQ", label: "Asus / BenQ" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "taille_pouces",
        label: "Taille (Pouces)",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "19 pouces", label: "19\"" },
          { valeur: "21.5 pouces", label: "21.5\"" },
          { valeur: "24 pouces", label: "24\"" },
          { valeur: "27 pouces", label: "27\"" },
          { valeur: "32 pouces+", label: "32\"+" }
        ]
      },
      {
        cle: "resolution",
        label: "Résolution native",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Full HD (1080p)", label: "Full HD (1920x1080)" },
          { valeur: "2K QHD (1440p)", label: "2K QHD (2560x1440)" },
          { valeur: "4K UHD (2160p)", label: "4K UHD (3840x2160)" },
          { valeur: "HD+ (1600x900)", label: "HD+" }
        ]
      },
      {
        cle: "frequence_hz",
        label: "Fréquence de rafraîchissement",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "60Hz", label: "60 Hz" },
          { valeur: "75Hz", label: "75 Hz" },
          { valeur: "100Hz", label: "100 Hz" },
          { valeur: "144Hz", label: "144 Hz" },
          { valeur: "165Hz+", label: "165 Hz+" }
        ]
      },
      {
        cle: "type_dalle",
        label: "Type de dalle",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "IPS", label: "IPS (Angles larges & Couleurs)" },
          { valeur: "VA", label: "VA (Contraste élevé)" },
          { valeur: "OLED", label: "OLED" },
          { valeur: "TN", label: "TN (Temps de réponse)" }
        ]
      },
      {
        cle: "connectique",
        label: "Connectique vidéo",
        type: "pills_multi",
        options: [
          { valeur: "HDMI", label: "HDMI" },
          { valeur: "DisplayPort", label: "DisplayPort" },
          { valeur: "USB-C Display", label: "USB-C Video / PD" },
          { valeur: "VGA", label: "VGA" },
          { valeur: "DVI", label: "DVI" }
        ]
      }
    ]
  },

  imprimante: {
    familleCle: "IMPRESSION",
    familleNom: "IMPRESSION & CONSOMMABLES",
    categories: ["Imprimantes", "Scanners", "Multifonctions", "Thermiques"],
    icone: "Printer",
    description: "Imprimantes laser, jet d'encre et thermiques professionnelles",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HP", label: "HP" },
          { valeur: "Canon", label: "Canon" },
          { valeur: "Epson", label: "Epson" },
          { valeur: "Brother", label: "Brother" },
          { valeur: "Xerox", label: "Xerox" },
          { valeur: "Zebra", label: "Zebra (Thermique POS)" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "technologie",
        label: "Technologie d'impression",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Laser Monochrome", label: "Laser Monochrome (Noir)" },
          { valeur: "Laser Couleur", label: "Laser Couleur" },
          { valeur: "Jet d'encre", label: "Jet d'encre (Tank/Cartouche)" },
          { valeur: "Thermique directe", label: "Thermique (Tickets/Étiquettes)" }
        ]
      },
      {
        cle: "fonctions",
        label: "Fonctionnalités",
        type: "pills_multi",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Multifonction (3-en-1)", label: "Multifonction (Scan/Copie)" },
          { valeur: "Recto-Verso Automatique", label: "Recto-Verso Auto (Duplex)" },
          { valeur: "Réseau Ethernet (RJ45)", label: "Réseau Ethernet (RJ45)" },
          { valeur: "Wi-Fi Direct", label: "Wi-Fi Direct / Sans fil" },
          { valeur: "Chargeur ADF", label: "Chargeur doc (ADF)" }
        ]
      },
      {
        cle: "ref_consommable",
        label: "Référence Toners / Cartouches associées",
        type: "text",
        placeholder: "ex: HP 83A (CF283A) / Brother TN-2420",
        aide: "Indiquez la référence exacte pour lier avec le stock consommables"
      }
    ]
  },

  gpu: {
    familleCle: "COMPOSANTS",
    familleNom: "COMPOSANTS & CARTES D'EXTENSION",
    categories: ["Cartes Graphiques", "GPU", "Quadro", "RTX", "Radeon"],
    icone: "Layers",
    description: "Cartes graphiques dédiées de bureau, workstation et serveur",
    attributs: [
      {
        cle: "fondeur",
        label: "Fondeur GPU",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "NVIDIA", label: "NVIDIA" },
          { valeur: "AMD", label: "AMD" },
          { valeur: "Intel", label: "Intel Arc" }
        ]
      },
      {
        cle: "gamme",
        label: "Gamme de produit",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "NVIDIA Quadro / RTX Pro", label: "NVIDIA Quadro / Pro" },
          { valeur: "GeForce RTX (Gaming/AI)", label: "GeForce RTX" },
          { valeur: "GeForce GTX", label: "GeForce GTX" },
          { valeur: "AMD Radeon Pro", label: "AMD Radeon Pro" },
          { valeur: "AMD Radeon RX", label: "AMD Radeon RX" },
          { valeur: "Tesla / Datacenter", label: "Tesla / Calcul Serveur" }
        ]
      },
      {
        cle: "vram_taille",
        label: "Mémoire Vidéo (VRAM)",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "2Go", label: "2 Go" },
          { valeur: "4Go", label: "4 Go" },
          { valeur: "6Go / 8Go", label: "6 Go / 8 Go" },
          { valeur: "12Go / 16Go", label: "12 Go / 16 Go" },
          { valeur: "24Go+", label: "24 Go+" }
        ]
      },
      {
        cle: "format_profil",
        label: "Hauteur de carte (Profil)",
        type: "pills",
        options: [
          { valeur: "Low Profile (LP)", label: "Low Profile (Demi-hauteur SFF)" },
          { valeur: "Full Height (FH)", label: "Standard (Pleine hauteur)" }
        ]
      },
      {
        cle: "sorties_video",
        label: "Sorties vidéo",
        type: "pills_multi",
        options: [
          { valeur: "DisplayPort", label: "DisplayPort" },
          { valeur: "Mini-DisplayPort", label: "Mini-DP (Quadro)" },
          { valeur: "HDMI", label: "HDMI" },
          { valeur: "DVI", label: "DVI" }
        ]
      }
    ]
  },

  consommables_ink: {
    familleCle: "IMPRESSION",
    familleNom: "IMPRESSION & CONSOMMABLES",
    categories: ["Toners", "Cartouches", "Consommables", "Tambours", "Rubans"],
    icone: "Package",
    description: "Toners laser, cartouches d'encre et tambours d'imagerie",
    attributs: [
      {
        cle: "marque",
        label: "Marque",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "HP", label: "HP" },
          { valeur: "Canon", label: "Canon" },
          { valeur: "Brother", label: "Brother" },
          { valeur: "Epson", label: "Epson" },
          { valeur: "Samsung", label: "Samsung" },
          { valeur: "Xerox", label: "Xerox" },
          { valeur: "Kyocera / Ricoh", label: "Kyocera / Ricoh" },
          { valeur: "Générique", label: "Générique Compatible" }
        ]
      },
      {
        cle: "type_consommable",
        label: "Type de consommable",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "Toner Laser", label: "Toner Laser" },
          { valeur: "Cartouche d'encre", label: "Cartouche Jet d'encre" },
          { valeur: "Tambour / Drum", label: "Tambour (Drum Unit)" },
          { valeur: "Bouteille d'encre (EcoTank)", label: "Bouteille d'encre" }
        ]
      },
      {
        cle: "couleur",
        label: "Couleur",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Noir (Black)", label: "Noir (K)" },
          { valeur: "Cyan", label: "Cyan (C)" },
          { valeur: "Magenta", label: "Magenta (M)" },
          { valeur: "Jaune (Yellow)", label: "Jaune (Y)" },
          { valeur: "Multipack 4 Couleurs", label: "Pack 4 Couleurs" }
        ]
      },
      {
        cle: "reference_oem",
        label: "Référence constructeur (OEM)",
        type: "text",
        obligatoire: true,
        placeholder: "ex: W1106A (106A), CF217A (17A), TN-1050"
      },
      {
        cle: "rendement_pages",
        label: "Rendement estimé (Pages)",
        type: "pills",
        options: [
          { valeur: "1000 - 1500 pages", label: "~1000 - 1500 p." },
          { valeur: "2500 - 3500 pages", label: "~2500 - 3500 p." },
          { valeur: "5000 - 10000 pages", label: "~5000 - 10 000 p." },
          { valeur: "10000+ pages", label: "10 000+ p." }
        ]
      }
    ]
  },

  point_de_vente: {
    familleCle: "ORDINATEURS",
    familleNom: "ORDINATEURS",
    categories: ["Point de Vente", "POS", "Terminaux & Caisses", "Caisse"],
    icone: "Tag",
    description: "Terminaux de caisse tactiles, TPV et stations d'encaissement",
    attributs: [
      {
        cle: "marque",
        label: "Marque / Constructeur TPV",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "AURES", label: "AURES (Yuno/Sango)" },
          { valeur: "Oracle MICROS", label: "Oracle MICROS" },
          { valeur: "Lenovo ThinkSmart", label: "Lenovo POS" },
          { valeur: "Toshiba / IBM", label: "Toshiba / IBM" },
          { valeur: "NCR", label: "NCR" },
          { valeur: "Autre", label: "Autre" }
        ]
      },
      {
        cle: "taille_ecran_pos",
        label: "Taille écran tactile",
        type: "pills",
        obligatoire: true,
        filtre: true,
        options: [
          { valeur: "10 pouces", label: "10\" / 12\"" },
          { valeur: "15 pouces", label: "15\" (Standard 4:3)" },
          { valeur: "15.6 pouces", label: "15.6\" (16:9 Widescreen)" },
          { valeur: "17 pouces", label: "17\"+" }
        ]
      },
      {
        cle: "cpu_pos",
        label: "Processeur",
        type: "pills",
        filtre: true,
        options: [
          { valeur: "Intel Celeron / J1900", label: "Celeron / J1900 / J6412" },
          { valeur: "Intel Core i3", label: "Core i3" },
          { valeur: "Intel Core i5", label: "Core i5" },
          { valeur: "ARM / Android", label: "ARM (Android POS)" }
        ]
      },
      {
        cle: "ram_pos",
        label: "RAM",
        type: "pills",
        options: [
          { valeur: "4Go", label: "4 Go" },
          { valeur: "8Go", label: "8 Go" },
          { valeur: "16Go", label: "16 Go" }
        ]
      },
      {
        cle: "stockage_pos",
        label: "Stockage SSD",
        type: "pills",
        options: [
          { valeur: "64Go / 128Go SSD", label: "64Go - 128Go SSD" },
          { valeur: "256Go SSD", label: "256 Go SSD" },
          { valeur: "512Go SSD", label: "512 Go SSD" }
        ]
      },
      {
        cle: "connectique_caisse",
        label: "Ports caisse intégrés",
        type: "pills_multi",
        options: [
          { valeur: "Port Tiroir Caisse (RJ11/12)", label: "Tiroir Caisse (RJ11/12)" },
          { valeur: "Ports Série RS-232 (COM)", label: "Ports Série (RS-232)" },
          { valeur: "Port Afficheur Client", label: "Afficheur Client (VFD/LCD)" },
          { valeur: "Lecteur Carte / MSR", label: "Lecteur MSR / Dallas Key" }
        ]
      }
    ]
  }
};

/**
 * Fonction de détection du profil d'équipement selon le nom de catégorie ou de famille
 */
export function determinerProfilEquipement(categorieNom: string = "", familleNom: string = ""): ProfilEquipement | null {
  const texte = `${familleNom} ${categorieNom}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Chargeurs & Alimentations
  if (texte.includes("chargeur") || texte.includes("adaptateur secteur") || texte.includes("alimentation externe")) {
    return MATRICE_EQUIPEMENTS.chargeur || null;
  }

  // 2. RAM
  if (texte.includes("ram") || texte.includes("memoire") || texte.includes("udimm") || texte.includes("rdimm") || texte.includes("ecc")) {
    return MATRICE_EQUIPEMENTS.ram || null;
  }

  // 3. Stockage (SSD/HDD)
  if (texte.includes("stockage") || texte.includes("disque") || texte.includes("ssd") || texte.includes("hdd") || texte.includes("nvme") || texte.includes("flash")) {
    return MATRICE_EQUIPEMENTS.stockage || null;
  }

  // 4. Cartes graphiques (GPU)
  if (texte.includes("carte graphique") || texte.includes("gpu") || texte.includes("quadro") || texte.includes("rtx") || texte.includes("radeon")) {
    return MATRICE_EQUIPEMENTS.gpu || null;
  }

  // 5. Point de Vente / POS
  if (texte.includes("point de vente") || texte.includes("pos") || texte.includes("terminal") || texte.includes("caisse")) {
    return MATRICE_EQUIPEMENTS.point_de_vente || null;
  }

  // 6. Serveurs
  if (texte.includes("serveur") || texte.includes("rack") || texte.includes("baie")) {
    return MATRICE_EQUIPEMENTS.serveur || null;
  }

  // 7. PC Portables
  if (texte.includes("portable") || texte.includes("laptop") || texte.includes("ultrabook") || texte.includes("macbook")) {
    return MATRICE_EQUIPEMENTS.ordinateur_portable || null;
  }

  // 8. PC Fixes / Tours / AIO
  if (texte.includes("ordinateur") || texte.includes("fixe") || texte.includes("tour") || texte.includes("sff") || texte.includes("mini pc") || texte.includes("station") || texte.includes("tout-en-un") || texte.includes("aio")) {
    return MATRICE_EQUIPEMENTS.ordinateur_fixe || null;
  }

  // 9. Écrans
  if (texte.includes("ecran") || texte.includes("moniteur") || texte.includes("affichage") || texte.includes("display")) {
    return MATRICE_EQUIPEMENTS.ecran || null;
  }

  // 10. Consommables / Toners
  if (texte.includes("toner") || texte.includes("cartouche") || texte.includes("consommable") || texte.includes("tambour")) {
    return MATRICE_EQUIPEMENTS.consommables_ink || null;
  }

  // 11. Imprimantes
  if (texte.includes("imprimante") || texte.includes("scanner") || texte.includes("thermique") || texte.includes("impression")) {
    return MATRICE_EQUIPEMENTS.imprimante || null;
  }

  return null;
}

/**
 * Génère automatiquement une désignation commerciale propre et lisible pour la fiche modèle
 */
export function genererDesignationAutomatique(
  profil: ProfilEquipement | null,
  specs: Record<string, any>,
  marque: string = "",
  nomBase: string = ""
): string {
  const parts: string[] = [];
  if (marque) parts.push(marque);
  if (nomBase) parts.push(nomBase);

  if (!profil) {
    return parts.filter(Boolean).join(" ");
  }

  switch (profil) {
    case MATRICE_EQUIPEMENTS.chargeur:
      if (specs.puissance_w) parts.push(specs.puissance_w);
      if (specs.type_connecteur) parts.push(`(${specs.type_connecteur})`);
      break;

    case MATRICE_EQUIPEMENTS.stockage:
      if (specs.capacite) parts.push(specs.capacite);
      if (specs.type_disque) parts.push(specs.type_disque);
      if (specs.interface) parts.push(specs.interface);
      if (specs.format_physique) parts.push(specs.format_physique);
      break;

    case MATRICE_EQUIPEMENTS.ram:
      if (specs.capacite) parts.push(specs.capacite);
      if (specs.generation) parts.push(specs.generation);
      if (specs.frequence_mhz) parts.push(specs.frequence_mhz);
      if (specs.type_specifique) parts.push(`[${specs.type_specifique}]`);
      break;

    case MATRICE_EQUIPEMENTS.ordinateur_fixe:
      if (specs.format) parts.push(specs.format);
      if (specs.cpu_gamme) parts.push(`- ${specs.cpu_gamme}`);
      if (specs.ram_taille) parts.push(`/ ${specs.ram_taille} RAM`);
      if (specs.stockage_principal) parts.push(`/ ${specs.stockage_principal}`);
      break;

    case MATRICE_EQUIPEMENTS.ordinateur_portable:
      if (specs.taille_ecran) parts.push(specs.taille_ecran);
      if (specs.cpu_modele) parts.push(`- ${specs.cpu_modele}`);
      if (specs.ram_taille) parts.push(`/ ${specs.ram_taille}`);
      if (specs.stockage) parts.push(`/ ${specs.stockage}`);
      break;

    case MATRICE_EQUIPEMENTS.ecran:
      if (specs.taille_pouces) parts.push(specs.taille_pouces);
      if (specs.resolution) parts.push(specs.resolution);
      if (specs.frequence_hz) parts.push(specs.frequence_hz);
      if (specs.type_dalle) parts.push(`(${specs.type_dalle})`);
      break;

    case MATRICE_EQUIPEMENTS.gpu:
      if (specs.gamme) parts.push(specs.gamme);
      if (specs.vram_taille) parts.push(specs.vram_taille);
      break;

    case MATRICE_EQUIPEMENTS.consommables_ink:
      if (specs.type_consommable) parts.push(specs.type_consommable);
      if (specs.couleur) parts.push(specs.couleur);
      if (specs.reference_oem) parts.push(`(Réf: ${specs.reference_oem})`);
      break;

    case MATRICE_EQUIPEMENTS.point_de_vente:
      if (specs.taille_ecran_pos) parts.push(specs.taille_ecran_pos);
      if (specs.cpu_pos) parts.push(specs.cpu_pos);
      parts.push("POS Touch Terminal");
      break;
  }

  return parts.filter(Boolean).join(" ");
}
