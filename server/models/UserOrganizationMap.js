// server/models/UserOrganizationMap.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const UserOrganizationMap = sequelize.define(
  "UserOrganizationMap",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "user_id",
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "organizations", key: "id" },
      field: "organization_id",
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "clients", key: "id" },
      field: "client_id",
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "roles", key: "id" },
      field: "role_id",
    },
    roleName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "role_name",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      defaultValue: "active",
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "assigned_at",
    },
    assignedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "assigned_by",
    },
  },
  {
    tableName: "user_organization_maps",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["user_id", "organization_id", "client_id"] },
      { fields: ["role_name"] },
    ],
  }
);

export default UserOrganizationMap;
