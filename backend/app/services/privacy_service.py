"""
Motor de Privacidad - Servicio de Anonimización/Desanonimización.

Implementa el "Proxy de Privacidad" usando Microsoft Presidio + spaCy.
REGLA DE ORO: Todo dato PII se enmascara ANTES de salir del servidor local.

Flujo:
  1. anonymize_payload()  → Detecta PII, reemplaza con tokens, retorna mapa.
  2. [LLM procesa texto ofuscado en la nube]
  3. deanonymize_text()    → Restaura datos reales usando el mapa inverso.
"""

import re
from typing import Any, Dict, List, Tuple

from loguru import logger
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig


# ============================================================
# Reconocedores Personalizados para Argentina
# ============================================================

def _crear_reconocedor_dni() -> PatternRecognizer:
    """
    Reconocedor de DNI argentino.
    Formatos soportados: 35123456, 35.123.456
    """
    patrones = [
        Pattern(
            name="dni_sin_puntos",
            regex=r"\b\d{7,8}\b",
            score=0.6,
        ),
        Pattern(
            name="dni_con_puntos",
            regex=r"\b\d{1,2}\.\d{3}\.\d{3}\b",
            score=0.85,
        ),
    ]
    return PatternRecognizer(
        supported_entity="DNI_AR",
        name="Reconocedor de DNI Argentino",
        patterns=patrones,
        supported_language="es",
        context=["dni", "documento", "identidad", "D.N.I.", "DNI"],
    )


def _crear_reconocedor_cuit() -> PatternRecognizer:
    """
    Reconocedor de CUIT/CUIL argentino.
    Formato: XX-XXXXXXXX-X (con o sin guiones).
    """
    patrones = [
        Pattern(
            name="cuit_con_guiones",
            regex=r"\b(20|23|24|27|30|33|34)-\d{8}-\d\b",
            score=0.95,
        ),
        Pattern(
            name="cuit_sin_guiones",
            regex=r"\b(20|23|24|27|30|33|34)\d{8}\d\b",
            score=0.7,
        ),
    ]
    return PatternRecognizer(
        supported_entity="CUIT_AR",
        name="Reconocedor de CUIT/CUIL Argentino",
        patterns=patrones,
        supported_language="es",
        context=["cuit", "cuil", "C.U.I.T.", "C.U.I.L.", "clave única"],
    )


def _crear_reconocedor_domicilio() -> PatternRecognizer:
    """
    Reconocedor básico de domicilios argentinos.
    Detecta patrones como "Av. Corrientes 1234" o "Calle San Martín 567, Piso 3".
    """
    patrones = [
        Pattern(
            name="domicilio_con_calle",
            regex=r"\b(Av\.|Avda\.|Calle|Bv\.|Blvd\.|Pasaje|Pje\.)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+\d{1,5}",
            score=0.6,
        ),
    ]
    return PatternRecognizer(
        supported_entity="DOMICILIO_AR",
        name="Reconocedor de Domicilios Argentinos",
        patterns=patrones,
        supported_language="es",
        context=["domicilio", "dirección", "domiciliado", "con domicilio en"],
    )


# ============================================================
# Servicio Principal de Privacidad
# ============================================================

