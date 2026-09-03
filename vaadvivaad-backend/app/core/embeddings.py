from typing import List

from google import genai
from google.genai import types
from langchain_core.embeddings import Embeddings

from app.core.config import settings

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _client


class GeminiEmbeddings(Embeddings):
    """LangChain-compatible embeddings backed by Gemini's embedding endpoint.

    Uses task-specific embeddings (RETRIEVAL_DOCUMENT for indexing,
    RETRIEVAL_QUERY for search) since they're asymmetric and this improves
    retrieval quality over using one embedding type for both.
    """

    def __init__(self, model: str = None, output_dimensionality: int = None):
        self.model = model or settings.EMBEDDING_MODEL
        self.output_dimensionality = output_dimensionality or settings.EMBEDDING_DIMENSIONS

    def _embed(self, texts: List[str], task_type: str) -> List[List[float]]:
        response = _get_client().models.embed_content(
            model=self.model,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=self.output_dimensionality,
            ),
        )
        return [embedding.values for embedding in response.embeddings]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(texts, task_type="RETRIEVAL_DOCUMENT")

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text], task_type="RETRIEVAL_QUERY")[0]
