import React from 'react'
import { Image, Text, View, Page, Document, StyleSheet } from '@react-pdf/renderer';
import logo from '../assets/images/CdQ.jpg';
import timbro from '../assets/images/timbro.png';
const Invoice = (props) => {
    let reciept_data = props.reciept_data;


    const styles = StyleSheet.create({
        page: { fontSize: 11, paddingTop: 20, paddingLeft: 40, paddingRight: 40, lineHeight: 1.5, flexDirection: 'column' },
        spaceBetween: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', color: "#3E3E3E" },
        titleContainerSilver: { flexDirection: 'row', marginTop: 5, backgroundColor: 'silver' },
        titleContainer: { flexDirection: 'row', marginTop: 5 },
        logo: { width: 90 },
        timbro: {width: 150, marginTop:80, margingLeft:250 },
        
        reportTitle: { fontSize: 16, textAlign: 'center' },
        addressTitle: { fontSize: 10, fontStyle: 'bold' },
        luogo: { fontWeight: 'bold', fontSize: 11, marginLeft: 20 },
        data: { fontWeight: 'bold', fontSize: 11, marginLeft: 20 },
        ricevutaNumero: { fontSize: 11, fontWeight: 'bold', marginLeft: 20 },
        siAttesta: { fontSize: 11, fontWeight: 'bold', marginLeft: 20 },
        aTitoloDi: { fontSize: 11, fontWeight: 'bold', marginLeft: 20 },
        importo: { fontSize: 11, fontWeight: 'bold', marginLeft: 20 },
        address: { fontWeight: 400, fontSize: 10, marginLeft: 20 },
        content: {
            padding: 5,
            '@media max-width: 500': {
                flexDirection: 'column',
            },
            '@media min-width: 500': {
                flexDirection: 'row',
            },
        },
        blockLeft: {
            width: 220
        },
        blockRight: {
            width: 280
        }
    });

    const InvoiceTitle = () => (
        <View style={styles.titleContainerSilver}>
            <View style={styles.spaceBetween}>
                <Image style={styles.logo} src={logo} />
            </View>
            <View>
                <Text style={styles.reportTitle}>RICEVUTA PER EROGAZIONE LIBERALE</Text>
                <Text style={styles.addressTitle}>Associazione "Comitato di Quartiere di Torrino Mezzocammino"</Text>
                <Text style={styles.addressTitle}>Viale Gianluigi Bonelli, 138 - Torrino Mezzocammino, 00127 - Roma</Text>
                <Text style={styles.addressTitle}>www.cdqtorrinomezzocammino.it, info@cdqtorrinomezzocammino.it, comitatotmc@pec.it </Text>
            </View>
        </View>
    );

    const Address = () => (
        <View style={styles.titleContainer}>
            <View>
                <View>
                    <Text style={styles.luogo}>Luogo: ROMA </Text>
                    <Text style={styles.data}>Data:  {reciept_data.data}</Text>
                    <Text style={styles.ricevutaNumero}>Ricevuta Numero: {reciept_data.invoice_no} </Text>
                </View>

            </View>
        </View>
    );

    const UserAddress = () => (
        <View style={styles.titleContainer}>
            <View>
                <View style={{ maxWidth: 500 }}>
                    <View style={styles.content}>
                        <Text style={[styles.blockLeft, styles.siAttesta]}>Si attesta di aver ricevuto da</Text>
                        <Text style={[styles.blockRight, { backgroundColor: '#fffacd',fontSize: 9 }]}> {reciept_data.attivita}</Text>
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.blockLeft, styles.importo]}>la somma di Euro</Text>
                        <Text style={[styles.blockRight, { backgroundColor: '#fffacd',fontSize: 9 }]}> {reciept_data.importo}</Text>
                    </View>
                    <View style={styles.content}>
                        <Text style={[styles.blockLeft, styles.aTitoloDi]}>a titolo di erogazione liberale in occasione di:</Text>
                        <Text style={[styles.blockRight, { backgroundColor: '#fffacd',fontSize: 9 }]}>{reciept_data.causale}</Text>
                    </View>                    
                    <Image style={styles.timbro} src={timbro} />
             
                </View>
            </View>
        </View>
    );



    return (
        <Document>
            <Page size="A4" style={styles.page} >
                <View style={{ with: "50%", border: 1 }}
                >
                    <InvoiceTitle />
                    <Address />
                    <UserAddress />
                </View>
            </Page>
        </Document>

    )
}

export default Invoice