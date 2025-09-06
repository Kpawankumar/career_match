#matcher.py:
import google.generativeai as genai
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import pickle
from sqlalchemy import create_engine
import json # Import the json module
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')


if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set. Please set it as an environment variable or provide it securely.")

genai.configure(api_key=GEMINI_API_KEY)

EMBEDDING_CACHE_FILE = 'jobs_embeddings_cache.pkl' # File to store pre-computed embeddings
BATCH_SIZE = 100 # Number of job descriptions to send per API request for embeddings

# --- Helper Functions ---

def parse_salary_range(salary_str):
    """Normalizes salary string to an average float value, handling new 'Salary' column."""
    if isinstance(salary_str, str) and '-' in salary_str:
        try:
            # Remove '$' and 'K', then split and convert to float for average
            min_salary, max_salary = salary_str.replace('$', '').replace('K', '000').split('-')
            return (float(min_salary) + float(max_salary)) / 2
        except ValueError:
            return np.nan
    return np.nan

def get_embedding(text, model="models/text-embedding-004"):
    """Generates an embedding for a single text using Gemini API."""
    try:
        response = genai.embed_content(model=model, content=text)
        return response['embedding']
    except Exception as e:
        print(f"Error generating embedding for text: '{text[:50]}...' Error: {e}")
        return None

def get_batch_embeddings(texts, model="models/text-embedding-004"):
    """Generates embeddings for a list of texts in a batch using Gemini API."""
    embeddings = []
    try:
        response = genai.embed_content(model=model, content=texts)
        embeddings = response['embedding']
    except Exception as e:
        print(f"Error generating batch embeddings. Error: {e}")
        # Fallback to single embedding if batch fails
        for text in texts:
            embeddings.append(get_embedding(text, model))
    return embeddings


# --- Main Data Loading and Embedding Logic ---

def load_and_prepare_data_from_db(connection_uri, cache_file, batch_size):
    """
    Loads job data from PostgreSQL (org_jobs table), generates embeddings (or loads from cache), and preprocesses it.
    This version includes a JOIN with the Organisation table to fetch company names.
    """
    df = None
    if os.path.exists(cache_file):
        try:
            df = pd.read_pickle(cache_file)
            # Check if the cache is valid for the new schema (optional, but good practice)
            # For simplicity, we'll assume if it loads, it's fine for now,
            # or force regeneration if schema changes are frequent.
            if 'embedding' in df.columns and not df['embedding'].isnull().all():
                print(f"Embeddings loaded successfully from cache: {cache_file}")
                return df
            else:
                print("Cache found but embeddings are missing or empty. Re-generating...")
                df = None
        except Exception as e:
            print(f"Error loading cache file: {e}. Re-generating embeddings.")
            df = None

    if df is None:
        try:
            print("Connecting to PostgreSQL to fetch job data from 'org_jobs' table...")
            engine = create_engine(connection_uri)
            # --- IMPORTANT CHANGE: JOIN with Organisation table to get company name ---
            # Assumes Organisation table has Org_ID and Org_Name
            sql_query = """
            SELECT
                oj.*,
                o.Org_Name
            FROM
                org_jobs oj
            LEFT JOIN
                Organisation o ON oj.Org_ID = o.Org_ID;
            """
            df = pd.read_sql(sql_query, con=engine)
            print("Data loaded successfully from PostgreSQL.")
        except Exception as e:
            print(f"Error connecting to database or loading data: {e}")
            return None

        # Normalize column names (e.g., 'Job_Desc' to 'job_desc', 'Org_Name' to 'org_name')
        df.columns = df.columns.str.strip().str.replace(' ', '_').str.lower()

        # Use 'salary' column for parsing (lowercase 's')
        df['Average_Salary_K'] = df['salary'].apply(parse_salary_range)

        # --- IMPORTANT CHANGE: Update text_columns based on new schema and joined data ---
        # Added 'org_name' for combined text
        text_columns = ['job_title', 'job_desc', 'qualification', 'experience', 'work_type', 'job_location']
        
        for col in text_columns:
            if col not in df.columns:
                print(f"Column '{col}' missing in DB table. Filling with empty string.")
                df[col] = ''
            df[col] = df[col].fillna('')

        df['combined_job_text'] = df[text_columns].agg(' '.join, axis=1)

        all_embeddings = []
        texts_to_embed = df['combined_job_text'].tolist()

        for i in range(0, len(texts_to_embed), batch_size):
            batch_texts = texts_to_embed[i:i + batch_size]
            non_empty_batch_texts = [t for t in batch_texts if t.strip()]

            if non_empty_batch_texts:
                batch_embeddings = get_batch_embeddings(non_empty_batch_texts)
                embed_idx = 0
                for original_text in batch_texts:
                    if original_text.strip():
                        if embed_idx < len(batch_embeddings):
                            all_embeddings.append(batch_embeddings[embed_idx])
                            embed_idx += 1
                        else:
                            all_embeddings.append(None) # Should not happen if API is consistent
                    else:
                        all_embeddings.append(None) # For empty original text
            else:
                all_embeddings.extend([None] * len(batch_texts)) # For batches with only empty texts

            print(f"Processed {min(i + batch_size, len(texts_to_embed))}/{len(texts_to_embed)} embeddings.")

        df['embedding'] = all_embeddings
        df = df.dropna(subset=['embedding']).reset_index(drop=True)

        try:
            df.to_pickle(cache_file)
            print(f"Embeddings saved to cache: {cache_file}")
        except Exception as e:
            print(f"Warning: Could not save embeddings to cache file: {e}")

    print(f"Final dataset has {len(df)} jobs with embeddings.")
    return df