class PrivacyService:
    """
    Servicio de anonimización y desanonimización de datos PII.
    
    Utiliza Presidio Analyzer para detección y Presidio Anonymizer 
    para el reemplazo con tokens deterministas.
    
    Uso:
        service = PrivacyService()
        datos_ofuscados, mapa = service.anonymize_payload(datos_originales)
        texto_restaurado = service.deanonymize_text(texto_llm, mapa)
    """

    def __init__(self) -> None:
        """Inicializa los motores de Presidio con reconocedores argentinos."""
        logger.info("Inicializando Motor de Privacidad (Presidio + spaCy es)")

        # Motor de análisis con modelo español de spaCy
        # Configurar explícitamente el NLP engine para español
        nlp_configuration = {
            "nlp_engine_name": "spacy",
            "models": [
                {"lang_code": "es", "model_name": "es_core_news_sm"},
            ],
        }
        nlp_engine_provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
        nlp_engine = nlp_engine_provider.create_engine()

        self._analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            supported_languages=["es"],
        )

        # Registrar reconocedores personalizados para Argentina
        self._analyzer.registry.add_recognizer(_crear_reconocedor_dni())
        self._analyzer.registry.add_recognizer(_crear_reconocedor_cuit())
        self._analyzer.registry.add_recognizer(_crear_reconocedor_domicilio())

        # Motor de anonimización
        self._anonymizer = AnonymizerEngine()

        # Contadores por tipo de entidad para generar tokens únicos
        self._contadores: Dict[str, int] = {}

        # Entidades que el sistema reconoce y anonimiza
        self._entidades_soportadas: List[str] = [
            "PERSON",        # Nombres (vía spaCy NER)
            "DNI_AR",        # DNI argentino (custom)
            "CUIT_AR",       # CUIT/CUIL argentino (custom)
            "DOMICILIO_AR",  # Domicilios argentinos (custom)
            "PHONE_NUMBER",  # Teléfonos (built-in Presidio)
            "EMAIL_ADDRESS", # Emails (built-in Presidio)
        ]

        logger.info(
            "Motor de Privacidad inicializado correctamente",
            entidades=self._entidades_soportadas,
        )

    def _resetear_contadores(self) -> None:
        """Reinicia contadores de tokens al inicio de cada operación."""
        self._contadores = {}

    def _generar_token(self, tipo_entidad: str) -> str:
        """
        Genera un token determinista para un tipo de entidad.
        
        Ejemplo: PERSON → [NOMBRE_1], DNI_AR → [DNI_1], CUIT_AR → [CUIT_1]
        """
        # Mapeo de tipos de Presidio a nombres legibles en español
        mapeo_nombres: Dict[str, str] = {
            "PERSON": "NOMBRE",
            "DNI_AR": "DNI",
            "CUIT_AR": "CUIT",
            "DOMICILIO_AR": "DOMICILIO",
            "PHONE_NUMBER": "TELEFONO",
            "EMAIL_ADDRESS": "EMAIL",
        }

        nombre_token = mapeo_nombres.get(tipo_entidad, tipo_entidad)
        contador = self._contadores.get(nombre_token, 0) + 1
        self._contadores[nombre_token] = contador

        return f"[{nombre_token}_{contador}]"

    def anonymize_payload(
        self, json_data: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, str]]:
        """
        Anonimiza todos los valores string de un payload JSON.
        
        Recorre cada campo del diccionario, detecta entidades PII usando
        Presidio Analyzer, y reemplaza cada ocurrencia con un token único.
        
        Args:
            json_data: Diccionario con los datos del formulario del frontend.
            
        Returns:
            Tupla de:
            - json_anonimizado: Copia del diccionario con valores PII reemplazados.
            - mapa_inversion: Diccionario {token → valor_original} para restauración.
            
        Ejemplo:
            >>> datos = {"nombre": "Juan Pérez", "dni": "35123456"}
            >>> ofuscado, mapa = service.anonymize_payload(datos)
            >>> ofuscado
            {"nombre": "[NOMBRE_1]", "dni": "[DNI_1]"}
            >>> mapa
            {"[NOMBRE_1]": "Juan Pérez", "[DNI_1]": "35123456"}
        """
        self._resetear_contadores()
        mapa_inversion: Dict[str, str] = {}
        json_anonimizado: Dict[str, Any] = {}

        audit_logger = logger.bind(audit=True)
        audit_logger.info(
            "Iniciando anonimización de payload",
            campos_totales=len(json_data),
        )

        for campo, valor in json_data.items():
            if not isinstance(valor, str) or not valor.strip():
                # Solo procesamos strings no vacíos
                json_anonimizado[campo] = valor
                continue

            # Analizar el texto con Presidio
            resultados = self._analyzer.analyze(
                text=valor,
                entities=self._entidades_soportadas,
                language="es",
                score_threshold=0.5,
            )

            if not resultados:
                # Sin PII detectado, mantener valor original
                json_anonimizado[campo] = valor
                continue

            # Ordenar resultados por posición (de fin a inicio para no romper índices)
            resultados_ordenados = sorted(
                resultados, key=lambda r: r.start, reverse=True
            )

            texto_procesado = valor
            for resultado in resultados_ordenados:
                valor_original = valor[resultado.start:resultado.end]

                # Verificar si este valor ya fue tokenizado (evitar duplicados)
                token_existente = None
                for token, val_orig in mapa_inversion.items():
                    if val_orig == valor_original:
                        token_existente = token
                        break

                if token_existente:
                    token = token_existente
                else:
                    token = self._generar_token(resultado.entity_type)
                    mapa_inversion[token] = valor_original

                texto_procesado = (
                    texto_procesado[:resultado.start]
                    + token
                    + texto_procesado[resultado.end:]
                )

                audit_logger.debug(
                    "Entidad PII enmascarada",
                    campo=campo,
                    tipo=resultado.entity_type,
                    score=resultado.score,
                    token=token,
                    # NUNCA loggeamos el valor original
                )

            json_anonimizado[campo] = texto_procesado

        audit_logger.info(
            "Anonimización completada",
            campos_anonimizados=len(mapa_inversion),
            tipos_detectados=list(set(
                self._contadores.keys()
            )),
        )

        return json_anonimizado, mapa_inversion

    def deanonymize_text(
        self, texto_ofuscado: str, mapa_inversion: Dict[str, str]
    ) -> str:
        """
        Restaura los datos reales en un texto previamente anonimizado.
        
        Reemplaza cada token [TIPO_N] por su valor original usando el mapa
        de inversión generado durante la anonimización.
        
        Args:
            texto_ofuscado: Texto devuelto por el LLM con tokens de reemplazo.
            mapa_inversion: Diccionario {token → valor_original}.
            
        Returns:
            Texto con todos los datos reales restaurados.
            
        Raises:
            ValueError: Si quedan tokens sin resolver en el texto final.
            
        Ejemplo:
            >>> texto = "Yo, [NOMBRE_1], DNI [DNI_1], certifico..."
            >>> mapa = {"[NOMBRE_1]": "Juan Pérez", "[DNI_1]": "35123456"}
            >>> service.deanonymize_text(texto, mapa)
            "Yo, Juan Pérez, DNI 35123456, certifico..."
        """
        audit_logger = logger.bind(audit=True)
        audit_logger.info(
            "Iniciando desanonimización",
            tokens_a_restaurar=len(mapa_inversion),
        )

        texto_restaurado = texto_ofuscado

        # Ordenar tokens por longitud descendente para evitar reemplazos parciales
        # Ej: [NOMBRE_10] debe procesarse antes que [NOMBRE_1]
        tokens_ordenados = sorted(
            mapa_inversion.keys(), key=len, reverse=True
        )

        for token in tokens_ordenados:
            valor_real = mapa_inversion[token]
            conteo = texto_restaurado.count(token)

            if conteo > 0:
                texto_restaurado = texto_restaurado.replace(token, valor_real)
                audit_logger.debug(
                    "Token restaurado",
                    token=token,
                    ocurrencias=conteo,
                )

        # Verificación de integridad: no deben quedar tokens sin resolver
        tokens_restantes = re.findall(r"\[[A-Z_]+_\d+\]", texto_restaurado)
        if tokens_restantes:
            audit_logger.warning(
                "Tokens sin resolver detectados en el texto final",
                tokens=tokens_restantes,
            )
            raise ValueError(
                f"Desanonimización incompleta: tokens sin resolver: {tokens_restantes}"
            )

        audit_logger.info("Desanonimización completada exitosamente")
        return texto_restaurado

    def get_stats(self, mapa_inversion: Dict[str, str]) -> Dict[str, Any]:
        """
        Genera estadísticas del proceso de anonimización para la respuesta API.
        
        Args:
            mapa_inversion: Mapa de tokens generado por anonymize_payload.
            
        Returns:
            Diccionario con métricas de la operación.
        """
        tipos: List[str] = []
        for token in mapa_inversion.keys():
            # Extraer tipo del token: [NOMBRE_1] → NOMBRE
            match = re.match(r"\[([A-Z_]+)_\d+\]", token)
            if match:
                tipos.append(match.group(1))

        tipos_unicos = list(set(tipos))

        return {
            "campos_anonimizados": len(mapa_inversion),
            "tipos_detectados": tipos_unicos,
        }


# ============================================================
# Singleton lazy — evita instanciar Presidio+spaCy más de una vez
# ============================================================

_privacy_service_instance: PrivacyService | None = None


def get_privacy_service() -> PrivacyService:
    """Retorna el singleton de PrivacyService, inicializándolo la primera vez."""
    global _privacy_service_instance
    if _privacy_service_instance is None:
        _privacy_service_instance = PrivacyService()
    return _privacy_service_instance
