const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const cron = require('node-cron');

// Ruta al archivo JSON de la cuenta de servicio
const KEYFILEPATH = path.join(__dirname, 'sonorous-parsec-435501-a8-bd11bd300440.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Autenticación con Google usando la cuenta de servicio
let auth;
try {
    auth = new google.auth.GoogleAuth({
        keyFile: KEYFILEPATH,
        scopes: SCOPES,
    });
} catch (error) {
    console.error('Error al autenticar con Google:', error.message);
}

// Variables globales para caché y última fecha de descarga
let cachedClientes = null;
let ultimaDescarga = null;

// Función para descargar un archivo de Google Drive
async function descargarArchivoDeGoogleDrive(auth, fileId, destino) {
    const drive = google.drive({ version: 'v3', auth });
    const dest = fs.createWriteStream(destino);

    try {
        console.log(`Iniciando la descarga del archivo con ID: ${fileId}`);
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        response.data.pipe(dest);

        return new Promise((resolve, reject) => {
            dest.on('finish', () => {
                console.log(`Descarga completada y guardada en: ${destino}`);
                resolve(destino);
            });

            dest.on('error', (error) => {
                console.error(`Error al guardar el archivo en: ${destino}`, error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('Error al descargar el archivo de Google Drive:', error.message);
        throw error;
    }
}

// Función para procesar un archivo de Excel
/*async function procesarArchivoExcel(rutaArchivo) {
    try {
        const workbook = XLSX.readFile(rutaArchivo);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        return jsonData;
    } catch (error) {
        console.error('Error al procesar el archivo Excel:', error.message);
        return [];
    }
}*/
// Función para procesar un archivo de Excel y devolver todo el JSON
async function procesarArchivoExcel(rutaArchivo) {
  try {
      const workbook = XLSX.readFile(rutaArchivo);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      console.log('Datos completos del Excel:', jsonData.slice(0, 5)); // Depuración
      return jsonData;
  } catch (error) {
      console.error('Error al procesar el archivo Excel:', error.message);
      return [];
  }
}
// Función para filtrar solo las columnas necesarias del JSON
function filtrarColumnas(jsonData) {
  // Filtra las columnas necesarias
  return jsonData.map(item => ({
      'Tipo Cliente': item['Tipo Cliente'] || '',
      'MI Range': item['MI Range'] || '',
      'Density Range': item['Density Range'] || '',
      'Gel': item['Gel'] || '',
      'Adds': item['Adds'] || '',
      'Tec Produccion Bimodal Monomodal': item['Tec Produccion Bimodal Monomodal'] || '',
      'Comonomero': item['Comonomero'] || '',
      'Supplier Pref': item['Supplier Pref'] || '',
      'Acepta Homologo': item['Acepta Homologo'] || '',
      'Claims': item['Claims'] || '',
      'Obs Especiales': item['Obs Especiales'] || ''
  }));
}
// Función para actualizar el caché y devolver todo el JSON
async function actualizarCacheClientes() {
  const fileId = '12vLW8MyAIPyXKVd13UmgyukUz-fUUtJR';  // Reemplaza con el ID del archivo en Google Drive
  const rutaArchivoDescargado = path.join(__dirname, 'temp_files', 'archivo.xlsx');

  console.log('Descargando archivo de Google Drive para actualizar el caché...');
  await descargarArchivoDeGoogleDrive(auth, fileId, rutaArchivoDescargado);

  // Procesa el archivo Excel y almacena todos los datos en el caché
  cachedClientes = await procesarArchivoExcel(rutaArchivoDescargado);
  ultimaDescarga = new Date();

  console.log(`Caché actualizado: ${ultimaDescarga}`);
  console.log(`Número de clientes cargados en caché: ${cachedClientes.length}`);
}

async function actualizarCacheClientes() {
  const fileId = '12vLW8MyAIPyXKVd13UmgyukUz-fUUtJR';  // Reemplaza con el ID del archivo en Google Drive
  const rutaArchivoDescargado = path.join(__dirname, 'temp_files', 'archivo.xlsx');

  console.log('Descargando archivo de Google Drive para actualizar el caché...');
  await descargarArchivoDeGoogleDrive(auth, fileId, rutaArchivoDescargado);

  // Procesa el archivo Excel descargado y almacena los clientes en caché
  cachedClientes = await procesarArchivoExcel(rutaArchivoDescargado);
  ultimaDescarga = new Date();

  console.log(`Caché actualizado: ${ultimaDescarga}`);
  console.log(`Número de clientes cargados en caché: ${cachedClientes.length}`);
}

async function obtenerSugerenciasClientes(query) {
  // Verifica si el caché está vacío o no se ha actualizado
  if (!cachedClientes || !ultimaDescarga) {
      console.log('El caché está vacío o no se ha actualizado, iniciando la descarga...');
      await actualizarCacheClientes(); // Actualiza el caché si está vacío
  }

  // Filtrar clientes con el término de búsqueda
  const sugerencias = cachedClientes
      .map(cliente => cliente.CUSTOMER) // Asumiendo que 'CUSTOMER' es el campo correcto
      .filter(nombreCliente => nombreCliente && nombreCliente.toLowerCase().includes(query.toLowerCase()));

  // Elimina duplicados
  const sugerenciasUnicas = [...new Set(sugerencias)];

  console.log('Sugerencias encontradas:', sugerenciasUnicas); // Registro para depurar
  return sugerenciasUnicas;
}

// Función para obtener materiales por cliente
async function obtenerMaterialesPorCliente(cliente) {
    // Verifica si el caché está vacío o si no se ha actualizado
    if (!cachedClientes || !ultimaDescarga) {
        await actualizarCacheClientes();
    }

    // Filtra los materiales basados en el cliente
    return cachedClientes.filter(item => item.CUSTOMER === cliente);
}

// Función para buscar materiales específicos
async function buscarMateriales(cliente, material) {
    // Verifica si el caché está vacío o si no se ha actualizado
    if (!cachedClientes || !ultimaDescarga) {
        await actualizarCacheClientes();
    }

    // Filtra los materiales basados en el cliente y el material
    return cachedClientes.filter(item => item.CUSTOMER === cliente && item.MATERIAL === material);
}

// Programar la descarga automática una vez por semana
cron.schedule('0 0 * * 0', async () => {
    console.log('Iniciando la descarga semanal del archivo de Google Drive...');
    try {
        await actualizarCacheClientes();
        console.log('Caché actualizado con la descarga semanal.');
    } catch (error) {
        console.error('Error al actualizar el caché de clientes:', error.message);
    }
});

module.exports = {
    obtenerSugerenciasClientes,
    obtenerMaterialesPorCliente,
    buscarMateriales,
    descargarArchivoDeGoogleDrive,
    procesarArchivoExcel,
};