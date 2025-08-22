// server/models/Role.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Role = sequelize.define(
  "Role",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    keycloakId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "keycloak_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "clients", key: "id" },
      field: "client_id",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "roles",
    timestamps: true,
    indexes: [
      { fields: ["client_id"] },
      { fields: ["name"] },
    ],
  }
);

export default Role;
