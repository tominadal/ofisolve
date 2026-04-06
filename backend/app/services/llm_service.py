"""
Servicio de integración con LLM (Gemini 2.0 Flash vía LangChain).

Modos de operación:
  - MOCK: Devuelve texto desde plantillas locales (sin API key).
  - PRODUCCIÓN: Envía prompts a Gemini vía langchain-google-genai.

REGLA DE ORO: Solo recibe datos ofuscados. Nunca PII real.
"""

from typing import Dict, Optional

from loguru import logger

from app.core.config import get_settings
from app.models.schemas import TipoDocumentoCertificar


# ============================================================
# System Prompt — Comportamiento estricto del LLM
# ============================================================

SYSTEM_PROMPT_NOTARIAL = """Eres un asistente legal especializado en redacción notarial argentina. 
Tu función es redactar documentos de certificación para una Escribanía en la República Argentina.

## REGLAS ESTRICTAS (INNEGOCIABLES):

1. **TONO NOTARIAL**: Utiliza lenguaje formal, solemne y preciso propio de instrumentos notariales argentinos.
2. **CERO CREATIVIDAD JURÍDICA**: NO inventes hechos, datos, nombres, números de documento ni circunstancias que no estén explícitamente provistos.
3. **USA SOLO LOS DATOS PROVISTOS**: Los datos del requirente se presentan como tokens (ej: [NOMBRE_1], [DNI_1]). Úsalos EXACTAMENTE como aparecen, sin modificarlos.
4. **NO AGREGUES** datos de contacto, direcciones, números telefónicos ni información personal que no se te haya proporcionado.
5. **ESTRUCTURA**: Sigue estrictamente la estructura de un acta notarial argentina:
   - Encabezado con lugar y fecha
   - Identificación del compareciente
   - Objeto de la certificación
   - Cláusula de cierre "DOY FE.-"
6. **IDIOMA**: Redacta exclusivamente en español rioplatense formal.
7. **FORMATO**: Devuelve SOLO el texto de la certificación, sin comentarios, explicaciones ni markdown.
8. **NORMATIVA**: Basa tu redacción en el contexto legal que se te proporcione. No cites artículos que no estén en el contexto.

## NORMATIVA DE REFERENCIA:
- Ley Nacional del Notariado N° 12.990
- Código Civil y Comercial de la Nación (Art. 299 y ss.)
- Ley 404 CABA (Ley Orgánica Notarial)
- Reglamentaciones del Colegio de Escribanos
"""


# ============================================================
# Prompts por tipo de certificación
# ============================================================

_PROMPTS_CERTIFICACION: Dict[TipoDocumentoCertificar, str] = {
    TipoDocumentoCertificar.FOTOCOPIA: """Redacta una CERTIFICACIÓN DE FOTOCOPIA con los siguientes datos:

Datos del requirente:
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

El requirente solicita que se certifique que una fotocopia es copia fiel de su original, 
el cual fue exhibido ante el escribano. Genera el texto completo del acta notarial.""",

    TipoDocumentoCertificar.FIRMA: """Redacta una CERTIFICACIÓN DE FIRMA con los siguientes datos:

Datos del requirente:
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

El requirente estampa su firma en presencia del escribano al pie de un documento. 
El escribano certifica la autenticidad de dicha firma. Genera el texto completo del acta notarial.""",

    TipoDocumentoCertificar.CONTENIDO: """Redacta una CERTIFICACIÓN DE CONTENIDO con los siguientes datos:

Datos del requirente:
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

El requirente solicita que se certifique que el contenido de un documento coincide 
fielmente con su original exhibido. Genera el texto completo del acta notarial.""",

    TipoDocumentoCertificar.FECHA_CIERTA: """Redacta una CERTIFICACIÓN DE FECHA CIERTA con los siguientes datos:

Datos del requirente:
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

El requirente presenta un documento del cual es firmante y solicita que se le otorgue 
fecha cierta mediante intervención notarial. Genera el texto completo del acta notarial.""",

    TipoDocumentoCertificar.VIAJE_MENORES: """Redacta una AUTORIZACIÓN DE VIAJE PARA MENORES con los siguientes datos:

Datos del requirente (padre/madre/tutor):
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

Se requiere certificar la firma inserta en una autorización para viaje de menor de edad.
Acorde a la jurisdicción pertinente, redacta el acta notarial completa.""",

    TipoDocumentoCertificar.SUPERVIVENCIA: """Redacta un CERTIFICADO DE SUPERVIVENCIA con los siguientes datos:

Datos del requirente:
- Nombre completo: {nombre_requirente}
- D.N.I. N°: {dni}
{datos_opcionales}

{contexto_legal}

El escribano da fe de la existencia física del requirente mediante contacto directo.
Genera el texto completo del acta notarial."""
}


# ============================================================
# Plantillas Mock
# ============================================================

