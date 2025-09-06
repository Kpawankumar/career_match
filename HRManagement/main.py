from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import psycopg2
import psycopg2.extras
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import jwt
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hr_api_debug.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="HR Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
def get_db_connection():
    try:
        db_host = os.getenv("DB_HOST", "localhost")
        db_name = os.getenv("DB_NAME", "employment_edge")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "postgres")
        db_port = os.getenv("DB_PORT", "5432")
        
        logger.info(f"🔍 Database connection attempt:")
        logger.info(f"   Host: {db_host}")
        logger.info(f"   Database: {db_name}")
        logger.info(f"   User: {db_user}")
        logger.info(f"   Port: {db_port}")
        
        connection = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=db_port
        )
        logger.info("✅ Database connection successful!")
        return connection
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic Models - Simplified for existing schema
class OrganizationCreate(BaseModel):
    name: str
    industry: str
    description: Optional[str] = None

class OrganizationResponse(BaseModel):
    org_id: int
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None

class HRUserCreate(BaseModel):
    user_id: str
    name: str
    email: EmailStr

class HRUserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    org_id: int

class JobPostingCreate(BaseModel):
    job_title: str
    job_desc: str
    qualification: str
    location: str
    salary_range: Optional[str] = None
    job_type: str = "Full-time"
    experience_level: str = "Entry"
    skills_required: List[str] = []
    status: str = "active"

class JobPostingResponse(BaseModel):
    job_id: int
    org_id: int
    job_title: str
    job_desc: str
    qualification: str
    location: str
    salary_range: str
    job_type: str
    experience_level: str
    skills_required: List[str] = []
    status: str = "active"
    created_at: str
    applicant_count: int = 0

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: Optional[str] = Header(None)):
    logger.info(f"🔐 get_current_user called with authorization: {authorization}")
    
    # For development, allow requests without authentication
    if not authorization:
        logger.info("👤 No authorization header, returning mock user for development")
        mock_user = {
            "user_id": "dev_user_123",
            "name": "Development User",
            "email": "dev@example.com"
        }
        logger.info(f"   Mock user: {mock_user}")
        return mock_user
    
    try:
        logger.info("🔑 Authorization header present, attempting to verify token")
        token = authorization.split(" ")[1]
        logger.info(f"   Token: {token[:20]}...")
        payload = verify_token(token)
        logger.info(f"✅ Token verified successfully: {payload}")
        
        # Ensure the payload has the required fields
        if not isinstance(payload, dict):
            logger.error(f"❌ Invalid payload type: {type(payload)}")
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Check if user_id or uid exists in payload (handle both field names)
        if "user_id" not in payload and "uid" not in payload:
            logger.error(f"❌ Missing user_id/uid in payload: {payload}")
            raise HTTPException(status_code=401, detail="Missing user_id in token")
        
        # Normalize user_id field (some tokens use 'uid' instead of 'user_id')
        if "uid" in payload and "user_id" not in payload:
            payload["user_id"] = payload["uid"]
            logger.info(f"🔄 Converted 'uid' to 'user_id': {payload['user_id']}")
        
        # Add name field if not present (for compatibility)
        if "name" not in payload:
            payload["name"] = payload.get("email", "Unknown User")
        
        logger.info(f"✅ Final user object: {payload}")
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"⚠️ Token verification failed: {str(e)}")
        # For development, return mock user if token is invalid
        mock_user = {
            "user_id": "dev_user_123",
            "name": "Development User",
            "email": "dev@example.com"
        }
        logger.info(f"   Returning mock user: {mock_user}")
        return mock_user

