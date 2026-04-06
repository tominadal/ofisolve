"""
Motor de Generación Documental — Servicio de creación de archivos .docx.

Utiliza la librería `docxtpl` para inyectar variables en plantillas Word.
Las plantillas usan la sintaxis Jinja2: {{ variable }}.

FORMATO DE PLANTILLA .docx:
  La plantilla Word debe contener marcadores Jinja2, por ejemplo:
  
  ┌──────────────────────────────────────────────────────┐
  │  CERTIFICACIÓN DE {{ tipo_certificacion }}           │
  │                                                      │
  │  En la Ciudad de Buenos Aires, a los {{ dia }} días  │
  │  del mes de {{ mes }} de {{ anio }}, ante mí,        │
  │  {{ nombre_escribano }}, Escribano/a Público/a,      │
  │  Titular del Registro Notarial N° {{ nro_registro }},│
  │  COMPARECE: {{ nombre_requirente }}, D.N.I. N°       │
  │  {{ dni }}, mayor de edad.                           │
  │                                                      │
  │  {{ cuerpo_certificacion }}                          │
  │                                                      │
  │  DOY FE.-                                            │
  │                                                      │
  │  {{ nombre_escribano }}                              │
  │  Escribano/a Público/a Nacional                      │
  └──────────────────────────────────────────────────────┘
  
  Las variables entre {{ }} se reemplazan dinámicamente al generar el .docx.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

from docxtpl import DocxTemplate
from loguru import logger


# Directorio base para plantillas y documentos generados
_BASE_DIR = Path(__file__).resolve().parent.parent
_TEMPLATES_DIR = _BASE_DIR / "templates"
_OUTPUT_DIR = _BASE_DIR.parent / "output"


class DocumentService:
    """
    Servicio de generación de documentos Word (.docx).
    
    Inyecta variables en plantillas Word usando docxtpl (motor Jinja2).
    Cada documento generado se almacena con un UUID único para trazabilidad.
    
    Uso:
        service = DocumentService()
        ruta = service.generar_docx(
            datos_finales={"texto_certificacion": "...", "nombre_escribano": "..."},
            nombre_plantilla="certificacion_fotocopia.docx",
        )
    """

    def __init__(
        self,
        directorio_plantillas: Optional[Path] = None,
        directorio_salida: Optional[Path] = None,
    ) -> None:
        """
        Inicializa el servicio de documentos.
        
        Args:
            directorio_plantillas: Ruta donde se almacenan las plantillas .docx.
                                   Por defecto: backend/app/templates/
            directorio_salida: Ruta donde se guardan los documentos generados.
                              Por defecto: backend/output/
        """
        self._templates_dir = directorio_plantillas or _TEMPLATES_DIR
        self._output_dir = directorio_salida or _OUTPUT_DIR

        # Crear directorios si no existen
        self._templates_dir.mkdir(parents=True, exist_ok=True)
        self._output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            "DocumentService inicializado",
            plantillas=str(self._templates_dir),
            salida=str(self._output_dir),
        )

    def _obtener_contexto_temporal(self) -> Dict[str, str]:
        """
        Genera variables de fecha/hora para inyectar en la plantilla.
        
        Returns:
            Diccionario con dia, mes (texto), anio, fecha_completa, hora.
        """
        ahora = datetime.now()
        meses_es = [
            "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]
        return {
            "dia": str(ahora.day),
            "mes": meses_es[ahora.month],
            "anio": str(ahora.year),
            "fecha_completa": ahora.strftime("%d/%m/%Y"),
            "hora": ahora.strftime("%H:%M"),
        }

    def generar_docx(
        self,
        datos_finales: Dict[str, Any],
        nombre_plantilla: str,
        nombre_archivo_salida: Optional[str] = None,
    ) -> Path:
        """
        Genera un archivo .docx inyectando datos en una plantilla Word.
        
        Args:
            datos_finales: Diccionario con todas las variables a inyectar.
                          Ej: {"texto_certificacion": "...", "nombre_escribano": "..."}
            nombre_plantilla: Nombre del archivo .docx plantilla.
                            Ej: "certificacion_fotocopia.docx"
            nombre_archivo_salida: Nombre personalizado para el archivo generado.
                                  Si no se provee, se genera con UUID.
                                  
        Returns:
            Path absoluto del archivo .docx generado.
            
        Raises:
            FileNotFoundError: Si la plantilla no existe en el directorio.
            ValueError: Si los datos finales están vacíos.
            RuntimeError: Si falla la generación del documento.
        """
        audit_logger = logger.bind(audit=True)

        # Validar datos de entrada
        if not datos_finales:
            raise ValueError("Los datos finales no pueden estar vacíos")

        # Resolver ruta de la plantilla
        ruta_plantilla = self._templates_dir / nombre_plantilla
        if not ruta_plantilla.exists():
            audit_logger.error(
                "Plantilla no encontrada",
                plantilla=nombre_plantilla,
                directorio=str(self._templates_dir),
            )
            raise FileNotFoundError(
                f"Plantilla '{nombre_plantilla}' no encontrada en "
                f"'{self._templates_dir}'. Verifique que el archivo exista."
            )

        # Generar nombre de archivo de salida
        if not nombre_archivo_salida:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            uid = str(uuid4())[:8]
            nombre_archivo_salida = f"certificacion_{timestamp}_{uid}.docx"

        ruta_salida = self._output_dir / nombre_archivo_salida

        try:
            # Cargar plantilla
            doc = DocxTemplate(str(ruta_plantilla))

            # Agregar contexto temporal (fecha, hora) al diccionario de datos
            contexto_completo = {
                **self._obtener_contexto_temporal(),
                **datos_finales,
            }

            # Renderizar con los datos
            doc.render(contexto_completo)

            # Guardar documento generado
            doc.save(str(ruta_salida))

            audit_logger.info(
                "Documento .docx generado exitosamente",
                plantilla=nombre_plantilla,
                salida=str(ruta_salida),
                variables_inyectadas=list(contexto_completo.keys()),
            )

            return ruta_salida

        except Exception as e:
            audit_logger.error(
                "Error al generar documento .docx",
                error=str(e),
                error_type=type(e).__name__,
                plantilla=nombre_plantilla,
            )
            raise RuntimeError(
                f"Error al generar el documento: {str(e)}"
            ) from e

    def generar_docx_desde_texto(
        self,
        texto_certificacion: str,
        metadatos: Dict[str, str],
        nombre_plantilla: str = "certificacion_generica.docx",
        nombre_archivo_salida: Optional[str] = None,
    ) -> Path:
        """
        Método de conveniencia: genera un .docx combinando el texto del LLM
        con los metadatos del escribano.
        
        Args:
            texto_certificacion: Texto generado por el LLM (ya desanonimizado).
            metadatos: Datos del escribano y registro (nombre_escribano, nro_registro).
            nombre_plantilla: Plantilla a utilizar.
            nombre_archivo_salida: Nombre personalizado del archivo.
            
        Returns:
            Path absoluto del archivo .docx generado.
        """
        datos_finales = {
            "texto_certificacion": texto_certificacion,
            **metadatos,
        }
        return self.generar_docx(
            datos_finales=datos_finales,
            nombre_plantilla=nombre_plantilla,
            nombre_archivo_salida=nombre_archivo_salida,
        )

    def listar_plantillas(self) -> list[str]:
        """
        Lista todas las plantillas .docx disponibles.
        
        Returns:
            Lista de nombres de archivo de plantillas disponibles.
        """
        return [
            f.name
            for f in self._templates_dir.glob("*.docx")
            if f.is_file()
        ]
