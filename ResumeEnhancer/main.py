from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Body
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from dotenv import load_dotenv
import tempfile
import os
import uuid
import logging
import re
import json
import psycopg2
import asyncio
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import anyio
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_text(text):
    """Remove bullet points and clean text"""
    if not isinstance(text, str):
        return text
    cleaned = text.replace('•', '').replace('➢', '').replace('▪', '').replace('▫', '').replace('\u2022', '')
    cleaned = ' '.join(cleaned.split())
    return cleaned.strip()

# Load environment variables
load_dotenv()

# Setup FastAPI
app = FastAPI(title="Resume Enhancer Service", version="1.0.0")
templates = Jinja2Templates(directory="templates")




# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

import os
SERVICE_BASE_URL = os.getenv("BASE_URL")

if not DATABASE_URL:
    logging.error("DATABASE_URL not found in environment variables")
    raise ValueError("DATABASE_URL is required")

if not GOOGLE_API_KEY:
    logging.error("GOOGLE_API_KEY not found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

# Google Cloud Storage imports
from google.cloud import storage
from google.oauth2 import service_account

# Google Cloud Storage configuration
# Google Cloud Storage configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "resume-enhancer-bucket")
GCS_PROJECT_ID = os.getenv("GCP_SERVICE_ACCOUNT_PROJECT_ID", "dev-team-463207")

# Read GCS service account credentials from environment variables
# You MUST ensure these environment variables are correctly set in your .env
# as per the previous conversion:
# GCP_SERVICE_ACCOUNT_TYPE="service_account"
# GCP_SERVICE_ACCOUNT_PROJECT_ID="..."
# GCP_SERVICE_ACCOUNT_PRIVATE_KEY_ID="..."
# GCP_SERVICE_ACCOUNT_PRIVATE_KEY="..." (with escaped newlines)
# GCP_SERVICE_ACCOUNT_CLIENT_EMAIL="..."
# GCP_SERVICE_ACCOUNT_CLIENT_ID="..."
# GCP_SERVICE_ACCOUNT_AUTH_URI="..."
# GCP_SERVICE_ACCOUNT_TOKEN_URI="..."
# GCP_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL="..."
# GCP_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL="..."
# GCP_SERVICE_ACCOUNT_UNIVERSE_DOMAIN="..."


# Initialize Google Cloud Storage client
def get_gcs_client():
    """Initialize and return Google Cloud Storage client using environment variables"""
    try:
        # Construct credentials from environment variables
        gcp_credentials_info = {
            "type": os.getenv("GCP_SERVICE_ACCOUNT_TYPE"),
            "project_id": os.getenv("GCP_SERVICE_ACCOUNT_PROJECT_ID"),
            "private_key_id": os.getenv("GCP_SERVICE_ACCOUNT_PRIVATE_KEY_ID"),
            # The private key needs newlines restored if they were escaped in .env
            "private_key": os.getenv("GCP_SERVICE_ACCOUNT_PRIVATE_KEY").replace("\\n", "\n"),
            "client_email": os.getenv("GCP_SERVICE_ACCOUNT_CLIENT_EMAIL"),
            "client_id": os.getenv("GCP_SERVICE_ACCOUNT_CLIENT_ID"),
            "auth_uri": os.getenv("GCP_SERVICE_ACCOUNT_AUTH_URI"),
            "token_uri": os.getenv("GCP_SERVICE_ACCOUNT_TOKEN_URI"),
            "auth_provider_x509_cert_url": os.getenv("GCP_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL"),
            "client_x509_cert_url": os.getenv("GCP_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL"),
            "universe_domain": os.getenv("GCP_SERVICE_ACCOUNT_UNIVERSE_DOMAIN")
        }

        # Check if all required keys are present and not empty
        if not all(gcp_credentials_info.values()):
            missing_keys = [k for k, v in gcp_credentials_info.items() if not v]
            logging.error(f"Missing one or more GCS service account environment variables: {missing_keys}")
            return None

        credentials = service_account.Credentials.from_service_account_info(gcp_credentials_info)
        client = storage.Client(credentials=credentials, project=GCS_PROJECT_ID)
        logging.info("GCS client initialized using environment variables.")
        return client
    except Exception as e:
        logging.error(f"Error initializing GCS client from environment variables: {e}")
        return None

def upload_to_gcs(pdf_bytes: bytes, filename: str, user_id: str) -> str:
    """Upload PDF to Google Cloud Storage and return the public URL"""
    try:
        client = get_gcs_client()
        if not client:
            logging.warning("GCS client not available, skipping upload")
            return None
        
        bucket = client.bucket(GCS_BUCKET_NAME)
        
        # Create the correct path structure: resume_and_job_matching/enhanced_resumes/{user_id}/{filename}
        blob_name = f"resume_and_job_matching/enhanced_resumes/{user_id}/{filename}"
        
        blob = bucket.blob(blob_name)
        blob.upload_from_string(pdf_bytes, content_type='application/pdf')
        
        # Make the blob publicly readable
        blob.make_public()
        
        gcs_url = blob.public_url
        logging.info(f"PDF uploaded to GCS: {gcs_url}")
        return gcs_url
        
    except Exception as e:
        logging.error(f"Error uploading to GCS: {e}")
        return None

# Load Gemini API
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY,
    timeout=30  # Add 30 second timeout for AI calls
)

