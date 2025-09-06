# parser.py
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from pypdf import PdfReader
from docx import Document
import json
import re
import logging
from fastapi import UploadFile
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image

# Configure logging for the parser
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini 2.0 Flash model
if not GOOGLE_API_KEY:
    logging.error("GOOGLE_API_KEY not found in environment variables. Please set it in your .env file.")
    model = None
else:
    try:
        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY)
        logging.info("Successfully initialized Gemini model.")
    except Exception as e:
        logging.error(f"Failed to initialize Gemini model: {e}")
        model = None

def extract_text(file: UploadFile) -> str:
    """
    Extracts text content and embedded hyperlinks from PDF or DOCX files.
    Filters links to include only potential social media profiles (e.g., LinkedIn, GitHub).
    Uses OCR for image-based PDFs if no text is found.
    """
    logging.info(f"Attempting to extract text from: {file.filename}")
    
    file.file.seek(0, 2)  # Move to end of file
    size = file.file.tell()
    file.file.seek(0)     # Reset to start
    max_file_size = 10 * 1024 * 1024  # 10 MB
    if size > max_file_size:
        raise ValueError("File size exceeds 10 MB limit.")

    extracted_text = ""
    links = []

    # Define patterns for social media/profile links
    social_media_domains = [
        "linkedin.com",
        "github.com",
        "leetcode.com",
        "codechef.com",
        "portfolio",
        "behance.net",
        "dribbble.com",
        "gitlab.com"
    ]
    social_media_pattern = "|".join(re.escape(domain) for domain in social_media_domains)

    if file.filename.endswith(".pdf"):
        try:
            reader = PdfReader(file.file)
            for page in reader.pages:
                if page.extract_text():
                    extracted_text += page.extract_text() + "\n"
            # If no text was extracted, try OCR
            if not extracted_text.strip():
                file.file.seek(0)
                images = convert_from_bytes(file.file.read())
                for image in images:
                    extracted_text += pytesseract.image_to_string(image) + "\n"
            # Extract links (annotations)
            for page in reader.pages:
                if "/Annots" in page:
                    for annot in page["/Annots"]:
                        annot_obj = annot.get_object()
                        if "/A" in annot_obj and "/URI" in annot_obj["/A"]:
                            uri = str(annot_obj["/A"]["/URI"])
                            if re.search(social_media_pattern, uri, re.IGNORECASE):
                                links.append(uri)
            logging.info(f"Successfully extracted text and {len(links)} social media links from PDF.")
        except Exception as e:
            logging.error(f"Error extracting text/links from PDF: {e}")
            raise ValueError(f"Failed to extract from PDF: {e}")

    elif file.filename.endswith(".docx"):
        try:
            doc = Document(file.file)
            extracted_text = "\n".join(p.text for p in doc.paragraphs)

            # Extract hyperlinks from .docx XML parts
            rels = doc.part.rels
            for rel in rels.values():
                if rel.reltype == "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink":
                    uri = rel.target_ref
                    # Only include links that match social media/profile patterns
                    if re.search(social_media_pattern, uri, re.IGNORECASE):
                        links.append(uri)
            logging.info(f"Successfully extracted text and {len(links)} social media links from DOCX.")
        except Exception as e:
            logging.error(f"Error extracting text/links from DOCX: {e}")
            raise ValueError(f"Failed to extract from DOCX: {e}")

    else:
        logging.warning(f"Unsupported file format for extraction: {file.filename}")
        raise ValueError("Unsupported file format. Only PDF and DOCX are supported.")

    # Append the links at the end of the extracted text to feed into the LLM
    if links:
        extracted_text += "\n\n[EXTRACTED LINKS]\n" + "\n".join(links)

    return extracted_text

