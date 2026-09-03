from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
import json
from typing import Dict

from app.core.embeddings import GeminiEmbeddings
from app.core.qdrant_client import ensure_collection, get_qdrant_client

COLLECTION_NAME = "ipc_sections"

# Initialize vector store lazily so the app can boot without a reachable Qdrant instance
_vector_store = None

def _get_vector_store():
    global _vector_store
    if _vector_store is None:
        ensure_collection(COLLECTION_NAME)
        _vector_store = QdrantVectorStore(
            client=get_qdrant_client(),
            collection_name=COLLECTION_NAME,
            embedding=GeminiEmbeddings(),
        )
    return _vector_store


def prepare_section_document(section: Dict) -> Document:
    """Convert a single IPC section JSON to LangChain Document format"""
    max_length = 2000  # Rough estimate for ~500 tokens

    content_parts = [
        f"Section {section['section']} of {section['code']}",
        f"Description: {section.get('description', 'No description available')}",
        "Elements of Offense:",
        section['elements_of_offense']['definition'],
        *[f"{elem['element']}: {elem['description']}" 
          for elem in section['elements_of_offense']['essential_elements']],
        f"Mens Rea: {section['elements_of_offense']['mens_rea']}",
        f"Proof Requirement: {section['elements_of_offense']['proof_requirement']}",
        "Punishments:",
        *[f"{pun['type']}: {pun['description']}" 
          for pun in section['typical_punishments']['punishments']],
        "Exceptions/Defenses:",
        *[f"{exc['exception']}: {exc['description']}" 
          for exc in section['exceptions_or_defenses']['exceptions']],
        *[f"{defense['defense']}: {defense['description']}" 
          for defense in section['exceptions_or_defenses']['defenses']],
        "Landmark Cases:",
        *[f"{case['case']}: {case['significance']}" 
          for case in section.get('landmark_cases', [])]
    ]
    
    content = "\n\n".join(content_parts)
    if len(content) > max_length:
        content = content[:max_length] + "..."
        print(f"Truncated section {section['section']} to {max_length} characters")

    metadata = {
        "section_number": section['section'],
        "code": section['code'],
        "current_status": section.get('status', {}).get('current', 'No status available'),
        "tags": [
            "ipc",
            section['code'].lower().replace(" ", "_"),
            f"section_{section['section']}",
            *[elem['element'].lower().replace(" ", "_") 
              for elem in section['elements_of_offense']['essential_elements']],
            *[pun['type'].lower().replace(" ", "_") 
              for pun in section['typical_punishments']['punishments']],
            *[exc['exception'].lower().replace(" ", "_") 
              for exc in section['exceptions_or_defenses']['exceptions']],
            *[defense['defense'].lower().replace(" ", "_") 
              for defense in section['exceptions_or_defenses']['defenses']],
            *[case['case'].lower().replace(" ", "_") 
              for case in section.get('landmark_cases', [])]
        ],
        "punishment_types": [pun['type'] for pun in section['typical_punishments']['punishments']],
        "cognizable": section.get('procedural_steps', {}).get('nature_of_offense', {}).get('cognizable', None),
        "bailable": section.get('procedural_steps', {}).get('nature_of_offense', {}).get('bailable', None),
        "compoundable": section.get('procedural_steps', {}).get('nature_of_offense', {}).get('compoundable', None),
        "court": section.get('procedural_steps', {}).get('nature_of_offense', {}).get('court', None),
        "full_data": section
    }
    
    return Document(
        page_content=content,
        metadata=metadata
    )


def saveIPCSection(section_data: Dict):
    """Store a single IPC section in Qdrant"""
    try:
        document = prepare_section_document(section_data)
        _get_vector_store().add_documents(documents=[document])
        print(f"Saved IPC section {section_data.get('section', 'unknown')} to Qdrant")
    except Exception as e:
        print(f"Error storing section {section_data.get('section', 'unknown')}: {str(e)}")


