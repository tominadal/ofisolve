import re
from loguru import logger

class ContextCompressor:
    """
    Compresor heurístico de contexto para RAG.
    Elimina palabras vacías (stopwords), espacios múltiples y 
    puntuación innecesaria para maximizar la densidad del prompt
    y reducir el riesgo de OOM en Ollama, sin usar memoria VRAM.
    """
    
    # Fallback stopwords en caso de que spacy no tenga el modelo es_core_news_sm cargado.
    FALLBACK_STOPWORDS = {
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "de", "del", "a", "al", "en", "por", "para", "con", "sin", "sobre", "entre",
        "y", "e", "ni", "o", "u", "pero", "aunque", "mas", "sino",
        "que", "cual", "cuales", "quien", "quienes",
        "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella", "aquellos", "aquellas",
        "mi", "tu", "su", "mis", "tus", "sus", "nuestro", "nuestra", "nuestros", "nuestras",
        "me", "te", "se", "nos", "os",
        "lo", "le", "les",
        "es", "son", "fue", "fueron", "ser", "siendo", "ha", "han", "he", "hemos",
        "ya", "muy", "mas", "tambien", "como", "asi",
    }
    
    def __init__(self):
        self._nlp = None
        self._stopwords = self.FALLBACK_STOPWORDS
        
        try:
            import spacy
            # Intentar cargar el modelo ligero en español
            self._nlp = spacy.load("es_core_news_sm")
            self._stopwords = self._nlp.Defaults.stop_words
            logger.info("ContextCompressor: Modelo Spacy cargado correctamente.")
        except Exception as e:
            logger.warning(f"ContextCompressor: Modelo Spacy no disponible, usando fallback. Error: {e}")

    def compress(self, text: str) -> str:
        """
        Comprime el texto eliminando stopwords y espacios extra,
        preservando saltos de línea clave (para mantener estructura).
        """
        if not text or not text.strip():
            return ""
            
        original_length = len(text)
        
        # 1. Limpieza inicial: eliminar saltos de línea repetidos y tabulaciones
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.replace('\t', ' ')
        
        # 2. Dividir por líneas para preservar un poco la estructura
        lines = text.split('\n')
        compressed_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                compressed_lines.append("")
                continue
                
            # Extraer palabras conservando puntuación básica
            # (Usamos split simple pero podríamos usar regex más complejo)
            words = line.split()
            kept_words = []
            
            for word in words:
                # Normalizar palabra para checkear stopword
                clean_word = re.sub(r'[\.,;:!?()\[\]"\'`]', '', word).lower()
                
                # Reglas de retención:
                # - No es stopword
                # - O es número
                # - O está en mayúsculas (siglas, acrónimos, nombres)
                # - O no es solo letras (códigos, fechas)
                if (clean_word not in self._stopwords) or \
                   (word.isupper()) or \
                   (not clean_word.isalpha()):
                    kept_words.append(word)
                    
            compressed_lines.append(" ".join(kept_words))
            
        compressed_text = "\n".join(compressed_lines)
        
        # Limpieza final de espacios extra generados por eliminación
        compressed_text = re.sub(r' +', ' ', compressed_text)
        
        compressed_length = len(compressed_text)
        ratio = (1 - (compressed_length / original_length)) * 100 if original_length > 0 else 0
        
        if ratio > 10:
            logger.info(f"ContextCompressor: Texto comprimido un {ratio:.1f}% ({original_length} -> {compressed_length} chars)")
            
        return compressed_text.strip()