# --- Job Matcher Function ---
# --- Job Matcher Function ---
def job_matcher(user_details, jobs_df, top_n=10):
    """
    Matches user details to jobs using semantic similarity and filters.
    Fetches experience and qualification from profile_info table using user_id.
    """
    # Use experience and qualification from user input directly
    user_experience = user_details.get('experience', '').lower()
    user_qualification = user_details.get('qualification', '').lower()

    # Get other user details from the input JSON
    user_work_type = user_details.get('work_type', '').lower()
    user_location = user_details.get('location', '').lower()
    user_domain = user_details.get('domain', '').lower()
    user_expected_salary = user_details.get('expected_salary')

    user_combined_text = f"Work Type: {user_work_type}, Location: {user_location}, " \
                         f"Experience: {user_experience}, Qualification: {user_qualification}, " \
                         f"Domain: {user_domain}"

    user_embedding_list = get_embedding(user_combined_text)
    if user_embedding_list is None:
        print("Could not generate embedding for user input.")
        return []

    user_embedding = np.array(user_embedding_list).reshape(1, -1)

    job_embeddings_array = np.array(jobs_df['embedding'].tolist())
    similarities = cosine_similarity(user_embedding, job_embeddings_array)[0]
    jobs_df['match_score'] = similarities * 100

    filtered_jobs = jobs_df.copy()

    if user_work_type:
        filtered_jobs = filtered_jobs[filtered_jobs['work_type'].str.lower() == user_work_type]

    if user_location:
        filtered_jobs = filtered_jobs[filtered_jobs['job_location'].str.lower().str.contains(user_location, na=False)]

    if user_expected_salary is not None:
        filtered_jobs = filtered_jobs[
            (filtered_jobs['Average_Salary_K'].fillna(0) >= user_expected_salary * 0.8) &
            (filtered_jobs['Average_Salary_K'].fillna(0) <= user_expected_salary * 1.5)
        ]

    # ✅ Experience filtering logic
    def parse_experience_range(exp_str):
        try:
            parts = exp_str.lower().replace("years", "").replace("year", "").split("to")
            if len(parts) == 2:
                min_exp = int(parts[0].strip())
                max_exp = int(parts[1].strip())
                return min_exp, max_exp
        except:
            pass
        return None, None

    try:
        user_exp_years = int(''.join([c for c in user_experience if c.isdigit()]))
    except:
        user_exp_years = None

    if user_exp_years is not None:
        filtered_jobs = filtered_jobs[
            filtered_jobs['experience'].apply(lambda exp: (
                parse_experience_range(exp)[0] is not None and
                parse_experience_range(exp)[0] <= user_exp_years <= parse_experience_range(exp)[1]
            ))
        ]

    if filtered_jobs.empty:
        print("No jobs found matching the strict filters (work type, location, salary, experience).")
        return []

    sorted_jobs = filtered_jobs.sort_values(by='match_score', ascending=False)

    output_jobs = []
    for index, job in sorted_jobs.head(top_n).iterrows():
        output_jobs.append({
            'job_id': job['job_id'],
            'job_title': job['job_title'],
            'job_description': job['job_desc'],
            'match_score': round(job['match_score'], 2),
            'salary': job['salary'],
            'location': job['job_location'],
            'experience': job['experience'],
            'date_posted': str(job['date_posted']),
            'work_type': job['work_type'],
            'org_name': job.get('org_name', 'Unknown'),
            'apply_link': job.get('apply_link', '')
        })

    return output_jobs
