"""
Configuración centralizada del sistema OfiSolve.
Carga variables de entorno con validación de tipos vía Pydantic Settings.
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración global de la aplicación cargada desde .env"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra='ignore',
    )

    # --- Aplicación ---
    app_env: str = Field(default="development", description="Entorno de ejecución")
    app_debug: bool = Field(default=False, description="Modo debug")
    app_host: str = Field(default="0.0.0.0", description="Host del servidor")
    app_port: int = Field(default=8000, description="Puerto del servidor")

    # --- Base de Datos ---
    database_url: str = Field(
        default="sqlite+aiosqlite:///./ofisolve_dev.db",
        description="URL de conexión a la base de datos",
    )
    
    # URL de Vercel Postgres (inyectada automáticamente por Vercel)
    postgres_url: str = Field(default="", alias="POSTGRES_URL")
    
    @property
    def final_database_url(self) -> str:
        """Determina la URL final, priorizando Postgres en producción."""
        url = self.postgres_url or self.database_url
        
        # Vercel entrega postgres://, pero SQLAlchemy asyncpg requiere postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        return url

    @property
    def is_postgres(self) -> bool:
        """Indica si el sistema está usando PostgreSQL."""
        return "postgresql" in self.final_database_url or "postgres" in self.final_database_url


    # --- Configuración de IA (Ollama Local) ---
    ai_provider: str = Field(
        default="ollama", description="Proveedor de IA activo (ollama | mock)"
    )

    ollama_base_url: str = Field(
        default="http://localhost:11434", description="URL del servidor Ollama"
    )
    ollama_llm_model: str = Field(
        default="ofisolve-notarial", description="Modelo LLM de Ollama"
    )
    ollama_embedding_model: str = Field(
        default="bge-m3", description="Modelo de embeddings de Ollama"
    )

    @property
    def llm_model(self) -> str:
        """Retorna el modelo LLM configurado."""
        return self.ollama_llm_model

    @property
    def embedding_model(self) -> str:
        """Retorna el modelo de embeddings configurado."""
        return self.ollama_embedding_model

    llm_max_tokens: int = Field(
        default=4096, description="Máximo de tokens por respuesta"
    )

    # --- ChromaDB (Vector DB local) ---
    chroma_persist_dir: str = Field(
        default="./chroma_db",
        description="Directorio de persistencia de ChromaDB",
    )
    chroma_collection: str = Field(
        default="normativa_notarial",
        description="Nombre de la colección de vectores",
    )

    # --- Seguridad ---
    secret_key: str = Field(
        default="cambiar-en-produccion", description="Clave secreta para JWT/sesiones"
    )
    access_token_expire_minutes: int = Field(
        default=60 * 24 * 15, description="Tiempo de expiración del token (15 días)"
    )
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://ofisolve-front.vercel.app",
            "*", 
        ],
        description="Orígenes permitidos para CORS",
    )


@lru_cache()
def get_settings() -> Settings:
    """Singleton de configuración. Se cachea para evitar relecturas del .env."""
    return Settings()
