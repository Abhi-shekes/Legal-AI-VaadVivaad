from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from typing import List, Dict, Any, Optional
from app.core.config import settings
import os
import re

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

def search_by_ipc_section(section: str) -> List[Dict[str, Any]]:
    """
    Direct search by IPC section number (e.g., "302", "302A")
    Handles case sensitivity and whitespace
    """
    try:
        # Normalize the section number by removing spaces
        normalized_section = section.replace(" ", "")
       
        # Perform exact match in metadata
        results = vector_store.similarity_search(
            query=f"IPC Section {normalized_section}",
            k=1,
            filter={"section_number": {"$eq": normalized_section}}
        )

        if not results:
            print("No results found for section:", normalized_section)
            return []
        
        # print("Search results:", results)  # Debugging print
        return format_ipc_results(results)  # Pass the entire list
    
    except Exception as e:
        error_message = str(e)
        if "COLLECTION_NOT_EXIST" in error_message or "collection name: case_laws" in error_message:
            print("Collection does not exist, returning empty case list.")
        else:
            print(f"Error in vector search: {error_message}")
        return []  # Unified empty result for both collection-not-found and no match


def format_ipc_results(results: List[Document]) -> List[Dict[str, Any]]:
    """Format vector store results into standardized IPC section response"""
    formatted_results = []
    
    for doc in results:
        if not hasattr(doc, 'metadata'):
            continue
            
        metadata = doc.metadata
        full_data = metadata.get('full_data', {})
        
        # Extract punishments details
        punishment_details = []
        for punishment in full_data.get('typical_punishments', {}).get('punishments', []):
            punishment_details.append({
                'type': punishment.get('type'),
                'description': punishment.get('description'),
                'conditions': punishment.get('conditions'),
                'example_cases': punishment.get('example_cases')
            })
        
        # Extract elements of offense
        elements = []
        for element in full_data.get('elements_of_offense', {}).get('essential_elements', []):
            elements.append({
                'element': element.get('element'),
                'description': element.get('description')
            })
        
        # Extract exceptions and defenses
        exceptions_defenses = []
        exceptions = full_data.get('exceptions_or_defenses', {}).get('exceptions', [])
        defenses = full_data.get('exceptions_or_defenses', {}).get('defenses', [])
        
        for item in exceptions + defenses:
            exceptions_defenses.append({
                'name': item.get('exception') or item.get('defense'),
                'description': item.get('description'),
                'conditions': item.get('conditions'),
                'outcome': item.get('outcome')
            })
        
        # Build complete result
        result = {
            # Basic Info
            'section_number': metadata.get('section_number'),
            'code': full_data.get('code'),
            'description': full_data.get('description') or "No description available",  # Default description
            'current_status': metadata.get('current_status'),
            
            # Classification
            'tags': metadata.get('tags', []),
            'cognizable': metadata.get('cognizable'),
            'bailable': metadata.get('bailable'),
            'compoundable': metadata.get('compoundable'),
            
            # Legal Elements
            'elements_of_offense': elements,
            'mens_rea': full_data.get('elements_of_offense', {}).get('mens_rea'),
            'proof_requirement': full_data.get('elements_of_offense', {}).get('proof_requirement'),
            
            # Punishments
            'punishment_types': metadata.get('punishment_types', []),
            'punishment_details': punishment_details,
            'sentencing_considerations': {
                'aggravating_factors': full_data.get('typical_punishments', {}).get('sentencing_considerations', {}).get('aggravating_factors', []),
                'mitigating_factors': full_data.get('typical_punishments', {}).get('sentencing_considerations', {}).get('mitigating_factors', [])
            },
            
            # Defenses
            'exceptions_defenses': exceptions_defenses,
            'burden_of_proof': full_data.get('exceptions_or_defenses', {}).get('burden_of_proof'),
            
            # Related Sections
            'related_sections': full_data.get('legal_framework', {}).get('related_sections', [])
        }
        
        formatted_results.append(result)
    
    return formatted_results