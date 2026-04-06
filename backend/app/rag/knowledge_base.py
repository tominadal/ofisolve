# ============================================================
# BASE DE CONOCIMIENTO LEGAL PARA RAG
# Normativa Notarial Argentina — Fuente para embeddings en Qdrant
# ============================================================
# Este archivo se utilizará para generar chunks de texto
# que serán embebidos y almacenados en Qdrant para el RAG.
# ============================================================

CAPITULO_ESCRITURAS_PUBLICAS = """
CÓDIGO CIVIL Y COMERCIAL DE LA NACIÓN ARGENTINA
LIBRO PRIMERO - PARTE GENERAL
TÍTULO IV - HECHOS Y ACTOS JURÍDICOS
CAPÍTULO 5 - ACTOS JURÍDICOS
SECCIÓN 5ª - ESCRITURA PÚBLICA Y ACTA

Artículo 299. Escritura pública. Definición.
La escritura pública es el instrumento matriz extendido en el protocolo de un escribano público 
o de otro funcionario autorizado para ejercer las mismas funciones, que contiene uno o más 
actos jurídicos. La copia o testimonio de las escrituras públicas que expiden los escribanos 
es instrumento público y hace plena fe como la escritura matriz. Si hay alguna variación entre 
ésta y la copia o el testimonio, se debe estar al contenido de la escritura matriz.

Artículo 300. Protocolo.
El protocolo se forma con los folios habilitados para el uso de cada registro, numerados 
correlativamente en cada año calendario, y con los documentos que se incorporan por exigencia 
legal o a requerimiento de las partes del acto. Corresponde a la ley local reglamentar lo 
relativo a las características de los folios, su expedición, así como los recaudos relativos 
a su colección en volúmenes o legajos, su conservación y archivo.

Artículo 301. Requisitos.
El escribano debe recibir por sí mismo las declaraciones de los comparecientes, sean las 
partes, sus representantes, testigos, cónyuges u otros intervinientes. Debe calificar los 
presupuestos y elementos del acto, y configurarlo técnicamente. Las escrituras públicas, que 
deben extenderse en un único acto, pueden ser manuscritas o mecanografiadas, pudiendo 
utilizarse mecanismos electrónicos de procesamiento de textos, siempre que en definitiva 
el texto resulte estampado en el soporte exigido por las reglamentaciones, con caracteres 
fácilmente legibles. En los casos de pluralidad de otorgantes en los que no haya entrega 
de dinero, valores o cosas en presencia del notario, los interesados pueden suscribir la 
escritura en distintas horas del mismo día de su otorgamiento. Este procedimiento puede 
utilizarse siempre que no se modifique el texto definitivo al tiempo de la primera firma.

Artículo 302. Idioma.
La escritura pública debe hacerse en idioma nacional. Si alguno de los otorgantes declara 
ignorarlo, la escritura debe redactarse conforme a una minuta firmada, que debe ser 
traducida por el traductor público. Si no hay traductor público, la traducción puede ser 
hecha por el traductor que el juez designe. El otorgante que no conoce el idioma nacional 
debe concurrir con el traductor. El instrumento debe hacerse en doble ejemplar, uno en 
castellano y otro en el idioma del otorgante.

Artículo 303. Abreviaturas y números.
No se deben dejar espacios en blanco, ni utilizar abreviaturas, o iniciales, excepto que 
estas dos últimas consten en los documentos que se transcriben, se ## otorguen o incorporen 
al acto. Pueden usarse números, excepto para las cantidades que se entreguen en presencia 
del escribano y otras cantidades o datos que correspondan a elementos esenciales del acto 
jurídico.

Artículo 304. Otorgante con discapacidad auditiva.
Si alguna de las personas otorgantes del acto tiene discapacidad auditiva, deben intervenir 
dos testigos que puedan dar cuenta del conocimiento y comprensión del acto por la persona 
otorgante. Si es alfabeta, además, la escritura debe hacerse de conformidad a una minuta 
firmada por ella y el escribano debe dar fe de ese hecho. La minuta debe quedar protocolizada.

Artículo 305. Contenido.
La escritura debe contener:
a) lugar y fecha de su otorgamiento; si cualquiera de las partes lo requiere o el escribano 
lo considera conveniente, la hora en que se firma el instrumento;
b) los nombres, apellidos, documento de identidad, domicilio real, fecha de nacimiento y 
estado de familia de los otorgantes; si se trata de personas casadas, se debe consignar 
también si lo son en primeras o en ulteriores nupcias y el nombre del cónyuge, si resulta 
relevante en atención a la naturaleza del acto; si el otorgante es una persona jurídica, 
se debe dejar constancia de su denominación completa, domicilio social y datos de 
inscripción de su constitución si corresponde;
c) la naturaleza del acto y la individualización de los bienes que constituyen su objeto;
d) la constancia instrumental de la lectura que el escribano debe hacer en el acto del 
otorgamiento de la escritura;
e) las enmiendas, testados, borraduras, entrelíneas, u otras modificaciones efectuadas al 
instrumento en partes esenciales, que deben ser realizadas de puño y letra del escribano y 
antes de la firma;
f) la firma de los otorgantes, del escribano y de los testigos si los hubiera; si alguno 
de los otorgantes no sabe o no puede firmar, debe hacerlo en su nombre otra persona; 
debe hacerse constar la manifestación sobre la causa del impedimento y la impresión digital 
del otorgante.

Artículo 306. Justificación de identidad.
La identidad de los comparecientes debe justificarse por cualquiera de los siguientes medios:
a) por exhibición que se haga al escribano de documento idóneo; en este caso, se debe 
individualizar el documento y consignar el número, registro, serie y, si consta, la 
expedición y vencimiento;
b) por afirmación del conocimiento del escribano.

Artículo 307. Documentos habilitantes.
Si el otorgante de la escritura es un representante, el escribano debe exigir la presentación 
del documento original que lo acredite, el que ha de quedar agregado al protocolo, excepto 
que se trate de poderes para más de un asunto o de otros documentos habilitantes que hagan 
necesaria la devolución, supuesto en el cual se debe agregar copia certificada por el 
escribano. En caso de que los documentos habilitantes ya estén protocolizados en el registro 
del escribano interviniente, basta con que se mencione esta circunstancia, indicando folio y 
año.

Artículo 308. Copias o testimonios.
El escribano debe dar copia o testimonio de la escritura a las partes. Ese instrumento puede 
ser obtenido por cualquier medio de reproducción que asegure su permanencia indeleble, 
constituyendo instrumento público. Si alguna de las partes solicita nueva copia, el escribano 
debe entregarla, excepto que la escritura contenga la constancia de alguna obligación 
directa a favor de persona determinada, en cuyo caso el escribano debe requerir la 
acreditación en instrumento público de la extinción de la obligación, la conformidad del 
acreedor, o la autorización judicial, que debe tramitar con citación de las partes del acto 
jurídico.

Artículo 309. Nulidad.
Son nulas las escrituras que no tengan la designación del tiempo y lugar en que sean hechas, 
el nombre de los otorgantes, la firma del escribano y de las partes, la firma a ruego de 
ellas cuando no saben o no pueden escribir y la firma de los dos testigos del acto cuando 
su presencia sea requerida. La inobservancia de las otras formalidades no anula las 
escrituras, pero los escribanos o funcionarios públicos pueden ser sancionados. No 
constituye defecto de forma la falta de los testigos en las escrituras para las cuales su 
presencia no sea requerida.

Artículo 310. Actas.
Las actas son los documentos notariales que tienen por objeto la comprobación de hechos.

Artículo 311. Requisitos de las actas notariales.
Las actas están sujetas a los requisitos de las escrituras públicas, con las siguientes 
modificaciones:
a) se debe hacer constar el requerimiento que motiva la intervención del notario y, en su 
caso, la manifestación del requirente respecto al interés propio o de terceros con que actúa;
b) no es necesaria la acreditación de la personería ni la del interés de terceros que alega 
el requirente;
c) no es necesario que el notario conozca o identifique a las personas con quienes trata a 
los efectos de realizar las notificaciones, intimaciones o constataciones que se le requieren;
d) las personas requeridas o notificadas, en la medida en que el objeto de la comprobación 
así lo permita, deben ser previamente informadas del carácter en que interviene el notario 
y, en su caso, del derecho a no responder o de cualquier otro que les asista. En este 
supuesto, se debe hacer constar la respuesta o, en su caso, su negativa a responder;
e) el notario puede practicar las diligencias sin la intervención de testigos.

Artículo 312. Valor probatorio.
El valor probatorio de las actas se circunscribe a los hechos que el notario tiene a la vista, 
a la verificación de su existencia y su estado. En cuanto a las personas, se circunscribe a 
su identificación si existe, y debe dejarse constancia de las declaraciones y juicios que 
emiten. Las declaraciones deben referirse como mero hecho y no como contenido negocial.
"""


