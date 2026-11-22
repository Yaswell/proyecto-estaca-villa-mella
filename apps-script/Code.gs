// Instalar como proyecto INDEPENDIENTE, no vinculado al archivo compartido.
const BOOK_ID = '1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0';
const FOLLOW = 'Seguimiento';
const HEADERS = [
  'Nombre completo', 'Fecha de nacimiento', 'Unidad', 'Fecha del bautismo',
  'Fecha de la confirmación', 'Fecha de la lección posbautismal',
  'Fecha de entrevista significativa', 'Estado de la recomendación para el templo',
  'Sacerdocio', 'Fecha de primera detección de preparación', 'Fecha de visita al templo',
  'Usó tarjeta de un familiar propio', 'Fecha de visita con tarjeta de familiar propio',
  'Actualizado por', 'Fecha de última actualización', 'Fuente de confirmación',
  'Estado de coincidencia', 'En lista actual de 12 meses',
];
const ACTIONS = {
  'Lección posbautismal': 'Fecha de la lección posbautismal',
  'Entrevista significativa': 'Fecha de entrevista significativa',
  'Visita al templo': 'Fecha de visita al templo',
  'Visita con tarjeta de familiar propio': 'Fecha de visita con tarjeta de familiar propio',
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Formulario')
    .setTitle('Seguimiento · Villa Mella').addMetaTag('viewport','width=device-width, initial-scale=1');
}

// Solo se ejecuta desde el editor por el administrador. No crea IDs de personas.
function prepararFormulario() {
  const book = libro_();
  if(!book.getSheetByName(FOLLOW)) throw new Error('Falta la pestaña Seguimiento.');
  seguimiento_(book);
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('FIRMA')) props.setProperty('FIRMA',Utilities.getUuid()+Utilities.getUuid());
  return 'Formulario preparado.';
}

function unidades() {
  return [...new Set(origen_(libro_()).map(row=>row.Unidad))].sort((a,b)=>a.localeCompare(b,'es'));
}

function conversos(unidad) {
  validarUnidad_(unidad);
  const book=libro_();
  const source=origen_(book).filter(row=>row.Unidad===unidad);
  const follow=seguimiento_(book).rows;
  const sourceCounts=contar_(source);
  const followCounts=contar_(follow);
  return source.filter(row=>sourceCounts[clave_(row)]===1 && (followCounts[clave_(row)]||0)<=1).map(row=>{
    const previous=follow.find(x=>clave_(x)===clave_(row));
    return {
      token: token_(row), nombre: primerNombre_(row['Nombre completo']),
      bautismo: row['Fecha del bautismo'], confirmacion: row['Fecha de la confirmación'],
      hechos: Object.keys(ACTIONS).flatMap(action=>{
        const fecha=previous && fechaISO_(previous[ACTIONS[action]]);
        return fecha ? [{accion:action,fecha}] : [];
      }),
    };
  }).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es') || a.bautismo.localeCompare(b.bautismo));
}

function guardarReporte(payload) {
  if(!payload || !Object.hasOwn(ACTIONS,payload.accion) || typeof payload.token!=='string' ||
    typeof payload.responsable!=='string' || payload.responsable.trim().length<2 ||
    payload.responsable.length>100 || !['Misioneros','Obispado','Cuórum de élderes','Sociedad de Socorro','Consultor de templo e historia familiar'].includes(payload.rol)) {
    throw new Error('Completa la persona, acción y responsable.');
  }
  validarUnidad_(payload.unidad);
  const fecha=fechaISO_(payload.fecha);
  const hoy=hoy_();
  if(!fecha || fecha>hoy)throw new Error('La fecha debe ser válida y no futura.');
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const book=libro_();
    const sources=origen_(book);
    const matches=sources.filter(row=>row.Unidad===payload.unidad && token_(row)===payload.token);
    if(matches.length!==1)throw new Error('Registro ambiguo o cambiado. Vuelve a cargar la lista.');
    const row=matches[0];
    if(fecha<row['Fecha del bautismo'])throw new Error('La acción no puede preceder al bautismo.');
    if(payload.accion!=='Lección posbautismal' &&
      (!row['Fecha de la confirmación'] || row['Fecha de la confirmación']<row['Fecha del bautismo'] ||
        row['Fecha de la confirmación']>hoy || fecha<row['Fecha de la confirmación'])) {
      throw new Error('Esta acción requiere una fecha de confirmación válida anterior o igual.');
    }
    const follow=seguimiento_(book);
    const targets=follow.rows.filter(other=>clave_(other)===clave_(row));
    if(targets.length>1)throw new Error('Hay duplicados en Seguimiento. Consulta al responsable.');
    const moved=follow.rows.some(other=>normal_(other['Nombre completo'])===normal_(row['Nombre completo']) &&
      fechaISO_(other['Fecha de nacimiento'])===row['Fecha de nacimiento'] &&
      normal_(other.Unidad)!==normal_(row.Unidad));
    if(moved)throw new Error('Posible cambio de unidad. El responsable debe conciliar el registro.');
    const previous=targets[0];
    const column=ACTIONS[payload.accion];
    if(previous && String(previous[column]||'').trim()) {
      if(fechaISO_(previous[column])===fecha)return {guardado:true,yaRegistrado:true};
      throw new Error('Ya hay otra fecha para esta acción. Solicita una corrección al responsable.');
    }
    const result=previous ? {...previous} : {};
    for(const key of ['Nombre completo','Fecha de nacimiento','Unidad','Fecha del bautismo','Fecha de la confirmación',
      'Estado de la recomendación para el templo','Sacerdocio']) result[key]=row[key]||'';
    result[column]=fecha;
    if(payload.accion==='Visita con tarjeta de familiar propio') {
      const first=fechaISO_(result['Fecha de visita al templo']);
      if(first && fecha<first)throw new Error('La visita con tarjeta familiar no puede preceder a la primera visita registrada.');
      result['Usó tarjeta de un familiar propio']='Sí';
      if(!first)result['Fecha de visita al templo']=fecha;
    }
    if(payload.accion==='Visita al templo') {
      const family=fechaISO_(result['Fecha de visita con tarjeta de familiar propio']);
      if(family && fecha>family)throw new Error('La visita no puede ser posterior a la visita familiar registrada.');
    }
    result['Actualizado por']=payload.responsable.trim()+' · '+payload.rol;
    result['Fecha de última actualización']=new Date().toISOString();
    result['Fuente de confirmación']='Formulario de seguimiento; responsable declarado';
    result['Estado de coincidencia']='Nombre completo + nacimiento + unidad';
    result['En lista actual de 12 meses']='Sí';
    const target=previous ? previous._fila : follow.sheet.getLastRow()+1;
    const range=follow.sheet.getRange(target,1,1,HEADERS.length);
    range.setNumberFormat('@');
    range.setValues([HEADERS.map(key=>textoCelda_(String(result[key]||'')))]);
    SpreadsheetApp.flush();
    return {guardado:true,yaRegistrado:false};
  } finally {lock.releaseLock();}
}

