# 📽 Media Review App

A **full-stack web application** that allows users to review and rate media content (movies, series, etc.) with secure authentication via **Keycloak** and a **MongoDB** backend.
This project is built with **Next.js** for the client and **Node.js/Express** for the server.

## 🌐 Live Deployment

| Service  | URL                                                  |
| -------- | ---------------------------------------------------- |
| Client   | https://media-review-app-beryl.vercel.app            |
| Server   | https://media-server-z4t6.onrender.com               |
| Keycloak | https://media-revieqw-app-keycloak.onrender.com      |

## 🚀 Features

* 🔐 **Authentication** with Keycloak (OIDC protocol)
* 📝 **Media review system** with user-generated content
* 📊 **MongoDB** for storing user and review data
* ⚡ **Next.js** frontend with server-side rendering
* 🌐 REST API backend for media data management

## 🛠 Tech Stack

**Frontend (Client):**

* Next.js
* NextAuth.js
* Tailwind CSS

**Backend (Server):**

* Node.js / Express
* MongoDB & Mongoose
* Keycloak Middleware

---

## 📂 Project Structure

```
media-review-app/
│
├── client/              # Next.js frontend
│   ├── pages/
│   ├── components/
│   ├── styles/
│   └── .env.local
│
├── server/              # Node.js backend
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── .env
│
└── README.md
```

---

## 🖥️ Local Setup

Follow these steps to **clone and run** the project on your local machine.

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/media-review-app.git
cd media-review-app
```

### 2️⃣ Install Dependencies

**For the client:**

```bash
cd client
npm install
```

**For the server:**

```bash
cd ../server
npm install
```

---

### 3️⃣ Environment Variables

#### 📄 Client – `client/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=123456789

# Keycloak
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nextjs-client
KEYCLOAK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
KEYCLOAK_ISSUER=http://localhost:8080/realms/media-review-app
```

#### 📄 Server – `server/.env`

```env
MONGODB_URI=mongodb+srv://vinay:xxxxxxxxxxxxxxx@cluster0.mtxwgof.mongodb.net/media-review-app?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
KEYCLOAK_ISSUER=http://localhost:8080/realms/media-review
```


### 4️⃣ Run the Application

**Run backend server:**

```bash
cd server
npm start
```

**Run frontend client:**

```bash
cd client
npm run dev
```

Now open **[http://localhost:3000](http://localhost:3000)** in your browser.

## 🤝 Contributing

1. **Fork** the repository.
2. Create your **feature branch**:

   ```bash
   git checkout -b feature/my-feature
   ```
3. **Commit** your changes:

   ```bash
   git commit -m "Add my new feature"
   ```
4. **Push** to the branch:

   ```bash
   git push origin feature/my-feature
   ```
5. Open a **Pull Request**.
---

## 📌 Notes

* Ensure you have **Keycloak** running locally at `http://localhost:8080` with the configured realm and client IDs.
* Make sure **MongoDB** is accessible via the provided `MONGODB_URI`.
* Do **not** commit `.env` files. They contain sensitive information.

* For Detailled Documentation: https://docs.google.com/document/d/1yqUK_n2C697JbYGMlQrp9GiEP_JrYefAbc-JMh5Dy_o/edit?usp=sharing
