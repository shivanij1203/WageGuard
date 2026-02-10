# WageGuard

wage theft costs US workers $50 billion a year — more than all robberies combined. yet there's no free tool for workers to check if they're getting ripped off.

WageGuard analyzes your pay stubs and flags violations — underpayment, missing overtime, illegal deductions, sketchy withholdings. upload a pay stub, get answers.

## what it does
- upload pay stubs (pdf, txt, images)
- AI checks for wage theft against federal/state labor laws
- shows violations with severity, earnings breakdown, deduction audit
- ask follow-up questions about your pay in natural language
- voice input supported

## stack
- django + mongodb (backend)
- react + vite + tailwind (frontend)
- openai gpt-4o (analysis)
- deepgram (voice)
- tesseract ocr (scanned docs)

## setup
```
cp backend/.env.example backend/.env
# add your API keys
pip install -r backend/requirements.txt
cd frontend && npm install
```

## run
```
python backend/manage.py runserver 8000
cd frontend && npm run dev
```

built for DeveloperWeek 2026 hackathon