# Organization Management
@app.post("/organizations", response_model=OrganizationResponse)
async def create_organization(org_data: OrganizationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new organization"""
    logger.info(f"🏢 Create organization called with data: {org_data}")
    logger.info(f"   Current user: {current_user}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if organization already exists
            logger.info(f"🔍 Checking if organization '{org_data.name}' already exists")
            cursor.execute("""
                SELECT org_id FROM organisation 
                WHERE org_name = %s AND org_type = %s
            """, (org_data.name, org_data.industry))
            
            existing_org = cursor.fetchone()
            if existing_org:
                logger.info(f"📋 Organization already exists with ID: {existing_org[0]}")
                # Return existing organization
                cursor.execute("""
                    SELECT org_id, org_name, org_type, org_desc
                    FROM organisation WHERE org_id = %s
                """, (existing_org[0],))
                
                result = cursor.fetchone()
                logger.info(f"✅ Returning existing organization: {result}")
                return OrganizationResponse(
                    org_id=result[0],
                    name=result[1] if result[1] else "",
                    industry=result[2] if result[2] else None,
                    description=result[3] if result[3] else None
                )
            
            # Create new organization
            logger.info(f"🆕 Creating new organization: {org_data.name}")
            cursor.execute("""
                INSERT INTO organisation (org_name, org_type, org_desc)
                VALUES (%s, %s, %s)
                RETURNING org_id, org_name, org_type, org_desc
            """, (
                org_data.name, org_data.industry, org_data.description
            ))
            
            result = cursor.fetchone()
            org_id = result[0]
            logger.info(f"✅ Organization created with ID: {org_id}")
            
            # Create HR user for this organization
            try:
                logger.info(f"👤 Creating HR user for organization {org_id}")
                cursor.execute("""
                    INSERT INTO hr (user_id, hr_name, hr_contact, hr_org_id, hr_orgs)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET
                    hr_name = EXCLUDED.hr_name,
                    hr_contact = EXCLUDED.hr_contact,
                    hr_org_id = EXCLUDED.hr_org_id,
                    hr_orgs = EXCLUDED.hr_orgs
                """, (
                    current_user["user_id"], current_user.get("name", "HR User"), 
                    current_user.get("email", "hr@company.com"), org_id, org_data.name
                ))
                logger.info("✅ HR user created/updated successfully")
            except Exception as hr_error:
                logger.warning(f"⚠️ Could not create HR user: {hr_error}")
            
            conn.commit()
            logger.info(f"💾 Database transaction committed successfully")
            
            response = OrganizationResponse(
                org_id=result[0],
                name=result[1] if result[1] else "",
                industry=result[2] if result[2] else None,
                description=result[3] if result[3] else None
            )
            logger.info(f"✅ Successfully created organization: {response}")
            return response
    except Exception as e:
        logger.error(f"❌ Error creating organization: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating organization: {e}")
    finally:
        conn.close()

@app.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(current_user: dict = Depends(get_current_user)):
    """List all organizations"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT org_id, org_name, org_type, org_desc
                FROM organisation 
                ORDER BY org_id
            """)
            
            results = cursor.fetchall()
            response_data = []
            for row in results:
                try:
                    org_response = OrganizationResponse(
                        org_id=row[0],
                        name=row[1] if row[1] else "",
                        industry=row[2] if row[2] else None,
                        description=row[3] if row[3] else None
                    )
                    response_data.append(org_response)
                except Exception as row_error:
                    logger.error(f"❌ Error processing row {row}: {str(row_error)}")
                    continue
            return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching organizations: {e}")
    finally:
        conn.close()

@app.get("/organizations/search", response_model=List[OrganizationResponse])
async def search_organizations(query: str = "", current_user: dict = Depends(get_current_user)):
    """Search organizations"""
    logger.info(f"🔍 Search organizations called with query: '{query}'")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if not query or query.strip() == "":
                cursor.execute("""
                    SELECT org_id, org_name, org_type, org_desc
                    FROM organisation 
                    ORDER BY org_id
                """)
            else:
                cursor.execute("""
                    SELECT org_id, org_name, org_type, org_desc
                    FROM organisation 
                    WHERE org_name ILIKE %s OR org_type ILIKE %s
                    ORDER BY org_id
                """, (f"%{query}%", f"%{query}%"))
            
            results = cursor.fetchall()
            response_data = []
            for row in results:
                try:
                    org_response = OrganizationResponse(
                        org_id=row[0],
                        name=row[1] if row[1] else "",
                        industry=row[2] if row[2] else None,
                        description=row[3] if row[3] else None
                    )
                    response_data.append(org_response)
                except Exception as row_error:
                    logger.error(f"❌ Error processing row {row}: {str(row_error)}")
                    continue
            return response_data
    except Exception as e:
        logger.error(f"❌ Error searching organizations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching organizations: {e}")
    finally:
        conn.close()

@app.get("/organizations/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: int, current_user: dict = Depends(get_current_user)):
    """Get organization details"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT org_id, org_name, org_type, org_desc
                FROM organisation WHERE org_id = %s
            """, (org_id,))
            
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            return OrganizationResponse(
                org_id=result[0],
                name=result[1] if result[1] else "",
                industry=result[2] if result[2] else None,
                description=result[3] if result[3] else None
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching organization: {e}")
    finally:
        conn.close()

@app.put("/organizations/{org_id}")
async def update_organization(org_id: int, org_data: OrganizationCreate, current_user: dict = Depends(get_current_user)):
    """Update organization details"""
    logger.info(f"🔄 Update organization called for ID: {org_id}")
    
    trimmed_name = org_data.name.strip()
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if organization exists
            cursor.execute("""
                SELECT org_id, org_name, org_type, org_desc
                FROM organisation WHERE org_id = %s
            """, (org_id,))
            
            existing_org = cursor.fetchone()
            if not existing_org:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            # Check if the new name already exists for a different organization
            cursor.execute("""
                SELECT org_id FROM organisation 
                WHERE org_name = %s AND org_id != %s
            """, (trimmed_name, org_id))
            
            if cursor.fetchone():
                raise HTTPException(
                    status_code=409, 
                    detail=f"Organization name '{trimmed_name}' already exists. Please choose a different name."
                )
            
            # Update organization
            cursor.execute("""
                UPDATE organisation 
                SET org_name = %s, org_type = %s, org_desc = %s
                WHERE org_id = %s
                RETURNING org_id, org_name, org_type, org_desc
            """, (
                trimmed_name, org_data.industry, org_data.description, org_id
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            return OrganizationResponse(
                org_id=result[0],
                name=result[1] if result[1] else "",
                industry=result[2] if result[2] else None,
                description=result[3] if result[3] else None
            )
    except HTTPException:
        raise
    except psycopg2.errors.UniqueViolation as e:
        conn.rollback()
        raise HTTPException(
            status_code=409, 
            detail=f"Organization name '{trimmed_name}' already exists. Please choose a different name."
        )
    except Exception as e:
        logger.error(f"❌ Error updating organization: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating organization: {e}")
    finally:
        conn.close()

@app.delete("/organizations/{org_id}")
async def delete_organization(org_id: int, current_user: dict = Depends(get_current_user)):
    """Delete organization"""
    logger.info(f"🗑️ Delete organization called for ID: {org_id}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if organization exists
            cursor.execute("SELECT org_id FROM organisation WHERE org_id = %s", (org_id,))
            
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Organization not found")
            
            # Delete organization
            cursor.execute("DELETE FROM organisation WHERE org_id = %s", (org_id,))
            
            conn.commit()
            
            return {"message": f"Organization {org_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting organization: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting organization: {e}")
    finally:
        conn.close()

# HR User Management
@app.post("/organizations/{org_id}/hr-users", response_model=HRUserResponse)
async def add_hr_user(org_id: int, hr_data: HRUserCreate, current_user: dict = Depends(get_current_user)):
    """Add HR user to organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if organization exists
            cursor.execute("SELECT org_id, org_name FROM organisation WHERE org_id = %s", (org_id,))
            org_result = cursor.fetchone()
            if not org_result:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            org_name = org_result[1]
            
            # Check if HR user already exists
            cursor.execute("SELECT user_id FROM hr WHERE user_id = %s", (hr_data.user_id,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                # Update existing user
                cursor.execute("""
                    UPDATE hr 
                    SET hr_name = %s, hr_contact = %s, hr_org_id = %s, hr_orgs = %s
                    WHERE user_id = %s
                    RETURNING user_id, hr_name, hr_contact, hr_org_id
                """, (
                    hr_data.name, hr_data.email, org_id, org_name, hr_data.user_id
                ))
            else:
                # Create new user
                cursor.execute("""
                    INSERT INTO hr (user_id, hr_name, hr_contact, hr_org_id, hr_orgs)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING user_id, hr_name, hr_contact, hr_org_id
                """, (
                    hr_data.user_id, hr_data.name, hr_data.email, org_id, org_name
                ))
            
            result = cursor.fetchone()
            conn.commit()
            
            return HRUserResponse(
                user_id=result[0],
                name=result[1],
                email=result[2],
                org_id=result[3]
            )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding HR user: {e}")
    finally:
        conn.close()

@app.get("/organizations/{org_id}/hr-users", response_model=List[HRUserResponse])
async def get_hr_users(org_id: int, current_user: dict = Depends(get_current_user)):
    """Get all HR users for an organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT user_id, hr_name, hr_contact, hr_org_id
                FROM hr 
                WHERE hr_org_id = %s
                ORDER BY user_id
            """, (org_id,))
            
            results = cursor.fetchall()
            return [
                HRUserResponse(
                    user_id=row[0],
                    name=row[1],
                    email=row[2],
                    org_id=row[3]
                )
                for row in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching HR users: {e}")
    finally:
        conn.close()

@app.get("/hr-users/profile", response_model=dict)
async def get_hr_profile(current_user: dict = Depends(get_current_user)):
    """Get HR user profile with organization details"""
    logger.info(f"🔍 Getting HR profile for user: {current_user}")
    
    # Validate current_user has required fields
    if not current_user or not isinstance(current_user, dict):
        logger.error(f"❌ Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user data")
    
    if "user_id" not in current_user:
        logger.error(f"❌ Missing user_id in current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Missing user_id in user data")
    
    user_id = current_user["user_id"]
    logger.info(f"🔍 Looking for HR user with user_id: {user_id}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get HR user data with organization details
            cursor.execute("""
                SELECT h.user_id, h.hr_name, h.hr_contact, h.hr_org_id, h.hr_orgs,
                       o.org_name, o.org_type, o.org_desc,
                       u.created_at
                FROM hr h
                LEFT JOIN organisation o ON h.hr_org_id = o.org_id
                LEFT JOIN users u ON h.user_id = u.uid
                WHERE h.user_id = %s
            """, (user_id,))
            
            result = cursor.fetchone()
            if not result:
                logger.info(f"📋 HR user not found for user_id: {user_id}")
                raise HTTPException(status_code=404, detail="HR user not found")
            
            logger.info(f"✅ HR user found: {result}")
            
            # Format created_at date
            created_at = None
            if result[8]:  # created_at from users table
                try:
                    created_at = result[8].isoformat() if hasattr(result[8], 'isoformat') else str(result[8])
                except:
                    created_at = None
            
            profile_data = {
                "user_id": result[0],
                "hr_name": result[1] or "",
                "hr_contact": result[2] or "",
                "hr_org_id": result[3] or None,
                "hr_orgs": result[4] or "",
                "org_name": result[5] or "",
                "org_type": result[6] or "",
                "org_desc": result[7] or "",
                "created_at": created_at,
                "has_organization": result[3] is not None
            }
            
            logger.info(f"✅ Returning HR profile: {profile_data}")
            return profile_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching HR profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching HR profile: {e}")
    finally:
        conn.close()

@app.put("/hr-users/profile", response_model=dict)
async def update_hr_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    """Update HR user profile"""
    logger.info(f"🔧 Updating HR profile for user: {current_user}")
    
    # Validate current_user has required fields
    if not current_user or not isinstance(current_user, dict):
        logger.error(f"❌ Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user data")
    
    if "user_id" not in current_user:
        logger.error(f"❌ Missing user_id in current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Missing user_id in user data")
    
    user_id = current_user["user_id"]
    logger.info(f"🔧 Updating HR profile for user_id: {user_id}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if HR user exists
            cursor.execute("""
                SELECT user_id FROM hr WHERE user_id = %s
            """, (user_id,))
            
            result = cursor.fetchone()
            if not result:
                logger.error(f"❌ HR user not found for user_id: {user_id}")
                raise HTTPException(status_code=404, detail="HR user not found")
            
            # Update HR profile fields
            update_fields = []
            update_values = []
            
            # Map frontend fields to database fields
            field_mapping = {
                'hr_name': 'hr_name',
                'hr_contact': 'hr_contact',
                'email': 'hr_contact',  # Map email to hr_contact
                'phone': 'hr_contact',  # For now, map phone to hr_contact
                'location': 'hr_contact',  # For now, map location to hr_contact
                'bio': 'hr_contact',  # For now, map bio to hr_contact
                'department': 'hr_contact',  # For now, map department to hr_contact
                'position': 'hr_contact',  # For now, map position to hr_contact
                'experience_years': 'hr_contact',  # For now, map experience to hr_contact
                'linkedin_url': 'hr_contact',  # For now, map linkedin to hr_contact
                'website_url': 'hr_contact',  # For now, map website to hr_contact
            }
            
            for frontend_field, db_field in field_mapping.items():
                if frontend_field in profile_data and profile_data[frontend_field] is not None:
                    update_fields.append(f"{db_field} = %s")
                    update_values.append(profile_data[frontend_field])
            
            if not update_fields:
                logger.warning(f"⚠️ No fields to update for user_id: {user_id}")
                raise HTTPException(status_code=400, detail="No valid fields to update")
            
            # Add user_id to update values
            update_values.append(user_id)
            
            # Build and execute update query
            update_query = f"""
                UPDATE hr 
                SET {', '.join(update_fields)}
                WHERE user_id = %s
            """
            
            logger.info(f"🔧 Executing update query: {update_query}")
            logger.info(f"🔧 Update values: {update_values}")
            
            cursor.execute(update_query, update_values)
            conn.commit()
            
            logger.info(f"✅ HR profile updated successfully for user_id: {user_id}")
            
            # Return updated profile
            return {
                "message": "Profile updated successfully",
                "user_id": user_id,
                "updated_fields": list(profile_data.keys())
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating HR profile: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating HR profile: {e}")
    finally:
        conn.close()

@app.post("/hr-users/initialize", response_model=dict)
async def initialize_hr_user(init_data: dict, current_user: dict = Depends(get_current_user)):
    """Initialize HR user profile without default organization"""
    logger.info(f"🔧 Initializing HR user for: {current_user}")
    
    # Validate current_user has required fields
    if not current_user or not isinstance(current_user, dict):
        logger.error(f"❌ Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user data")
    
    if "user_id" not in current_user:
        logger.error(f"❌ Missing user_id in current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Missing user_id in user data")
    
    user_id = current_user["user_id"]
    logger.info(f"🔧 Initializing HR user with user_id: {user_id}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if HR user exists
            cursor.execute("""
                SELECT user_id, hr_name, hr_contact, hr_org_id, hr_orgs
                FROM hr 
                WHERE user_id = %s
            """, (user_id,))
            
            result = cursor.fetchone()
            if result:
                logger.info(f"✅ HR user already exists: {result}")
                # User exists, return current data
                return {
                    "user_id": result[0],
                    "hr_name": result[1] or "",
                    "hr_contact": result[2] or "",
                    "hr_org_id": result[3] or None,
                    "hr_orgs": result[4] or "",
                    "created_at": datetime.now().isoformat(),
                    "has_organization": result[3] is not None
                }
            else:
                logger.info(f"🆕 Creating new HR user for user_id: {user_id}")
                # Create new HR user without organization
                cursor.execute("""
                    INSERT INTO hr (user_id, hr_name, hr_contact, hr_org_id, hr_orgs)
                    VALUES (%s, %s, %s, NULL, NULL)
                    RETURNING user_id, hr_name, hr_contact, hr_org_id, hr_orgs
                """, (
                    user_id,
                    current_user.get("name", "HR User"),
                    current_user.get("email", "hr@company.com")
                ))
                
                result = cursor.fetchone()
                conn.commit()
                logger.info(f"✅ HR user created successfully: {result}")
                
                return {
                    "user_id": result[0],
                    "hr_name": result[1] or "",
                    "hr_contact": result[2] or "",
                    "hr_org_id": None,
                    "hr_orgs": "",
                    "created_at": datetime.now().isoformat(),
                    "has_organization": False
                }
    except Exception as e:
        logger.error(f"❌ Error initializing HR user: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error initializing HR user: {e}")
    finally:
        conn.close()

@app.post("/hr-users/assign-organization", response_model=dict)
async def assign_hr_to_organization(assignment_data: dict, current_user: dict = Depends(get_current_user)):
    """Assign HR user to an organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            org_id = assignment_data.get("org_id")
            if not org_id:
                raise HTTPException(status_code=400, detail="Organization ID is required")
            
            # Check if organization exists
            cursor.execute("SELECT org_id, org_name FROM organisation WHERE org_id = %s", (org_id,))
            org_result = cursor.fetchone()
            if not org_result:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            org_name = org_result[1]
            
            # Update HR user with organization
            cursor.execute("""
                UPDATE hr 
                SET hr_org_id = %s, hr_orgs = %s
                WHERE user_id = %s
                RETURNING user_id, hr_name, hr_contact, hr_org_id, hr_orgs
            """, (org_id, org_name, current_user["user_id"]))
            
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="HR user not found")
            
            conn.commit()
            
            return {
                "user_id": result[0],
                "hr_name": result[1] or "",
                "hr_contact": result[2] or "",
                "hr_org_id": result[3],
                "hr_orgs": result[4] or "",
                "org_name": org_name,
                "message": "Successfully assigned to organization"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error assigning HR to organization: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error assigning HR to organization: {e}")
    finally:
        conn.close()

# Job Posting Management
@app.post("/organizations/{org_id}/jobs", response_model=JobPostingResponse)
async def create_job_posting(
    org_id: int, 
    job_data: JobPostingCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Create a new job posting"""
    logger.info(f"Creating job posting for org_id: {org_id}, user_id: {current_user['user_id']}")
    logger.info(f"Job data: {job_data}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Verify HR user belongs to organization
            cursor.execute("""
                SELECT user_id FROM hr 
                WHERE user_id = %s AND hr_org_id = %s
            """, (current_user["user_id"], org_id))
            
            hr_user = cursor.fetchone()
            logger.info(f"HR user verification result: {hr_user}")
            
            # For development/testing, allow if no HR user found but org exists
            if not hr_user:
                # Check if organization exists
                cursor.execute("SELECT org_id FROM organisation WHERE org_id = %s", (org_id,))
                org_exists = cursor.fetchone()
                if not org_exists:
                    logger.error(f"Organization {org_id} not found")
                    raise HTTPException(status_code=404, detail="Organization not found")
                
                # For development, allow job creation even without HR user
                logger.warning(f"HR user {current_user['user_id']} not found for org {org_id}, but allowing job creation for development")
            
            insert_values = (
                org_id, job_data.job_title, job_data.job_desc, job_data.location,
                job_data.job_type, job_data.experience_level, job_data.salary_range, job_data.qualification,
                datetime.utcnow()
            )
            logger.info(f"Inserting job with values: {insert_values}")
            
            cursor.execute("""
                INSERT INTO org_jobs 
                (org_id, job_title, job_desc, job_location, work_type, experience, 
                 salary, qualification, date_posted)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING job_id, org_id, job_title, job_desc, qualification,
                         job_location, salary, work_type, experience, date_posted
            """, insert_values)
            
            result = cursor.fetchone()
            conn.commit()
            
            return JobPostingResponse(
                job_id=result[0],
                org_id=result[1],
                job_title=result[2],
                job_desc=result[3],
                qualification=result[4],
                location=result[5],
                salary_range=result[6] or "Not specified",
                job_type=result[7] or "Full-time",
                experience_level=result[8] or "Entry",
                skills_required=[],
                status="active",  # Default status
                created_at=result[9].isoformat() if result[9] else datetime.now().isoformat(),
                applicant_count=0
            )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating job posting: {e}")
        logger.error(f"Error type: {type(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating job posting: {e}")
    finally:
        conn.close()

@app.get("/organizations/{org_id}/jobs", response_model=List[JobPostingResponse])
async def get_job_postings(
    org_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all job postings for an organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT job_id, org_id, job_title, job_desc, qualification,
                       job_location, salary, work_type, experience,
                       date_posted
                FROM org_jobs 
                WHERE org_id = %s
                ORDER BY date_posted DESC
            """, (org_id,))
            
            results = cursor.fetchall()
            return [
                JobPostingResponse(
                    job_id=row[0],
                    org_id=row[1],
                    job_title=row[2],
                    job_desc=row[3],
                    qualification=row[4],
                    location=row[5],
                    salary_range=row[6] or "Not specified",
                    job_type=row[7] or "Full-time",
                    experience_level=row[8] or "Entry",
                    skills_required=[],
                    status="active",  # Default status
                    created_at=row[9].isoformat() if row[9] else datetime.now().isoformat(),
                    applicant_count=0
                )
                for row in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching job postings: {e}")
    finally:
        conn.close()

@app.put("/organizations/{org_id}/jobs/{job_id}")
async def update_job_posting(
    org_id: int, 
    job_id: int, 
    job_data: dict, 
    current_user: dict = Depends(get_current_user)
):
    """Update job posting"""
    logger.info(f"🔧 Updating job {job_id} for organization {org_id}")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Verify job belongs to organization
            cursor.execute("""
                SELECT job_id FROM org_jobs 
                WHERE job_id = %s AND org_id = %s
            """, (job_id, org_id))
            
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Job not found")
            
            # Update job posting
            cursor.execute("""
                UPDATE org_jobs 
                SET job_title = %s, job_desc = %s, qualification = %s, 
                    job_location = %s, salary = %s, work_type = %s, 
                    experience = %s
                WHERE job_id = %s
            """, (
                job_data.get("job_title", ""),
                job_data.get("job_desc", ""),
                job_data.get("qualification", ""),
                job_data.get("location", ""),
                job_data.get("salary_range", ""),
                job_data.get("job_type", "Full-time"),
                job_data.get("experience_level", "Entry"),
                job_id
            ))
            
            conn.commit()
            logger.info(f"✅ Job {job_id} updated successfully")
            
            return {"message": "Job updated successfully"}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating job: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating job: {e}")
    finally:
        conn.close()

@app.put("/organizations/{org_id}/jobs/{job_id}/status")
async def update_job_status(
    org_id: int, 
    job_id: int, 
    status_data: dict, 
    current_user: dict = Depends(get_current_user)
):
    """Update job status"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Verify job belongs to organization
            cursor.execute("""
                SELECT job_id FROM org_jobs 
                WHERE job_id = %s AND org_id = %s
            """, (job_id, org_id))
            
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Job not found")
            
            # Update job status (if status column exists)
            try:
                cursor.execute("""
                    UPDATE org_jobs 
                    SET status = %s
                    WHERE job_id = %s
                """, (status_data.get("status", "active"), job_id))
                
                conn.commit()
                return {"message": f"Job status updated to {status_data.get('status')}"}
            except Exception as e:
                # If status column doesn't exist, just return success
                logger.warning(f"Status column not available: {e}")
                return {"message": "Job status update not available"}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating job status: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating job status: {e}")
    finally:
        conn.close()

@app.get("/organizations/{org_id}/applications")
async def get_organization_applications(org_id: int, current_user: dict = Depends(get_current_user)):
    """Get all applications for an organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Try to get applications from application_status table
            try:
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.job_id,
                        a.applicant_id,
                        a.status,
                        a.enhanced_resume_url,
                        a.cover_letter_id,
                        a.sent_at,
                        a.updated_at,
                        oj.job_title,
                        o.name as company_name,
                        oj.job_location as location,
                        au.u_name as applicant_name,
                        au.email_id as applicant_email
                    FROM application_status a
                    JOIN org_jobs oj ON a.job_id = oj.job_id
                    JOIN organisation o ON oj.org_id = o.org_id
                    LEFT JOIN app_user au ON a.applicant_id = au.user_id
                    WHERE oj.org_id = %s
                    ORDER BY a.sent_at DESC
                """, (org_id,))
                
                applications = []
                for row in cursor.fetchall():
                    applications.append({
                        "id": row[0],
                        "job_id": row[1],
                        "applicant_id": row[2],
                        "status": row[3] or "applied",
                        "enhanced_resume_url": row[4],
                        "cover_letter_id": row[5],
                        "sent_at": row[6].isoformat() if row[6] else None,
                        "updated_at": row[7].isoformat() if row[7] else None,
                        "job_title": row[8],
                        "company_name": row[9],
                        "location": row[10],
                        "applicant_name": row[11] or f"Applicant {row[2]}",
                        "applicant_email": row[12] or "No email provided"
                    })
                
                return applications
            except Exception as e:
                logger.warning(f"Application_status table not available: {e}")
                # Return empty list if table doesn't exist
                return []
                
    except Exception as e:
        logger.error(f"❌ Error fetching applications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching applications: {e}")
    finally:
        conn.close()

@app.put("/applications/{application_id}/status")
async def update_application_status(application_id: int, status_data: dict, current_user: dict = Depends(get_current_user)):
    """Update application status"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            new_status = status_data.get('status')
            if not new_status:
                raise HTTPException(status_code=400, detail="Status is required")
            
            cursor.execute("""
                UPDATE application_status 
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (new_status, application_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Application not found")
            
            conn.commit()
            return {"message": f"Application status updated to {new_status}"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating application status: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating application status: {e}")
    finally:
        conn.close()

@app.get("/organizations/{org_id}/analytics")
async def get_organization_analytics(org_id: int, current_user: dict = Depends(get_current_user)):
    """Get analytics for an organization"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get job statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN date_posted >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_jobs
                FROM org_jobs 
                WHERE org_id = %s
            """, (org_id,))
            
            job_stats = cursor.fetchone()
            total_jobs = job_stats[0] if job_stats else 0
            recent_jobs = job_stats[1] if job_stats else 0
            
            # Get application statistics (if applications table exists)
            try:
                cursor.execute("""
                    SELECT COUNT(*) as total_applications
                    FROM application_status a
                    JOIN org_jobs oj ON a.job_id = oj.job_id
                    WHERE oj.org_id = %s
                """, (org_id,))
                app_stats = cursor.fetchone()
                total_applications = app_stats[0] if app_stats else 0
            except:
                total_applications = 0
            
            return {
                "total_jobs": total_jobs,
                "active_jobs": recent_jobs,
                "total_applications": total_applications,
                "applications_this_month": 0,  # Placeholder
                "jobs_by_status": {"active": recent_jobs, "total": total_jobs},
                "applications_by_status": {"applied": total_applications},
                "top_performing_jobs": []
            }
    except Exception as e:
        logger.error(f"❌ Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {e}")
    finally:
        conn.close()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("🏥 Health check endpoint called")
    
    try:
        logger.info("🔍 Testing database connection...")
        conn = get_db_connection()
        logger.info("✅ Database connection successful")
        
        # Test basic query
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM organisation")
            org_count = cursor.fetchone()[0]
            logger.info(f"📊 Found {org_count} organizations in database")
        
        conn.close()
        logger.info("✅ Health check completed successfully")
        
        return {
            "status": "healthy", 
            "service": "HR Management API",
            "database": "connected",
            "organizations_count": org_count
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return {
            "status": "unhealthy", 
            "service": "HR Management API",
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 