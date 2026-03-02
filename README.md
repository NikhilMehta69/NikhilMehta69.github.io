# PDF Quizzer

A lightweight browser app that lets you upload a text-based PDF containing numbered questions and an answer key, then quizzes you one question at a time.

## Run locally

1. Open a terminal in this project folder.
2. Start a local web server:

   ```bash
   python3 -m http.server 4173
   ```

3. Open your browser to:

   ```
   http://127.0.0.1:4173
   ```

4. Upload your PDF using the file input.

## Expected PDF format

- Numbered questions in the main body (examples: `1.`, `2)`, `3:`).
- An **Answer Key** or **Answers** section near the end.
- Text-based PDF (not scanned images).

## Troubleshooting

- If upload appears to fail, check the status message shown in the app.
- Scanned/image PDFs usually cannot be parsed because there is no selectable text.
- If you changed files and the browser seems stale, hard-refresh the page.
