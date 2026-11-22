import test from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { createContext, runInContext, Script } from 'node:vm';
import { combinarSeguimiento, preparacionRegistrada } from '../src/utils/seguimientoPersistente.js';

function servicio() {
  const headers=['Nombre de preferencia','Unidad','Fecha del bautismo','Fecha de la confirmación','Fecha de nacimiento',
    'Estado de la recomendación para el templo','Sacerdocio'];
  const source=[headers,
    ['Prueba, Ana','Unidad A','01-11-2026','05-11-2026','01-12-2000','Activa',''],
    ['Prueba, Luis','Unidad A','01-11-2026','05-11-2026','01-12-2014','Activa','Aarónico'],
    ['Prueba, Otra','Unidad B','01-11-2026','05-11-2026','01-12-2000','','']];
  const values=[];
  const props=new Map([['FIRMA','firma-prueba']]);
  const follow={
    getDataRange:()=>({getDisplayValues:()=>values.map(row=>[...row])}),
    getLastRow:()=>values.length,
    getRange:(r,c,h,w)=>({
      setNumberFormat(){},
      setValues(rows) { assert.equal(h,rows.length); rows.forEach((row,i)=>{
        values[r+i-1] ||= [];
        row.forEach((cell,j)=>{assert.equal(typeof cell,'string');values[r+i-1][c+j-1]=cell;});
      });assert.equal(w,rows[0].length); },
    }),
  };
  const book={getSheets:()=>[{getSheetId:()=>0,getDataRange:()=>({getDisplayValues:()=>source})}],getSheetByName:()=>follow};
  const context=createContext({
    SpreadsheetApp:{openById:()=>book,flush(){}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props.get(key),setProperty:(key,v)=>props.set(key,v),
      setProperties:updates=>Object.entries(updates).forEach(([key,value])=>props.set(key,value)),
      deleteProperty:key=>props.delete(key)})},
    Utilities:{
      formatDate:()=> '2026-11-22',
      computeHmacSha256Signature:(text,key)=>createHmac('sha256',key).update(text).digest(),
      base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url'),
      DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},
    },
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  });
  runInContext(readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),context);
  values.push(runInContext('[...HEADERS]',context));
  return {api:context,values,source,follow,props};
}
test('guardar, reintentar y conciliar por nombre+nacimiento+unidad sin IDs',()=>{
  const {api,values,source}=servicio();
  const options=api.conversos('Unidad A');
  assert.equal(options.length,2);
  assert.equal(options[0].nombre,'Ana');
  assert.equal('nacimiento' in options[0],false);
  assert.equal('id' in options[0],false);
  assert.equal(api.conversos('Unidad B').length,1);
  assert.throws(()=>api.conversos(''),/unidad válida/);
  const payload={unidad:'Unidad A',token:options[0].token,accion:'Lección posbautismal',
    fecha:'2026-11-03',responsable:'Responsable prueba',rol:'Misioneros'};
  assert.throws(()=>api.guardarReporte({...payload,unidad:'Unidad B'}),/cambiado/);
  assert.equal(api.guardarReporte(payload).guardado,true);
  assert.equal(values.length,2);
  assert.equal(api.guardarReporte(payload).yaRegistrado,true);
  assert.equal(values.length,2);
  assert.throws(()=>api.guardarReporte({...payload,fecha:'2026-11-04'}),/otra fecha/);
  assert.throws(()=>api.guardarReporte({...payload,accion:'Entrevista significativa',fecha:'2026-11-04'}),/confirmación/);
  assert.equal(api.guardarReporte({...payload,accion:'Visita al templo',fecha:'2026-11-06',rol:'Obispado'}).guardado,true);
  assert.equal(api.guardarReporte({...payload,accion:'Visita con tarjeta de familiar propio',fecha:'2026-11-07'}).guardado,true);
  const report=Object.fromEntries(values[0].map((key,i)=>[key,values[1][i]]));
  assert.equal(report['Fecha de la lección posbautismal'],'2026-11-03');
  assert.equal(report['Fecha de visita al templo'],'2026-11-06');
  assert.equal(report['Usó tarjeta de un familiar propio'],'Sí');
  assert.equal(api.conversos('Unidad A')[0].hechos.length,3);
  const [original]=source.splice(1,1);
  source.push(original);
  assert.equal(api.guardarReporte(payload).yaRegistrado,true);
  source[source.length-1][1]='Unidad C';
  assert.throws(()=>api.guardarReporte(payload),/cambiado/);
  assert.equal(values.length,2);
});
test('bloquea duplicados y cambios de unidad',()=>{
  const {api,source,values}=servicio();
  const token=api.conversos('Unidad A')[0].token;
  source.push([...source[1]]);
  assert.throws(()=>api.guardarReporte({unidad:'Unidad A',token,accion:'Lección posbautismal',fecha:'2026-11-03',responsable:'Prueba',rol:'Misioneros'}),/ambiguo/);
  assert.equal(values.length,1);
});
test('el tablero combina solo coincidencias únicas sin alterar el origen',()=>{
  const source=[{'Nombre de preferencia':'Prueba, Ana',Unidad:'A','Fecha de nacimiento':'1 dic 2000'}];
  const report={'Nombre completo':'Prueba, Ana',Unidad:'A','Fecha de nacimiento':'2000-12-01','Fecha de la lección posbautismal':'2026-11-03'};
  assert.equal(combinarSeguimiento(source,[report])[0]['Fecha de la lección posbautismal'],'2026-11-03');
  assert.equal(source[0]['Fecha de la lección posbautismal'],undefined);
  assert.equal(combinarSeguimiento(source,[report,report])[0]['Fecha de la lección posbautismal'],undefined);
  assert.equal(combinarSeguimiento(source,[{...report,Unidad:'B'}])[0]['Fecha de la lección posbautismal'],undefined);
});
test('preparación exige recomendación y sacerdocio en varones del grupo anual',()=>{
  const row={Sexo:'V','Fecha de nacimiento':'31 dic 2014','Estado de la recomendación para el templo':'Activa'};
  assert.equal(preparacionRegistrada(row,new Date(2026,0,1)),false);
  assert.equal(preparacionRegistrada({...row,Sacerdocio:'Aarónico'},new Date(2026,0,1)),true);
  assert.equal(preparacionRegistrada({...row,Sexo:'M'},new Date(2026,0,1)),true);
});
test('el JavaScript del formulario tiene sintaxis válida',()=>{
  const html=readFileSync(new URL('../apps-script/Formulario.html',import.meta.url),'utf8');
  new Script(html.split('<script>')[1].split('</script>')[0]);
});
