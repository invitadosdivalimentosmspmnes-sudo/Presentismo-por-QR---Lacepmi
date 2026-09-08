/**
 * Configuración global de la app LACEPMI Presentismo QR.
 * Reemplazar APPS_SCRIPT_URL por la URL de tu Web App de Google Apps Script
 * (ver docs/INSTALACION.md, paso "Publicar la API").
 */
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzUj6M7uSXvkTQEOcApT7xSvIi5FrFqjCH81ZIhpNruO-peLs_iwEH_dwG502HNPFY/exec',
  NOMBRE_SISTEMA: 'LACEPMI Presentismo QR',
  NOMBRE_INSTITUCION: 'División de Calidad de Alimentos, Agua y Laboratorio',
  SUBTITULOS_INSTITUCIONALES: [
    'Subsecretaría de Atención Primaria y Salud Ambiental',
    'Dirección de Saneamiento Ambiental',
    'Departamento de Saneamiento Básico'
  ],
  VENTANA_DUPLICADO_SEGUNDOS: 30
};

const TIPOS_REGISTRO = [
  { valor: 'PRESENTE', etiqueta: 'Presente', icono: 'check-circle', color: 'var(--color-verde)' },
  { valor: 'AUSENTE', etiqueta: 'Ausente', icono: 'x-circle', color: 'var(--color-rojo)' },
  { valor: 'TARDANZA', etiqueta: 'Tardanza', icono: 'clock', color: 'var(--color-ambar)' },
  { valor: 'AUDITORÍA', etiqueta: 'Auditoría', icono: 'clipboard-check', color: 'var(--color-azul-medio)' },
  { valor: 'CAPACITACIÓN', etiqueta: 'Capacitación', icono: 'graduation-cap', color: 'var(--color-azul-medio)' },
  { valor: 'REUNIÓN', etiqueta: 'Reunión', icono: 'users', color: 'var(--color-azul-medio)' },
  { valor: 'OTRO MOTIVO', etiqueta: 'Otro motivo', icono: 'more-horizontal', color: 'var(--color-gris-oscuro)' }
];

function tipoRegistroInfo(valor) {
  return TIPOS_REGISTRO.find(function (t) { return t.valor === valor; }) || TIPOS_REGISTRO[6];
}

function enmascararDni(dni) {
  const s = String(dni || '');
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '.' + '*'.repeat(s.length - 4) + '.' + s.slice(-2);
}