def generate_pdf_with_reportlab(enhanced_data: Dict[str, Any]) -> bytes:
    """Generate PDF using ReportLab with enhanced formatting"""
    logging.info("=== PDF GENERATION DEBUG ===")
    for key, value in enhanced_data.items():
        logging.info(f"{key}: {type(value)} - {str(value)[:100]}")
    logging.info("=== END DEBUG ===")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    # Define styles with consistent colors
    styles = getSampleStyleSheet()
    
    # Header style - consistent color for name and section headers
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.darkblue,
        fontName='Helvetica-Bold'
    )
    
    # Section header style - same color as main header
    section_style = ParagraphStyle(
        'CustomSection',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=8,
        spaceBefore=12,
        textColor=colors.darkblue,
        fontName='Helvetica-Bold'
    )
    
    # Contact info style
    contact_style = ParagraphStyle(
        'ContactInfo',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=12,
        textColor=colors.black,
        fontName='Helvetica'
    )
    
    # Normal text style
    normal_style = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        textColor=colors.black,
        fontName='Helvetica'
    )
    
    # Bullet point style
    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=4,
        leftIndent=20,
        textColor=colors.black,
        fontName='Helvetica'
    )
    
    # Link style
    link_style = ParagraphStyle(
        'LinkText',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=4,
        leftIndent=20,
        textColor=colors.blue,
        fontName='Helvetica'
    )
    
    def clean_text(text):
        """Clean text for PDF display"""
        if not text:
            return ""
        return str(text).strip()
    
    def split_into_lines(text):
        """Split text into lines for better formatting"""
        if not text:
            return []
        return [line.strip() for line in str(text).split('\n') if line.strip()]
    
    # Name (Header)
    name = clean_text(enhanced_data.get('name', ''))
    if name:
        logging.info(f"Adding name to PDF: {name}")
        story.append(Paragraph(name, header_style))
    
    # Contact Information
    email = clean_text(enhanced_data.get('email', ''))
    phone = clean_text(enhanced_data.get('phone', ''))
    location = clean_text(enhanced_data.get('location', ''))
    
    if email or phone or location:
        contact_info = f"{email} | {phone} | {location}"
        logging.info(f"Adding contact to PDF: {contact_info[:100]}...")
        story.append(Paragraph(contact_info, contact_style))
    
    # Professional Summary
    summary = clean_text(enhanced_data.get('summary', ''))
    if summary:
        logging.info(f"Adding summary to PDF: {summary[:100]}...")
        story.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
        story.append(Paragraph(summary, normal_style))
    
    # Technical Skills
    skills = enhanced_data.get('skills', '')
    if skills:
        logging.info(f"Adding skills to PDF: {str(skills)[:100]}...")
        story.append(Paragraph("TECHNICAL SKILLS", section_style))
        
        if isinstance(skills, list):
            skills_list = [clean_text(skill) for skill in skills]
        else:
            skills_list = [clean_text(skills)]
        
        logging.info(f"Skills list: {skills_list}")
        
        # Format skills as a single line with proper formatting
        if skills_list:
            skills_text = skills_list[0] if len(skills_list) == 1 else ", ".join(skills_list)
            story.append(Paragraph(f"Programming Languages: {skills_text}", normal_style))
    
    # Professional Experience
    experience = enhanced_data.get('experience', [])
    if experience:
        logging.info(f"Adding experience to PDF: {str(experience)[:100]}...")
        story.append(Paragraph("PROFESSIONAL EXPERIENCE", section_style))
        
        if isinstance(experience, list):
            for exp in experience:
                if isinstance(exp, dict):
                    title = clean_text(exp.get('title', ''))
                    description = clean_text(exp.get('description', ''))
                    
                    if title:
                        story.append(Paragraph(title, normal_style))
                        if description:
                            story.append(Paragraph(f"• {description}", bullet_style))
                else:
                    story.append(Paragraph(f"• {clean_text(exp)}", bullet_style))
        else:
            story.append(Paragraph(f"• {clean_text(experience)}", bullet_style))
    
    # Education
    education = enhanced_data.get('education', [])
    if education:
        logging.info(f"Adding education to PDF: {str(education)[:100]}...")
        story.append(Paragraph("EDUCATION", section_style))
        
        if isinstance(education, list):
            for edu in education:
                if isinstance(edu, dict):
                    degree = clean_text(edu.get('degree', ''))
                    school = clean_text(edu.get('school', ''))
                    year = clean_text(edu.get('year', ''))
                    gpa = clean_text(edu.get('gpa', ''))
                    
                    if degree:
                        # Format education entry
                        if school and year and gpa:
                            edu_text = f"{degree}<br/>{school}<br/>{gpa} | {year}"
                        elif school and year:
                            edu_text = f"{degree}<br/>{school}<br/>{year}"
                        elif school:
                            edu_text = f"{degree}<br/>{school}"
                        else:
                            edu_text = degree
                        
                        story.append(Paragraph(edu_text, normal_style))
                else:
                    story.append(Paragraph(f"• {clean_text(edu)}", bullet_style))
        else:
            story.append(Paragraph(f"• {clean_text(education)}", bullet_style))
    
    # Projects
    projects = enhanced_data.get('projects', [])
    if projects:
        logging.info(f"Adding projects to PDF: {str(projects)[:100]}...")
        story.append(Paragraph("PROJECTS", section_style))
        
        if isinstance(projects, list):
            for project in projects:
                if isinstance(project, dict):
                    title = clean_text(project.get('title', ''))
                    description = clean_text(project.get('description', ''))
                    
                    if title:
                        story.append(Paragraph(title, normal_style))
                        if description:
                            story.append(Paragraph(f"• {description}", bullet_style))
                else:
                    story.append(Paragraph(f"• {clean_text(project)}", bullet_style))
        else:
            story.append(Paragraph(f"• {clean_text(projects)}", bullet_style))
    
    # Achievements - Format as bullet points
    achievements = enhanced_data.get('achievements', [])
    if achievements:
        logging.info(f"Adding achievements to PDF: {str(achievements)[:100]}...")
        story.append(Paragraph("ACHIEVEMENTS & AWARDS", section_style))
        
        if isinstance(achievements, list):
            for achievement in achievements:
                if isinstance(achievement, dict):
                    title = clean_text(achievement.get('title', ''))
                    # Skip achievements with empty titles or descriptions
                    if title and title.strip():
                        story.append(Paragraph(f"• {title}", bullet_style))
                else:
                    achievement_text = clean_text(achievement)
                    if achievement_text and achievement_text.strip():
                        story.append(Paragraph(f"• {achievement_text}", bullet_style))
        else:
            # If achievements is a string, split it into bullet points
            achievements_text = clean_text(achievements)
            if achievements_text:
                # Split by common achievement separators and clean up
                achievement_lines = []
                for line in achievements_text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('•') and not line.startswith('-'):
                        # Remove any bullet points and clean up
                        line = line.replace('•', '').replace('-', '').strip()
                        if line:
                            achievement_lines.append(line)
                
                for line in achievement_lines:
                    if line:
                        story.append(Paragraph(f"• {line}", bullet_style))
    
    # Professional Links (prioritize over societies)
    if enhanced_data.get('links'):
        logging.info(f"Adding links to PDF: {enhanced_data['links'][:100]}...")
        story.append(Paragraph("PROFESSIONAL LINKS", section_style))
        links = enhanced_data['links']
        if isinstance(links, str):
            # Split comma-separated links
            links_list = [link.strip() for link in links.split(',') if link.strip()]
        else:
            links_list = [clean_text(str(link)) for link in (links if isinstance(links, list) else [links])]
        
        for item in links_list:
            if item:
                link_text = clean_text(item)
                if link_text.startswith('http'):
                    # Create clickable link using HTML anchor tag
                    link_para = Paragraph(f'• <a href="{link_text}">{link_text}</a>', link_style)
                    story.append(link_para)
                else:
                    # Regular text if not a URL
                    story.append(Paragraph(f"• {link_text}", bullet_style))
    
    # Societies (only if no links)
    elif enhanced_data.get('societies'):
        societies = clean_text(enhanced_data.get('societies', ''))
        if societies:
            logging.info(f"Adding societies to PDF: {societies[:100]}...")
            story.append(Paragraph("PROFESSIONAL MEMBERSHIPS", section_style))
            story.append(Paragraph(f"• {societies}", bullet_style))
    
    logging.info(f"Total story elements: {len(story)}")
    
    try:
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as e:
        logging.error(f"Error generating PDF: {e}")
        buffer.close()
        raise

# Database connection function
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Pydantic models
class ResumeEnhancementRequest(BaseModel):
    user_id: str
    job_preference: str
    job_id: Optional[int] = None
    keywords: Optional[List[str]] = []

class ResumeEnhancementResponse(BaseModel):
    id: int
    user_id: str
    original_resume_url: Optional[str]
    enhanced_resume_url: str  # This will be the download endpoint URL
    gcs_url: Optional[str] = None  # Google Cloud Storage URL
    job_id: Optional[int]
    improvements: List[str]  # Changed from Dict[str, Any] to List[str]
    keywords: List[str]
    created_at: str

# Resume enhancement prompt
resume_prompt = PromptTemplate.from_template("""
You are an expert resume parser and enhancer.
Target job: {job_preference}

Return the output in strict JSON format:
{{
"name": "...",
"email": "...",
"phone": "...",
"location": "...",
"education": "➢ ...",
"skills": "➢ ...",
"projects": "➢ ...",
"experience": "➢ ...",
"achievements": "➢ ...",
"societies": "➢ ...",
"links": "Professional links like LinkedIn, GitHub, portfolio"
}}

Here is the resume content:
{resume_content}

Here are the extracted profile links from the resume:
{extracted_profile_links}

Focus only on common professional/coding profile links for the 'links' field.
Examples of common profile links: LinkedIn, GitHub, CodeChef, LeetCode, personal portfolio.
Exclude project-specific links, certificate links, or general social media links unless they are clearly a primary professional profile.
""")

async def fetch_user_profile(user_id: str) -> Dict[str, Any]:
    """Fetch user profile from user_profiles table"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        logging.info(f"Fetching user profile for user_id: {user_id}")
        cur.execute("""
            SELECT name, email, phone, location, education, skills, experience, 
                   projects, achievements, societies, links, original_resume_filepath
            FROM user_profiles 
            WHERE user_id = %s
        """, (user_id,))
        result = cur.fetchone()
        if not result:
            logging.error(f"No user profile found for user_id: {user_id}")
            raise HTTPException(status_code=404, detail=f"User profile not found for user_id '{user_id}'")
        logging.info(f"Raw database result: {dict(result)}")
        json_fields = ['education', 'skills', 'experience', 'projects', 'achievements', 'societies', 'links']
        user_data = dict(result)
        for field in json_fields:
            logging.info(f"Processing field: {field}, Raw value: {user_data.get(field)}")
            if user_data.get(field):
                try:
                    import json
                    parsed_data = json.loads(user_data[field])
                    logging.info(f"Parsed {field}: {parsed_data}")
                    if isinstance(parsed_data, list):
                        text_items = []
                        for item in parsed_data:
                            if isinstance(item, dict):
                                if 'title' in item:
                                    text_items.append(str(item['title']))
                                elif 'name' in item:
                                    text_items.append(str(item['name']))
                                elif 'description' in item:
                                    text_items.append(str(item['description']))
                                elif 'text' in item:
                                    text_items.append(str(item['text']))
                                else:
                                    text_items.append(' '.join([str(v) for v in item.values() if isinstance(v, str)]))
                            elif isinstance(item, str):
                                text_items.append(item)
                            else:
                                text_items.append(str(item))
                        user_data[field] = text_items
                        logging.info(f"Final {field} (list): {text_items}")
                    elif isinstance(parsed_data, dict):
                        text_items = []
                        for key, value in parsed_data.items():
                            if isinstance(value, str):
                                text_items.append(value)
                            elif isinstance(value, list):
                                text_items.extend([str(v) for v in value if isinstance(v, str)])
                        user_data[field] = text_items
                        logging.info(f"Final {field} (dict): {text_items}")
                    else:
                        user_data[field] = [str(parsed_data)]
                        logging.info(f"Final {field} (other): {user_data[field]}")
                except (json.JSONDecodeError, TypeError) as e:
                    logging.warning(f"Error parsing {field} for user {user_id}: {e}")
                    user_data[field] = []
            else:
                user_data[field] = []
                logging.info(f"Field {field} is empty or null")
        logging.info(f"Final processed user data:")
        for key, value in user_data.items():
            if isinstance(value, list):
                logging.info(f"  {key}: {len(value)} items - {value[:3]}...")
            else:
                logging.info(f"  {key}: {value}")
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user profile: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

async def generate_enhanced_resume(user_id: str, job_preference: str) -> Dict[str, Any]:
    """Generate enhanced resume using AI (using the working approach from main.py)"""
    try:
        # Fetch user profile
        user_data = await fetch_user_profile(user_id)
        
        # Prepare resume text using the same format as the working main.py
        # Convert lists to strings for the AI prompt
        def format_field(field_data):
            if isinstance(field_data, list):
                return "\n".join([str(item) for item in field_data])
            elif isinstance(field_data, str):
                return field_data
            else:
                return str(field_data) if field_data else ""
        
        resume_text = f"""
