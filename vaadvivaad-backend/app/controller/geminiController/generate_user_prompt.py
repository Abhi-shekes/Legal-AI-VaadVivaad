from google import genai
import json
from app.core.config import settings

## Add your prompt imporvisation logic here 

def generate_user_prompt(user_prompt: str):
    try:
        
        
        return 
        
    except Exception as e:
        print("Error generating content from Gemini:", e)
        return {
            "status": "fail",
            "message": "Error processing the prompt: " + str(e)
        }