_PLANTILLAS_MOCK: Dict[TipoDocumentoCertificar, str] = {
    TipoDocumentoCertificar.FOTOCOPIA: """CERTIFICACIÓN DE FOTOCOPIA

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad, hábil y de mi conocimiento, doy fe.

El/La compareciente me REQUIERE que certifique que la fotocopia que se agrega es COPIA FIEL de su original, el cual he tenido a la vista.

En consecuencia, CERTIFICO que la fotocopia adjunta es reproducción fiel y exacta de su original, el cual me fue exhibido a tal efecto.

DOY FE.-""",

    TipoDocumentoCertificar.FIRMA: """CERTIFICACIÓN DE FIRMA

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad, hábil y de mi conocimiento, doy fe.

El/La compareciente estampa su firma en mi presencia al pie del documento que se me exhibe, la cual CERTIFICO como auténtica.

DOY FE.-""",

    TipoDocumentoCertificar.CONTENIDO: """CERTIFICACIÓN DE CONTENIDO

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad, hábil y de mi conocimiento, doy fe.

CERTIFICO que el contenido del documento que se transcribe a continuación corresponde fielmente al original que me fue exhibido por el/la requirente.

DOY FE.-""",

    TipoDocumentoCertificar.FECHA_CIERTA: """CERTIFICACIÓN DE FECHA CIERTA

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad, hábil y de mi conocimiento, doy fe.

El/La compareciente me presenta un documento del cual resulta ser firmante, requiriéndome le otorgue FECHA CIERTA, lo que efectúo estampando mi sello y firma notarial en el citado instrumento.

CERTIFICO que el documento presentado tiene fecha cierta a partir del día de la fecha, conforme lo establecido por el Art. 317 del Código Civil y Comercial de la Nación.

DOY FE.-""",

    TipoDocumentoCertificar.VIAJE_MENORES: """AUTORIZACIÓN DE VIAJE PARA MENORES

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad, hábil y de mi conocimiento, doy fe.

El/La compareciente en su carácter de progenitor autoriza expresamente a su hijo/a menor de edad a viajar fuera del territorio nacional, en un todo conforme a lo dispuesto por la Dirección Nacional de Migraciones.

CERTIFICO que la firma que antecede es auténtica, habiendo sido estampada en mi presencia.

DOY FE.-""",

    TipoDocumentoCertificar.SUPERVIVENCIA: """CERTIFICADO DE SUPERVIVENCIA

En la Ciudad Autónoma de Buenos Aires, a los {dia} días del mes de {mes} de {anio}, ante mí, Escribano/a Público/a, Titular del Registro Notarial, COMPARECE PERSONALMENTE: {nombre_requirente}, D.N.I. N° {dni}, mayor de edad.

CERTIFICO por haber tenido a la vista al/la compareciente que se encuentra vivo/a a la fecha de este acto.

DOY FE.-""",
}


# ============================================================
# Servicio Principal
# ============================================================