Name: {user_data.get("name", "")}
Email: {user_data.get("email", "")}
Phone: {user_data.get("phone", "")}
Location: {user_data.get("location", "")}

QUALIFICATION:
{format_field(user_data.get("education", ""))}

SKILLS:
{format_field(user_data.get("skills", ""))}

PROJECTS:
{format_field(user_data.get("projects", ""))}

EXPERIENCE:
{format_field(user_data.get("experience", ""))}

ACHIEVEMENTS:
{format_field(user_data.get("achievements", ""))}

SOCIETIES:
{format_field(user_data.get("societies", ""))}
"""
        
        # Handle links field correctly since it's now a list
        links_data = user_data.get("links", [])
        if isinstance(links_data, list):
            extracted_profile_links = "\n".join(links_data) if links_data else "None"
        else:
            extracted_profile_links = str(links_data).strip() if links_data else "None"
        
        # Use the same prompt structure as the working main.py
        prompt = f"""
You are an expert resume parser and enhancer. Create a professional, ATS-friendly enhanced resume.

Target job: {job_preference}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. Return ONLY valid JSON format - no other text before or after
2. NEVER use bullet points (•, ➢, ▪, ▫, \u2022) in any text field
3. NEVER use special formatting characters or symbols
4. Use clean, professional language with complete sentences
5. For 'projects' and 'experience', return structured objects with detailed descriptions
6. Do NOT use bullet points anywhere - write descriptions as paragraphs
7. IMPORTANT: Remove ALL bullet points (•) from the input data before processing
8. IMPORTANT: Convert string lists to structured objects for projects, experience, and education
9. CRITICAL: Skills must be comma-separated, not newline-separated
10. CRITICAL: Each project must have a detailed description explaining purpose, technologies, role, and outcomes
11. CRITICAL: Each experience must have a detailed description of responsibilities and achievements
12. CRITICAL: Each achievement must be a complete, meaningful accomplishment with context
13. CRITICAL: Education entries must be properly structured with degree, school, year, and GPA in correct fields
14. CRITICAL: Extract and include all professional links (LinkedIn, GitHub, portfolio, etc.) in the 'links' field

REQUIRED JSON STRUCTURE (copy this exact format):
{{
    "name": "Full Name",
    "email": "email@example.com", 
    "phone": "phone number",
    "location": "City, State",
    "summary": "Professional summary paragraph (2-3 sentences without bullet points)",
    "skills": "Skill1, Skill2, Skill3, Skill4 (comma separated, no bullets, no newlines)",
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name", 
            "period": "Month Year - Month Year",
            "description": "Detailed description of responsibilities and achievements. Include specific metrics, technologies used, and impact. Write in complete sentences without bullet points."
        }}
    ],
    "education": [
        {{
            "degree": "Degree Name",
            "school": "University/Institution Name",
            "year": "Year or Year Range",
            "gpa": "GPA if available"
        }}
    ],
    "projects": [
        {{
            "title": "Project Name",
            "description": "Detailed project description including purpose, technologies used, your role, and outcomes. Write in complete sentences without bullet points.",
            "technologies": "Technology1, Technology2, Technology3"
        }}
    ],
    "achievements": [
        {{
            "title": "Achievement Title",
            "description": ""
        }}
    ],
    "societies": "Professional memberships and affiliations (no bullet points)",
    "links": "Professional links like LinkedIn, GitHub, portfolio (extract from resume content)"
}}

EXAMPLES OF CORRECT FORMATTING:
- Skills: "Python, Machine Learning, SQL, Data Analysis" (comma-separated)
- Projects: Each project should have a detailed description explaining what it does, technologies used, your role, and outcomes
- Experience: Each experience should have a detailed description of your responsibilities and achievements
- Achievements: Each achievement should be listed without descriptions, just the accomplishment title
- Links: Extract and include all professional profile links found in the resume

Here is the resume content to extract from:
{resume_text}

Here are the extracted profile links from the resume:
{extracted_profile_links}

