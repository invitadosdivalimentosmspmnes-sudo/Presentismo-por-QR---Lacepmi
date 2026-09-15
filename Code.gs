/**
 * LACEPMI — App de Presentismo por QR
 * Backend en Google Apps Script.
 * Base de datos: Google Sheets. Sin login / sin autenticación.
 *
 * INSTALACIÓN
 * 1) Crear un Google Sheet nuevo.
 * 2) Extensiones > Apps Script, borrar el contenido por defecto y pegar este archivo completo.
 * 3) En el editor de Apps Script, seleccionar la función "setup" en el desplegable y ejecutarla una vez.
 *    (la primera vez pedirá autorización: revisar permisos y aceptar)
 * 4) Esto crea las hojas EMPLEADOS, INVITADOS, REGISTROS y CONFIGURACIÓN, y carga la nómina real
 *    de 20 empleados del PDF oficial con su ID y QR_ID.
 * 5) Implementar > Nueva implementación > Tipo: Aplicación web.
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 * 6) Copiar la URL de la Web App y pegarla en js/config.js como APPS_SCRIPT_URL.
 */

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

const SHEET_EMPLEADOS = 'EMPLEADOS';
const SHEET_INVITADOS = 'INVITADOS';
const SHEET_REGISTROS = 'REGISTROS';
const SHEET_CONFIG = 'CONFIGURACIÓN';

const TIPOS_REGISTRO = [
  'PRESENTE', 'AUSENTE', 'TARDANZA', 'AUDITORÍA',
  'CAPACITACIÓN', 'REUNIÓN', 'OTRO MOTIVO'
];

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

// Intervalo mínimo (segundos) entre dos registros idénticos de la misma persona
// antes de considerarlo un posible duplicado accidental.
const VENTANA_DUPLICADO_SEGUNDOS = 30;

// Nómina oficial — fuente: PDF adjunto. No modificar apellidos, nombres ni DNI.
const NOMINA_EMPLEADOS = [
  { apellido: 'Aguirre', nombres: 'Carlos Alberto', dni: '12395501' },
  { apellido: 'Alvarenga', nombres: 'Gonzalo Javier', dni: '33013369' },
  { apellido: 'Alvarez', nombres: 'Juan Manuel', dni: '37890526' },
  { apellido: 'Ariste', nombres: 'Celeste Elizabeth', dni: '36093438' },
  { apellido: 'Balbuena', nombres: 'María Eugenia', dni: '36783683' },
  { apellido: 'Capaccio', nombres: 'Pablo Nicolás', dni: '25199096' },
  { apellido: 'Caruso', nombres: 'Valeria Gisella', dni: '37771848' },
  { apellido: 'Cerri', nombres: 'Ana Victoria', dni: '30694500' },
  { apellido: 'Fiedler', nombres: 'Jacqueline Noemí', dni: '33613028' },
  { apellido: 'Garcia', nombres: 'Myriam Alicia', dni: '17378148' },
  { apellido: 'Hein Plaza', nombres: 'Maria Candelaria', dni: '37420399' },
  { apellido: 'Klein', nombres: 'Andrés Arnaldo', dni: '36095909' },
  { apellido: 'López', nombres: 'Débora Arminda', dni: '17823383' },
  { apellido: 'Melnik', nombres: 'Sandra Beatriz', dni: '30372421' },
  { apellido: 'Molinari', nombres: 'Gabriel', dni: '40807944' },
  { apellido: 'Neumann', nombres: 'Karina Natalia', dni: '41091138' },
  { apellido: 'Parafieniuk', nombres: 'Sergio Ariel', dni: '33013482' },
  { apellido: 'Payes Monzón', nombres: 'Federico', dni: '14236071' },
  { apellido: 'Schweikofski', nombres: 'Mariel Eliana', dni: '36268172' },
  { apellido: 'Skuarek', nombres: 'Martin Ismael', dni: '33808931' }
];

