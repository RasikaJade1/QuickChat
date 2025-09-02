// import express from "express";
// import "dotenv/config";
// import cors from "cors";
// import http from "http";
// import { connectDB } from "./lib/db.js";
// import userRouter from "./routes/userRoutes.js";
// import messageRouter from "./routes/messageRoutes.js";
// import { Server } from "socket.io";

// //Create express app and http server
// const app = express();
// const server = http.createServer(app);

// // Initialize socket.io server
// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://quickchat-xi.vercel.app",
//   "https://quick-chat-git-main-jaderasika-gmailcoms-projects.vercel.app/login"
// ];

// export const io = new Server(server, {
//   cors: {
//     origin: allowedOrigins, // Match with Express CORS
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     credentials: true,
//   },
// });

// //store online users
// export const userSocketMap = {}; //{userId: socketId}

// //Socket.io connection handler
// io.on("connection", (socket)=> {
//     const userId = socket.handshake.query.userId;
//     console.log("User connected", userId);

//     if(userId) userSocketMap[userId] = socket.id;

//     //Emit online users to all connected clients
//     io.emit("getOnlineUsers", Object.keys(userSocketMap));

//     socket.on("disconnect", () => {
//         console.log("User disconnected", userId);
//         delete userSocketMap[userId];
//         io.emit("getOnlineUsers", Object.keys(userSocketMap));
//     })
// });


// //Middleware setup
// app.use(express.json({limit: "4mb"}));
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   credentials: true,
// }));


// //Route setup
// app.use("/api/status", (req,res) => res.send("Server is live"));
// app.use("/api/auth", userRouter);
// app.use("/api/messages", messageRouter);

// //connect to mongoDB
// await connectDB();

// if(process.env.NODE_ENV !== "production"){
//     const PORT = process.env.PORT || 5000;
// server.listen(PORT, ()=> console.log("Server is running on port: " + PORT));
// }

// //Export server for vercel
// export default server;


import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// Create express app and http server
const app = express();
const server = http.createServer(app);

// Initialize socket.io server
const allowedOrigins = [
  "http://localhost:5173",
  "https://quickchat-xi.vercel.app",
  "https://quick-chat-git-main-jaderasika-gmailcoms-projects.vercel.app", // Corrected to match the origin
];

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Store online users
export const userSocketMap = {}; // {userId: socketId}

// Socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200, // Ensure preflight returns 200
}));

// Route setup
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB
connectDB().catch((err) => console.error("MongoDB connection error:", err));

// Export as a Vercel handler
export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.IO");
    server.on("upgrade", (request, socket, head) => {
      io.handleUpgrade(request, socket, head, (socket) => {
        io.emit("upgrade", socket);
      });
    });
    res.socket.server.io = io;
  } else {
    console.log("Socket.IO already running");
  }

  // Handle preflight requests explicitly
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", allowedOrigins.includes(req.headers.origin) ? req.headers.origin : allowedOrigins[0]);
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  // Handle the request with Express
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  app(req, res);
}