// server/models/Invite.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Invite = sequelize.define(
  "Invite",
  {
    email: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("viewer", "reviewer"), allowNull: false },
    orgId: { type: DataTypes.STRING, allowNull: false },
    mediaId: { type: DataTypes.INTEGER, allowNull: true, field: "media_id" },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM("pending", "accepted", "registered", "rejected"), defaultValue: "pending" },
    invitedBy: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "invites", timestamps: true }
);

export default Invite;


