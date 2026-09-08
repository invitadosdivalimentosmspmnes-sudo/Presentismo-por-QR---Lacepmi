/**
 * Utilidades comunes: navegación, formato de fecha/hora, helpers de UI.
 * Los iconos usan Lucide (data-lucide="..."), inicializados con lucide.createIcons().
 */

const NAV_ITEMS = [
  { href: 'index.html', label: 'Inicio', icon: 'layout-dashboard' },
  { href: 'registrar.html', label: 'Registrar', icon: 'qr-code' },
  { href: 'registros.html', label: 'Registros', icon: 'list' },
  { href: 'empleados.html', label: 'Empleados', icon: 'users' },
  { href: 'invitados.html', label: 'Invitados', icon: 'user-plus' },
  { href: 'qr.html', label: 'Códigos QR', icon: 'qr-code' },
  { href: 'estadisticas.html', label: 'Estadísticas', icon: 'bar-chart-3' }
];

function paginaActual() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}

function renderNav() {
  const activa = paginaActual();

  const itemsHtml = NAV_ITEMS.map(function (item) {
    const activeClass = item.href === activa ? ' is-active' : '';
    return '<li><a class="nav-link' + activeClass + '" href="' + item.href + '">' +
      '<i data-lucide="' + item.icon + '"></i><span>' + item.label + '</span></a></li>';
  }).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML =
    '<div class="sidebar__brand">' +
      '<div class="sidebar__brand-mark">LC</div>' +
      '<div class="sidebar__brand-text">LACEPMI<span>Presentismo QR</span></div>' +
    '</div>' +
    '<ul class="nav-list">' + itemsHtml + '</ul>' +
    '<div class="sidebar__footer">División de Calidad de Alimentos,<br>Agua y Laboratorio</div>';

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML =
    '<div class="topbar__brand"><div class="topbar__brand-mark">LC</div>LACEPMI</div>' +
    '<button class="hamburger" id="btnHamburger" aria-label="Abrir menú"><i data-lucide="menu"></i></button>';

  const scrim = document.createElement('div');
  scrim.className = 'sidebar-scrim';
  scrim.id = 'sidebarScrim';

  document.body.prepend(scrim);
  document.body.prepend(topbar);
  document.body.prepend(sidebar);

  document.getElementById('btnHamburger').addEventListener('click', function () {
    sidebar.classList.add('is-open');
    scrim.classList.add('is-open');
  });
  scrim.addEventListener('click', function () {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-open');
  });

  if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', renderNav);

/* ---------- Formato ---------- */

function formatFechaCorta(fechaIso) {
  if (!fechaIso) return '—';
  const partes = String(fechaIso).split('-');
  if (partes.length !== 3) return fechaIso;
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function formatFechaHoy() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function badgeTipoRegistro(tipo) {
  const mapaColor = {
    'PRESENTE': 'verde', 'AUSENTE': 'rojo', 'TARDANZA': 'ambar',
    'AUDITORÍA': 'azul', 'CAPACITACIÓN': 'azul', 'REUNIÓN': 'azul', 'OTRO MOTIVO': 'gris'
  };
  const color = mapaColor[tipo] || 'gris';
  const info = tipoRegistroInfo(tipo);
  return '<span class="badge badge--' + color + '"><i data-lucide="' + info.icono + '" style="width:12px;height:12px"></i>' + info.etiqueta + '</span>';
}

function badgeTipoPersona(tipo) {
  return tipo === 'EMPLEADO'
    ? '<span class="badge badge--azul">Empleado</span>'
    : '<span class="badge badge--gris">Invitado</span>';
}

/* ---------- Estado de carga / error reutilizable ---------- */

function elCarga(mensaje) {
  return '<div class="estado-carga"><div class="spinner"></div>' + (mensaje || 'Cargando datos…') + '</div>';
}

function elVacio(titulo, descripcion, icono) {
  return '<div class="estado-vacio"><i data-lucide="' + (icono || 'inbox') + '"></i>' +
    '<div class="estado-vacio__titulo">' + titulo + '</div><p>' + (descripcion || '') + '</p></div>';
}

function elError(mensaje) {
  return '<div class="banner-error"><i data-lucide="alert-triangle"></i><span>' + mensaje + '</span></div>';
}

function mensajeErrorApi(err) {
  if (err instanceof ApiError) return err.mensaje;
  return 'Ocurrió un error inesperado. Intentá nuevamente.';
}

function refrescarIconos() {
  if (window.lucide) lucide.createIcons();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}
