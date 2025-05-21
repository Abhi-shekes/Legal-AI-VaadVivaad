from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB Configuration
    MONGO_URL: str = "mongodb+srv://2003deepak:Deepak%407449*@atlascluster.yeqsq.mongodb.net?retryWrites=true&w=majority&appName=AtlasCluster"
    DB_NAME: str = "LegalAI"
    
    # JWT Configuration
    JWT_SECRET_KEY: str = "secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AstraDB Configuration
    ASTRA_DB_APPLICATION_TOKEN: str
    ASTRA_DB_API_ENDPOINT: str
    ASTRA_DB_KEYSPACE: str

    # Google API Configuration
    GOOGLE_API_KEY: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
#print("Settings loaded:", settings.dict())  # Debug print to verify values