def parse_resume_with_gpt(text: str) -> dict:
    """
    Parses resume text using a Google Gemini AI model to extract structured information.
    """
    if not model:
        logging.error("Gemini model not initialized. Cannot parse resume.")
        return {"error": "AI model not available. Ensure GOOGLE_API_KEY is set correctly."}

    if not text.strip():
        logging.warning("Empty resume text provided.")
        return {
            "error": "Empty resume text",
            "details": "The provided resume text is empty or contains only whitespace."
        }

    prompt_template = PromptTemplate.from_template("""
You are an expert resume parser. Extract the following fields from the provided resume text and return a valid JSON object with these exact keys:
["name", "email", "phone", "location", "summary", "education", "skills", "projects", "experience", "achievements", "societies", "links", "currentCompany"]

- "summary": A 2-3 sentence professional summary or objective. If not present, generate one based on the candidate's experience and education.
- "experience": An array of objects, each with "title", "company", "period", and "description". If you cannot find all fields, fill what you can, but always return an array of objects (never an array of strings or a string).
- "education": An array of objects, each with "degree", "school", "year", and "gpa" (if available). If you cannot find all fields, fill what you can, but always return an array of objects (never an array of strings or a string).
- "skills": An array of strings.
- "projects": An array of objects, each with "title", "description", and "link" (if available). If you cannot find all fields, fill what you can, but always return an array of objects (never an array of strings or a string).
- "achievements": An array of objects, each with "name", "issuer", and "year" (if available). Treat these as certifications, awards, or honors. If you cannot find all fields, fill what you can, but always return an array of objects.
- "societies": An array of strings.
- "links": An array of URLs as strings.
- "currentCompany": If the most recent experience period contains 'Present' or 'Current', set to that company. If the most recent experience title contains 'intern', set to 'Ex-Intern at {{company}}'. If no experience, set to 'Student' or 'Fresher'. Otherwise, set to 'Ex-Employee at {{company}}'.

If a field is missing, use an empty string or empty array as appropriate.
**Do NOT return experience, education, projects, or achievements as plain strings or arrays of strings. Always return arrays of objects for these fields.**
The output must be valid JSON, with all fields present and correctly typed.

Example output:
{{
  "name": "Jane Doe",
  "email": "jane.doe@email.com",
  "phone": "+1-555-123-4567",
  "location": "New York, NY",
  "summary": "Experienced software engineer with a passion for building scalable web applications...",
  "education": [
    {{ "degree": "B.Sc. in Computer Science", "school": "NYU", "year": "2020", "gpa": "3.8" }},
    {{ "degree": "High School Diploma", "school": "Central High", "year": "2016", "gpa": "" }}
  ],
  "skills": ["Python", "JavaScript", "SQL"],
  "projects": [
    {{
      "title": "E-commerce Platform",
      "description": "Built a full-stack e-commerce platform using React and Node.js",
      "link": "https://github.com/janedoe/ecommerce"
    }},
    {{
      "title": "Task Management App",
      "description": "Developed a collaborative task management application with real-time updates",
      "link": ""
    }}
  ],
  "experience": [
    {{
      "title": "Software Engineer",
      "company": "XYZ Corp",
      "period": "2020-2022",
      "description": "Worked on backend APIs and frontend features."
    }},
    {{
      "title": "Intern",
      "company": "ABC Inc.",
      "period": "2019",
      "description": "Assisted with web development projects."
    }}
  ],
  "achievements": [
    {{ "name": "Dean's List", "issuer": "NYU", "year": "2020" }},
    {{ "name": "Hackathon Winner", "issuer": "ABC Hackathon", "year": "2019" }}
  ],
  "societies": ["ACM", "Chess Club"],
  "links": ["https://linkedin.com/in/janedoe", "https://github.com/janedoe"],
  "currentCompany": "XYZ Corp"
}}

Resume text:
{text}
""")

    formatted_prompt = prompt_template.format(text=text)
    logging.info("Sending formatted prompt to LLM...")
    try:
        response = model.invoke([HumanMessage(content=formatted_prompt)])
        raw = response.content.strip()
        logging.info(f"LLM raw response received (first 200 chars): {raw[:200]}...")

        # Try to extract JSON substring from response
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                parsed_json = json.loads(json_str)
                # Ensure all required fields are present, even if empty
                required_fields = [
                    "name", "email", "phone", "location", "summary", "education",
                    "skills", "projects", "experience", "achievements",
                    "societies", "links", "currentCompany"
                ]
                for field in required_fields:
                    if field not in parsed_json:
                        parsed_json[field] = [] if field in ["education", "skills", "projects", "experience", "achievements", "societies", "links"] else ""
                        logging.warning(f"Field '{field}' missing in LLM response. Setting to empty value.")
                logging.info("Successfully parsed JSON from LLM response.")
                return parsed_json
            except json.JSONDecodeError as e:
                logging.error(f"JSON parsing error: {e}. Problematic JSON string: {json_str[:500]}...")
                return {
                    "error": "Failed to parse model response as JSON",
                    "details": str(e),
                    "raw_json_attempt": json_str[:500]  # Limit length to avoid excessive logging
                }
            except Exception as e:
                logging.error(f"An unexpected error occurred during JSON parsing: {e}", exc_info=True)
                return {
                    "error": "An unexpected error occurred during JSON parsing",
                    "details": str(e)
                }
        else:
            logging.warning("No JSON object found in the raw LLM response.")
            return {
                "error": "No JSON found in model response",
                "raw_llm_response": raw[:500]  # Limit length for logging
            }
    except Exception as e:
        logging.error(f"Error invoking Gemini model: {e}", exc_info=True)
        return {
            "error": f"Failed to get response from AI model: {str(e)}",
            "details": "Check API key and network connectivity."
        }