// ============================================================
// SETUP — ejecutar una sola vez desde el editor
// ============================================================

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const empleadosSheet = getOrCreateSheet_(ss, SHEET_EMPLEADOS);
  empleadosSheet.clear();
  empleadosSheet.appendRow([
    'ID_EMPLEADO', 'APELLIDO', 'NOMBRES', 'NOMBRE_COMPLETO', 'DNI', 'SECTOR', 'CARGO', 'QR_ID', 'ESTADO'
  ]);
  NOMINA_EMPLEADOS.forEach(function (emp, i) {
    const id = 'LACEPMI-EMP-' + String(i + 1).padStart(3, '0');
    empleadosSheet.appendRow([
      id, emp.apellido, emp.nombres, emp.apellido + ' ' + emp.nombres, emp.dni,
      'LACEPMI', '', id, 'ACTIVO'
    ]);
  });
  formatHeader_(empleadosSheet, 9);

  const invitadosSheet = getOrCreateSheet_(ss, SHEET_INVITADOS);
  invitadosSheet.clear();
  invitadosSheet.appendRow([
    'ID_INVITADO', 'APELLIDO', 'NOMBRES', 'NOMBRE_COMPLETO', 'DNI', 'TIPO',
    'SECTOR', 'QR_ID', 'FECHA_ALTA', 'ESTADO', 'OBSERVACION'
  ]);
  formatHeader_(invitadosSheet, 11);

  const registrosSheet = getOrCreateSheet_(ss, SHEET_REGISTROS);
  registrosSheet.clear();
  registrosSheet.appendRow([
    'ID_REGISTRO', 'TIPO_PERSONA', 'ID_PERSONA', 'NOMBRE_COMPLETO', 'DNI',
    'TIPO_REGISTRO', 'FECHA', 'HORA', 'TIMESTAMP', 'OBSERVACION', 'ESTADO'
  ]);
  formatHeader_(registrosSheet, 11);

  const configSheet = getOrCreateSheet_(ss, SHEET_CONFIG);
  configSheet.clear();
  configSheet.appendRow(['NOMBRE_SISTEMA', 'NOMBRE_INSTITUCION', 'ZONA_HORARIA', 'VERSION']);
  configSheet.appendRow([
    'LACEPMI Presentismo QR',
    'División de Calidad de Alimentos, Agua y Laboratorio',
    ZONA_HORARIA,
    '1.0.0'
  ]);
  formatHeader_(configSheet, 4);

  SpreadsheetApp.flush();
  Logger.log('Setup completo: ' + NOMINA_EMPLEADOS.length + ' empleados cargados.');
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function formatHeader_(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight('bold').setBackground('#134074').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

// ============================================================
// ENTRADA HTTP
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    switch (action) {
      case 'getEmpleados':
        result = getEmpleados_();
        break;
      case 'getInvitados':
        result = getInvitados_();
        break;
      case 'getRegistros':
        result = getRegistros_(e.parameter);
        break;
      case 'getEstadisticas':
        result = getEstadisticas_();
        break;
      case 'identificar':
        result = identificarPorQr_(e.parameter.qr_id);
        break;
      case 'ping':
        result = { ok: true, mensaje: 'LACEPMI API activa' };
        break;
      default:
        return jsonOut_({ ok: false, error: 'Acción GET no reconocida: ' + action });
    }
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    switch (action) {
      case 'crearInvitado':
        result = crearInvitado_(body);
        break;
      case 'registrar':
        result = registrarMovimiento_(body);
        break;
      default:
        return jsonOut_({ ok: false, error: 'Acción POST no reconocida: ' + action });
    }
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// LECTURA
// ============================================================

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = values.slice(1).filter(function (r) { return r.join('') !== ''; });
  return rows.map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function getEmpleados_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return sheetToObjects_(getOrCreateSheet_(ss, SHEET_EMPLEADOS));
}

function getInvitados_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return sheetToObjects_(getOrCreateSheet_(ss, SHEET_INVITADOS));
}

