# Use a slim Python base image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file (assuming you have one, or install dependencies directly)
# If you don't have a requirements.txt, you can add `pip install fastapi python-dotenv psycopg2-binary langchain-google-genai reportlab google-cloud-storage anyio` directly below.
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . /app

# Expose the port your FastAPI app runs on
EXPOSE 8080

# Command to run the application using Uvicorn
# The --host 0.0.0.0 is crucial for Cloud Run to route requests correctly
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]