CAPITULO_REPRESENTACION = """
CÓDIGO CIVIL Y COMERCIAL DE LA NACIÓN ARGENTINA
LIBRO PRIMERO - PARTE GENERAL
TÍTULO IV - HECHOS Y ACTOS JURÍDICOS
CAPÍTULO 8 - REPRESENTACIÓN

Artículo 358. Principio. Fuentes.
Los actos jurídicos entre vivos pueden ser celebrados por medio de representante, excepto 
en los casos en que la ley exige que sean otorgados por el titular del derecho.

Artículo 362. Caracteres.
La representación voluntaria comprende sólo los actos que el representado puede otorgar por 
sí mismo. Los límites de la representación, su extinción, y las instrucciones que el 
representado dio a su representante, son oponibles a terceros si éstos las conocen o 
pudieron conocerlas actuando con la debida diligencia.

Artículo 363. Forma.
El apoderamiento debe ser otorgado en la forma prescripta para el acto que el representante 
debe realizar. El poder especial para administrar bienes registrables requiere escritura 
pública. La forma de la carta poder está sujeta a las disposiciones de la ley electoral.

Artículo 375. Poder conferido en términos generales y facultades expresas.
Las facultades contenidas en el poder son de interpretación restrictiva. El poder conferido 
en términos generales sólo incluye los actos propios de administración ordinaria y los 
necesarios para su ejecución. Son necesarias facultades expresas para:
a) peticionar el divorcio, la nulidad de matrimonio, la modificación, disolución o 
liquidación del régimen patrimonial del matrimonio;
b) otorgar el asentimiento conyugal si el acto lo requiere, caso en el que deben 
identificarse los bienes a que se refiere;
c) reconocer hijos, caso en el que debe individualizarse a la persona que se reconoce;
d) aceptar herencias;
e) constituir, modificar, transferir o extinguir derechos reales sobre inmuebles u otros 
bienes registrables;
f) crear obligaciones por una declaración unilateral de voluntad;
g) reconocer o novar obligaciones anteriores al otorgamiento del poder;
h) hacer pagos que no sean los ordinarios de la administración;
i) renunciar, transar, someter a juicio arbitral derechos u obligaciones, sin perjuicio 
de las reglas aplicables en materia de concursos y quiebras;
j) formar uniones transitorias de empresas, agrupamientos de colaboración empresaria, 
sociedades, asociaciones, o fundaciones;
k) dar o tomar en locación inmuebles por más de tres años, o cobrar alquileres anticipados 
por más de un año;
l) realizar donaciones, u otras liberalidades, excepto pequeñas gratificaciones habituales;
m) dar fianzas, comprometer servicios personales, recibir cosas en depósito si no se trata 
del necesario, y dar o tomar dinero en préstamo, excepto cuando estos actos correspondan 
al objeto para el que se otorgó un poder en términos generales.

Artículo 376. Responsabilidad por inexistencia o exceso en la representación.
Quien invoca una representación que no tiene, o que excede de las facultades, es responsable 
del daño que la otra parte sufra por haber confiado, sin culpa suya, en la validez del acto; 
si hace saber al tercero la falta o deficiencia de su poder, está exento de dicha responsabilidad.

Artículo 377. Sustitución.
El representante puede sustituir el poder en otro. Responde por el sustituto si incurre en 
culpa al elegirlo. El representado puede indicar la persona del sustituto, caso en el cual 
el representante no responde por éste.
"""