function libro_() { return SpreadsheetApp.openById(BOOK_ID); }

function origen_(book) {
  const sheet=book.getSheets().find(s=>s.getSheetId()===0);
  if(!sheet)throw new Error('No se encuentra Conversos.');
  const {headers,rows}=leer_(sheet);
  for(const key of ['Nombre de preferencia','Unidad','Fecha del bautismo','Fecha de la confirmación','Fecha de nacimiento']) {
    if(headers.filter(h=>h===key).length!==1)throw new Error('Revisa el encabezado '+key+'.');
  }
  return rows.map(row=>({
    ...row, 'Nombre completo':row['Nombre de preferencia']?.trim(),
    Unidad:row.Unidad?.trim(),
    'Fecha de nacimiento':fechaISO_(row['Fecha de nacimiento']),
    'Fecha del bautismo':fechaISO_(row['Fecha del bautismo']),
    'Fecha de la confirmación':fechaISO_(row['Fecha de la confirmación']),
  })).filter(row=>row.Unidad && row['Nombre completo'] && row['Fecha de nacimiento'] &&
    row['Fecha de nacimiento']<=hoy_() && row['Fecha del bautismo'] &&
    row['Fecha del bautismo']<=hoy_() && row['Fecha de nacimiento']<=row['Fecha del bautismo'] &&
    primerNombre_(row['Nombre completo']));
}

function seguimiento_(book) {
  const sheet=book.getSheetByName(FOLLOW);
  if(!sheet)throw new Error('Falta la pestaña Seguimiento.');
  const {headers,rows}=leer_(sheet);
  if(HEADERS.some((key,i)=>headers[i]!==key))throw new Error('No coinciden los encabezados de Seguimiento.');
  return {sheet,rows:rows.filter(row=>row['Nombre completo'])};
}

function leer_(sheet) {
  const values=sheet.getDataRange().getDisplayValues();
  const headers=values[0].map(h=>h.trim());
  return {headers,rows:values.slice(1).map((row,i)=>Object.fromEntries(
    [['_fila',i+2],...headers.map((key,n)=>[key,row[n]||''])]))};
}

function normal_(value) {return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function clave_(row) {return JSON.stringify([normal_(row['Nombre completo']),fechaISO_(row['Fecha de nacimiento']),normal_(row.Unidad)]);}
function contar_(rows) {return rows.reduce((a,row)=>{const key=clave_(row);a[key]=(a[key]||0)+1;return a;},{});}
function token_(row) {
  const secret=PropertiesService.getScriptProperties().getProperty('FIRMA');
  if(!secret)throw new Error('El administrador debe preparar el formulario.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(clave_(row),secret));
}
function validarUnidad_(unidad) {
  if(typeof unidad!=='string' || !unidad.trim() || unidad.length>150)throw new Error('Selecciona una unidad válida.');
}
function hoy_() {return Utilities.formatDate(new Date(),'America/Santo_Domingo','yyyy-MM-dd');}
function textoCelda_(value) {return /^[=+@-]/.test(value) ? "'"+value : value;}
function primerNombre_(value) {const text=String(value||'').trim();const comma=text.indexOf(',');return comma>=0 ? text.slice(comma+1).trim().split(/\s+/)[0] : /\s/.test(text) ? '' : text;}
function fechaISO_(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  const written = /^(\d{1,2})\s+(?:de\s+)?([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/i.exec(text);
  const months = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const [y, m, d] = (iso ? iso.slice(1) : local ? [local[3], local[2], local[1]]
    : written ? [written[3], months[written[2].toLowerCase().slice(0, 3)], written[1]] : []).map(Number);
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}