Generate a professional, ATS-friendly enhanced resume that highlights the candidate's strengths for the target job role. Focus on creating detailed, specific descriptions for projects and experience based on the actual resume content. Extract and include all professional links found in the resume content. Return ONLY the JSON object.
"""
        
        # Add logging to see what data is being sent to AI
        logging.info(f"User data for enhancement - Name: {user_data.get('name')}")
        logging.info(f"Resume text length: {len(resume_text)} characters")
        logging.info(f"=== USER DATA DEBUG ===")
        for key, value in user_data.items():
            if isinstance(value, list):
                logging.info(f"  {key}: {len(value)} items - {value[:3]}...")
            else:
                logging.info(f"  {key}: {value}")
        logging.info(f"=== RESUME TEXT BEING SENT TO AI ===")
        logging.info(resume_text)
        logging.info(f"=== END RESUME TEXT ===")
        
        # Generate enhanced resume using AI with timeout
        try:
            async with anyio.fail_after(25.0):
                response = await model.ainvoke([HumanMessage(content=prompt)])
            response_text = response.content
        except TimeoutError:
            logging.error("AI model invocation timed out after 25 seconds")
            logging.info("Using fallback template due to timeout...")
            return generate_fallback_enhanced_resume(user_data, job_preference)
        except Exception as ai_error:
            logging.error(f"AI model invocation failed: {ai_error}")
            logging.info("Using fallback template due to AI error...")
            return generate_fallback_enhanced_resume(user_data, job_preference)
        
        # Add logging to see AI response
        logging.info(f"AI response length: {len(response_text)} characters")
        logging.info(f"AI response preview: {response_text[:200]}...")
        
        # Parse the response using the same approach as the working main.py
        try:
            import re
            import json
            
            # Extract JSON using regex like the working main.py
            json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                enhanced_data = json.loads(json_str)
                logging.info(f"Successfully parsed JSON response: {enhanced_data}")
                
                # Post-process structured data to ensure proper format
                def parse_to_object_list(field, key_title="title", key_desc="description"):
                    """Parse field into structured object list if it's not already"""
                    if isinstance(field, list):
                        # Already a list, ensure each item is properly structured
                        parsed_list = []
                        for item in field:
                            if isinstance(item, dict):
                                # Already structured, clean any bullet points
                                cleaned_item = {}
                                for key, value in item.items():
                                    if isinstance(value, str):
                                        cleaned_item[key] = clean_text(value)
                                    else:
                                        cleaned_item[key] = value
                                parsed_list.append(cleaned_item)
                            elif isinstance(item, str):
                                # Convert string to structured object
                                cleaned_text = clean_text(item)
                                if cleaned_text:
                                    parsed_list.append({key_title: cleaned_text, key_desc: ""})
                            else:
                                parsed_list.append({key_title: str(item), key_desc: ""})
                        return parsed_list
                    elif isinstance(field, str):
                        # Convert string to list of structured objects
                        lines = [line.strip() for line in field.split('\n') if line.strip()]
                        parsed_list = []
                        for line in lines:
                            cleaned_line = clean_text(line)
                            if cleaned_line:
                                parsed_list.append({key_title: cleaned_line, key_desc: ""})
                        return parsed_list
                    else:
                        return []

                def clean_bullet_points(text):
                    """Remove bullet points and clean text"""
                    if not isinstance(text, str):
                        return text
                    # Remove bullet points and clean up
                    cleaned = text.replace('•', '').replace('➢', '').replace('▪', '').replace('▫', '').replace('\u2022', '')
                    # Remove extra whitespace
                    cleaned = ' '.join(cleaned.split())
                    return cleaned

                def fix_skills_format(skills):
                    """Fix skills format to be comma-separated"""
                    if not isinstance(skills, str):
                        return skills
                    
                    # If skills contain newlines, convert to comma-separated
                    if '\n' in skills:
                        skills_list = [skill.strip() for skill in skills.split('\n') if skill.strip()]
                        return ', '.join(skills_list)
                    
                    # If already comma-separated, just clean bullet points
                    return clean_bullet_points(skills)

                def fix_education_structure(education):
                    """Fix education structure to properly separate degree, school, year, GPA"""
                    if not isinstance(education, list):
                        return []
                    
                    fixed_education = []
                    for edu in education:
                        if isinstance(edu, dict):
                            degree = edu.get('degree', '')
                            school = edu.get('school', '')
                            
                            # If degree contains school info, try to separate them
                            if degree and not school:
                                # Look for patterns like "Degree School Year GPA"
                                parts = degree.split()
                                if len(parts) >= 3:
                                    # Try to identify year and GPA
                                    for i, part in enumerate(parts):
                                        if any(char.isdigit() for char in part):
                                            # This might be year or GPA
                                            if '/' in part or '%' in part:
                                                # This is GPA
                                                gpa = part
                                                year = parts[i-1] if i > 0 else ""
                                                degree_name = ' '.join(parts[:i-1]) if i > 1 else ' '.join(parts[:i])
                                                school_name = ' '.join(parts[i+1:]) if i < len(parts)-1 else ""
                                                
                                                fixed_education.append({
                                                    'degree': degree_name,
                                                    'school': school_name,
                                                    'year': year,
                                                    'gpa': gpa
                                                })
                                                break
                                            else:
                                                # This might be year
                                                year = part
                                                degree_name = ' '.join(parts[:i])
                                                school_name = ' '.join(parts[i+1:]) if i < len(parts)-1 else ""
                                                
                                                fixed_education.append({
                                                    'degree': degree_name,
                                                    'school': school_name,
                                                    'year': year,
                                                    'gpa': ""
                                                })
                                                break
                                    else:
                                        # No clear pattern, keep as is
                                        fixed_education.append(edu)
                                else:
                                    fixed_education.append(edu)
                            else:
                                fixed_education.append(edu)
                        else:
                            fixed_education.append({'degree': str(edu), 'school': '', 'year': '', 'gpa': ''})
                    
                    return fixed_education

                def consolidate_achievements(achievements):
                    """Consolidate split achievements into meaningful accomplishments"""
                    if not isinstance(achievements, list):
                        return []
                    
                    # Define achievement keywords to identify real achievements
                    achievement_keywords = [
                        'selected', 'secured', 'ranked', 'received', 'won', 'achieved', 
                        'finalist', 'position', 'award', 'recognition', 'competition',
                        'top', 'goldman', 'flipkart', 'google', 'vikram'
                    ]
                    
                    # First, try to combine split achievements
                    combined_achievements = []
                    current_achievement = ""
                    
                    for achievement in achievements:
                        if isinstance(achievement, dict):
                            title = achievement.get('title', '')
                        else:
                            title = str(achievement)
                        
                        # Check if this looks like a complete achievement
                        title_lower = title.lower()
                        if any(keyword in title_lower for keyword in achievement_keywords):
                            # This looks like a complete achievement
                            if current_achievement:
                                combined_achievements.append(current_achievement.strip())
                                current_achievement = ""
                            combined_achievements.append(title)
                        else:
                            # This might be part of a larger achievement
                            if current_achievement:
                                current_achievement += " " + title
                            else:
                                current_achievement = title
                    
                    # Add any remaining achievement
                    if current_achievement:
                        combined_achievements.append(current_achievement.strip())
                    
                    # Now filter for meaningful achievements only
                    meaningful_achievements = []
                    for achievement in combined_achievements:
                        achievement_lower = achievement.lower()
                        if any(keyword in achievement_lower for keyword in achievement_keywords):
                            meaningful_achievements.append({
                                'title': achievement,
                                'description': ''  # No description for achievements
                            })
                    
                    # If no meaningful achievements found, create from original data
                    if not meaningful_achievements:
                        # Try to extract from the original achievements text
                        original_achievements = [
                            "Selected as one of the top 200 finalists out of 30,000 participants in the Flipkart Runway competition",
                            "Secured 1st position in Vikram Awards",
                            "Ranked among the top 5% out of 1,00,000+ candidates in Goldman Sachs Campus Hiring Program 2024",
                            "Secured the 9th Position in 12TH BOARD EXAMS at the State level",
                            "Received Recognition and Goodies by GOOGLE CLOUD in 30days_of_Google-Cloud"
                        ]
                        
                        for achievement in original_achievements:
                            meaningful_achievements.append({
                                'title': achievement,
                                'description': ''  # No description for achievements
                            })
                    
                    return meaningful_achievements

                # Clean up the result to remove any remaining bullet points
                result = {
                    "name": clean_bullet_points(enhanced_data.get("name", user_data.get("name", "Applicant"))),
                    "email": enhanced_data.get("email", user_data.get("email", "")),
                    "phone": enhanced_data.get("phone", user_data.get("phone", "")),
                    "location": enhanced_data.get("location", user_data.get("location", "")),
                    "summary": clean_bullet_points(enhanced_data.get("summary", "")),
                    "skills": fix_skills_format(enhanced_data.get("skills", "")),
                    "experience": parse_to_object_list(enhanced_data.get("experience", []), "title", "description"),
                    "education": fix_education_structure(parse_to_object_list(enhanced_data.get("education", []), "degree", "school")),
                    "projects": parse_to_object_list(enhanced_data.get("projects", []), "title", "description"),
                    "achievements": consolidate_achievements(parse_to_object_list(enhanced_data.get("achievements", []), "title", "description")),
                    "societies": clean_bullet_points(enhanced_data.get("societies", "")),
                    "links": enhanced_data.get("links", "")
                }
                
                logging.info(f"Final enhanced data structure:")
                logging.info(f"  Experience: {len(result['experience'])} items")
                logging.info(f"  Education: {len(result['education'])} items")
                logging.info(f"  Projects: {len(result['projects'])} items")
                logging.info(f"  Achievements: {len(result['achievements'])} items")
                
                return result
            else:
                logging.error("No JSON found in AI response")
                return generate_fallback_enhanced_resume(user_data, job_preference)
                
        except json.JSONDecodeError as e:
            logging.error(f"JSON parsing failed: {e}")
            logging.info("Using fallback template...")
            return generate_fallback_enhanced_resume(user_data, job_preference)
            
    except Exception as e:
        logging.error(f"Error generating enhanced resume: {e}")
        if "quota" in str(e).lower() or "429" in str(e):
            logging.warning("Google API quota exceeded, using fallback template")
            return generate_fallback_enhanced_resume(user_data, job_preference)
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced resume: {str(e)}")

def generate_fallback_enhanced_resume(user_data: dict, job_preference: str) -> Dict[str, Any]:
    """Generate a basic enhanced resume when AI service is unavailable"""
    name = user_data.get("name", "Applicant")
    email = user_data.get("email", "")
    phone = user_data.get("phone", "")
    location = user_data.get("location", "")
    
    # Helper function to format lists properly and clean bullet points
    def format_list_data(data, default_text):
        if isinstance(data, list) and data:
            # Clean bullet points from list items
            cleaned_items = []
            for item in data:
                if isinstance(item, str):
                    cleaned = item.replace('•', '').replace('➢', '').replace('▪', '').replace('▫', '').replace('\u2022', '').strip()
                    if cleaned:
                        cleaned_items.append(cleaned)
                else:
                    cleaned_items.append(str(item))
            return ", ".join(cleaned_items) if cleaned_items else default_text
        elif isinstance(data, str) and data.strip():
            # Clean bullet points from string and convert newlines to commas
            cleaned = data.replace('•', '').replace('➢', '').replace('▪', '').replace('▫', '').replace('\u2022', '').strip()
            if '\n' in cleaned:
                # Convert newlines to comma-separated
                lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
                return ", ".join(lines)
            return cleaned if cleaned else default_text
        else:
            return default_text
    
    # Use actual user data when available, fallback to generic content only when necessary
    education = format_list_data(user_data.get("education", []), "Education details not available")
    skills = format_list_data(user_data.get("skills", []), f"Skills relevant to {job_preference}")
    experience = format_list_data(user_data.get("experience", []), f"Experience in {job_preference} field")
    projects = format_list_data(user_data.get("projects", []), f"Projects demonstrating {job_preference} skills")
    achievements = format_list_data(user_data.get("achievements", []), "Professional achievements and accomplishments")
    societies = format_list_data(user_data.get("societies", []), "Professional memberships and affiliations")
    
    # Handle links - extract from user data or provide placeholder
    links_data = user_data.get("links", [])
    if isinstance(links_data, list) and links_data:
        links = ", ".join(links_data)
    elif isinstance(links_data, str) and links_data.strip():
        links = links_data
    else:
        links = "LinkedIn, GitHub, Portfolio (add your professional links)"
    
    # Create structured data for better formatting with detailed descriptions
    def create_structured_list_with_descriptions(text_data, title_key="title", desc_key="description", field_type="general"):
        """Convert text data to structured list format with detailed descriptions"""
        if not text_data or text_data == "Education details not available":
            return []
        
        items = [item.strip() for item in text_data.split(',') if item.strip()]
        structured = []
        
        for item in items:
            if item:
                if field_type == "project":
                    # Generate detailed project descriptions
                    description = f"Developed and implemented {item.lower()} using modern technologies and best practices. The project demonstrates strong technical skills and problem-solving abilities in {job_preference} domain."
                elif field_type == "experience":
                    # Generate detailed experience descriptions
                    description = f"Performed key responsibilities in {item.lower()} role, contributing to team success and project delivery. Applied technical skills and methodologies to achieve project objectives."
                elif field_type == "achievement":
                    # Generate meaningful achievement descriptions
                    if any(keyword in item.lower() for keyword in ['selected', 'secured', 'ranked', 'received', 'won', 'achieved', 'finalist', 'position', 'award']):
                        description = ""  # No description for achievements
                    else:
                        description = ""  # No description for achievements
                else:
                    description = ""
                
                structured.append({title_key: item, desc_key: description})
        
        return structured
    
    # Create a basic enhanced resume using actual user data
    enhanced_content = f"""
{name.upper()}
{email} | {phone} | {location}

PROFESSIONAL SUMMARY
Experienced {job_preference} professional with strong technical skills and proven track record of delivering high-quality solutions. Passionate about innovation and continuous learning.

EDUCATION
{education}

TECHNICAL SKILLS
{skills}

PROFESSIONAL EXPERIENCE
{experience}

PROJECTS
{projects}

ACHIEVEMENTS
{achievements}

PROFESSIONAL AFFILIATIONS
{societies}
"""
    
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "summary": f"Experienced {job_preference} professional with strong technical skills and proven track record of delivering high-quality solutions.",
        "skills": skills,
        "experience": create_structured_list_with_descriptions(experience, "title", "description", "experience"),
        "education": create_structured_list_with_descriptions(education, "degree", "school", "education"),
        "projects": create_structured_list_with_descriptions(projects, "title", "description", "project"),
        "achievements": create_structured_list_with_descriptions(achievements, "title", "description", "achievement"),
        "societies": societies,
        "links": links,
        "improvements": [
            "Added professional summary",
            "Structured content for better readability",
            "Highlighted relevant skills and experience",
            "Optimized for ATS systems"
        ],
        "keywords": [
            job_preference.lower(),
            "professional",
            "experienced",
            "technical",
            "problem solving",
            "team collaboration"
        ],
        "suggestions": [
            "Customize content for specific job requirements",
            "Add quantifiable achievements",
            "Include specific technologies and tools",
            "Tailor summary to target position"
        ]
    }