function getRegistros_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let registros = sheetToObjects_(getOrCreateSheet_(ss, SHEET_REGISTROS));

  if (params) {
    if (params.persona_id) {
      registros = registros.filter(function (r) { return r.ID_PERSONA === params.persona_id; });
    }
    if (params.tipo_persona) {
      registros = registros.filter(function (r) { return r.TIPO_PERSONA === params.tipo_persona; });
    }
    if (params.tipo_registro) {
      registros = registros.filter(function (r) { return r.TIPO_REGISTRO === params.tipo_registro; });
    }
    if (params.fecha_desde) {
      registros = registros.filter(function (r) { return String(r.FECHA) >= params.fecha_desde; });
    }
    if (params.fecha_hasta) {
      registros = registros.filter(function (r) { return String(r.FECHA) <= params.fecha_hasta; });
    }
    if (params.busqueda) {
      const q = params.busqueda.toLowerCase();
      registros = registros.filter(function (r) {
        return String(r.NOMBRE_COMPLETO).toLowerCase().indexOf(q) !== -1;
      });
    }
  }

  registros.sort(function (a, b) { return String(b.TIMESTAMP).localeCompare(String(a.TIMESTAMP)); });
  return registros;
}

function getEstadisticas_() {
  const empleados = getEmpleados_();
  const invitados = getInvitados_();
  const registros = getRegistros_(null);
  const hoy = formatFecha_(new Date());
  const registrosHoy = registros.filter(function (r) { return String(r.FECHA) === hoy; });

  const contarPorTipo = function (lista) {
    const out = {};
    TIPOS_REGISTRO.forEach(function (t) { out[t] = 0; });
    lista.forEach(function (r) {
      if (out.hasOwnProperty(r.TIPO_REGISTRO)) out[r.TIPO_REGISTRO]++;
    });
    return out;
  };

  const porDia = {};
  registros.forEach(function (r) {
    const f = String(r.FECHA);
    porDia[f] = (porDia[f] || 0) + 1;
  });

  const porPersona = {};
  registros.forEach(function (r) {
    const n = String(r.NOMBRE_COMPLETO);
    porPersona[n] = (porPersona[n] || 0) + 1;
  });

  const porMes = {};
  registros.forEach(function (r) {
    const f = String(r.FECHA);
    const mes = f.substring(0, 7); // YYYY-MM
    porMes[mes] = (porMes[mes] || 0) + 1;
  });

  return {
    totalEmpleados: empleados.length,
    totalInvitados: invitados.length,
    registrosHoy: registrosHoy.length,
    hoyPorTipo: contarPorTipo(registrosHoy),
    totalPorTipo: contarPorTipo(registros),
    porDia: porDia,
    porPersona: porPersona,
    porMesActividad: porMes
  };
}

function identificarPorQr_(qrId) {
  if (!qrId) return { encontrado: false };

  const empleados = getEmpleados_();
  const empleado = empleados.find(function (e) { return e.QR_ID === qrId; });
  if (empleado) {
    return { encontrado: true, tipo: 'EMPLEADO', persona: empleado };
  }

  const invitados = getInvitados_();
  const invitado = invitados.find(function (i) { return i.QR_ID === qrId; });
  if (invitado) {
    return { encontrado: true, tipo: 'INVITADO', persona: invitado };
  }

  return { encontrado: false };
}

// ============================================================
// ESCRITURA
// ============================================================

