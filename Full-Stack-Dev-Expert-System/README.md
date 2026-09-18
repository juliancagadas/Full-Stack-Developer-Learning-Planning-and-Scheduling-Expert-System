## How to Run the Project

### 1. Open the project folder

Open a terminal and go to the `python` folder:

```cmd
cd F:\Clips-Project\Full-Stack-Dev-Expert-System\expert-system\python
```

### 2. Install the required packages

Make sure Python 3.13 is installed.

Install Flask and CLIPSpy:

```cmd
py -3.13 -m pip install Flask clipspy
```

### 3. Start the Flask server

Run:

```cmd
py -3.13 app.py
```

You should see:

```text
* Running on http://127.0.0.1:5000
```

### 4. Open the website

Open your browser and go to:

```text
http://127.0.0.1:5000
```

### 5. Generate a Learning Plan

1. Answer the questions in the form.
2. Select the technologies you already know.
3. Select the technologies you want to learn.
4. Choose your available study time.
5. Choose your target duration.
6. Click **Generate My Learning Plan**.
7. The system will process your answers using the CLIPS expert system.
8. The generated learning plan will appear on the page.

## How the System Works

```text
User
 ↓
HTML / CSS / JavaScript
 ↓
Flask Backend
 ↓
CLIPS Expert System
 ↓
CLIPS Rules
 ↓
Learning Plan
 ↓
Flask
 ↓
JavaScript
 ↓
Results displayed on the webpage
```

## What CLIPS Handles

The CLIPS expert system is responsible for:

- Checking prerequisites
- Determining topic priorities
- Allocating study hours
- Checking the target duration
- Providing recommendations
- Creating the study schedule
- Determining the recommended learning order

The JavaScript only handles the user interface, form validation, sending data, and displaying the results.

## Important

Use:

```py -3.13 app.py
```
or

```py app.py
```

because in my own computer has both regular Python 3.13 and Python 3.13 free-threaded installed that's why im using (py -3.13 app.py).

The regular Python 3.13 version is required for CLIPSpy in this project.

## Stopping the Server

To stop the Flask server, press:

```text
Ctrl + C
```

## Notes

- Do not open `index.html` directly.
- Do not use Live Server to run the frontend.
- Start Flask first, then open `http://127.0.0.1:5000`.
- Keep the terminal running while using the system.