NORMATIVAS_CERTIFICACIONES = """
NORMAS PARA CERTIFICACIONES NOTARIALES EN ARGENTINA

I. CERTIFICACIÓN DE FOTOCOPIAS
================================
Fundamento legal: Ley 404 CABA (Art. sobre documentos extraprotocolares), CCyCN Art. 312.

Procedimiento:
1. El requirente se presenta ante el escribano con el documento original.
2. El escribano verifica la identidad del requirente mediante DNI vigente.
3. El escribano coteja la fotocopia con el original, verificando que sea reproducción fiel.
4. El escribano estampa su sello y firma en la fotocopia, certificando su fidelidad.
5. Se labra constancia en el libro de requerimientos con:
   - Número correlativo
   - Fecha y hora
   - Datos del requirente (nombre, DNI)
   - Descripción del documento original
   - Cantidad de fojas certificadas

Fórmula tipo:
"CERTIFICO que la presente fotocopia, que consta de [N] foja/s, es copia fiel de su original, 
el cual he tenido a la vista. DOY FE.-"

Efectos: La certificación NO convierte la fotocopia en documento público. Solo atesta la 
fidelidad de la copia respecto al original exhibido.


II. CERTIFICACIÓN DE FIRMAS
===============================
Fundamento legal: Ley 404 CABA, CCyCN Art. 306, 314.

Procedimiento:
1. El requirente se presenta ante el escribano con DNI vigente.
2. El escribano verifica la identidad del firmante.
3. El requirente estampa su firma EN PRESENCIA del escribano.
4. El escribano certifica que la firma pertenece a la persona identificada.
5. Se asienta en el libro de requerimientos.

Modalidades:
a) Presencial: El firmante estampa la firma ante el notario.
b) Reconocimiento: Si la firma ya fue estampada, el firmante la reconoce como propia 
   ante el notario (se labra acta de reconocimiento).

Fórmula tipo:
"CERTIFICO que la firma que antecede pertenece a [NOMBRE], D.N.I. N° [DNI], quien la 
estampa/reconoce como propia en mi presencia. DOY FE.-"


III. CERTIFICACIÓN DE CONTENIDO
===================================
Procedimiento:
1. El requirente presenta el documento cuyo contenido se desea certificar.
2. El escribano transcribe o coteja el contenido.
3. Se certifica que el contenido coincide fielmente con el original.

Fórmula tipo:
"CERTIFICO que el contenido del documento que se transcribe/adjunta corresponde fielmente 
al original que me fue exhibido. DOY FE.-"


IV. CERTIFICACIÓN DE FECHA CIERTA
======================================
Fundamento legal: CCyCN Art. 317.

Art. 317 CCyCN: "La eficacia probatoria de los instrumentos privados reconocidos se extiende 
a los terceros desde su fecha cierta. Adquieren fecha cierta el día en que acontece un hecho 
del que resulta como consecuencia ineludible que el documento ya estaba firmado o no pudo ser 
firmado después. La intervención de un escribano hace adquirir fecha cierta a los instrumentos 
privados."

Procedimiento:
1. El requirente presenta un documento privado firmado.
2. El escribano verifica la identidad del requirente y su calidad de firmante.
3. El escribano estampa su sello y firma, otorgando fecha cierta desde ese momento.

Fórmula tipo:
"CERTIFICO que el documento presentado tiene fecha cierta a partir del día de la fecha, 
conforme lo establecido por el Art. 317 del Código Civil y Comercial de la Nación. DOY FE.-"
"""