function crearInvitado_(body) {
  if (!body.apellido || !body.nombres || !body.dni) {
    return { ok: false, error: 'Datos incompletos: apellido, nombres y DNI son obligatorios.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_INVITADOS);
  const existentes = sheetToObjects_(sheet);

  const nextNum = existentes.length + 1;
  const idInvitado = 'LACEPMI-INV-' + String(nextNum).padStart(3, '0');
  const qrId = idInvitado;
  const nombreCompleto = body.apellido + ' ' + body.nombres;
  const fechaAlta = formatFecha_(new Date());

  sheet.appendRow([
    idInvitado, body.apellido, body.nombres, nombreCompleto, body.dni,
    body.tipo || 'Visitante', body.sector || '', qrId, fechaAlta, 'ACTIVO', body.observacion || ''
  ]);

  return {
    ok: true,
    invitado: {
      ID_INVITADO: idInvitado, APELLIDO: body.apellido, NOMBRES: body.nombres,
      NOMBRE_COMPLETO: nombreCompleto, DNI: body.dni, TIPO: body.tipo || 'Visitante',
      SECTOR: body.sector || '', QR_ID: qrId, FECHA_ALTA: fechaAlta, ESTADO: 'ACTIVO',
      OBSERVACION: body.observacion || ''
    }
  };
}

function registrarMovimiento_(body) {
  const personaTipo = body.persona_tipo;
  const personaId = body.persona_id;
  const tipoRegistro = (body.tipo || '').toUpperCase();
  const observacion = body.observacion || '';

  if (!personaTipo || !personaId || !tipoRegistro) {
    return { ok: false, error: 'Datos incompletos para registrar el movimiento.' };
  }
  if (['EMPLEADO', 'INVITADO'].indexOf(personaTipo) === -1) {
    return { ok: false, error: 'Tipo de persona inválido.' };
  }
  if (TIPOS_REGISTRO.indexOf(tipoRegistro) === -1) {
    return { ok: false, error: 'Tipo de registro inválido.' };
  }
  if (tipoRegistro === 'OTRO MOTIVO' && !observacion) {
    return { ok: false, error: 'Debe especificar el motivo en la observación.' };
  }

  const persona = personaTipo === 'EMPLEADO'
    ? getEmpleados_().find(function (e) { return e.ID_EMPLEADO === personaId; })
    : getInvitados_().find(function (i) { return i.ID_INVITADO === personaId; });

  if (!persona) {
    return { ok: false, error: 'Empleado o invitado inexistente.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEET_REGISTROS);

  // Prevención de duplicados: mismo movimiento de la misma persona en una ventana corta.
  if (!body.forzar) {
    const registrosPrevios = sheetToObjects_(sheet);
    const ahora = new Date();
    const posibleDuplicado = registrosPrevios.some(function (r) {
      if (r.ID_PERSONA !== personaId || r.TIPO_REGISTRO !== tipoRegistro) return false;
      const ts = new Date(r.TIMESTAMP);
      const diffSeg = (ahora.getTime() - ts.getTime()) / 1000;
      return diffSeg >= 0 && diffSeg < VENTANA_DUPLICADO_SEGUNDOS;
    });
    if (posibleDuplicado) {
      return { ok: false, duplicado: true, error: 'Registro duplicado: ya se registró ese mismo movimiento hace instantes.' };
    }
  }

  const nombreCompleto = persona.NOMBRE_COMPLETO;
  const dni = persona.DNI;
  const now = new Date();
  const idRegistro = 'REG-' + Utilities.formatDate(now, ZONA_HORARIA, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);

  sheet.appendRow([
    idRegistro, personaTipo, personaId, nombreCompleto, dni, tipoRegistro,
    formatFecha_(now), formatHora_(now), now.toISOString(), observacion, 'REGISTRADO'
  ]);

  return {
    ok: true,
    registro: {
      ID_REGISTRO: idRegistro, TIPO_PERSONA: personaTipo, ID_PERSONA: personaId,
      NOMBRE_COMPLETO: nombreCompleto, DNI: dni, TIPO_REGISTRO: tipoRegistro,
      FECHA: formatFecha_(now), HORA: formatHora_(now), TIMESTAMP: now.toISOString(),
      OBSERVACION: observacion, ESTADO: 'REGISTRADO'
    }
  };
}

// ============================================================
// UTILIDADES
// ============================================================

function formatFecha_(date) {
  return Utilities.formatDate(date, ZONA_HORARIA, 'yyyy-MM-dd');
}

function formatHora_(date) {
  return Utilities.formatDate(date, ZONA_HORARIA, 'HH:mm:ss');
}