import re

def postprocess_parsed_data(parsed_data, raw_text):
    # Fallback for email
    if not parsed_data.get("email"):
        match = re.search(r"[\w\.-]+@[\w\.-]+", raw_text)
        if match:
            parsed_data["email"] = match.group(0)
    # Fallback for phone
    if not parsed_data.get("phone"):
        match = re.search(r"(\+?\d[\d\s\-()]{7,})", raw_text)
        if match:
            parsed_data["phone"] = match.group(0)
    # Clean up name (optional, e.g., take first line if missing)
    if not parsed_data.get("name"):
        lines = raw_text.splitlines()
        if lines:
            parsed_data["name"] = lines[0].strip()
    # Fallback for summary
    if not parsed_data.get("summary"):
        # Try to generate a summary from experience/education
        exp = parsed_data.get("experience", [])
        edu = parsed_data.get("education", [])
        if exp and isinstance(exp, list) and len(exp) > 0:
            first_job = exp[0]
            parsed_data["summary"] = f"Experienced {first_job.get('title', 'professional')} with a background at {first_job.get('company', '')}."
        elif edu and isinstance(edu, list) and len(edu) > 0:
            first_edu = edu[0]
            parsed_data["summary"] = f"Graduate of {first_edu.get('school', '')} with a degree in {first_edu.get('degree', '')}."
        else:
            parsed_data["summary"] = "Motivated professional seeking new opportunities."
    # Fallback for currentCompany
    if not parsed_data.get("currentCompany"):
        exp = parsed_data.get("experience", [])
        if exp and isinstance(exp, list) and len(exp) > 0:
            most_recent = exp[0]
            company = most_recent.get('company', '')
            title = most_recent.get('title', '').lower()
            period = most_recent.get('period', '').lower()
            if 'present' in period or 'current' in period:
                parsed_data["currentCompany"] = company if company else "Current Company Not Specified"
            elif 'intern' in title:
                parsed_data["currentCompany"] = f"Ex-Intern at {company}" if company else "Ex-Intern"
            else:
                parsed_data["currentCompany"] = f"Ex-Employee at {company}" if company else "Ex-Employee"
        else:
            parsed_data["currentCompany"] = "Student"
    return parsed_data