NORMATIVAS_PODERES = """
NORMAS PARA PODERES NOTARIALES EN ARGENTINA

I. PODER GENERAL DE ADMINISTRACIÓN
========================================
Fundamento: CCyCN Art. 375. Interpretación restrictiva.

Un poder general solo incluye actos propios de administración ordinaria:
- Cobrar alquileres, dividendos, créditos
- Pagar deudas y gastos ordinarios de administración
- Gestionar trámites ante organismos públicos (AFIP, ANSES, Bancos)
- Representar ante reparticiones nacionales, provinciales, municipales

Estructura de la escritura pública:
1. ENCABEZAMIENTO: Lugar, fecha, escribano, registro.
2. COMPARECENCIA: Datos completos del poderdante (nombre, DNI, estado civil, domicilio).
3. MANIFESTACIÓN: "Que por el presente otorga PODER GENERAL DE ADMINISTRACIÓN..."
4. DESIGNACIÓN DEL APODERADO: Datos completos.
5. FACULTADES: Enumeración específica de las facultades otorgadas.
6. CLÁUSULAS ESPECIALES: Sustitución, revocabilidad, vigencia.
7. CIERRE: Lectura, conformidad, firmas.


II. PODER ESPECIAL
=======================
Fundamento: CCyCN Art. 375 (facultades expresas requeridas).

Se requiere para actos de disposición y actos específicos:
- Compraventa de inmuebles (Art. 375 inc. e)
- Aceptar herencias (Art. 375 inc. d)
- Constituir hipotecas o prendas
- Realizar donaciones (Art. 375 inc. l)
- Representación judicial

Estructura: Similar al general pero con:
- Individualización precisa del acto o bien
- Facultades expresamente detalladas
- Precio o condiciones si corresponde


III. AUTORIZACIÓN DE VIAJE PARA MENORES
============================================
Fundamento: Ley 26.061 (Protección Integral de Derechos de Niños), 
Disposiciones DNM (Dirección Nacional de Migraciones).

Requisitos:
- Si viaja solo: autorización de AMBOS padres
- Si viaja con un progenitor: autorización del otro progenitor
- Si viaja con terceros: autorización de AMBOS padres
- Si viaja con ambos padres: solo DNI del menor y documentación de vínculo

Documentación necesaria:
1. DNI vigente (último ejemplar) del menor
2. DNI de los autorizantes (padres/tutores)
3. Documentación que acredite el vínculo (partida de nacimiento, libreta de familia)
4. Datos del acompañante (si corresponde)

Vigencia de la autorización:
a) Para un único viaje (90 días de validez)
b) Por un período determinado
c) Hasta la mayoría de edad del menor

Estructura del documento notarial:
1. ENCABEZAMIENTO: Lugar, fecha, escribano.
2. COMPARECENCIA: Datos de los padres/tutores autorizantes.
3. DATOS DEL MENOR: Nombre, DNI, fecha de nacimiento, vínculo.
4. AUTORIZACIÓN: Destino, fechas, acompañante, vigencia.
5. DECLARACIÓN: Los padres autorizan expresamente el viaje.
6. CIERRE: Lectura, conformidad, firmas.

Nota: La autorización puede revocarse en cualquier momento por cualquiera de los padres.
"""


