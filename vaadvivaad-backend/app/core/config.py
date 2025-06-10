from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB Configuration
    MONGO_URL: str 
    DB_NAME: str 
    
    # JWT Configuration
    JWT_SECRET_KEY: str 
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AstraDB Configuration
    ASTRA_DB_APPLICATION_TOKEN: str 
    ASTRA_DB_API_ENDPOINT: str 
    ASTRA_DB_KEYSPACE: str 

    # Google API Configuration
    GOOGLE_API_KEY: str 

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
