import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import JSZip from 'jszip'
import { formatEuro } from './numbers'

const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

const s = StyleSheet.create({
  page: { fontSize: 11, padding: 15, lineHeight: 1.4, flexDirection: 'column' },
  frame: { width: '100%', height: '100%', borderWidth: 1, borderColor: '#000', padding: 5, flexDirection: 'column' },
  head: { flexDirection: 'row', backgroundColor: 'silver', padding: 8, alignItems: 'center' },
  logoBox: { width: 100, height: 80 },
  img: { width: '100%', height: '100%', objectFit: 'contain' },
  headText: { flex: 1, paddingLeft: 10, color: '#3E3E3E' },
  title: { fontSize: 15, textAlign: 'center', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headLine: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  meta: { marginTop: 10, marginLeft: 20, fontFamily: 'Helvetica-Bold' },
  metaLine: { marginLeft: 20, fontFamily: 'Helvetica-Bold' },
  row: { padding: 4, flexDirection: 'row', alignItems: 'flex-start' },
  label: { width: 250, marginLeft: 20, fontFamily: 'Helvetica-Bold' },
  value: { flex: 1, backgroundColor: '#fffacd', padding: 4, fontSize: 9, marginRight: 4 },
  stampBox: { width: 200, height: 90, alignSelf: 'flex-end', marginTop: 20, marginRight: 40 },
  footer: { marginTop: 'auto', marginLeft: 20, marginRight: 20, fontSize: 8, color: '#555' },
})

const Receipt = ({ org = {}, r = {} }) => {
  const rec = r.recipient || {}
  const who = [rec.name, rec.taxId && `C.F./P.IVA: ${rec.taxId}`, rec.address].filter(Boolean).join(' - ')
  const city = org.city || 'ROMA'

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.frame}>
        <View style={s.head}>
          {org.logo ? (
            <View style={s.logoBox}>
              <Image style={s.img} src={org.logo} />
            </View>
          ) : null}
          <View style={s.headText}>
            <Text style={s.title}>{org.title || 'RICEVUTA PER EROGAZIONE LIBERALE'}</Text>
            {org.name ? <Text style={s.headLine}>{org.name}</Text> : null}
            {org.address ? <Text style={s.headLine}>{org.address}</Text> : null}
            {org.taxId ? <Text style={s.headLine}>C.F./P.IVA: {org.taxId}</Text> : null}
            {org.contacts ? <Text style={s.headLine}>{org.contacts}</Text> : null}
          </View>
        </View>

        <Text style={s.meta}>Luogo: {city}</Text>
        <Text style={s.metaLine}>Data: {fmtDate(r.date)}</Text>
        <Text style={s.metaLine}>Ricevuta Numero: {r.number}/{r.year}</Text>

        <View style={{ marginTop: 14 }}>
          <View style={s.row}>
            <Text style={s.label}>Si attesta di aver ricevuto da</Text>
            <Text style={s.value}>{who}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>la somma di Euro</Text>
            <Text style={s.value}>{formatEuro(r.amountCents || 0)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>a titolo di erogazione liberale in occasione di:</Text>
            <Text style={s.value}>{r.causale}</Text>
          </View>
        </View>

        {org.timbro ? (
          <View style={s.stampBox}>
            <Image style={s.img} src={org.timbro} />
          </View>
        ) : null}

        {org.footerNote ? <Text style={s.footer}>{org.footerNote}</Text> : null}
      </View>
    </Page>
  )
}

export const Doc = ({ org, receipts }) => (
  <Document title={`Ricevute ${org?.name || ''}`} author={org?.name || ''}>
    {(receipts || []).map((r) => (
      <Receipt key={`${r.year}-${r.number}`} org={org} r={r} />
    ))}
  </Document>
)

export const buildSinglePdf = (org, receipts) => pdf(<Doc org={org} receipts={receipts} />).toBlob()

const safe = (t) => (t ? t.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40) : 'ricevuta')

export async function buildZip(org, receipts, onProgress) {
  const zip = new JSZip()
  for (const [i, r] of (receipts || []).entries()) {
    const blob = await pdf(<Doc org={org} receipts={[r]} />).toBlob()
    zip.file(`Ricevuta_${r.number}-${r.year}_${safe(r.recipient?.name)}.pdf`, blob)
    onProgress?.(i + 1)
  }
  return zip.generateAsync({ type: 'blob' })
}