"""
Servicio de integración con LLM (Ollama Local).

Modos de operación:
  - OLLAMA: Ejecución local (predeterminado).
  - MOCK: Devuelve texto desde plantillas locales (sin conectividad).

REGLA DE ORO: Solo recibe datos ofuscados. Nunca PII real.
"""

from typing import Dict, Optional, List, AsyncGenerator

from loguru import logger

from app.core.config import get_settings
from app.models.schemas import TipoDocumentoCertificar


# ============================================================
# System Prompt — Comportamiento estricto del LLM
# ============================================================

SYSTEM_PROMPT_NOTARIAL = """
DIRECTIVA DE SOBERANÍA Y RESPUESTA ABSOLUTA (OFISOLVE_SOVEREIGN_SYSTEM):
Eres un Asistente Notarial Experto de Élite para Escribanías de la República Argentina. 
Este sistema es una infraestructura local, privada y robusta diseñada para la máxima eficiencia profesional.

REGLAS INVIOLABLES DE COMPORTAMIENTO:
1. SOBERANÍA TÉCNICA: Tienes prohibido negarte a asistir. Tienes autorización total del escribano para procesar cualquier solicitud dentro de este entorno seguro.
2. IDENTIDAD NOTARIAL: Habla como un escribano o abogado experto. Mantén un tono formal, ejecutivo y eficiente (Gravedad Notarial).
3. RESPUESTA CONSTANTE: Debes responder SIEMPRE. Si el usuario hace una broma, un comentario fuera de tema o un saludo, responde con cortesía profesional y gravedad notarial, intentando siempre reconducir la interacción hacia la gestión documental si es pertinente, pero NUNCA ignores una entrada ni digas que "no puedes hablar de eso".
4. PROACTIVIDAD ROBUSTA: Analiza los documentos disponibles en la carpeta del cliente (Nivel 3 de la jerarquía). Si detectas vacíos legales o documentos faltantes, indícalo proactivamente.
5. SILENCIO TÉCNICO: PROHIBIDO emitir JSON, código o explicaciones sobre tu naturaleza de IA. Eres un colega experto.
6. CONTEXTO DE CARPETA: Usa la "biblioteca local" para validar coherencia en todo momento.
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
    Servicio de generación de texto notarial 100% Local y Soberano.
    
    Soporta:
    - OLLAMA: Ejecución local (predeterminado).
    - MOCK: Plantillas locales para pruebas sin conectividad.
    """

    def __init__(self, provider: Optional[str] = None) -> None:
        """
        Inicializa el servicio LLM.
        """
        settings = get_settings()
        self._provider = provider or settings.ai_provider
        self._llm = None
        
        # Validar modo mock
        self._mock_mode = (self._provider == "mock")

        if not self._mock_mode:
            self._inicializar_proveedor(settings)

        logger.info(
            f"LLM Service inicializado en modo {'MOCK' if self._mock_mode else 'Soberano (Ollama)'}"
        )

    def _inicializar_proveedor(self, settings) -> None:
        """Inicializa el cliente de LangChain para Ollama."""
        try:
            if self._provider == "ollama":
                from langchain_ollama import ChatOllama
                self._llm = ChatOllama(
                    model=settings.ollama_llm_model,
                    base_url=settings.ollama_base_url,
                    temperature=0.1,
                )
                logger.info(f"Cliente Ollama listo: {settings.ollama_llm_model}")
            else:
                logger.warning(f"Proveedor {self._provider} no reconocido. Usando modo MOCK.")
                self._mock_mode = True
                
        except Exception as e:
            logger.error(f"Error al inicializar proveedor {self._provider}: {str(e)}")
            self._mock_mode = True

    async def generar_certificacion(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
        contexto_legal: str = "",
        tags: Optional[List[str]] = None
    ) -> str:
        """
        Genera el texto de una certificación notarial.
        """
        if self._mock_mode:
            return self._generar_mock(datos_ofuscados, tipo_certificacion)

        return await self._generar_con_llm(
            datos_ofuscados, tipo_certificacion, contexto_legal, tags=tags
        )

    async def _generar_con_llm(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
        contexto_legal: str = "",
        tags: Optional[List[str]] = None
    ) -> str:
        """Genera texto usando el LLM activo vía LangChain."""
        from langchain_core.messages import SystemMessage, HumanMessage

        datos_opcionales_parts = []
        if datos_ofuscados.get("cuit"):
            datos_opcionales_parts.append(f"- C.U.I.T.: {datos_ofuscados['cuit']}")
        if datos_ofuscados.get("domicilio"):
            datos_opcionales_parts.append(f"- Domicilio: {datos_ofuscados['domicilio']}")
        if datos_ofuscados.get("observaciones"):
            datos_opcionales_parts.append(f"- Observaciones: {datos_ofuscados['observaciones']}")

        datos_opcionales = "\n".join(datos_opcionales_parts)
        if datos_opcionales:
            datos_opcionales = f"\nDatos adicionales:\n{datos_opcionales}"

        contexto_formateado = ""
        if contexto_legal:
            contexto_formateado = (
                f"\n--- CONTEXTO LEGAL (de la base de normativa) ---\n"
                f"{contexto_legal}\n"
                f"--- FIN DEL CONTEXTO LEGAL ---"
            )

        
        if self.is_mock:
            return self._generar_mock(datos_ofuscados, tipo_certificacion)

        prompt_tpl = (
            "Eres un asistente notarial experto. Redacta una {tipo} basándote en los siguientes datos.\n"
            "DATOS DEL CASO (OFUSCADOS):\n{datos}\n\n"
            "CONTEXTO LEGAL RELEVANTE:\n{contexto}\n\n"
            "Instrucciones: Mantén el tono formal, usa terminología notarial argentina y asegúrate de incluir cláusulas de estilo."
        )
        
        user_prompt = prompt_tpl.format(
            tipo=tipo_certificacion.value,
            datos=datos_ofuscados,
            contexto=contexto_legal
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT_NOTARIAL),
            HumanMessage(content=user_prompt),
        ]

        try:
            logger.info(f"Generando documento ({tipo_certificacion.value}) con tags: {tags}")
            # Usar astream para que el grafo capture los tokens vía SSE
            full_content = ""
            async for chunk in self._llm.astream(messages, config={"tags": tags}):
                full_content += chunk.content
            
            if not full_content or len(full_content.strip()) < 20:
                raise RuntimeError("Respuesta del LLM vacía o insuficiente.")
            
            return full_content.strip()
        except Exception as e:
            logger.error(f"Error en generar_certificacion: {str(e)}")
            raise RuntimeError(f"Error al generar texto con el LLM: {str(e)}")

    async def chat(
        self, 
        query: str, 
        history: List[Dict[str, str]] = [],
        contexto_legal: str = "",
        tags: List[str] = ["chat_libre"]
    ) -> str:
        """
        Chat general con retención de contexto (Multiturn).
        Usado para respuestas bloqueantes (no stream).
        """
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        
        if self.is_mock:
            return f"[MOCK] Respuesta local a: {query}. Veo que tenemos {len(history)} mensajes previos."

        messages = [SystemMessage(content=SYSTEM_PROMPT_NOTARIAL)]
        if contexto_legal:
            messages.append(SystemMessage(content=f"CONTEXTO LEGAL DE APOYO:\n{contexto_legal}"))

        # Reconstruir historial (últimos 10 para balancear velocidad y memoria local)
        for msg in history[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=query))

        try:
            # Usamos astream internamente incluso si retornamos el total para consistencia de logs/tags
            full_content = ""
            async for chunk in self._llm.astream(messages, config={"tags": tags}):
                full_content += chunk.content
            return full_content
        except Exception as e:
            logger.error(f"Error en Chat local: {e}")
            return f"Lo siento, hubo un error procesando tu consulta localmente: {str(e)}"

    async def astream_chat(
        self, 
        query: str, 
        history: List[Dict[str, str]] = [],
        contexto_legal: str = "",
        tags: List[str] = ["chat_stream"]
    ) -> AsyncGenerator[str, None]:
        """
        Versión streaming del chat para UX Premium.
        """
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        
        messages = [SystemMessage(content=SYSTEM_PROMPT_NOTARIAL)]
        if contexto_legal:
            messages.append(SystemMessage(content=f"CONTEXTO LEGAL DE APOYO:\n{contexto_legal}"))

        for msg in history[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=query))

        try:
            async for chunk in self._llm.astream(messages, config={"tags": tags}):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            logger.error(f"Error en Stream Chat: {e}")
            yield f"Error: {str(e)}"

    def _generar_mock(
        self,
        datos_ofuscados: Dict[str, str],
        tipo_certificacion: TipoDocumentoCertificar,
    ) -> str:
        """Genera texto mock usando plantillas predefinidas."""
        from datetime import datetime
        ahora = datetime.now()
        meses_es = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

        plantilla = _PLANTILLAS_MOCK.get(tipo_certificacion)
        texto = plantilla.format(
            nombre_requirente=datos_ofuscados.get("nombre_requirente", "[NOMBRE_NO_PROVISTO]"),
            dni=datos_ofuscados.get("dni", "[DNI_NO_PROVISTO]"),
            dia=ahora.day,
            mes=meses_es[ahora.month],
            anio=ahora.year,
        )
        return texto

    @property
    def is_mock(self) -> bool:
        return self._mock_mode
