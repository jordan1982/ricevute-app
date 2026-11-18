# Ricevute per associazioni

Genera ricevute in PDF per più associazioni. Accesso con Google, dati salvati su Supabase **cifrati nel browser**, numerazione annuale per associazione, hosting su GitHub Pages.

## Come funziona la sicurezza

- Più utenti possono lavorare sulla stessa associazione: il proprietario aggiunge i colleghi per email (Associazione, sezione “Chi può lavorare”). Tutti vedono anagrafica, registro delle ricevute e numerazione; solo il proprietario modifica i dati dell’associazione e i membri.
- Nel database finisce solo testo cifrato (AES-GCM 256). Ogni associazione ha una propria chiave, consegnata a ciascun membro cifrata con la sua chiave pubblica (RSA-OAEP). La chiave privata di ogni utente è protetta da una **password di cifratura** scelta al primo accesso (PBKDF2, 600.000 iterazioni) e non lascia mai il browser.
- Cifrati: dati associazione (nome, indirizzo, C.F./P.IVA, logo, nota), anagrafica società, contenuto delle ricevute (società, importo, causale, data, chi l’ha emessa).
- In chiaro restano: ID, anno e numero di ricevuta, email dei membri, ruoli e date tecniche.
- Le ricevute registrate non si possono modificare né cancellare. I numeri vengono assegnati dal database insieme alla registrazione: niente doppioni, niente buchi.
- Row Level Security: si leggono e scrivono solo i dati delle associazioni di cui si è membri.
- Se perdi la password di cifratura il tuo accesso ai dati non è recuperabile (un altro membro può comunque continuare a lavorare).
- Limiti: la cifratura protegge da letture del database, non da un amministratore Supabase che manomettesse attivamente le chiavi pubbliche. Rimuovere un membro gli toglie l’accesso ai dati, ma non “dimentica” ciò che ha già letto.

## Configurazione

1. **Supabase**: crea un progetto ed esegui `supabase/schema.sql` nello SQL Editor.
2. **Google**: in Google Cloud Console crea un OAuth Client ID (tipo Web) con redirect URI `https://<progetto>.supabase.co/auth/v1/callback`. In Supabase, Authentication, Providers, Google: incolla Client ID e Secret.
3. **URL**: in Supabase, Authentication, URL Configuration, imposta come Site URL `https://<utente>.github.io/<repo>/` e aggiungi tra i Redirect URLs lo stesso indirizzo e `http://localhost:3000/`.
4. **Facoltativo**: disattiva il provider Email, così si entra solo con Google.
5. **GitHub**: in Settings, Secrets and variables, Actions, aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. In Settings, Pages, scegli Source: GitHub Actions. A ogni push su `main` il sito si pubblica.

## Sviluppo locale

```bash
cp .env.example .env.local   # inserisci URL e anon key
npm install
npm start                    # http://localhost:3000
```

## CSV

Intestazioni riconosciute (maiuscole e accenti ignorati): `nome` / `ragione sociale` / `denominazione`, `indirizzo` / `via`, `cap`, `citta` / `comune`, `provincia`, `piva` / `partita iva` / `codice fiscale` / `cf`.

## Pulizia opzionale

Puoi eliminare le cartelle demo del template non più usate (`src/views/base`, `buttons`, `forms`, `charts`, `icons`, `notifications`, `theme`, `widgets`, `dashboard`, `pages/register`) e, se nessun componente le usa, le dipendenze `chart.js`, `@coreui/chartjs`, `@coreui/react-chartjs`, `react-icons`.
