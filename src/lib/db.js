import { supabase } from './supabase'
import {
  decryptJSON, encryptJSON, generateDek, importDek, importPublicKey, rewrapDek, unwrapDekRaw, wrapDek,
} from './crypto'

const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

// PostgREST restituisce al massimo 1000 righe per richiesta: si legge a pagine
async function fetchAll(buildQuery) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const page = check(await buildQuery().range(from, from + 999))
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}

// Si salvano solo i campi strettamente necessari
const pickRecipient = ({ name, address, taxId }) => ({ name, address: address || '', taxId: taxId || '' })
const pickAssociation = ({ name, address, contacts, title, city, taxId, logo, timbro }) => ({
  name,
  address: address || '',
  contacts: contacts || '',
  title: title || '',
  city: city || '',
  taxId: taxId || '',
  logo: logo || '',
  timbro: timbro || '',
})

// ---- chiavi personali ----
export const getUserKeys = async () =>
  check(await supabase.from('user_keys').select('salt,iterations,public_key,wrapped_private').maybeSingle())
export const insertUserKeys = async (row) => check(await supabase.from('user_keys').insert(row))

// ---- associazioni ----
export async function listAssociations(privateKey, userId) {
  const rows = check(
    await supabase
      .from('association_members')
      .select('role, wrapped_dek, associations(id, data)')
      .eq('user_id', userId),
  )
  const list = await Promise.all(
    rows.map(async (m) => {
      const key = await importDek(await unwrapDekRaw(m.wrapped_dek, privateKey))
      const data = await decryptJSON(key, m.associations.data)
      if (data.contacts === undefined) data.contacts = data.footerNote || '' // dati salvati con la versione precedente
      return { id: m.associations.id, role: m.role, wrappedDek: m.wrapped_dek, key, ...data }
    }),
  )
  return list.sort((a, b) => a.name.localeCompare(b.name, 'it'))
}
export async function createAssociation(myPublicKey, fields) {
  const dek = await generateDek()
  const data = await encryptJSON(dek, pickAssociation(fields))
  return check(await supabase.rpc('create_association', { p_data: data, p_wrapped_dek: await wrapDek(dek, myPublicKey) }))
}
export async function updateAssociation(key, id, fields) {
  const data = await encryptJSON(key, pickAssociation(fields))
  check(await supabase.from('associations').update({ data }).eq('id', id))
}
export const deleteAssociation = async (id) => check(await supabase.from('associations').delete().eq('id', id))

// ---- membri ----
export const listMembers = async (assocId) =>
  check(await supabase.from('association_members').select('user_id,email,role').eq('association_id', assocId).order('created_at'))

export async function addMember(assoc, myPrivateKey, email) {
  const target = check(await supabase.rpc('find_user_key', { p_email: email }))?.[0]
  if (!target) {
    throw new Error('Persona non trovata. Deve prima accedere una volta all’app con Google e creare la sua password di cifratura.')
  }
  const wrapped = await rewrapDek(assoc.wrappedDek, myPrivateKey, await importPublicKey(target.public_key))
  check(
    await supabase.from('association_members').insert({
      association_id: assoc.id, user_id: target.user_id, email: target.email, role: 'member', wrapped_dek: wrapped,
    }),
  )
}
export const removeMember = async (assocId, userId) =>
  check(await supabase.from('association_members').delete().eq('association_id', assocId).eq('user_id', userId))

// ---- anagrafica ----
export async function listRecipients(key, assocId) {
  const rows = await fetchAll(() =>
    supabase.from('recipients').select('id,data').eq('association_id', assocId).order('created_at').order('id'),
  )
  const list = await Promise.all(rows.map(async (r) => ({ id: r.id, ...(await decryptJSON(key, r.data)) })))
  return list.sort((a, b) => a.name.localeCompare(b.name, 'it'))
}
export async function insertRecipients(key, assocId, items) {
  const payload = await Promise.all(
    items.map(async (it) => ({ association_id: assocId, data: await encryptJSON(key, pickRecipient(it)) })),
  )
  for (let i = 0; i < payload.length; i += 200) {
    check(await supabase.from('recipients').insert(payload.slice(i, i + 200)))
  }
}
export async function updateRecipient(key, id, item) {
  check(await supabase.from('recipients').update({ data: await encryptJSON(key, pickRecipient(item)) }).eq('id', id))
}
export const deleteRecipients = async (ids) => check(await supabase.from('recipients').delete().in('id', ids))

// ---- numerazione e registro ----
export async function getLastNumber(assocId, year) {
  const row = check(
    await supabase.from('receipt_counters').select('last_number').eq('association_id', assocId).eq('year', year).maybeSingle(),
  )
  return row?.last_number ?? 0
}
export const setLastNumber = async (assocId, year, last) =>
  check(await supabase.rpc('set_receipt_counter', { p_association: assocId, p_year: year, p_last: last }))

export async function listReceiptYears(assocId) {
  const rows = check(await supabase.from('receipt_counters').select('year').eq('association_id', assocId).order('year', { ascending: false }))
  return rows.map((r) => r.year)
}

// Assegna i numeri e registra le ricevute (atomico). Restituisce il primo numero assegnato.
export async function issueReceipts(key, assocId, year, list) {
  const items = await Promise.all(list.map((r) => encryptJSON(key, r)))
  return check(await supabase.rpc('issue_receipts', { p_association: assocId, p_year: year, p_items: items }))
}
export async function listReceipts(key, assocId, year) {
  const rows = await fetchAll(() =>
    supabase.from('receipts').select('number,year,issued_at,data').eq('association_id', assocId).eq('year', year).order('number'),
  )
  return Promise.all(
    rows.map(async (r) => ({ number: r.number, year: r.year, issuedAt: r.issued_at, ...(await decryptJSON(key, r.data)) })),
  )
}
