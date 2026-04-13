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


    # --- LLM (Gemini) ---
    google_api_key: str = Field(
        default="", description="API Key de Google AI (Gemini)"
    )
    llm_model: str = Field(
        default="gemini-2.0-flash", description="Modelo LLM a utilizar"
    )
    llm_max_tokens: int = Field(
        default=4096, description="Máximo de tokens por respuesta"
    )
    embedding_model: str = Field(
        default="models/text-embedding-004",
        description="Modelo de embeddings de Gemini",
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
        default=60 * 24 * 7, description="Tiempo de expiración del token (7 días)"
    )
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://ofisolve.vercel.app", # URL por defecto tentativa
            "https://ofisolve-*.vercel.app", # Previews de Vercel
        ],
        description="Orígenes permitidos para CORS",
    )

    # --- Observabilidad (LangSmith) ---
    langchain_tracing_v2: str = Field(default="true")
    langchain_endpoint: str = Field(default="https://api.smith.langchain.com")
    langchain_api_key: str = Field(default="")
    langchain_project: str = Field(default="ofisolve-saas")


@lru_cache()
def get_settings() -> Settings:
    """Singleton de configuración. Se cachea para evitar relecturas del .env."""
    return Settings()
