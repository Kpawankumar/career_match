#!/usr/bin/env python3
"""
AI Job Generator Service
Generates complete job postings using AI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import os
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Debug: Check if API key is loaded
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("WARNING: GOOGLE_API_KEY not found in environment variables")
    print("Available environment variables:", [k for k in os.environ.keys() if 'API' in k or 'KEY' in k])
else:
    print(f"API key loaded successfully (length: {len(api_key)})")

# Configure Gemini
genai.configure(api_key=api_key)

app = FastAPI(title="AI Job Generator", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JobGenerationRequest(BaseModel):
    prompt: str
    organization_name: str = "Our Company"
    industry: str = "Technology"

class JobGenerationResponse(BaseModel):
    job_description: str
    requirements: str
    responsibilities: str
    benefits: str
    suggested_salary_range: str
    suggested_skills: List[str]
    seo_optimized_title: str
    suggested_department: str
    suggested_experience_level: str
    suggested_location: str
    suggested_work_type: str
    generation_time_ms: int

def generate_complete_job_posting(prompt: str, organization_name: str, industry: str) -> dict:
    """
    Generate a complete job posting using AI
    """
    
    system_prompt = f"""You are an expert HR professional and job posting writer. 
    Generate a complete, professional job posting based on the user's description.
    
    Organization: {organization_name}
    Industry: {industry}
    
    Generate the following:
    1. SEO-optimized job title
    2. Department/team
    3. Experience level (Entry, Mid, Senior, Lead, Manager, Director)
    4. Location
    5. Work type (Full-time, Part-time, Contract, Internship, Freelance)
    6. Comprehensive job description
    7. Detailed requirements
    8. Key responsibilities
    9. Benefits and perks
    10. Realistic salary range
    11. Required skills (as a list)
    
    Make it professional, engaging, and comprehensive. Use modern HR practices and inclusive language.
    """
    
    user_prompt = f"""
    Create a complete job posting for: {prompt}
    
    Please provide a JSON response with the following structure:
    {{
        "seo_optimized_title": "Job Title",
        "suggested_department": "Department Name",
        "suggested_experience_level": "Experience Level",
        "suggested_location": "Location",
        "suggested_work_type": "Work Type",
        "job_description": "Comprehensive job description...",
        "requirements": "Detailed requirements...",
        "responsibilities": "Key responsibilities...",
        "benefits": "Benefits and perks...",
        "suggested_salary_range": "Salary range",
        "suggested_skills": ["skill1", "skill2", "skill3"]
    }}
    """
    
    try:
        # Initialize Gemini model with timeout
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Combine system and user prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        # Add timeout to prevent hanging
        import asyncio
        import concurrent.futures
        
        def generate_with_timeout():
            response = model.generate_content(full_prompt)
            return response.text
        
        # Run with 30-second timeout
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(generate_with_timeout)
            try:
                content = future.result(timeout=30)  # 30 second timeout
            except concurrent.futures.TimeoutError:
                raise Exception("AI generation timed out after 30 seconds")
        
        # Extract the response content
        content = content
        
        # Try to parse JSON from the response
        try:
            # Find JSON in the response (in case there's extra text)
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            json_str = content[start_idx:end_idx]
            
            result = json.loads(json_str)
            
            # Ensure all required fields are present
            required_fields = [
                'seo_optimized_title', 'suggested_department', 'suggested_experience_level',
                'suggested_location', 'suggested_work_type', 'job_description',
                'requirements', 'responsibilities', 'benefits', 'suggested_salary_range',
                'suggested_skills'
            ]
            
            for field in required_fields:
                if field not in result:
                    result[field] = "To be determined"
            
            return result
            
        except json.JSONDecodeError:
            # Fallback: parse the response manually
            return parse_fallback_response(content)
            
    except Exception as e:
        print(f"Error generating job posting: {e}")
        # Return a fallback response instead of failing completely
        return {
            'seo_optimized_title': f"{prompt} Position",
            'suggested_department': 'General',
            'suggested_experience_level': 'Mid-level',
            'suggested_location': 'Remote',
            'suggested_work_type': 'Full-time',
            'job_description': f"We are looking for a {prompt} to join our team at {organization_name}. This is an exciting opportunity in the {industry} industry.",
            'requirements': f"Experience in {prompt} and related technologies. Strong communication and problem-solving skills.",
            'responsibilities': f"Develop and maintain {prompt} solutions. Collaborate with team members and stakeholders.",
            'benefits': 'Competitive salary, health insurance, PTO, professional development opportunities.',
            'suggested_salary_range': '$50,000 - $80,000',
            'suggested_skills': ['Communication', 'Problem-solving', 'Teamwork', 'Technical skills']
        }

def parse_fallback_response(content: str) -> dict:
    """
    Fallback parser for when JSON parsing fails
    """
    lines = content.split('\n')
    result = {
        'seo_optimized_title': 'Job Position',
        'suggested_department': 'General',
        'suggested_experience_level': 'Mid',
        'suggested_location': 'Remote',
        'suggested_work_type': 'Full-time',
        'job_description': content[:500] + "...",
        'requirements': 'Requirements will be determined based on the role.',
        'responsibilities': 'Responsibilities will be outlined during the hiring process.',
        'benefits': 'Competitive benefits package including health insurance, PTO, and professional development.',
        'suggested_salary_range': 'Competitive salary based on experience',
        'suggested_skills': ['Communication', 'Teamwork', 'Problem-solving']
    }
    
    # Try to extract information from the content
    for line in lines:
        line = line.strip()
        if 'title' in line.lower() and ':' in line:
            result['seo_optimized_title'] = line.split(':', 1)[1].strip()
        elif 'department' in line.lower() and ':' in line:
            result['suggested_department'] = line.split(':', 1)[1].strip()
        elif 'location' in line.lower() and ':' in line:
            result['suggested_location'] = line.split(':', 1)[1].strip()
    
    return result

@app.post("/generate-complete-job", response_model=JobGenerationResponse)
async def generate_complete_job(request: JobGenerationRequest):
    """
    Generate a complete job posting from a prompt
    """
    start_time = time.time()
    
    try:
        # Generate the job posting
        result = generate_complete_job_posting(
            request.prompt,
            request.organization_name,
            request.industry
        )
        
        # Calculate generation time
        generation_time = int((time.time() - start_time) * 1000)
        
        # Convert lists to strings if needed
        requirements = result.get('requirements', '')
        if isinstance(requirements, list):
            requirements = '\n'.join(requirements)
        
        responsibilities = result.get('responsibilities', '')
        if isinstance(responsibilities, list):
            responsibilities = '\n'.join(responsibilities)
        
        benefits = result.get('benefits', '')
        if isinstance(benefits, list):
            benefits = '\n'.join(benefits)
        
        return JobGenerationResponse(
            job_description=result.get('job_description', ''),
            requirements=requirements,
            responsibilities=responsibilities,
            benefits=benefits,
            suggested_salary_range=result.get('suggested_salary_range', ''),
            suggested_skills=result.get('suggested_skills', []),
            seo_optimized_title=result.get('seo_optimized_title', ''),
            suggested_department=result.get('suggested_department', ''),
            suggested_experience_level=result.get('suggested_experience_level', ''),
            suggested_location=result.get('suggested_location', ''),
            suggested_work_type=result.get('suggested_work_type', ''),
            generation_time_ms=generation_time
        )
        
    except Exception as e:
        print(f"Error in generate_complete_job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Job Generator"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Job Generator Service",
        "version": "1.0.0",
        "endpoints": {
            "generate_complete_job": "/generate-complete-job",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 