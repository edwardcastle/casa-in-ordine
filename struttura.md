# Struttura del Progetto: Casa in Ordine

Questo documento descrive la struttura del progetto, basato su **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4** e **next-intl** per l'internazionalizzazione (multi-lingua).

## Albero del Progetto

```text
casa-in-ordine/
├───.gitignore
├───eslint.config.mjs
├───next.config.ts
├───package-lock.json
├───package.json
├───postcss.config.mjs
├───README.md
├───tsconfig.json
├───messages/
│   ├───en.json
│   ├───es.json
│   └───it.json
├───public/
│   ├───favicon_...
│   └───images/
│       ├───backgrounds/
│       ├───gallery/
│       └───logo/
└───src/
    ├───proxy.ts
    ├───actions/
    │   └───contact.ts
    ├───app/
    │   ├───favicon.ico
    │   ├───globals.css
    │   ├───layout.tsx
    │   ├───not-found.tsx
    │   ├───robots.ts
    │   ├───sitemap.ts
    │   └───[locale]/
    │       ├───layout.tsx
    │       ├───page.tsx
    │       ├───about/
    │       ├───blog/
    │       ├───contact/
    │       ├───preventivo/
    │       └───services/
    ├───components/
    │   ├───BalanceChart.tsx
    │   └───... (altri componenti UI)
    └───i18n/
        ├───request.ts
        └───routing.ts
```

## File di Configurazione della Root

*   **`package.json`** / **`package-lock.json`**: Gestiscono le dipendenze del progetto (Next.js, React, chart.js, next-intl, Tailwind CSS) e gli script npm (dev, build, start, lint).
*   **`next.config.ts`**: Configurazione principale di Next.js.
*   **`tsconfig.json`**: Configurazione del compilatore TypeScript per garantire la tipizzazione del codice.
*   **`eslint.config.mjs`**: Configurazione del linter (ESLint) per mantenere uno standard di qualità nel codice.
*   **`postcss.config.mjs`**: Configurazione di PostCSS, utilizzato per processare Tailwind CSS.
*   **`.gitignore`**: Specifica i file e le cartelle da ignorare su Git (come `node_modules` e `.next`).
*   **`README.md`**: Documentazione base del progetto.

## Cartelle Principali

### `messages/`
Contiene i file JSON utilizzati da `next-intl` per le traduzioni.
*   **`it.json`**, **`en.json`**, **`es.json`**: Dizionari per le lingue Italiano, Inglese e Spagnolo.

### `public/`
Contiene tutti gli asset statici (immagini, font, icone) accessibili pubblicamente.
*   **`favicon_*`**: Varie icone del sito per diverse risoluzioni e dispositivi.
*   **`images/`**:
    *   **`backgrounds/`**: Immagini di sfondo, hero banner e foto generiche (es. pulizia, storie).
    *   **`gallery/`**: Immagini per la galleria fotografica dei vari ambienti (bagno, cucina, soggiorno, ecc.).
    *   **`logo/`**: Logo del brand in vari formati e dimensioni.

### `src/`
È il cuore dell'applicazione, contiene tutto il codice sorgente.

*   **`proxy.ts`**: Probabilmente un'utility per gestire chiamate API esterne o configurazioni proxy interne.

#### `src/actions/`
*   **`contact.ts`**: Server Action di Next.js per gestire in modo sicuro l'invio del modulo di contatto dal lato server.

#### `src/app/`
Utilizza il sistema di routing "App Router" di Next.js.
*   **`globals.css`**: Il file CSS globale che include le direttive base di Tailwind CSS.
*   **`layout.tsx`** e **`[locale]/layout.tsx`**: Definiscono il layout generale (Header, Footer, tag HTML/Body). `[locale]/layout.tsx` gestisce il layout specifico per la lingua selezionata.
*   **`not-found.tsx`**: Pagina personalizzata per l'errore 404 (Pagina non trovata).
*   **`robots.ts`** e **`sitemap.ts`**: Generano dinamicamente `robots.txt` e `sitemap.xml` per la SEO.
*   **`[locale]/`**: Segmento dinamico per l'internazionalizzazione. Tutte le rotte interne rispondono alla lingua (es. `/it/about`, `/en/about`).
    *   **`page.tsx`**: La Home Page (es. `/it`).
    *   **`about/`**, **`blog/`**, **`contact/`**, **`preventivo/`**, **`services/`**: Le varie pagine del sito (Chi siamo, Blog, Contatti, Richiesta Preventivo, Servizi).

#### `src/components/`
Contiene i componenti React riutilizzabili per l'interfaccia utente.
*   **`BalanceChart.tsx`** / **`ImpactChart.tsx`**: Componenti grafici (realizzati tramite `chart.js`) per visualizzare statistiche o dati d'impatto.
*   **`BeforeAfter.tsx`**: Componente interattivo per comparare due immagini (es. situazione "Prima" e "Dopo" l'intervento di riordino).
*   **`ContactForm.tsx`**: Il modulo di contatto per gli utenti.
*   **`QuoteWizard.tsx`**: Un wizard a step per richiedere un preventivo personalizzato.
*   **`Header.tsx`** / **`Footer.tsx`**: L'intestazione e il piè di pagina comuni a tutte le pagine.
*   **`GalleryGrid.tsx`**: Una griglia per visualizzare le foto dei lavori svolti.
*   **`JsonLd.tsx`**: Componente per inserire i dati strutturati (JSON-LD) nella pagina a scopo SEO.
*   **`LanguageSwitcher.tsx`**: Un menu a tendina/selettore per permettere all'utente di cambiare lingua.
*   **`OverlayImage.tsx`**: Componente per gestire immagini con overlay di testo o effetti.
*   **`ScrollReveal.tsx`**: Componente per animare gli elementi man mano che l'utente scorre la pagina (scroll animations).
*   **`ServiceCard.tsx`**: Card UI per presentare un singolo servizio offerto.
*   **`TestimonialCard.tsx`**: Card UI per mostrare le recensioni o i feedback dei clienti.

#### `src/i18n/`
Configurazione del routing e del supporto multilingua.
*   **`request.ts`**: File di configurazione di `next-intl` che definisce come caricare i messaggi in base al locale richiesto (es. dal server).
*   **`routing.ts`**: Configura le regole di routing multilingua (quali lingue sono supportate, qual è quella di default, ecc.).
