// server/models/Client.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Client = sequelize.define(
  "Client",
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
    clientId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "client_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "organizations", key: "id" },
      field: "organization_id",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
    },
  },
  {
    tableName: "clients",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["client_id"] },
      { fields: ["organization_id"] },
    ],
  }
);

export default Client;