LEY_404_CABA_RESUMEN = """
LEY 404 - LEY ORGÁNICA NOTARIAL DE LA CIUDAD AUTÓNOMA DE BUENOS AIRES
Sancionada: 15/06/2000. Publicada en B.O. 24/07/2000.

TÍTULO I - Principios Generales
- La función notarial es una función pública ejercida por profesionales del derecho 
  investidos como fedatarios.
- El escribano actúa como depositario de la fe pública.
- Competencia territorial: el escribano ejerce en la jurisdicción de su registro.

TÍTULO II - Funciones Notariales
- Deberes del escribano: asesoramiento imparcial, secreto profesional, guarda del protocolo.
- Régimen de registros: cada registro tiene un titular y puede tener adscriptos.
- Incompatibilidades: no puede ejercer el comercio, ser funcionario público (salvo docencia).

TÍTULO III - Documentos Notariales
Capítulo 1 - Documentos protocolares:
  - Escrituras públicas: instrumento matriz del protocolo.
  - Actas protocolares: comprobación de hechos.

Capítulo 2 - Documentos extraprotocolares:
  - Certificaciones de firmas
  - Certificaciones de fotocopias
  - Certificaciones de contenido
  - Certificaciones de fecha cierta
  - Los certificados se extienden en fojas de actuación notarial.

SECCIÓN TERCERA - DOCUMENTOS EXTRAPROTOCOLARES

Capítulo I - Disposiciones Generales (Arts. 93-95)

Artículo 93. Documentos extraprotocolares. Concepto.
Son instrumentos públicos extendidos en fojas de actuación notarial o en los soportes 
reglamentados, bajo la fe del notario y con las formalidades que la presente ley establece. 
Comprenden los certificados y los traslados.

Artículo 94. Requisitos formales.
Los documentos extraprotocolares deben contener:
a) Lugar y fecha de otorgamiento.
b) Datos de identificación del requirente.
c) Objeto del requerimiento.
d) Las constancias o diligencias que el caso requiera.
e) Firma y sello del escribano.
f) Numeración correlativa.

Artículo 95. Fojas de actuación notarial.
Los documentos extraprotocolares se extienden en las fojas de actuación notarial 
habilitadas por el Colegio de Escribanos, identificadas con serie y numeración.

Capítulo II - Certificados (Arts. 96-102)

Artículo 96. Certificados. Definición.
Los certificados son documentos notariales extraprotocolares que contienen la declaración 
o atestación del notario sobre hechos que conoce, que presencia o comprueba; sobre la 
existencia y estado de personas; o sobre la autenticación de firmas e impresiones digitales.

Artículo 97. Certificación de firmas.
Para la certificación de firmas el escribano debe:
a) Verificar la identidad del firmante mediante documento de identidad vigente.
b) Presenciar la firma del requirente o recibir su reconocimiento.
c) Dejar constancia de los datos identificatorios del firmante.
d) Dejar constancia del documento donde se estampa o reconoce la firma.

Artículo 98. Certificación de impresiones digitales.
Cuando el requirente no sepa o no pueda firmar, el escribano certificará la impresión 
digital, haciendo constar el motivo de la imposibilidad y la identidad del requirente.

Artículo 99. Certificación de reproducciones.
Para certificar reproducciones (fotocopias), el escribano debe:
a) Tener a la vista el documento original.
b) Cotejar que la reproducción sea fiel al original.
c) Certificar que la copia es reproducción fiel.
d) No debe calificar el contenido del documento original.

Artículo 100. Efectos de la certificación de reproducciones.
La certificación de reproducciones no convierte a la copia en documento público y no 
califica el contenido del instrumento original.

Artículo 101. Libro de requerimientos.
El notario debe llevar un libro de requerimientos, habilitado por el Colegio de Escribanos, 
donde asentará las constancias correspondientes de cada actuación extraprotocolar.

Artículo 102. Libros. Requisitos.
Los libros habilitados deben tener:
a) Foliatura correlativa.
b) Apertura y cierre certificados.
c) Datos establecidos por la reglamentación del Colegio.

TÍTULO IV - Organización Notarial
- Colegio de Escribanos de la Ciudad de Buenos Aires
- Tribunal de Superintendencia del Notariado
- Régimen disciplinario: apercibimiento, multa, suspensión, destitución.

TÍTULO V - Fondo de Garantía
- Para responder por los daños causados por escribanos en el ejercicio de su función.
"""


