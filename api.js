/**
 * Cliente de la API LACEPMI (Google Apps Script + Google Sheets).
 * Las lecturas usan GET con query params. Las escrituras usan POST con
 * Content-Type text/plain (Apps Script no soporta preflight CORS con JSON,
 * pero puede leer el JSON igual desde e.postData.contents).
 */
const Api = (function () {

  function urlConfigurada() {
    return Boolean(CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL.trim());
  }

  async function get(action, params) {
    if (!urlConfigurada()) {
      throw new ApiError('CONFIG_FALTANTE', 'La app todavía no está conectada a Google Sheets. Configurá APPS_SCRIPT_URL en js/config.js.');
    }
    const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
    let resp;
    try {
      resp = await fetch(CONFIG.APPS_SCRIPT_URL + '?' + qs.toString(), { method: 'GET' });
    } catch (e) {
      throw new ApiError('SIN_CONEXION', 'No se pudo conectar con Google Sheets. Revisá tu conexión a internet.');
    }
    if (!resp.ok) {
      throw new ApiError('ERROR_API', 'La API respondió con un error (' + resp.status + ').');
    }
    const json = await resp.json();
    if (!json.ok) {
      throw new ApiError('ERROR_API', json.error || 'Error desconocido de la API.');
    }
    return json.data;
  }

  async function post(action, body) {
    if (!urlConfigurada()) {
      throw new ApiError('CONFIG_FALTANTE', 'La app todavía no está conectada a Google Sheets. Configurá APPS_SCRIPT_URL en js/config.js.');
    }
    let resp;
    try {
      resp = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action }, body || {}))
      });
    } catch (e) {
      throw new ApiError('SIN_CONEXION', 'No se pudo conectar con Google Sheets. Revisá tu conexión a internet.');
    }
    if (!resp.ok) {
      throw new ApiError('ERROR_API', 'La API respondió con un error (' + resp.status + ').');
    }
    return resp.json();
  }

  return {
    ping: function () { return get('ping'); },
    getEmpleados: function () { return get('getEmpleados'); },
    getInvitados: function () { return get('getInvitados'); },
    getRegistros: function (filtros) { return get('getRegistros', filtros); },
    getEstadisticas: function () { return get('getEstadisticas'); },
    identificar: function (qrId) { return get('identificar', { qr_id: qrId }); },
    crearInvitado: function (datos) { return post('crearInvitado', datos); },
    registrar: function (datos) { return post('registrar', datos); }
  };
})();

function ApiError(codigo, mensaje) {
  this.codigo = codigo;
  this.mensaje = mensaje;
}
ApiError.prototype = Object.create(Error.prototype);
