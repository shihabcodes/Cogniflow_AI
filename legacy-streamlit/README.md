# Cogniflow v1 — Streamlit YouTube Summarizer (archived)

This is the original single-file version of Cogniflow: paste a YouTube link, get a Gemini-powered summary in a Streamlit UI. It still works and is kept here for history.

The main event has moved to the repo root: a Next.js RAG app that indexes YouTube videos, PDFs, audio, and pasted text, and answers questions with citations. See the [root README](../README.md).

## Run the legacy app

```bash
cd legacy-streamlit
pip install -r requirements.txt
echo "GOOGLE_API_KEY=your_key_here" > .env
streamlit run app.py
```