CAPITULO_INSTRUMENTOS_PRIVADOS = """
CÓDIGO CIVIL Y COMERCIAL DE LA NACIÓN ARGENTINA
LIBRO PRIMERO - PARTE GENERAL
TÍTULO IV - HECHOS Y ACTOS JURÍDICOS
CAPÍTULO 5 - ACTOS JURÍDICOS
SECCIÓN 6ª - INSTRUMENTOS PRIVADOS Y PARTICULARES

Artículo 313. Firma de los instrumentos privados.
Si alguno de los firmantes de un instrumento privado no sabe o no puede firmar, puede 
dejarse constancia de la impresión digital o mediante la presencia de dos testigos que 
deben suscribir también el instrumento.

Artículo 314. Reconocimiento de la firma.
Todo aquel contra quien se presente un instrumento cuya firma se le atribuye debe manifestar 
si ésta le pertenece. Los herederos pueden limitarse a manifestar que ignoran si la firma es 
o no de su causante.
La autenticidad de la firma puede probarse por cualquier medio de prueba. El reconocimiento 
de la firma importa el reconocimiento del cuerpo del instrumento privado.
El instrumento privado reconocido, o cuya firma ha sido certificada por escribano, no hace 
plena fe respecto de su contenido y de la fecha de su otorgamiento, excepto si hubiera sido 
certificado por escribano con intervención, firma y sello, o si hubiera sido presentado ante 
funcionario público competente para su archivo o registro.

Artículo 315. Documentos particulares no firmados.
Los documentos particulares no firmados comprenden todo escrito no firmado, entre otros, los 
impresos, los registros visuales o auditivos de cosas o hechos y, cualquiera que sea el medio 
empleado, los registros de la palabra y de información.
Ellos deben ser valorados por el juez según las reglas de la sana crítica, atendiendo a la 
congruencia entre lo sucedido y narrado, a la precisión y claridad técnica del texto, a los 
usos y prácticas del tráfico, a las relaciones precedentes y a la confiabilidad de los 
soportes utilizados y de los procedimientos técnicos que se apliquen.

Artículo 316. Enmiendas.
Las enmiendas, borraduras, entrelíneas y otras alteraciones contenidas en partes esenciales 
del instrumento privado deben ser salvadas con la firma de las partes. Si no se salvan, el 
juez debe valorar su eficacia probatoria.

Artículo 317. Fecha cierta.
La eficacia probatoria de los instrumentos privados con fecha cierta se extiende a los terceros.
La fecha cierta es el día en que acontece un hecho del que resulta como consecuencia forzosa 
que el documento ya estaba firmado o no pudo ser firmado después de ese día.
La fecha cierta de los instrumentos privados se configura, principalmente, con su exhibición 
en juicio o en repartición pública, si queda archivado; con su presentación ante escribano 
público para certificar la fecha, aunque no certifique la firma; o con la muerte o incapacidad 
permanente de cualquiera de las partes que lo firmaron.

Artículo 318. Contradocumentos.
Los contradocumentos particulares, cuyo objeto es alterar lo dispuesto en el instrumento público, 
pueden ser invocados por las partes, pero no pueden ser opuestos a terceros interesados de buena fe.
"""


