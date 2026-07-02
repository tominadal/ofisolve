import asyncio
import os
from app.core.database import AsyncSessionLocal
from app.models.db_models import DocumentoLibreria
from sqlalchemy import select

MOCKS = {
    'Minuta_Firma.docx': '''MINUTA DE FIRMA Y CERTIFICACIÓN

En la Ciudad Autónoma de Buenos Aires, a los 01 días del mes de julio de 2026.

COMPARECE: El señor Juan Pérez, D.N.I. Nº 12.345.678, argentino, mayor de edad, estado civil casado en primeras nupcias, domiciliado en Av. Santa Fe 1234, CABA.

OBJETO: El compareciente manifiesta que la firma puesta en el documento adjunto ("Contrato de Locación comercial") es auténtica y fue estampada en mi presencia, reconociendo el contenido del mismo.

DOY FE: Que conozco al compareciente por haber justificado su identidad conforme artículo 306, inciso A del Código Civil y Comercial de la Nación, exhibiendo su documento original.

Leída que fue la presente, el compareciente se ratifica de su contenido y firma por ante mí, de lo que DOY FE.-
''',
    'Titulo_Propiedad.pdf': '''TÍTULO DE PROPIEDAD - ESCRITURA NÚMERO CIENTO VEINTE (120)

En la Ciudad de Córdoba, Provincia de Córdoba, República Argentina, a 15 de marzo de 2018.

POR ANTE MÍ, Escribana Pública Titular del Registro 45...

COMPARECEN:
Por una parte, la parte VENDEDORA: María Gómez, D.N.I. 23.456.789.
Por la otra parte, la parte COMPRADORA: Carlos López, D.N.I. 34.567.890.

Y DICEN: Que la VENDEDORA VENDE, CEDE y TRANSFIERE a favor del COMPRADOR, el inmueble sito en la calle San Martín 500, inscripto en el Registro de la Propiedad Inmueble bajo la Matrícula 12345.

PRECIO: La venta se realiza por el precio total y convenido de DÓLARES ESTADOUNIDENSES CIEN MIL (USD 100.000).

DOY FE.-
''',
    'Acta_Directorio.txt': '''ACTA DE DIRECTORIO N° 45 - EMPRESA S.A.

En la Ciudad Autónoma de Buenos Aires, a los 10 días de abril de 2026, siendo las 10:00 horas, se reúnen en la sede social sita en calle Florida 456, los miembros del Directorio de "EMPRESA S.A.".

Se encuentra presente el Presidente, Sr. Roberto Martínez, y los directores titulares: Laura Fernández y Diego Silva.

El Presidente toma la palabra e informa que el motivo de la reunión es tratar el otorgamiento de un poder general judicial a favor del Dr. Leandro Gómez, abogado, para que represente a la sociedad en todos los litigios pendientes.

Tras una breve deliberación, se aprueba por unanimidad otorgar dicho poder. No habiendo más asuntos que tratar, se levanta la sesión a las 11:30 horas, firmando los presentes de conformidad.
''',
    'Partida_Nacimiento.pdf': '''REPÚBLICA ARGENTINA - REGISTRO DEL ESTADO CIVIL Y CAPACIDAD DE LAS PERSONAS

ACTA DE NACIMIENTO N° 1234 - AÑO 1990

En la Ciudad de Rosario, Provincia de Santa Fe, a los 5 días del mes de junio de 1990.

Se inscribe el nacimiento de: MARTÍN GOLDI.
Sexo: Masculino.
Nacido el 2 de junio de 1990 a las 14:30 horas en el Sanatorio Parque, Rosario.

Padre: Ricardo Goldi, argentino, D.N.I. 10.000.000.
Madre: Susana López, argentina, D.N.I. 11.000.000.

Observaciones: Sin observaciones.
Firma el Oficial Público.
''',
    'DNI_Goldi.pdf': '''REPÚBLICA ARGENTINA
DOCUMENTO NACIONAL DE IDENTIDAD

APELLIDO: GOLDI
NOMBRES: MARTÍN
SEXO: M
NACIONALIDAD: ARGENTINA
FECHA DE NACIMIENTO: 02/06/1990
FECHA DE EMISIÓN: 15/08/2022
TRÁMITE N°: 123456789

DOMICILIO: CALLE FALSA 123, ROSARIO, SANTA FE.
''',
    'Estatuto_Socio.pdf': '''ESTATUTO SOCIAL DE "INVERSIONES DEL SUR S.R.L."

TÍTULO I: DENOMINACIÓN, DOMICILIO, PLAZO Y OBJETO
ARTÍCULO 1°: Con la denominación "INVERSIONES DEL SUR S.R.L." se constituye una sociedad de responsabilidad limitada que se regirá por las disposiciones de la Ley General de Sociedades 19.550.
ARTÍCULO 2°: El domicilio legal de la sociedad se fija en la jurisdicción de la Ciudad Autónoma de Buenos Aires.
ARTÍCULO 3°: La sociedad tiene por objeto realizar por cuenta propia o de terceros, operaciones inmobiliarias, compraventa, locación, y administración de inmuebles.

TÍTULO II: CAPITAL Y CUOTAS SOCIALES
ARTÍCULO 4°: El capital social se fija en la suma de PESOS UN MILLÓN (.000.000), dividido en 10.000 cuotas de 100 pesos valor nominal cada una.
Socio A: Suscribe 5.000 cuotas.
Socio B: Suscribe 5.000 cuotas.

DOY FE de que es copia fiel del original inscripto en IGJ.
'''
}

async def generate_dummies():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(DocumentoLibreria))
        docs = result.scalars().all()
        for d in docs:
            print(f'Actualizando mock para {d.path}')
            os.makedirs(os.path.dirname(d.path), exist_ok=True)
            content = MOCKS.get(d.nombre, f'Documento: {d.nombre}\\n\\nEste es un archivo de prueba. Podés editarlo acá mismo.')
            with open(d.path, 'w', encoding='utf-8') as f:
                f.write(content)
        print('Mocks realistas generados exitosamente.')

asyncio.run(generate_dummies())
