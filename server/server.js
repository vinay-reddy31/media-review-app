// server/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import mediaRoutes from "./routes/media.js";
import commentRoutes from "./routes/comments.js";
import { verifyKeycloakToken } from "./middleware/verifyKeycloakToken.js";
import { connectDB } from "./db.js";
import { connectMongoDB } from "./db.js";
import Annotation from "./models/Annotation.js";
import Comment from "./models/Comment.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/media", mediaRoutes);
app.use("/comments", commentRoutes);

// Socket authentication function
const verifySocketToken = (token) => {
  return new Promise((resolve, reject) => {
    const client = jwksClient({
      jwksUri: process.env.KEYCLOAK_JWKS_URI,
    });

    function getKey(header, callback) {
      client.getSigningKey(header.kid, function (err, key) {
        if (err) {
          console.error("Error getting signing key", err);
          return callback(err);
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      });
    }

    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.KEYCLOAK_CLIENT_ID,
        issuer: `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          console.error("JWT verification failed", err.message);
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
};

// Socket.IO connection handling
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  
  try {
    const decoded = await verifySocketToken(token);
    console.log("✅ Socket token verified, decoded payload:", decoded);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.user?.sub);

  // Join media room
  socket.on("joinMediaRoom", (mediaId) => {
    socket.join(mediaId);
    console.log(`User ${socket.user?.sub} joined media room: ${mediaId}`);
    
    // Emit user joined to room
    socket.to(mediaId).emit("userJoined", {
      userId: socket.user?.sub,
      userName: socket.user?.preferred_username || "Anonymous"
    });

    // Send existing annotations to the joining user
    Annotation.find({ mediaId })
      .then(annotations => {
        console.log(`📥 Found ${annotations.length} existing annotations for media ${mediaId}`);
        if (annotations.length > 0) {
          console.log(`First annotation:`, annotations[0]);
        }
        socket.emit("existingAnnotations", annotations);
      })
      .catch(err => {
        console.error("❌ Error fetching existing annotations:", err);
      });

    // Send existing comments to the joining user
    Comment.find({ mediaId })
      .then(comments => {
        console.log(`📥 Found ${comments.length} existing comments for media ${mediaId}`);
        if (comments.length > 0) {
          console.log(`First comment:`, comments[0]);
        }
        socket.emit("existingComments", comments);
      })
      .catch(err => {
        console.error("❌ Error fetching existing comments:", err);
      });
  });

  // Leave media room
  socket.on("leaveMediaRoom", (mediaId) => {
    socket.leave(mediaId);
    console.log(`User ${socket.user?.sub} left media room: ${mediaId}`);
    
    // Emit user left to room
    socket.to(mediaId).emit("userLeft", {
      userId: socket.user?.sub,
      userName: socket.user?.preferred_username || "Anonymous"
    });
  });

  // Handle new annotations
  socket.on("newAnnotation", async (data) => {
    try {
      console.log(`🎨 Creating new annotation for media: ${data.mediaId}`);
      console.log(`Annotation data received:`, data);
      console.log(`Current user data:`, socket.user);
      console.log(`User ID to save: ${socket.user?.sub}`);
      
      const annotation = new Annotation({
        mediaId: data.mediaId,
        type: data.type,
        data: data.data,
        timeInMedia: data.timeInMedia,
        userId: socket.user?.sub,
        userName: data.userName || socket.user?.preferred_username || "Anonymous",
      });

      console.log(`Annotation object before save:`, annotation);
      
      await annotation.save();
      
      console.log(`✅ Annotation saved successfully with ID: ${annotation._id}`);
      console.log(`Saved annotation data:`, annotation.toObject());
      
      // Broadcast to all users in the room
      io.to(data.mediaId).emit("annotationAdded", annotation);
      
      console.log(`🎯 Annotation saved to DB and broadcasted for media ${data.mediaId} by ${socket.user?.sub}`);
    } catch (error) {
      console.error("❌ Error saving annotation:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
  });

  // Handle clearing annotations
  socket.on("clearAnnotations", async (data) => {
    try {
      await Annotation.deleteMany({ mediaId: data.mediaId });
      io.to(data.mediaId).emit("annotationsCleared");
      console.log(`Annotations cleared for media ${data.mediaId} by ${socket.user?.sub}`);
    } catch (error) {
      console.error("Error clearing annotations:", error);
    }
  });

  // Handle new comments - FIXED: Now properly saves to MongoDB
  socket.on("newComment", async (data) => {
    try {
      console.log(`Creating new comment for media: ${data.mediaId}`);
      console.log(`Current user data:`, socket.user);
      console.log(`User ID to save: ${socket.user?.sub}`);
      
      const comment = new Comment({
        mediaId: data.mediaId,
        text: data.text,
        timeInMedia: data.timeInMedia,
        userId: socket.user?.sub,
        userName: data.userName || socket.user?.preferred_username || "Anonymous",
      });

      console.log(`Comment object before save:`, comment);
      
      await comment.save();
      
      console.log(`Comment saved successfully with ID: ${comment._id}`);
      console.log(`Saved comment data:`, comment.toObject());
      
      // Broadcast to all users in the room
      io.to(data.mediaId).emit("commentAdded", comment);
      
      console.log(`Comment saved to DB and broadcasted for media ${data.mediaId} by ${socket.user?.sub}`);
    } catch (error) {
      console.error("Error saving comment:", error);
    }
  });

  // Handle comment deletion
  socket.on("deleteComment", async (data) => {
    try {
      const { commentId, mediaId } = data;
      
      console.log(`Attempting to delete comment: ${commentId} from media: ${mediaId}`);
      console.log(`Current user ID: ${socket.user?.sub}`);
      console.log(`Current user data:`, socket.user);
      
      // Check if user can delete (owner or comment author)
      const comment = await Comment.findById(commentId);
      if (!comment) {
        console.error("Comment not found:", commentId);
        return;
      }

      console.log(`Found comment:`, comment);
      console.log(`Comment user ID: ${comment.userId}`);
      console.log(`Comment user ID type: ${typeof comment.userId}`);
      console.log(`Socket user ID type: ${typeof socket.user?.sub}`);
      console.log(`Direct comparison: ${comment.userId === socket.user?.sub}`);
      console.log(`String comparison: ${String(comment.userId) === String(socket.user?.sub)}`);

      // Allow deletion if user is comment author OR if user is owner (using string comparison for safety)
      const isCommentAuthor = String(comment.userId) === String(socket.user?.sub);
      const isOwner = socket.user?.realm_access?.roles?.includes('owner') || socket.user?.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles?.includes('owner');
      
      console.log(`Is comment author: ${isCommentAuthor}`);
      console.log(`Is owner: ${isOwner}`);
      console.log(`User roles:`, socket.user?.realm_access?.roles, socket.user?.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles);

      if (isCommentAuthor || isOwner) {
        const deleteResult = await Comment.findByIdAndDelete(commentId);
        console.log(`Delete result:`, deleteResult);
        
        if (deleteResult) {
          // Broadcast deletion to all users in the room
          io.to(mediaId).emit("commentDeleted", { commentId });
          
          console.log(`Comment deleted from media ${mediaId} by ${socket.user?.sub}`);
        } else {
          console.error("Failed to delete comment from database");
        }
      } else {
        console.log(`User ${socket.user?.sub} not authorized to delete comment ${commentId}`);
        console.log(`Comment belongs to: ${comment.userId}`);
        
        // Send error back to the user who tried to delete
        socket.emit("commentDeleteError", { 
          error: "You are not authorized to delete this comment",
          commentId,
          commentUserId: comment.userId,
          currentUserId: socket.user?.sub,
          isCommentAuthor,
          isOwner
        });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Send error back to the user
      socket.emit("commentDeleteError", { 
        error: "Failed to delete comment",
        commentId: data.commentId,
        details: error.message
      });
    }
  });

  // Handle typing indicators
  socket.on("userTyping", (data) => {
    socket.to(data.mediaId).emit("userTyping", {
      mediaId: data.mediaId,
      userName: data.userName || socket.user?.preferred_username || "Anonymous"
    });
  });

  // Handle user viewing presence
  socket.on("userViewing", (data) => {
    socket.to(data.mediaId).emit("userViewing", {
      mediaId: data.mediaId,
      userName: data.userName || socket.user?.preferred_username || "Anonymous"
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user?.sub);
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Test annotation endpoint
app.get("/test-annotations", async (req, res) => {
  try {
    const annotations = await Annotation.find({});
    res.json({ 
      status: "OK", 
      count: annotations.length,
      annotations: annotations.slice(0, 5), // Show first 5
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: "ERROR", 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectMongoDB();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
