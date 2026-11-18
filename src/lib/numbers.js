const U = ['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','undici','dodici',
  'tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove']
const T = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta']

const under100 = (n) => {
  if (n < 20) return U[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  const tens = u === 1 || u === 8 ? T[t].slice(0, -1) : T[t]
  return tens + (u ? U[u] : '')
}
const under1000 = (n) => {
  const h = Math.floor(n / 100)
  const r = n % 100
  let head = h === 0 ? '' : h === 1 ? 'cento' : U[h] + 'cento'
  if (!r) return head
  const rest = under100(r)
  if (h === 1 && rest.startsWith('o')) head = 'cent' // centotto, centottanta
  return head + rest
}

export function words(n) {
  if (n === 0) return 'zero'
  if (n >= 1000000) return String(n)
  const th = Math.floor(n / 1000)
  const r = n % 1000
  let out = ''
  if (th) out += th === 1 ? 'mille' : under1000(th) + 'mila'
  if (r) out += under1000(r)
  return n > 3 ? out.replace(/tre$/, 'tré') : out
}

// "150,50" -> 15050 (centesimi); null se non valido
export function toCents(input) {
  const v = Number(String(input).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null
}
export const formatEuro = (cents) =>
  '€ ' + (cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// 15050 -> "centocinquanta/50"
export const amountInWords = (cents) =>
  `${words(Math.floor(cents / 100))}/${String(cents % 100).padStart(2, '0')}`