NORMATIVA_VIAJE_MENORES_DETALLADA = """
NORMATIVA PARA AUTORIZACIÓN DE VIAJE DE MENORES - ARGENTINA
Fuentes: Ley 26.061, resoluciones vigentes de la DNM, CCyCN.

I. CUÁNDO ES OBLIGATORIA LA AUTORIZACIÓN
============================================
La autorización de viaje al exterior es obligatoria cuando:
- El menor viaja SOLO (autorización de AMBOS padres/tutores)
- El menor viaja con UN SOLO progenitor (autorización del otro)
- El menor viaja con TERCEROS (autorización de AMBOS padres/tutores)

Excepción: Si viaja con AMBOS padres, solo se requiere:
- DNI del menor (último ejemplar)
- Documentación que acredite vínculo (partida de nacimiento, libreta civil, 
  DNI digital donde figuren datos filiatorios)

II. REQUISITOS DOCUMENTALES
================================
1. DNI vigente (último ejemplar) del menor
2. DNI de los padres/tutores autorizantes
3. Documentación que acredite el vínculo:
   - Partida de Nacimiento
   - Libreta Civil de Familia
   - Testimonio Judicial de adopción
   - DNI digital con datos filiatorios
4. Si viaja con terceros: Datos completos del acompañante (nombre, DNI, domicilio)
5. Pasaporte vigente del menor (si el destino lo requiere)

III. MODALIDADES DE VIGENCIA
================================
a) Para un ÚNICO VIAJE: 90 días de validez desde la emisión
b) Por un PERÍODO DETERMINADO: según lo fijado por los padres
c) Hasta la MAYORÍA DE EDAD del menor

IV. DÓNDE SE PUEDE TRAMITAR
================================
a) Dirección Nacional de Migraciones (DNM):
   - Modalidad Normal: entrega en 10 días hábiles
   - Modalidad Express: entrega en 48 horas
   - Modalidad Al Instante: resolución en hasta 2 horas
   - Requiere turno previo (excepto pasos fronterizos, Ezeiza, Aeroparque, Buquebus)
   
b) Escribano Público:
   - Certificación de firmas de los padres en la autorización
   - IMPORTANTE: El escribano debe registrar la autorización en el sistema 
     electrónico de la DNM para que tenga validez migratoria

c) Juez de Paz (en algunas jurisdicciones)

V. SITUACIONES ESPECIALES
================================
1. Fallecimiento de un progenitor: Presentar acta de defunción original
2. Progenitor con paradero desconocido: Autorización Judicial Supletoria
3. Privación de responsabilidad parental: Autorización Judicial
4. Desacuerdo entre padres: Resolución judicial
5. Tutor legal: Presentar resolución de tutela

VI. ESTRUCTURA DE LA AUTORIZACIÓN NOTARIAL
=============================================
1. ENCABEZAMIENTO: Lugar, fecha, datos del escribano y registro
2. COMPARECENCIA: Datos completos de los padres/tutores:
   - Nombre completo, DNI, estado civil, domicilio, nacionalidad
3. DATOS DEL MENOR:
   - Nombre completo, DNI, fecha de nacimiento
   - Vínculo con los autorizantes
4. AUTORIZACIÓN PROPIAMENTE DICHA:
   - Destino del viaje (país/es)
   - Fechas o período de vigencia
   - Datos del acompañante (si corresponde)
   - Medio de transporte (si se especifica)
5. DECLARACIONES: Los padres expresan su libre y espontánea voluntad
6. REVOCABILIDAD: Cualquier progenitor puede revocar en cualquier momento
7. CIERRE: Lectura, conformidad, firmas y certificación

VII. CONTROL MIGRATORIO
================================
- Presentar documentación ORIGINAL en el puesto de control
- Las constancias de "DNI en trámite" NO son válidas para viajar
- El menor debe presentar su propio DNI vigente
"""


REGLAMENTO_CECBA_CERTIFICACIONES = """
REGLAMENTO DE CERTIFICACIONES - COLEGIO DE ESCRIBANOS DE LA CIUDAD DE BUENOS AIRES (CECBA)

1. Disposiciones Generales:
El escribano de CABA debe utilizar "Fojas de Actuación Notarial para Certificaciones" (Serie F o G, o las vigentes según disponga el Colegio) para expedir certificados extraprotocolares (firmas, fotocopias, etc.). Las fojas llevan numeración correlativa y medidas de seguridad.

2. Identificación de Comparecientes:
- La identidad debe justificarse inexcusablemente con la exhibición del Documento Nacional de Identidad (DNI) vigente, en su ÚLTIMO EJEMPLAR emitido por el RENAPER.
- No se admite como único comprobante la constancia de "DNI en trámite".
- Verificación biométrica provista por el RENAPER es obligatoria para las certificaciones de firma.

3. Certificación de Firmas:
- El escribano asienta el requerimiento en el Libro de Requerimientos.
- Se hace constar: Nombre completo, DNI, Nacionalidad, Fecha de Nacimiento, y Domicilio.
- Firma física en presencia del escribano. Impresión dígito pulgar derecho es mandatoria si el requirente no sabe/no puede firmar, requiriendo 2 testigos.
- El texto del certificado de firma debe indicar expresamente el tipo de documento anexado (Ej. "Formulario 08", "Contrato de Locación"). 

4. Certificación de Reproducciones (Fotocopias):
- El escribano no califica el contenido del documento copiado.
- La expresión obligatoria debe ser: "Concuerda con su documento original que tuve a la vista". No se dice "copia fiel" sino "reproducción fiel".

5. Formato del Documento:
El texto resultante de la certificación debe imprimirse íntegramente en el frente y/o dorso de la foja transcribiendo lugar, fecha, firma y sello del escribano. Si el documento sobre el que se certifica tiene espacio libre, podrá usarse mediante un sello de actuación o foja engrapada (con sello caballete).
"""

