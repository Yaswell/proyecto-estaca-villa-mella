# Seguimiento de conversos · Villa Mella

React + Vite. `npm run dev` abre el tablero local; `npm run lint`, `npm run build` y `node --test tests/formulario.test.js` validan el proyecto.

## Fuentes y actualización

- **Conversos** (gid 0): lista actual de LCR, 20 columnas; nacimiento ocupa T. Solo A2:T se reemplaza semanalmente; la fila 1 y otras pestañas se conservan.
- **Seguimiento** (gid 112786024): registro permanente. No se limpia al renovar la lista de 12 meses.
- **Historia familiar**: agregado por unidad para envío de nombres; no admite filtros individuales.

El tablero inicia en el mes actual de Santo Domingo. Los filtros se combinan por unidad, mes de bautismo, edad cronológica y sexo. El grupo anual para sacerdocio incluye varones que cumplen 12 en ese año, desde enero, y no equivale a estar ordenado. La edad se calcula usando nacimiento. Los tiempos posteriores parten de una confirmación válida; la lección cuenta desde bautismo.

## Formulario y persistencia

El formulario de `apps-script/Formulario.html` registra:

1. Lección posbautismal.
2. Entrevista significativa.
3. Visita al templo.
4. Visita con tarjeta de familiar propio.

Pide unidad, muestra primeros nombres y sus acontecimientos registrados, solicita fecha, responsable declarado y su responsabilidad. No requiere contraseña ni cuenta: cualquier persona con el enlace puede consultar las listas por unidad y registrar avances. La identidad del responsable es declarada.

`apps-script/Code.gs` se instala en un proyecto de Apps Script **independiente**, no vinculado al libro compartido. El proyecto debe permanecer privado para que los editores del libro no puedan modificar el código que se ejecuta como propietario.

La coincidencia es **nombre completo normalizado + fecha de nacimiento exacta + unidad**. No se asignan IDs de personas. El token del selector es una firma técnica calculada de esos campos, no una columna nueva en Sheets. El formulario no devuelve la fecha de nacimiento ni el apellido al navegador. Los duplicados y posibles traslados requieren revisión.

El servidor vuelve a comprobar la unidad y la firma al guardar. Usa un bloqueo de escritura y actualiza una sola fila de Seguimiento; no modifica Conversos. Repetir el mismo acontecimiento y fecha devuelve éxito sin duplicar. Una fecha diferente para un acontecimiento ya registrado requiere corrección por el responsable. No se conserva un historial de revisiones completo en esta versión; se mantiene una fecha por hito y la última actualización.

## Instalación

1. Pegar `Code.gs` y `Formulario.html` en un proyecto independiente de Apps Script. El código contiene el ID del libro autorizado.
2. Ejecutar **prepararFormulario** desde el editor y revisar/conceder los permisos de Google. Valida los encabezados existentes y crea la firma del servidor; no rellena reportes ficticios.
3. Crear una implementación de tipo aplicación web, ejecutada como propietario. Elegir el acceso mínimo adecuado para el piloto. La publicación o ampliación de acceso requiere revisión del propietario. El servidor comprueba que la firma de la persona corresponde a la unidad seleccionada.
4. Guardar la URL `https://script.google.com/macros/s/.../exec` en `VITE_REPORTE_MISIONERO_URL` de `.env.local` y reiniciar Vite.
5. Abrir Senda de los convenios y probar con un dato autorizado. Después usar **Actualizar datos** en el tablero para leer Seguimiento.

La lectura del tablero usa el archivo existente. No publicar ni ampliar permisos por activar este formulario. Compartir el libro y publicar pestañas son controles distintos. Si la política de acceso requiere restringir el libro, la lectura privada del tablero necesita su propia conexión; la aplicación estática no proporciona autenticación por sí sola.

Variables opcionales: `VITE_CONVERSOS_CSV_URL`, `VITE_HISTORIA_FAMILIAR_CSV_URL`, `VITE_SEGUIMIENTO_CSV_URL`. Nunca poner firmas o credenciales en variables Vite.

## Columnas de Seguimiento

Nombre completo; Fecha de nacimiento; Unidad; Fecha del bautismo; Fecha de la confirmación; Fecha de la lección posbautismal; Fecha de entrevista significativa; Estado de la recomendación para el templo; Sacerdocio; Fecha de primera detección de preparación; Fecha de visita al templo; Usó tarjeta de un familiar propio; Fecha de visita con tarjeta de familiar propio; Actualizado por; Fecha de última actualización; Fuente de confirmación; Estado de coincidencia; En lista actual de 12 meses.

No se ha implementado una conciliación semanal que archive o actualice automáticamente todas las filas permanentes. El formulario crea o actualiza la fila cuando se reporta un acontecimiento. El tablero combina únicamente coincidencias únicas del listado actual con Seguimiento; no elimina filas antiguas.

## Progreso semanal

Las tarjetas muestran el último hito registrado:

- Bautismo o confirmación.
- Lección completada.
- Entrevista o preparación verificada (recomendación vigente y sacerdocio para los varones del grupo correspondiente). La preparación no inventa una entrevista.
- Visita al templo realizada.
- Visita con tarjeta familiar explícitamente confirmada.

La vista Progreso semanal está disponible también en la página publicada. Muestra el primer nombre, la edad y el estado de seguimiento por unidad. Los borradores WhatsApp se copian para revisión y envío manual.

## Prueba local

Añadir `?demo=1#reporte` a la URL de desarrollo. **Abrir formulario de prueba** y seleccionar Barrio de prueba A o B. La demo usa el mismo HTML del formulario, con un servidor local y persistencia en memoria; no escribe en Google Sheets ni implica que Apps Script esté desplegado. Reiniciar Vite borra los reportes ficticios.

Registrar una lección y volver al tablero de prueba. Ampliar el período a octubre si el bautismo de prueba cae fuera del mes actual. La tarjeta debe pasar a Lección posbautismal realizada. Las rutas de demo no se incluyen en producción.
