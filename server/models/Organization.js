// server/models/Organization.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Organization = sequelize.define(
  "Organization",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    keycloakId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Keycloak organization ID",
      field: "keycloak_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    domains: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
    },
  },
  {
    tableName: "organizations",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["name"] },
      // Use actual column name to avoid mapping issues during index creation
      { fields: ["keycloak_id"] },
    ],
  }
);

export default Organization;
