import os
import streamlit as st
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Google GenerativeAI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Prompt for summarization
prompt = """Welcome, Video Summarizer! Your task is to distill the essence of a given YouTube video transcript into a concise summary. Your summary should capture the key points and essential information, presented in bullet points, within a 250-word limit. Let's dive into the provided transcript and extract the vital details for our audience."""


# Function to extract video ID from various YouTube URL formats
def extract_video_id(url):
    from urllib.parse import urlparse, parse_qs
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        return parsed_url.path[1:]
    if parsed_url.hostname in ('www.youtube.com', 'youtube.com', 'm.youtube.com'):
        if parsed_url.path == '/watch':
            p = parse_qs(parsed_url.query)
            if 'v' in p:
                return p['v'][0]
    # Fallback
    if "=" in url:
        return url.split("=")[1].split("&")[0]
    return url

# Function to extract transcript details from a YouTube video URL
def extract_transcript_details(youtube_video_url):
    try:
        video_id = extract_video_id(youtube_video_url)
        transcript_text = YouTubeTranscriptApi().fetch(video_id)

        transcript = ""
        for i in transcript_text:
            transcript += " " + i.text

        return transcript
    except Exception as e:
        raise e


# Function to generate summary using Google Gemini Pro
def generate_gemini_content(transcript_text, prompt):
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt + transcript_text)
    return response.text


# Streamlit UI
st.title(
    "Gemini YouTube Transcript Summarizer: Extract Key Insights from YouTube Videos"
)
youtube_link = st.text_input("Enter YouTube Video Link:")

if youtube_link:
    try:
        video_id = extract_video_id(youtube_link)
        st.image(f"http://img.youtube.com/vi/{video_id}/0.jpg", use_column_width=True)
    except Exception:
        pass

# Button to trigger summary generation
if st.button("Get Detailed Notes"):
    transcript_text = extract_transcript_details(youtube_link)

    if transcript_text:
        # Generate summary using Gemini Pro
        summary = generate_gemini_content(transcript_text, prompt)

        # Display summary
        st.markdown("## Detailed Notes:")
        st.write(summary)
