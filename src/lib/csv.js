import Papa from 'papaparse'

const norm = (h) =>
  String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

// I CSV esportati da Excel in italiano sono spesso in Windows-1252 e separati da ";"
async function readText(file) {
  const buf = await file.arrayBuffer()
  const text = new TextDecoder('utf-8').decode(buf)
  return text.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buf) : text
}

// Cerca la prima colonna il cui nome contiene una delle parole indicate (in ordine di priorità)
const findCol = (keys, words, exclude = []) => {
  for (const w of words) {
    const k = keys.find((x) => !exclude.includes(x) && x.includes(w))
    if (k) return k
  }
  return null
}

// Riconosce le intestazioni in modo flessibile, ad esempio:
//   Attività | Ragione sociale | Denominazione | Nome | Società | Cliente
//   Partita Iva/Codice Fiscale | P.IVA | C.F.
//   Indirizzo | Via, CAP, Città | Comune, Provincia
// Se non trova una colonna per il nome, usa la prima colonna.
export async function parseRecipientsCsv(file) {
  const text = await readText(file)
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: norm })
  const keys = (meta.fields || []).filter(Boolean)

  const taxKey = keys.find((k) => k === 'cf') || findCol(keys, ['partitaiva', 'piva', 'fiscale', 'iva'])
  const nameKey =
    findCol(keys, ['ragionesociale', 'denominazione', 'societa', 'azienda', 'attivita', 'intestatario', 'cliente', 'nome'], [taxKey]) ||
    keys.find((k) => k !== taxKey)
  const addrKey = findCol(keys, ['indirizzo']) || keys.find((k) => k === 'via')
  const capKey = keys.find((k) => k === 'cap')
  const cityKey = findCol(keys, ['citta', 'comune', 'localita'])
  const provKey = keys.find((k) => k === 'provincia' || k === 'prov')

  const val = (row, k) => (k && row[k] != null ? String(row[k]).trim() : '')

  return data
    .map((r) => ({
      name: val(r, nameKey),
      address: [val(r, addrKey), [val(r, capKey), val(r, cityKey)].filter(Boolean).join(' '), val(r, provKey)]
        .filter(Boolean)
        .join(', '),
      taxId: val(r, taxKey),
    }))
    .filter((r) => r.name)
}
