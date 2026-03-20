# LifeBridge AI

AI-powered emergency response platform that converts unstructured user input into structured emergency actions and intelligently matches users with the most suitable hospitals.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React (Vite), Tailwind CSS, Axios   |
| Backend   | FastAPI (Python), Pydantic          |
| Database  | Firebase Firestore                  |
| Auth      | Firebase Authentication             |
| AI        | Google Gemini API                   |
| Deploy    | Cloud Run (backend), Firebase Hosting (frontend) |

## Project Structure

```
LifeBridge-AI/
├── frontend/          # React + Vite app
│   └── src/
│       ├── api/       # Axios API client
│       ├── components/
│       ├── context/
│       ├── pages/     # UserPage, HospitalDashboard
│       └── utils/
├── backend/           # FastAPI server
│   ├── main.py        # Entry point
│   └── app/
│       ├── routes/    # API endpoints
│       ├── models/    # Pydantic schemas
│       ├── services/  # Business logic (Gemini, matching, Firebase)
│       └── utils/     # Haversine distance, etc.
├── firebase.json      # Firebase Hosting config
├── firestore.rules    # Firestore security rules
└── cloudbuild.yaml    # Cloud Build → Cloud Run deploy
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (for Cloud Run deployment)

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

### Deploy Backend to Cloud Run

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Deploy Frontend to Firebase Hosting

```bash
cd frontend && npm run build
firebase deploy --only hosting
```

## API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/analyze-emergency`  | AI analysis of emergency input     |
| POST   | `/match-hospitals`    | Match hospitals to emergency needs |
| POST   | `/alert-hospital`     | Send alert to selected hospital    |
| GET    | `/hospitals`          | List all registered hospitals      |

## License

MIT