class LLMService:
    """
    Servicio de generación de texto notarial vía LLM (Gemini).
    
    Opera en dos modos:
    - mock_mode=True: Usa plantillas locales (sin API key).
    - mock_mode=False: Llama a Gemini 2.0 Flash vía LangChain.
    """

    def __init__(self, mock_mode: Optional[bool] = None) -> None:
        """
        Inicializa el servicio LLM.
        
        Args:
            mock_mode: Forzar modo mock. Si None, autodetecta según la
                      presencia de GOOGLE_API_KEY en .env.
        """
        settings = get_settings()

        # Autodetectar modo según disponibilidad de API key
        if mock_mode is None:
            self._mock_mode = (
                not settings.google_api_key
                or settings.google_api_key.startswith("tu-api-key")
            )
        else:
            self._mock_mode = mock_mode

        self._model_name = settings.llm_model
        self._max_tokens = settings.llm_max_tokens
        self._llm = None

        if not self._mock_mode:
            self._inicializar_cliente(settings.google_api_key)

        logger.info(
            "LLM Service inicializado",
            modo="MOCK" if self._mock_mode else "PRODUCCIÓN (Gemini)",
            modelo=self._model_name if not self._mock_mode else "N/A",
        )

    def _inicializar_cliente(self, api_key: str) -> None:
        """Inicializa el cliente de LangChain para Gemini."""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            self._llm = ChatGoogleGenerativeAI(
                model=self._model_name,
                google_api_key=api_key,
                max_output_tokens=self._max_tokens,
                temperature=0.1,  # Casi determinista
                streaming=True,   # Habilitar streaming para SSE
            )
            logger.info(
                "Cliente LLM (Gemini) inicializado",
                modelo=self._model_name,
                temperature=0.1,
            )
        except ImportError as e:
            logger.error(
                "langchain-google-genai no instalado. Revirtiendo a modo mock.",
                error=str(e),
            )
            self._mock_mode = True
        except Exception as e:
            logger.error(
                "Error al inicializar cliente LLM. Revirtiendo a modo mock.",
                error=str(e),
            )
            self._mock_mode = True

    async def generar_certificacion(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
        contexto_legal: str = "",
    ) -> str:
        """
        Genera el texto de una certificación notarial.
        
        Args:
            datos_ofuscados: Diccionario con campos anonimizados.
            tipo_certificacion: Tipo de certificación a generar.
            contexto_legal: Contexto obtenido del RAG (normativa relevante).
            
        Returns:
            Texto de la certificación con tokens ofuscados preservados.
        """
        if self._mock_mode:
            return self._generar_mock(datos_ofuscados, tipo_certificacion)

        return await self._generar_con_llm(
            datos_ofuscados, tipo_certificacion, contexto_legal
        )

    async def _generar_con_llm(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
        contexto_legal: str = "",
    ) -> str:
        """Genera texto usando Gemini vía LangChain."""
        from langchain_core.messages import SystemMessage, HumanMessage

        # Construir datos opcionales
        datos_opcionales_parts = []
        if datos_ofuscados.get("cuit"):
            datos_opcionales_parts.append(f"- C.U.I.T.: {datos_ofuscados['cuit']}")
        if datos_ofuscados.get("domicilio"):
            datos_opcionales_parts.append(f"- Domicilio: {datos_ofuscados['domicilio']}")
        if datos_ofuscados.get("observaciones"):
            datos_opcionales_parts.append(
                f"- Observaciones: {datos_ofuscados['observaciones']}"
            )

        datos_opcionales = "\n".join(datos_opcionales_parts)
        if datos_opcionales:
            datos_opcionales = f"\nDatos adicionales:\n{datos_opcionales}"

        # Formatear contexto legal del RAG
        contexto_formateado = ""
        if contexto_legal:
            contexto_formateado = (
                f"\n--- CONTEXTO LEGAL (de la base de normativa) ---\n"
                f"{contexto_legal}\n"
                f"--- FIN DEL CONTEXTO LEGAL ---"
            )

        # Obtener prompt por tipo
        prompt_template = _PROMPTS_CERTIFICACION.get(tipo_certificacion)
        if not prompt_template:
            raise ValueError(f"Tipo de certificación no soportado: {tipo_certificacion}")

        user_prompt = prompt_template.format(
            nombre_requirente=datos_ofuscados.get("nombre_requirente", "[NOMBRE_NO_PROVISTO]"),
            dni=datos_ofuscados.get("dni", "[DNI_NO_PROVISTO]"),
            datos_opcionales=datos_opcionales,
            contexto_legal=contexto_formateado,
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT_NOTARIAL),
            HumanMessage(content=user_prompt),
        ]

        try:
            logger.info(
                "Enviando prompt a Gemini",
                tipo=tipo_certificacion.value,
                modelo=self._model_name,
                con_contexto_rag=bool(contexto_legal),
            )

            response = await self._llm.ainvoke(messages)
            texto_generado = response.content

            if not texto_generado or len(texto_generado.strip()) < 50:
                raise RuntimeError(
                    "El LLM devolvió una respuesta vacía o demasiado corta."
                )

            if "DOY FE" not in texto_generado.upper():
                logger.warning(
                    "La respuesta del LLM no contiene 'DOY FE'. Revisar."
                )

            logger.info(
                "Texto generado por Gemini exitosamente",
                longitud=len(texto_generado),
                tipo=tipo_certificacion.value,
            )

            return texto_generado.strip()

        except ConnectionError as e:
            logger.error("Error de conexión con Gemini", error=str(e))
            raise ConnectionError(
                "No se pudo conectar con la API de Gemini. "
                "Verifique su conexión y la GOOGLE_API_KEY."
            ) from e

        except Exception as e:
            logger.error(
                "Error al generar texto con Gemini",
                error=str(e),
                error_type=type(e).__name__,
            )
            raise RuntimeError(f"Error al generar texto con el LLM: {str(e)}") from e

    def _generar_mock(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
    ) -> str:
        """Genera texto mock usando plantillas predefinidas."""
        from datetime import datetime

        ahora = datetime.now()
        meses_es = [
            "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]

        plantilla = _PLANTILLAS_MOCK.get(tipo_certificacion)
        if not plantilla:
            raise ValueError(f"Tipo no soportado: {tipo_certificacion}")

        texto = plantilla.format(
            nombre_requirente=datos_ofuscados.get("nombre_requirente", "[NOMBRE_NO_PROVISTO]"),
            dni=datos_ofuscados.get("dni", "[DNI_NO_PROVISTO]"),
            dia=ahora.day,
            mes=meses_es[ahora.month],
            anio=ahora.year,
        )

        logger.info("Texto mock generado", tipo=tipo_certificacion.value, longitud=len(texto))
        return texto

    @property
    def is_mock(self) -> bool:
        """Indica si el servicio está en modo mock."""
        return self._mock_mode
