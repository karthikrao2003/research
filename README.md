# Nutrition Calculator

This project is a full-stack nutrition calculator with a FastAPI backend and a React frontend.

## Project Structure

```
/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
└── README.md
```

## Backend Setup

1.  **Navigate into the backend directory:**
    ```bash
    cd backend
    ```
    *All subsequent backend commands must be run from this directory.*

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    -   On Windows:
        ```bash
        .\venv\Scripts\activate
        ```
    -   On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```

4.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```

The backend will be running at `http://127.0.0.1:8000`.

## Frontend Setup

1.  **Navigate into the frontend directory:**
    ```bash
    cd frontend
    ```
    *All subsequent frontend commands must be run from this directory.*

2.  **Install the dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```

The frontend will be running at `http://localhost:5173`.
