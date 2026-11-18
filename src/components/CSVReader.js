// Filename - App.js

import React, { useState } from "react";
import Papa from "papaparse";



import { PDFDownloadLink } from '@react-pdf/renderer';
import { HiOutlineDownload } from 'react-icons/hi';
import RicevutaTemplate from '../template/RicevutaTemplate';
import {
  CCard,
  CCardBody,
  CCardGroup,
  CCardHeader,
  CFormLabel,
  CCol,
  CButton,
  CLink,
  CForm,
  CFormInput,
  CRow,
  CTable,
  CTableBody,
  CInputGroup,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow
} from '@coreui/react';
import FormControl from "../views/forms/form-control/FormControl";


// Allowed extensions for input file
const allowedExtensions = ["csv"];

const CSVReader = () => {


  const [ricevuta, setRicevuta] = useState({
    nomeAttivita: '',
    partitaiva: '',
    numero: null,
    anno: null,
    causale: '',
    importo: null
  });
  const styles = {
    btn: { borderRadius: '3px', border: '1px solid gray', display: 'flex', alignItems: 'center', gap: '2px', padding: '3px', fontSize: '11px', color: '#4f4f4f', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }
  }


  //State to store table Column name
  const [tableRows, setTableRows] = useState([]);

  //State to store the values
  const [values, setValues] = useState([]);


  // It state will contain the error when
  // correct file extension is not used
  const [error, setError] = useState("");

  // It will store the file uploaded by the user
  const [file, setFile] = useState("");

  // This function will be called when
  // the file input changes
  const handleFileChange = (e) => {
    setError("");

    // Check if user has entered the file
    if (e.target.files.length) {
      const inputFile = e.target.files[0];

      // Check the file extensions, if it not
      // included in the allowed extensions
      // we show the error
      const fileExtension =
        inputFile?.type.split("/")[1];
      if (
        !allowedExtensions.includes(fileExtension)
      ) {
        setError("Please input a csv file");
        return;
      }

      // If input type is correct set the state
      setFile(inputFile);
    }
  };
  const handleParse = () => {

    // If user clicks the parse button without
    // a file we show a error
    if (!file) return alert("Enter a valid file");

    // Initialize a reader which allows user
    // to read any file or blob.
    const reader = new FileReader();

    // Event listener on reader when the file
    // loads, we parse it and set the data.
    reader.onload = async ({ target }) => {
      //const csv = 
      Papa.parse(target.result, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const rowsArray = [];
          const valuesArray = [];

          // Iterating data to get column name and their values
          results.data.map((d) => {
            rowsArray.push(Object.keys(d));
            valuesArray.push(Object.assign({}, ricevuta, { name: Object.values(d)[0], piva: Object.values(d)[1] }));
            return valuesArray;
          });



          // Filtered Column Names
          setTableRows(rowsArray[0]);

          // Filtered Values
          setValues(valuesArray);

        }
      });

    };
    reader.readAsText(file);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setRicevuta((prevState) => ({ ...prevState, [name]: value }));
  };


  /*const sayHello = (nomeAttivita, piva) => {
    ricevuta.nomeAttivita = nomeAttivita;
    ricevuta.partitaiva = piva;
    alert('Attività:' + ricevuta.nomeAttivita + "Piva:" + ricevuta.partitaiva + "Numero ricevuta:" + ricevuta.numero + " Causale Ricevuta:" + ricevuta.causale + " Importo: " + ricevuta.importo);
  }*/


  return (
    <div className="container-sm" data-bs-theme="dark">
      <CCard className="text-center">
        <CCardHeader>CdQ Torrino Mezzocammino</CCardHeader>
        <CCardBody>
          <CForm>
            <CRow className="mb-3">
              <CCol md={4}>

                <CFormLabel >Numero ricevuta:</CFormLabel>
                <CFormInput type="text" name="numero" placeholder="Inserisci il numero della ricevuta" value={ricevuta.numero ?? ''} onChange={handleChange} />

              </CCol>
              <CCol md={4}>
                <CFormLabel >Anno ricevuta:</CFormLabel>
                <CFormInput type="text" name="anno" placeholder="Inserisci l'anno della ricevuta" value={ricevuta.anno ?? ''} onChange={handleChange} />
              </CCol>

              <CCol md={4}>
                <CFormLabel>Importo ricevuta (€):</CFormLabel>
                <CFormInput type="text" name="importo" placeholder="Inserisci l'mporto della ricevuta" value={ricevuta.importo ?? ''} onChange={handleChange} />

              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Causale della ricevuta:</CFormLabel>
                <CFormInput type="text" name="causale" placeholder="Inserisci la causale della ricevuta" value={ricevuta.causale ?? ''} onChange={handleChange} />
              </CCol>
            </CRow>


          </CForm>

          <CRow md={12}>
            <CCol md={5}>
              <CFormLabel style={{ display: "block" }} htmlFor="csvInput">
                Carica il file CSV contenente le attività che ci sostengono
              </CFormLabel>
            </CCol>
            <CCol md={5}>
              <CInputGroup className="mb-3">

                <CFormInput
                  onChange={handleFileChange}
                  id="csvInput"
                  name="file"
                  type="File"
                />
                <CButton color="primary" id="button-addon2" onClick={handleParse}>
                  Carica
                </CButton>

              </CInputGroup>

            </CCol>




          </CRow>
          <CRow md={12}>
            <CCol md={2}></CCol>
            <CCol md={8}>

              {error
                ? error
                :
                <CTable striped bordered hover>

                  <CTableHead className="text-nowrap">
                    <CTableRow>
                      <CTableHeaderCell scope="col" className="bg-body-tertiary text-center">#</CTableHeaderCell>
                      {tableRows.map((rows, index) => {
                        return <CTableHeaderCell scope="col" className="bg-body-tertiary text-center">{rows}</CTableHeaderCell>;
                      })}

                      <CTableHeaderCell scope="col" className="bg-body-tertiary text-center">Azioni</CTableHeaderCell>

                    </CTableRow>
                  </CTableHead>

                  <CTableBody>
                    {values.map((value, index) => {
                      return (
                        <CTableRow key={index}>
                          <>
                            <CTableDataCell key={index}>{index + 1}
                            </CTableDataCell>
                            <CTableDataCell key={index}>{value.name}
                            </CTableDataCell>
                            <CTableDataCell key={index}>{value.piva}

                            </CTableDataCell>
                            <CTableDataCell>
                              {/* <button className="btn btn-primary" onClick={() => sayHello(value.name, value.piva)}>Stampa</button> */}

                              <PDFDownloadLink document={
                                <RicevutaTemplate reciept_data={{
                                  "invoice_no": (++ricevuta.numero) + '/' + ricevuta.anno,
                                  "causale": ricevuta.causale,
                                  "importo": ricevuta.importo,
                                  "attivita": value.name + " - " + value.piva,
                                  "data": new Date().toLocaleDateString()

                                }}
                                />} fileName={value.name + '-' + ricevuta.numero + '/' + ricevuta.anno + '-ricevuta.pdf'}>
                                <div style={styles.btn}>
                                  <HiOutlineDownload size={14} />
                                  <span>Download</span>
                                </div>
                              </PDFDownloadLink>
                            </CTableDataCell>
                          </>
                        </CTableRow>
                      );
                    })}
                  </CTableBody>
                </CTable >
              }
            </CCol>
            <CCol md={2}></CCol>

          </CRow>

        </CCardBody>
      </CCard>
    </div>
  );
};

export default CSVReader;