NORMATIVA_ASENTIMIENTO_CONYUGAL = """
ASENTIMIENTO CONYUGAL (ART. 470 CCyCN) - PROCEDIMIENTO CABA
==========================================================
En la Ciudad Autónoma de Buenos Aires, el asentimiento para disponer de bienes gananciales o del inmueble que es sede de la vivienda familiar sigue reglas estrictas:

1. Bienes Gananciales: Es necesario el asentimiento del otro cónyuge para enajenar o gravar bienes registrables, acciones nominativas, participaciones societarias o establecimientos comerciales.
2. Vivienda Familiar: Aunque el bien sea propio de uno de los cónyuges, si es sede del hogar conyugal y existen hijos menores o con discapacidad, se requiere el asentimiento para disponer de él.
3. El asentimiento DEBE ser específico: Debe indicar el inmueble o bien objeto del acto y, preferentemente, las condiciones de la operación (precio, comprador).
4. Poder para Asentir: No se admite un "poder general" para prestar asentimiento en el futuro sobre bienes indeterminados. Debe ser un poder especial para el bien determinado.
"""

NORMATIVA_SOCIEDADES_CABA = """
REPRESENTACIÓN DE PERSONAS JURÍDICAS EN CABA (IGJ)
==================================================
Para escrituras donde intervienen sociedades (S.A., S.R.L., SAS) en CABA, el escribano debe calificar:

1. Existencia de la Sociedad: Estatuto social original y sus reformas, inscriptos ante la Inspección General de Justicia (IGJ).
2. Representación Legal: Acta de Directorio (SA) o de Gerencia (SRL) donde conste la designación de autoridades vigente e inscripta.
3. Facultades para el Acto: Acta de asamblea o directorio donde se resuelva específicamente el acto de disposición (venta, hipoteca) si excede la administración ordinaria.
4. Vigencia de Autoridades: Si la inscripción de autoridades ante la IGJ (Art. 60 Ley 19.550) está vencida, el escribano debe dejar constancia de la documentación que acredita la prórroga o nueva designación.
"""

# ============================================================
# Exportar como lista de documentos para el RAG
# ============================================================

DOCUMENTOS_RAG = [
    {
        "titulo": "Código Civil y Comercial - Escrituras Públicas y Actas (Arts. 299-312)",
        "contenido": CAPITULO_ESCRITURAS_PUBLICAS,
        "fuente": "Código Civil y Comercial de la Nación Argentina",
        "tipo": "legislacion",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Código Civil y Comercial - Instrumentos Privados (Arts. 313-318)",
        "contenido": CAPITULO_INSTRUMENTOS_PRIVADOS,
        "fuente": "Código Civil y Comercial de la Nación Argentina",
        "tipo": "legislacion",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Código Civil y Comercial - Representación y Poderes (Arts. 358-377)",
        "contenido": CAPITULO_REPRESENTACION,
        "fuente": "Código Civil y Comercial de la Nación Argentina",
        "tipo": "legislacion",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Normas para Certificaciones Notariales (Fotocopia, Firma, Contenido, Fecha Cierta)",
        "contenido": NORMATIVAS_CERTIFICACIONES,
        "fuente": "Compilación de normativa notarial argentina",
        "tipo": "procedimiento",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Normas para Poderes y Autorización de Viaje de Menores",
        "contenido": NORMATIVAS_PODERES,
        "fuente": "CCyCN + Ley 26.061 + Disposiciones DNM",
        "tipo": "procedimiento",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Ley 404 CABA - Ley Orgánica Notarial (con Arts. 93-102 Documentos Extraprotocolares)",
        "contenido": LEY_404_CABA_RESUMEN,
        "fuente": "Ley 404 CABA - Texto Consolidado",
        "tipo": "legislacion",
        "jurisdiccion": "caba",
    },
    {
        "titulo": "Autorización de Viaje de Menores - Normativa Detallada",
        "contenido": NORMATIVA_VIAJE_MENORES_DETALLADA,
        "fuente": "Ley 26.061 + DNM + CCyCN",
        "tipo": "procedimiento",
        "jurisdiccion": "nacional",
    },
    {
        "titulo": "Reglamento de Certificaciones - CECBA",
        "contenido": REGLAMENTO_CECBA_CERTIFICACIONES,
        "fuente": "Colegio de Escribanos de CABA",
        "tipo": "procedimiento",
        "jurisdiccion": "caba",
    },
    {
        "titulo": "Asentimiento Conyugal y Vivienda Familiar - CABA",
        "contenido": NORMATIVA_ASENTIMIENTO_CONYUGAL,
        "fuente": "Art. 470 CCyCN + Doctrina CECBA",
        "tipo": "procedimiento",
        "jurisdiccion": "caba",
    },
    {
        "titulo": "Representación de Personas Jurídicas - CABA (IGJ)",
        "contenido": NORMATIVA_SOCIEDADES_CABA,
        "fuente": "Ley 19.550 + Reglamentación IGJ",
        "tipo": "procedimiento",
        "jurisdiccion": "caba",
    },
]


