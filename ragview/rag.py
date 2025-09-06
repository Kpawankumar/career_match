import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import TextLoader
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
from operator import itemgetter

VECTOR_DB_PATH = "faiss_index"
CONTEXT_FILE = "output.txt"

def RAG(user_input, is_first_message=False, is_conversation_end=False):
    load_dotenv()
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    MODEL1 = "gemini-2.0-flash"

    model = ChatGoogleGenerativeAI(model=MODEL1, google_api_key=GOOGLE_API_KEY)
    parser = StrOutputParser()

    prompt_template = """
    You are a friendly and knowledgeable assistant, acting like a human conversational partner. Your goal is to provide clear, concise, and relevant answers to the user's question based on the provided context. Follow these guidelines:
    - Use a warm, conversational tone as if you're speaking to a friend.
    - Answer only what the user asks, avoiding unnecessary details to keep responses focused and avoid confusion.
    - If you can't find the answer in the context, respond politely with something like, "I'm not sure about that, but I'm happy to help with anything else you need!"
    - If this is the first message (is_first_message=True), include a brief, friendly greeting before the answer.
    - If this is the end of the conversation (is_conversation_end=True), include a polite farewell after the answer.
    - Ensure the response feels natural and engaging, using phrases that make it sound human-like.

    Context: {context}
    Question: {question}
    Answer: 
    """
    prompt = PromptTemplate.from_template(prompt_template)

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    loader = TextLoader(CONTEXT_FILE, encoding="utf-8")
    pages = loader.load_and_split()

    if os.path.exists(VECTOR_DB_PATH):
        print(f"Loading existing FAISS vector store: {VECTOR_DB_PATH}")
        vectorstore = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)

        # Filter out duplicate content (by page.content)
        existing_texts = {doc.page_content for doc in vectorstore.docstore._dict.values()}
        new_pages = [doc for doc in pages if doc.page_content not in existing_texts]

        if new_pages:
            print(f"Adding {len(new_pages)} new documents to vector store.")
            vectorstore.add_documents(new_pages)
            vectorstore.save_local(VECTOR_DB_PATH)
        else:
            print("No new documents to add.")
    else:
        print("Creating new FAISS vector store...")
        vectorstore = FAISS.from_documents(pages, embedding=embeddings)
        vectorstore.save_local(VECTOR_DB_PATH)

    retriever = vectorstore.as_retriever()

    chain = {
        "context": itemgetter("question") | retriever,
        "question": itemgetter("question")
    } | prompt | model | parser

    result = chain.invoke({"question": user_input})

    # Handle cases where the result might indicate no answer was found
    if not result.strip() or "no information" in result.lower():
        result = "I'm not sure about that, but I'm happy to help with anything else you need!"

    # Add greeting for the first message
    if is_first_message:
        result = f"Hi there! I'm excited to help you today. {result}"

    # Add farewell for the end of the conversation
    if is_conversation_end:
        result = f"{result} Thanks for chatting with me! Feel free to reach out anytime."

    return result

if __name__ == "__main__":
    user_input = input("Enter your question: ")
    result = RAG(user_input, is_first_message=True)
    print(result)