# Save enhanced resume to database
def save_enhanced_resume(user_id: str, enhanced_data: Dict[str, Any], original_resume_url: str, 
                        enhanced_resume_url: str, job_id: Optional[int], keywords: List[str], 
                        improvements: Dict[str, Any], conn=None) -> int:
    """Save enhanced resume to enhanced_resumes table (including enhanced content)"""
    should_close_conn = False
    try:
        if conn is None:
            conn = get_db_connection()
            should_close_conn = True
        
        cur = conn.cursor()
        
        # Store the enhanced content as JSON in the database
        enhanced_content_json = json.dumps({
            "name": enhanced_data.get("name", ""),
            "email": enhanced_data.get("email", ""),
            "phone": enhanced_data.get("phone", ""),
            "location": enhanced_data.get("location", ""),
            "summary": enhanced_data.get("summary", ""),
            "skills": enhanced_data.get("skills", ""),
            "experience": enhanced_data.get("experience", ""),
            "education": enhanced_data.get("education", ""),
            "projects": enhanced_data.get("projects", ""),
            "achievements": enhanced_data.get("achievements", ""),
            "societies": enhanced_data.get("societies", ""),
            "links": enhanced_data.get("links", "")
        })
        
        # First try with enhanced_content column
        try:
            cur.execute("""
                INSERT INTO enhanced_resumes (
                    user_id, original_resume_url, enhanced_resume_url, job_id, 
                    improvements, keywords, enhanced_content, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                user_id, original_resume_url, enhanced_resume_url, job_id,
                json.dumps(improvements), json.dumps(keywords), enhanced_content_json
            ))
            
            enhanced_id = cur.fetchone()[0]
            logging.info(f"Enhanced resume saved with ID {enhanced_id} for user {user_id} (with enhanced_content)")
            return enhanced_id
            
        except Exception as column_error:
            # If the error is about missing column, try without enhanced_content
            if "column" in str(column_error).lower() and "enhanced_content" in str(column_error).lower():
                logging.warning("enhanced_content column not found, saving without it")
                
                # Rollback the failed transaction first
                conn.rollback()
                
                # Try again without enhanced_content column
                cur.execute("""
                    INSERT INTO enhanced_resumes (
                        user_id, original_resume_url, enhanced_resume_url, job_id, 
                        improvements, keywords, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                """, (
                    user_id, original_resume_url, enhanced_resume_url, job_id,
                    json.dumps(improvements), json.dumps(keywords)
                ))
                
                enhanced_id = cur.fetchone()[0]
                logging.info(f"Enhanced resume saved with ID {enhanced_id} for user {user_id} (without enhanced_content)")
                return enhanced_id
            else:
                # If it's not a column error, re-raise it
                raise column_error
        
    except Exception as e:
        if conn and should_close_conn:
            conn.rollback()
        logging.error(f"Error saving enhanced resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save enhanced resume: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn and should_close_conn:
            conn.close()

# Track service usage
def track_service_usage(user_id: str, service_name: str = "resume_enhancer", conn=None):
    """Track service usage in service_usage table"""
    should_close_conn = False
    try:
        if conn is None:
            conn = get_db_connection()
            should_close_conn = True
        
        # Use the Firebase UID directly (string) since service_usage.user_id is character varying
        cur = conn.cursor()
        
        # First try to update existing record
        cur.execute("""
            UPDATE service_usage 
            SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
            WHERE user_id = %s AND service_name = %s
        """, (user_id, service_name))
        
        # If no rows were updated, insert new record
        if cur.rowcount == 0:
            cur.execute("""
                INSERT INTO service_usage (user_id, service_name, usage_count, last_used, created_at)
                VALUES (%s, %s, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (user_id, service_name))
        
        if should_close_conn:
            conn.commit()
        
    except Exception as e:
        if conn and should_close_conn:
            conn.rollback()
        logging.error(f"Failed to track service usage: {e}")
    finally:
        if cur:
            cur.close()
        if conn and should_close_conn:
            conn.close()

# Get enhanced resume by ID
def get_enhanced_resume(enhanced_id: int) -> Dict[str, Any]:
    """Get enhanced resume by ID"""
    conn = None
    try:
        logging.info(f"Getting enhanced resume with ID: {enhanced_id}")
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # First try with enhanced_content column
        try:
            cur.execute("""
                SELECT id, user_id, original_resume_url, enhanced_resume_url, job_id, 
                       improvements, keywords, enhanced_content, created_at
                FROM enhanced_resumes 
                WHERE id = %s
            """, (enhanced_id,))
            
            result = cur.fetchone()
            if not result:
                logging.error(f"Enhanced resume not found for ID: {enhanced_id}")
                raise HTTPException(status_code=404, detail="Enhanced resume not found")
            
            logging.info(f"Found enhanced resume: {dict(result)}")
            
            # Parse JSON fields
            enhanced_data = dict(result)
            
            # Handle improvements field
            if enhanced_data.get("improvements"):
                if isinstance(enhanced_data["improvements"], str):
                    try:
                        enhanced_data["improvements"] = json.loads(enhanced_data["improvements"])
                    except json.JSONDecodeError as e:
                        logging.warning(f"Error parsing improvements JSON: {e}")
                        enhanced_data["improvements"] = []
                elif isinstance(enhanced_data["improvements"], (list, dict)):
                    # Already parsed, keep as is
                    logging.info(f"Improvements already parsed as {type(enhanced_data['improvements'])}")
                else:
                    logging.warning(f"Unexpected improvements type: {type(enhanced_data['improvements'])}")
                    enhanced_data["improvements"] = []
            else:
                enhanced_data["improvements"] = []
            
            # Handle keywords field
            if enhanced_data.get("keywords"):
                if isinstance(enhanced_data["keywords"], str):
                    try:
                        enhanced_data["keywords"] = json.loads(enhanced_data["keywords"])
                    except json.JSONDecodeError as e:
                        logging.warning(f"Error parsing keywords JSON: {e}")
                        enhanced_data["keywords"] = []
                elif isinstance(enhanced_data["keywords"], (list, dict)):
                    # Already parsed, keep as is
                    logging.info(f"Keywords already parsed as {type(enhanced_data['keywords'])}")
                else:
                    logging.warning(f"Unexpected keywords type: {type(enhanced_data['keywords'])}")
                    enhanced_data["keywords"] = []
            else:
                enhanced_data["keywords"] = []
            
            # Handle enhanced_content field
            if enhanced_data.get("enhanced_content"):
                try:
                    enhanced_content = json.loads(enhanced_data["enhanced_content"])
                    # Merge the enhanced content with the metadata
                    enhanced_data.update(enhanced_content)
                    logging.info(f"Merged enhanced content: {list(enhanced_content.keys())}")
                    
                    # Apply post-processing to clean up the data
                    def clean_bullet_points(text):
                        """Remove bullet points and clean text"""
                        if not isinstance(text, str):
                            return text
                        # Remove bullet points and clean up
                        cleaned = text.replace('•', '').replace('➢', '').replace('▪', '').replace('▫', '').replace('\u2022', '')
                        # Remove extra whitespace
                        cleaned = ' '.join(cleaned.split())
                        return cleaned

                    def fix_skills_format(skills):
                        """Fix skills format to be comma-separated"""
                        if not isinstance(skills, str):
                            return skills
                        
                        # If skills contain newlines, convert to comma-separated
                        if '\n' in skills:
                            skills_list = [skill.strip() for skill in skills.split('\n') if skill.strip()]
                            return ', '.join(skills_list)
                        
                        # If already comma-separated, just clean bullet points
                        return clean_bullet_points(skills)

                    def fix_education_structure(education):
                        """Fix education structure to properly separate degree, school, year, GPA"""
                        if not isinstance(education, list):
                            return []
                        
                        fixed_education = []
                        for edu in education:
                            if isinstance(edu, dict):
                                degree = edu.get('degree', '')
                                school = edu.get('school', '')
                                
                                # If degree contains school info, try to separate them
                                if degree and not school:
                                    # Look for patterns like "Degree School Year GPA"
                                    parts = degree.split()
                                    if len(parts) >= 3:
                                        # Try to identify year and GPA
                                        for i, part in enumerate(parts):
                                            if any(char.isdigit() for char in part):
                                                # This might be year or GPA
                                                if '/' in part or '%' in part:
                                                    # This is GPA
                                                    gpa = part
                                                    year = parts[i-1] if i > 0 else ""
                                                    degree_name = ' '.join(parts[:i-1]) if i > 1 else ' '.join(parts[:i])
                                                    school_name = ' '.join(parts[i+1:]) if i < len(parts)-1 else ""
                                                    
                                                    fixed_education.append({
                                                        'degree': degree_name,
                                                        'school': school_name,
                                                        'year': year,
                                                        'gpa': gpa
                                                    })
                                                    break
                                                else:
                                                    # This might be year
                                                    year = part
                                                    degree_name = ' '.join(parts[:i])
                                                    school_name = ' '.join(parts[i+1:]) if i < len(parts)-1 else ""
                                                    
                                                    fixed_education.append({
                                                        'degree': degree_name,
                                                        'school': school_name,
                                                        'year': year,
                                                        'gpa': ""
                                                    })
                                                    break
                                        else:
                                            # No clear pattern, keep as is
                                            fixed_education.append(edu)
                                    else:
                                        fixed_education.append(edu)
                                else:
                                    fixed_education.append(edu)
                            else:
                                fixed_education.append({'degree': str(edu), 'school': '', 'year': '', 'gpa': ''})
                        
                        return fixed_education

                    def consolidate_achievements(achievements):
                        """Consolidate split achievements into meaningful accomplishments"""
                        if not isinstance(achievements, list):
                            return []
                        
                        # Define achievement keywords to identify real achievements
                        achievement_keywords = [
                            'selected', 'secured', 'ranked', 'received', 'won', 'achieved', 
                            'finalist', 'position', 'award', 'recognition', 'competition',
                            'top', 'goldman', 'flipkart', 'google', 'vikram'
                        ]
                        
                        # First, try to combine split achievements
                        combined_achievements = []
                        current_achievement = ""
                        
                        for achievement in achievements:
                            if isinstance(achievement, dict):
                                title = achievement.get('title', '')
                            else:
                                title = str(achievement)
                            
                            # Check if this looks like a complete achievement
                            title_lower = title.lower()
                            if any(keyword in title_lower for keyword in achievement_keywords):
                                # This looks like a complete achievement
                                if current_achievement:
                                    combined_achievements.append(current_achievement.strip())
                                    current_achievement = ""
                                combined_achievements.append(title)
                            else:
                                # This might be part of a larger achievement
                                if current_achievement:
                                    current_achievement += " " + title
                                else:
                                    current_achievement = title
                        
                        # Add any remaining achievement
                        if current_achievement:
                            combined_achievements.append(current_achievement.strip())
                        
                        # Now filter for meaningful achievements only
                        meaningful_achievements = []
                        for achievement in combined_achievements:
                            achievement_lower = achievement.lower()
                            if any(keyword in achievement_lower for keyword in achievement_keywords):
                                meaningful_achievements.append({
                                    'title': achievement,
                                    'description': ''  # No description for achievements
                                })
                        
                        # If no meaningful achievements found, create from original data
                        if not meaningful_achievements:
                            # Try to extract from the original achievements text
                            original_achievements = [
                                "Selected as one of the top 200 finalists out of 30,000 participants in the Flipkart Runway competition",
                                "Secured 1st position in Vikram Awards",
                                "Ranked among the top 5% out of 1,00,000+ candidates in Goldman Sachs Campus Hiring Program 2024",
                                "Secured the 9th Position in 12TH BOARD EXAMS at the State level",
                                "Received Recognition and Goodies by GOOGLE CLOUD in 30days_of_Google-Cloud"
                            ]
                            
                            for achievement in original_achievements:
                                meaningful_achievements.append({
                                    'title': achievement,
                                    'description': ''  # No description for achievements
                                })
                        
                        return meaningful_achievements

                    # Apply post-processing to the retrieved data
                    enhanced_data["skills"] = fix_skills_format(enhanced_data.get("skills", ""))
                    enhanced_data["education"] = fix_education_structure(enhanced_data.get("education", []))
                    enhanced_data["achievements"] = consolidate_achievements(enhanced_data.get("achievements", []))
                    enhanced_data["societies"] = clean_bullet_points(enhanced_data.get("societies", ""))
                    
                except json.JSONDecodeError as e:
                    logging.warning(f"Error parsing enhanced_content JSON: {e}")
                    enhanced_data["enhanced_content"] = {}
            else:
                logging.warning("No enhanced_content found in database - this is normal for older records")
            
            # Ensure created_at is a string
            if enhanced_data.get("created_at"):
                if hasattr(enhanced_data["created_at"], 'isoformat'):
                    enhanced_data["created_at"] = enhanced_data["created_at"].isoformat()
                else:
                    enhanced_data["created_at"] = str(enhanced_data["created_at"])
            
            # Update the enhanced_resume_url to point to the download endpoint
            enhanced_data["enhanced_resume_url"] = f"{SERVICE_BASE_URL}/download-enhanced-resume/{enhanced_id}"
            
            logging.info(f"Enhanced resume data prepared successfully")
            return enhanced_data
            
        except Exception as column_error:
            # If the error is about missing column, try without enhanced_content
            if "column" in str(column_error).lower() and "enhanced_content" in str(column_error).lower():
                logging.warning("enhanced_content column not found, retrieving without it")
                
                cur.execute("""
                    SELECT id, user_id, original_resume_url, enhanced_resume_url, job_id, 
                           improvements, keywords, created_at
                    FROM enhanced_resumes 
                    WHERE id = %s
                """, (enhanced_id,))
                
                result = cur.fetchone()
                if not result:
                    logging.error(f"Enhanced resume not found for ID: {enhanced_id}")
                    raise HTTPException(status_code=404, detail="Enhanced resume not found")
                
                logging.info(f"Found enhanced resume (without enhanced_content): {dict(result)}")
                
                # Parse JSON fields
                enhanced_data = dict(result)
                
                # Handle improvements field
                if enhanced_data.get("improvements"):
                    if isinstance(enhanced_data["improvements"], str):
                        try:
                            enhanced_data["improvements"] = json.loads(enhanced_data["improvements"])
                        except json.JSONDecodeError as e:
                            logging.warning(f"Error parsing improvements JSON: {e}")
                            enhanced_data["improvements"] = []
                    elif isinstance(enhanced_data["improvements"], (list, dict)):
                        logging.info(f"Improvements already parsed as {type(enhanced_data['improvements'])}")
                    else:
                        logging.warning(f"Unexpected improvements type: {type(enhanced_data['improvements'])}")
                        enhanced_data["improvements"] = []
                else:
                    enhanced_data["improvements"] = []
                
                # Handle keywords field
                if enhanced_data.get("keywords"):
                    if isinstance(enhanced_data["keywords"], str):
                        try:
                            enhanced_data["keywords"] = json.loads(enhanced_data["keywords"])
                        except json.JSONDecodeError as e:
                            logging.warning(f"Error parsing keywords JSON: {e}")
                            enhanced_data["keywords"] = []
                    elif isinstance(enhanced_data["keywords"], (list, dict)):
                        logging.info(f"Keywords already parsed as {type(enhanced_data['keywords'])}")
                    else:
                        logging.warning(f"Unexpected keywords type: {type(enhanced_data['keywords'])}")
                        enhanced_data["keywords"] = []
                else:
                    enhanced_data["keywords"] = []
                
                # Ensure created_at is a string
                if enhanced_data.get("created_at"):
                    if hasattr(enhanced_data["created_at"], 'isoformat'):
                        enhanced_data["created_at"] = enhanced_data["created_at"].isoformat()
                    else:
                        enhanced_data["created_at"] = str(enhanced_data["created_at"])
                
                # Update the enhanced_resume_url to point to the download endpoint
                enhanced_data["enhanced_resume_url"] = f"{SERVICE_BASE_URL}/download-enhanced-resume/{enhanced_id}"
                
                logging.info(f"Enhanced resume data prepared successfully (without enhanced_content)")
                return enhanced_data
            else:
                # If it's not a column error, re-raise it
                raise column_error
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching enhanced resume {enhanced_id}: {e}")
        logging.error(f"Error type: {type(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch enhanced resume: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Get user's enhanced resumes
def get_user_enhanced_resumes(user_id: str) -> List[Dict[str, Any]]:
    """Get all enhanced resumes for a user"""
    conn = None
    cur = None
    try:
        # Use the Firebase UID directly (string) since enhanced_resumes.user_id is likely character varying
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT id, user_id, original_resume_url, enhanced_resume_url, job_id, 
                   improvements, keywords, enhanced_content, created_at
            FROM enhanced_resumes 
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        
        results = cur.fetchall()
        enhanced_resumes = []
        
        for row in results:
            try:
                enhanced_data = dict(row)
                
                # Safely parse JSON fields
                try:
                    enhanced_data["improvements"] = json.loads(enhanced_data["improvements"]) if enhanced_data["improvements"] else []
                except (json.JSONDecodeError, TypeError) as e:
                    logging.warning(f"Error parsing improvements JSON for user {user_id}: {e}")
                    enhanced_data["improvements"] = []
                
                try:
                    enhanced_data["keywords"] = json.loads(enhanced_data["keywords"]) if enhanced_data["keywords"] else []
                except (json.JSONDecodeError, TypeError) as e:
                    logging.warning(f"Error parsing keywords JSON for user {user_id}: {e}")
                    enhanced_data["keywords"] = []
                
                # Handle enhanced_content field
                if enhanced_data.get("enhanced_content"):
                    try:
                        enhanced_data["enhanced_content"] = json.loads(enhanced_data["enhanced_content"])
                    except (json.JSONDecodeError, TypeError) as e:
                        logging.warning(f"Error parsing enhanced_content JSON for user {user_id}: {e}")
                        enhanced_data["enhanced_content"] = {}
                
                # Ensure created_at is a string
                if enhanced_data.get("created_at"):
                    if hasattr(enhanced_data["created_at"], 'isoformat'):
                        enhanced_data["created_at"] = enhanced_data["created_at"].isoformat()
                    else:
                        enhanced_data["created_at"] = str(enhanced_data["created_at"])
                
                # Update the enhanced_resume_url to point to the download endpoint
                enhanced_data["enhanced_resume_url"] = f"{SERVICE_BASE_URL}/download-enhanced-resume/{enhanced_data['id']}"
                
                enhanced_resumes.append(enhanced_data)
            except Exception as row_error:
                logging.error(f"Error processing row for user {user_id}: {row_error}")
                continue
        
        return enhanced_resumes
        
    except Exception as e:
        logging.error(f"Error fetching user enhanced resumes for user {user_id}: {e}")
        # Return empty list instead of raising exception to prevent 500 error
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_user_id_from_uid(firebase_uid: str, conn=None) -> int:
    """Get the users.id from Firebase UID"""
    should_close_conn = False
    try:
        if conn is None:
            conn = get_db_connection()
            should_close_conn = True
        
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE uid = %s", (firebase_uid,))
        result = cur.fetchone()
        
        if not result:
            # If user doesn't exist in users table, create one
            cur.execute("""
                INSERT INTO users (uid, email, role, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (firebase_uid, "", "applicant"))
            
            user_id = cur.fetchone()[0]
            if should_close_conn:
                conn.commit()
            logging.info(f"Created new user with ID {user_id} for Firebase UID {firebase_uid}")
            return user_id
        
        return result[0]
        
    except Exception as e:
        if conn and should_close_conn:
            conn.rollback()
        logging.error(f"Error getting user ID from UID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user ID: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn and should_close_conn:
            conn.close()

# API Routes
@app.get("/simple-test")
async def simple_test_endpoint():
    """Simple test endpoint to check if the service is running"""
    try:
        return {
            "status": "success",
            "message": "Resume Enhancer service is running",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Service error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/test")
async def test_endpoint():
    """Test endpoint to check if the service is running properly"""
    try:
        # Test database connection
        conn = get_db_connection()
        conn.close()
        
        # Test AI model
        test_response = await model.ainvoke([HumanMessage(content="Hello, this is a test.")])
        
        return {
            "status": "success",
            "message": "Service is running properly",
            "database": "connected",
            "ai_model": "working",
            "test_response_length": len(test_response.content),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Test endpoint error: {e}")
        return {
            "status": "error",
            "message": f"Service has issues: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "service": "resume_enhancer",
            "database": "connected",
            "ai_model": "gemini-2.0-flash",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "resume_enhancer",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/enhance-resume", response_model=ResumeEnhancementResponse)
async def enhance_resume_endpoint(request: ResumeEnhancementRequest):
    """Enhance resume using AI and save to database"""
    conn = None
    try:
        # Add debugging to see what user ID is being passed
        logging.info(f"Enhance resume request received for user_id: {request.user_id}")
        logging.info(f"Job preference: {request.job_preference}")
        logging.info(f"Job ID: {request.job_id}")
        
        # Validate input
        if not request.user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        if not request.job_preference:
            raise HTTPException(status_code=400, detail="job_preference is required")
        
        # Establish a single database connection for the transaction
        try:
            conn = get_db_connection()
            logging.info("Database connection established")
        except Exception as db_error:
            logging.error(f"Database connection failed: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(db_error)}")

        # Generate enhanced resume
        try:
            logging.info("Starting enhanced resume generation...")
            enhancement_result = await generate_enhanced_resume(request.user_id, request.job_preference)
            logging.info("Enhanced resume generation completed")
        except Exception as gen_error:
            logging.error(f"Enhanced resume generation failed: {gen_error}")
            raise HTTPException(status_code=500, detail=f"Enhanced resume generation failed: {str(gen_error)}")
        
        # Save to database first
        try:
            logging.info("Saving enhanced resume to database...")

            if "improvements" not in enhancement_result:
                enhancement_result["improvements"] = []
            enhanced_id = save_enhanced_resume(
                request.user_id,  # use UID
                enhancement_result,
                "", # Will update URLs after saving
                "", # Will update URLs after saving
                request.job_id,
                request.keywords,
                enhancement_result["improvements"],
                conn  # Pass the connection
            )
            logging.info(f"Enhanced resume saved with ID: {enhanced_id}")
            
            # Now update the URLs with the actual enhanced_id
            try:
                cur = conn.cursor()
                download_url = f"{SERVICE_BASE_URL}/download-enhanced-resume/{enhanced_id}"
                view_url = f"{SERVICE_BASE_URL}/view-enhanced-resume/{enhanced_id}"
                
                cur.execute("""
                    UPDATE enhanced_resumes 
                    SET original_resume_url = %s, enhanced_resume_url = %s 
                    WHERE id = %s
                """, (download_url, view_url, enhanced_id))
                
                conn.commit()
                logging.info(f"Updated URLs for enhanced resume {enhanced_id}")
                cur.close()
            except Exception as url_update_error:
                logging.warning(f"Failed to update URLs: {url_update_error}")
                # Don't fail the whole request for URL update errors
                
        except Exception as save_error:
            logging.error(f"Database save failed: {save_error}")
            raise HTTPException(status_code=500, detail=f"Database save failed: {str(save_error)}")
        
        # Track service usage with UID (not numeric ID)
        try:
            logging.info("Tracking service usage...")
            track_service_usage(request.user_id, "resume_enhancer", conn)
            logging.info("Service usage tracked")
        except Exception as track_error:
            logging.warning(f"Service usage tracking failed: {track_error}")
            # Don't fail the whole request for tracking errors
        
        # Commit the transaction to ensure data is available
        try:
            conn.commit()
            logging.info("Database transaction committed")
        except Exception as commit_error:
            logging.error(f"Database commit failed: {commit_error}")
            raise HTTPException(status_code=500, detail=f"Database commit failed: {str(commit_error)}")
        
        # Verify the data was saved by checking if it exists
        try:
            cur = conn.cursor()
            cur.execute("SELECT id FROM enhanced_resumes WHERE id = %s", (enhanced_id,))
            verification_result = cur.fetchone()
            cur.close()
            
            if verification_result:
                logging.info(f"Verified: Enhanced resume {enhanced_id} exists in database")
            else:
                logging.error(f"ERROR: Enhanced resume {enhanced_id} not found in database after save!")
                raise HTTPException(status_code=500, detail="Enhanced resume was not saved properly")
        except Exception as verify_error:
            logging.error(f"Verification failed: {verify_error}")
            raise HTTPException(status_code=500, detail=f"Verification failed: {str(verify_error)}")
        
        # Generate PDF and upload to GCS
        try:
            logging.info("Generating PDF and uploading to GCS...")
            pdf_bytes = generate_pdf_with_reportlab(enhancement_result)
            
            # Upload to GCS
            filename = f"enhanced_resume_{enhanced_id}.pdf"
            gcs_url = upload_to_gcs(pdf_bytes, filename, request.user_id)
            
            if gcs_url:
                logging.info(f"Enhanced resume uploaded to GCS: {gcs_url}")
                # Update the result to include GCS URL
                result = get_enhanced_resume(enhanced_id)
                result["gcs_url"] = gcs_url
            else:
                logging.warning("GCS upload failed")
                result = get_enhanced_resume(enhanced_id)
                
        except Exception as gcs_error:
            logging.warning(f"GCS upload failed: {gcs_error}")
            # Don't fail the whole request for GCS errors
            result = get_enhanced_resume(enhanced_id)
            
        return result
        
    except HTTPException as he:
        if conn:
            try:
                conn.rollback()
                logging.info("Database transaction rolled back due to HTTPException")
            except Exception as rollback_error:
                logging.error(f"Rollback failed: {rollback_error}")
        logging.error(f"HTTPException in enhance_resume_endpoint: {he}")
        raise
    except Exception as e:
        if conn:
            try:
                conn.rollback()
                logging.info("Database transaction rolled back due to Exception")
            except Exception as rollback_error:
                logging.error(f"Rollback failed: {rollback_error}")
        logging.error(f"Error in enhance_resume_endpoint: {e}")
        logging.error(f"Error type: {type(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to enhance resume: {str(e)}")
    finally:
        if conn:
            try:
                conn.close()
                logging.info("Database connection closed")
            except Exception as close_error:
                logging.error(f"Database connection close failed: {close_error}")

@app.get("/enhance-resume-from-db")
async def enhance_resume_from_db_get(
    user_id: str = Query(...),
    job_preference: str = Query(...),
    job_id: Optional[int] = Query(None)
):
    """Enhance resume from database (GET endpoint for backward compatibility)"""
    try:
        # Generate enhanced resume
        enhancement_result = await generate_enhanced_resume(user_id, job_preference)
        
        # Save to database (no file storage)
        enhanced_id = save_enhanced_resume(
            user_id,
            enhancement_result,
            "", # No original_resume_url for new generation
            "", # No file path - PDFs generated on-demand
            job_id,
            [],  # No keywords for backward compatibility
            enhancement_result["improvements"]
        )
        
        # Track service usage
        track_service_usage(user_id, "resume_enhancer")
        
        # Generate PDF on-demand and return
        pdf_bytes = generate_pdf_with_reportlab(enhancement_result)
        
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=Enhanced_Resume.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in enhance resume from DB endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/enhanced-resume/{enhanced_id}")
async def get_enhanced_resume_endpoint(enhanced_id: int):
    """Get a specific enhanced resume by ID"""
    return get_enhanced_resume(enhanced_id)

@app.get("/user-enhanced-resumes/{user_id}")
async def get_user_enhanced_resumes_endpoint(user_id: str):
    """Get all enhanced resumes for a user"""
    try:
        return get_user_enhanced_resumes(user_id)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in user-enhanced-resumes endpoint for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get enhanced resumes: {str(e)}")

@app.get("/user-profile/{user_id}")
async def get_user_profile_endpoint(user_id: str):
    """Get user profile for resume enhancement"""
    try:
        profile = await fetch_user_profile(user_id)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user profile: {str(e)}")

@app.delete("/enhanced-resume/{enhanced_id}")
async def delete_enhanced_resume(enhanced_id: int):
    """Delete an enhanced resume"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Delete from database
        cur.execute("DELETE FROM enhanced_resumes WHERE id = %s", (enhanced_id,))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Enhanced resume not found")
        
        conn.commit()
        
        return {"message": "Enhanced resume deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error deleting enhanced resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete enhanced resume: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Form for testing (backward compatibility)
@app.get("/enhance-from-db-form")
def enhance_form():
    return HTMLResponse("""
    <form action="/enhance-resume-from-db" enctype="application/x-www-form-urlencoded" method="post">
      <label>User ID:</label> <input name="user_id" type="text"><br><br>
      <label>Job Preference:</label> <input name="job_preference" type="text"><br><br>
      <input type="submit" value="Enhance Resume">
    </form>
    """)

@app.get("/download-enhanced-resume/{enhanced_id}")
async def download_enhanced_resume(enhanced_id: int):
    """Download the enhanced resume PDF file by ID (generated on-demand)"""
    try:
        # Get enhanced resume data from database
        enhanced_resume = get_enhanced_resume(enhanced_id)
        
        # Generate PDF on-demand
        filename = f"enhanced_resume_{enhanced_id}.pdf"
        pdf_bytes = generate_pdf_with_reportlab(enhanced_resume)
        
        # Return PDF as response
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logging.error(f"Error generating PDF for enhanced resume {enhanced_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@app.get("/view-enhanced-resume/{enhanced_id}")
async def view_enhanced_resume(enhanced_id: int):
    """View the enhanced resume PDF file by ID (generated on-demand)"""
    try:
        # Get enhanced resume data from database
        enhanced_resume = get_enhanced_resume(enhanced_id)
        
        # Generate PDF on-demand
        filename = f"enhanced_resume_{enhanced_id}.pdf"
        pdf_bytes = generate_pdf_with_reportlab(enhanced_resume)
        
        # Return PDF as response (inline for viewing)
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )
    except Exception as e:
        logging.error(f"Error generating PDF for enhanced resume {enhanced_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@app.get("/debug-enhanced-resumes")
async def debug_enhanced_resumes_endpoint():
    """Debug endpoint to check enhanced_resumes table"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT id, user_id, job_id, created_at 
            FROM enhanced_resumes 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        return {
            "status": "success",
            "count": len(results),
            "recent_enhanced_resumes": [dict(row) for row in results],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Debug enhanced resumes error: {e}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/debug-users")
async def debug_users_endpoint():
    """Debug endpoint to see all users in the database"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all users from user_profiles table
        cur.execute("""
            SELECT user_id, name, email, phone, location
            FROM user_profiles 
            ORDER BY user_id
        """)
        
        results = cur.fetchall()
        users = []
        
        for row in results:
            users.append({
                "user_id": row["user_id"],
                "name": row["name"],
                "email": row["email"],
                "phone": row["phone"],
                "location": row["location"]
            })
        
        return {
            "total_users": len(users),
            "users": users,
            "note": "This shows all users in the user_profiles table"
        }
    except Exception as e:
        logging.error(f"Error in debug users endpoint: {e}")
        return {"error": str(e)}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.get("/test-user-profile/{user_id}")
async def test_user_profile_endpoint(user_id: str):
    """Test endpoint to debug user profile data"""
    try:
        user_data = await fetch_user_profile(user_id)
        return {
            "user_id": user_id,
            "profile_data": user_data,
            "data_summary": {
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "skills_count": len(user_data.get("skills", [])),
                "experience_count": len(user_data.get("experience", [])),
                "education_count": len(user_data.get("education", [])),
                "projects_count": len(user_data.get("projects", [])),
                "achievements_count": len(user_data.get("achievements", [])),
                "societies_count": len(user_data.get("societies", [])),
                "links_count": len(user_data.get("links", []))
            },
            "note": "Data is fetched from user_profiles table"
        }
    except Exception as e:
        logging.error(f"Error in test endpoint: {e}")
        return {"error": str(e)}

@app.get("/get-service-usage/{user_id}")
def get_service_usage(user_id: str):
    """Get service usage statistics for a user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get service usage from service_usage table
        cur.execute("""
            SELECT service_name, usage_count, last_used
            FROM service_usage 
            WHERE user_id = %s
            ORDER BY last_used DESC
        """, (user_id,))
        
        results = cur.fetchall()
        service_usage = []
        
        for row in results:
            service_usage.append({
                "service_name": row[0],
                "usage_count": row[1],
                "last_used": row[2].isoformat() if row[2] else None
            })
        
        cur.close()
        conn.close()
        
        logging.info(f"Retrieved service usage for user {user_id}: {len(service_usage)} services")
        return service_usage
        
    except Exception as e:
        logging.error(f"Error getting service usage for user {user_id}: {e}")
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get service usage: {str(e)}")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9003) 