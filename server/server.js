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
import inviteRoutes from "./routes/invites.js";
import organizationRoutes from "./routes/organizations.js";
import userRoutes from "./routes/users.js";
import { verifyKeycloakToken } from "./middleware/verifyKeycloakToken.js";
import { connectDB } from "./db.js";
import { connectMongoDB } from "./db.js";
import Annotation from "./models/Annotation.js";
import Comment from "./models/Comment.js";
import { getUserEffectiveRoleForMedia, hasCapability } from "./utils/accessControl.js";
import annotationRoutes from "./routes/annotations.js";

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
app.use("/annotations", annotationRoutes);
app.use("/invites", inviteRoutes);
app.use("/organizations", verifyKeycloakToken, organizationRoutes);
app.use("/users", verifyKeycloakToken, userRoutes);

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
        audience: [process.env.KEYCLOAK_CLIENT_ID, "account"].filter(Boolean),
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
  socket.on("joinMediaRoom", async (mediaId) => {
    console.log(`🔍 User ${socket.user?.sub} attempting to join media room: ${mediaId}`);
    
    const { role } = await getUserEffectiveRoleForMedia(socket.user, mediaId);
    if (!hasCapability(role, "view")) {
      socket.emit("accessDenied", { reason: "No access to this media" });
      return;
    }
    
    socket.join(mediaId);
    console.log(`✅ User ${socket.user?.sub} joined media room: ${mediaId}`);
    console.log(`🔍 Current rooms for user:`, socket.rooms);
    console.log(`🔍 Users in room ${mediaId}:`, io.sockets.adapter.rooms.get(mediaId)?.size || 0);
    
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
      const { role } = await getUserEffectiveRoleForMedia(socket.user, data.mediaId);
      if (!hasCapability(role, "annotate")) {
        socket.emit("accessDenied", { reason: "No annotate permission" });
        return;
      }
      console.log(`🎨 Creating new annotation for media: ${data.mediaId}`);
      console.log(`Annotation data received:`, data);
      console.log(`Current user data:`, socket.user);
      console.log(`User ID to save: ${socket.user?.sub}`);
      
      // Map payload to Mongoose Annotation schema
      // Schema expects: { mediaId, userId, username, type: 'point', coordinates: {x,y}, text, timestamp }
      const coords = data.coordinates || data.data?.position || {};
      const text = data.text || data.data?.text || "Annotation";
      const annotation = new Annotation({
        mediaId: String(data.mediaId),
        userId: socket.user?.sub,
        username: data.userName || socket.user?.preferred_username || "Anonymous",
        type: "point",
        coordinates: { x: Number(coords.x), y: Number(coords.y) },
        text: text || "Annotation", // Ensure text is never empty
        timestamp: typeof data.timeInMedia === "number" ? data.timeInMedia : 0,
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
  socket.on("clearAnnotations", async (mediaId) => {
    try {
      const { role } = await getUserEffectiveRoleForMedia(socket.user, mediaId);
      if (!hasCapability(role, "annotate")) {
        socket.emit("accessDenied", { reason: "No annotate permission" });
        return;
      }
      
      console.log(`🗑️ Clearing all annotations for media: ${mediaId}`);
      await Annotation.deleteMany({ mediaId: String(mediaId) });
      
      // Broadcast to all users in the room
      io.to(mediaId).emit("annotationsCleared");
      
      console.log(`✅ All annotations cleared for media ${mediaId} by ${socket.user?.sub}`);
    } catch (error) {
      console.error("❌ Error clearing annotations:", error);
    }
  });

  // Handle editing annotations
  socket.on("editAnnotation", async (data) => {
    try {
      const { annotationId, mediaId, newText } = data;
      
      console.log(`✏️ Attempting to edit annotation: ${annotationId} from media: ${mediaId}`);
      console.log(`Current user ID: ${socket.user?.sub}`);
      
      // Check if user can edit (annotation author)
      const annotation = await Annotation.findById(annotationId);
      if (!annotation) {
        console.error("Annotation not found:", annotationId);
        return;
      }

      const isAnnotationAuthor = String(annotation.userId) === String(socket.user?.sub);
      
      if (isAnnotationAuthor) {
        annotation.text = newText;
        await annotation.save();
        
        // Broadcast update to all users in the room
        io.to(mediaId).emit("annotationEdited", annotation);
        
        console.log(`✅ Annotation edited for media ${mediaId} by ${socket.user?.sub}`);
      } else {
        console.log(`User ${socket.user?.sub} not authorized to edit annotation ${annotationId}`);
        socket.emit("annotationEditError", { 
          error: "You are not authorized to edit this annotation",
          annotationId
        });
      }
    } catch (error) {
      console.error("❌ Error editing annotation:", error);
      socket.emit("annotationEditError", { 
        error: "Failed to edit annotation",
        annotationId: data.annotationId,
        details: error.message
      });
    }
  });

  // Handle deleting annotations
  socket.on("deleteAnnotation", async (data) => {
    try {
      const { annotationId, mediaId } = data;
      
      console.log(`🗑️ Attempting to delete annotation: ${annotationId} from media: ${mediaId}`);
      console.log(`Current user ID: ${socket.user?.sub}`);
      console.log(`Current user data:`, socket.user);
      
      // Check if user can delete (annotation author or owner)
      const annotation = await Annotation.findById(annotationId);
      if (!annotation) {
        console.error("Annotation not found:", annotationId);
        return;
      }

      console.log(`Found annotation:`, annotation);
      console.log(`Annotation user ID: ${annotation.userId}`);
      console.log(`Annotation user ID type: ${typeof annotation.userId}`);
      console.log(`Socket user ID type: ${typeof socket.user?.sub}`);
      console.log(`Direct comparison: ${annotation.userId === socket.user?.sub}`);
      console.log(`String comparison: ${String(annotation.userId) === String(socket.user?.sub)}`);

      const isAnnotationAuthor = String(annotation.userId) === String(socket.user?.sub);
      const allClientRoles = Object.values(socket.user?.resource_access || {}).flatMap((e) => e?.roles || []);
      const isOwner = (socket.user?.realm_access?.roles || []).includes('owner') || allClientRoles.includes('owner');
      
      console.log(`Is annotation author: ${isAnnotationAuthor}`);
      console.log(`Is owner: ${isOwner}`);
      console.log(`User roles:`, socket.user?.realm_access?.roles, socket.user?.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles);

      // Allow deletion if user is annotation author OR if user is owner
      if (isAnnotationAuthor || isOwner) {
        const deleteResult = await Annotation.findByIdAndDelete(annotationId);
        console.log(`Delete result:`, deleteResult);
        
        if (deleteResult) {
          // Broadcast deletion to all users in the room
          console.log(`Broadcasting annotationDeleted event to room ${mediaId} with annotationId: ${annotationId}`);
          console.log(`🔍 Room ${mediaId} exists:`, io.sockets.adapter.rooms.has(mediaId));
          console.log(`🔍 Users in room ${mediaId}:`, io.sockets.adapter.rooms.get(mediaId)?.size || 0);
          
          io.to(mediaId).emit("annotationDeleted", { annotationId });
          
          console.log(`✅ Annotation deleted from media ${mediaId} by ${socket.user?.sub}`);
        } else {
          console.error("Failed to delete annotation from database");
        }
      } else {
        console.log(`User ${socket.user?.sub} not authorized to delete annotation ${annotationId}`);
        console.log(`User must be annotation author or owner to delete`);
        
        socket.emit("annotationDeleteError", { 
          error: "You can only delete your own annotations or you must be an owner",
          annotationId,
          annotationUserId: annotation.userId,
          currentUserId: socket.user?.sub,
          isAnnotationAuthor,
          isOwner
        });
      }
    } catch (error) {
      console.error("❌ Error deleting annotation:", error);
      socket.emit("annotationDeleteError", { 
        error: "Failed to delete annotation",
        annotationId: data.annotationId,
        details: error.message
      });
    }
  });

  // Handle new comments - FIXED: Now properly saves to MongoDB
  socket.on("newComment", async (data) => {
    try {
      const { role } = await getUserEffectiveRoleForMedia(socket.user, data.mediaId);
      if (!hasCapability(role, "annotate")) {
        socket.emit("accessDenied", { reason: "No comment permission" });
        return;
      }
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
      const allClientRoles = Object.values(socket.user?.resource_access || {}).flatMap((e) => e?.roles || []);
      const isOwner = (socket.user?.realm_access?.roles || []).includes('owner') || allClientRoles.includes('owner');
      
      console.log(`Is comment author: ${isCommentAuthor}`);
      console.log(`Is owner: ${isOwner}`);
      console.log(`User roles:`, socket.user?.realm_access?.roles, socket.user?.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles);

      // Allow deletion if user is comment author OR if user is owner
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
        console.log(`User must be comment author or owner to delete`);
        
        // Send error back to the user who tried to delete
        socket.emit("commentDeleteError", { 
          error: "You can only delete your own comments or you must be an owner",
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

  // Handle comment editing
  socket.on("editComment", async (data) => {
    try {
      const { commentId, mediaId, newText } = data;
      
      console.log(`✏️ Attempting to edit comment: ${commentId} from media: ${mediaId}`);
      console.log(`Current user ID: ${socket.user?.sub}`);
      
      // Check if user can edit (comment author)
      const comment = await Comment.findById(commentId);
      if (!comment) {
        console.error("Comment not found:", commentId);
        return;
      }

      const isCommentAuthor = String(comment.userId) === String(socket.user?.sub);
      
      if (isCommentAuthor) {
        comment.text = newText;
        await comment.save();
        
        // Broadcast update to all users in the room
        io.to(mediaId).emit("commentEdited", comment);
        
        console.log(`✅ Comment edited for media ${mediaId} by ${socket.user?.sub}`);
      } else {
        console.log(`User ${socket.user?.sub} not authorized to edit comment ${commentId}`);
        socket.emit("commentEditError", { 
          error: "You are not authorized to edit this comment",
          commentId
        });
      }
    } catch (error) {
      console.error("❌ Error editing comment:", error);
      socket.emit("commentEditError", { 
        error: "Failed to edit comment",
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
