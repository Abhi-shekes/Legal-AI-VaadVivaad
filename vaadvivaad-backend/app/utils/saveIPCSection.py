from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from app.core.config import settings
import json
from typing import Dict  


# Initialize vector store
vector_store = AstraDBVectorStore(
    collection_name="ipc_sections",
    api_endpoint=settings.ASTRA_DB_API_ENDPOINT,
    token=settings.ASTRA_DB_APPLICATION_TOKEN,
    namespace=settings.ASTRA_DB_KEYSPACE,
    collection_vector_service_options=VectorServiceOptions(
        provider="nvidia",
        model_name="NV-Embed-QA",
    ),
)


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
    """Store a single IPC section in Astra DB"""
    try:
        document = prepare_section_document(section_data)
        vector_store.add_documents(documents=[document])
        print(f"Saved IPC section {section_data.get('section', 'unknown')} to Astra DB")
    except Exception as e:
        print(f"Error storing section {section_data.get('section', 'unknown')}: {str(e)}")


